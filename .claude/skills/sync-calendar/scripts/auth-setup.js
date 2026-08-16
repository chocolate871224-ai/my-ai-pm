#!/usr/bin/env node

/**
 * Google Calendar OAuth2 Setup (one-time)
 *
 * Runs the OAuth2 "loopback" flow for a Desktop-app client to obtain a
 * long-lived refresh token, then writes GCAL_REFRESH_TOKEN back into .env.
 *
 * Prerequisites (done by you in Google Cloud Console):
 *   1. Create a project, enable the "Google Calendar API"
 *   2. Create an OAuth client of type "Desktop app"
 *   3. Put the client id/secret into .env as GCAL_CLIENT_ID / GCAL_CLIENT_SECRET
 *
 * Usage:
 *   npm run cal:auth
 *
 * Security:
 * - Talks only to Google's official OAuth endpoints
 * - Spins up a temporary localhost listener purely to catch the redirect
 * - No new runtime dependencies (Node built-ins only)
 */

import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar';
const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

function readEnvValue(key) {
  if (!fs.existsSync(ENV_PATH)) return null;
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function writeEnvValue(key, value) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    if (content && !content.endsWith('\n')) content += '\n';
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function exchangeCode(code, clientId, clientSecret) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${data.error_description || data.error}`);
  }
  return data;
}

async function main() {
  const clientId = readEnvValue('GCAL_CLIENT_ID');
  const clientSecret = readEnvValue('GCAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('\n✗ Missing GCAL_CLIENT_ID / GCAL_CLIENT_SECRET in .env');
    console.error('  Set them up first:');
    console.error('  1. https://console.cloud.google.com → create project → enable "Google Calendar API"');
    console.error('  2. Create OAuth client (type: Desktop app)');
    console.error('  3. Add GCAL_CLIENT_ID and GCAL_CLIENT_SECRET to .env\n');
    process.exit(1);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl =
    `${AUTH_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent', // force refresh_token issuance
      state,
    }).toString();

  const codePromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (reqUrl.pathname !== '/oauth2callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const code = reqUrl.searchParams.get('code');
      const returnedState = reqUrl.searchParams.get('state');
      const error = reqUrl.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error || !code) {
        res.end(`<h2>授權失敗：${error || 'no code'}</h2><p>可以關閉這個分頁。</p>`);
        server.close();
        reject(new Error(error || 'No authorization code returned'));
        return;
      }
      if (returnedState !== state) {
        res.end('<h2>State mismatch — 安全檢查失敗</h2>');
        server.close();
        reject(new Error('OAuth state mismatch'));
        return;
      }
      res.end('<h2>✓ 授權成功</h2><p>可以關閉這個分頁，回到終端機。</p>');
      server.close();
      resolve(code);
    });
    server.listen(REDIRECT_PORT, () => {
      console.error(`\nOpening browser for Google consent...`);
      console.error(`If it doesn't open, paste this URL manually:\n${authUrl}\n`);
      openBrowser(authUrl);
    });
    server.on('error', reject);
  });

  const code = await codePromise;
  const tokens = await exchangeCode(code, clientId, clientSecret);

  if (!tokens.refresh_token) {
    console.error('\n✗ No refresh_token returned. Revoke prior access and retry:');
    console.error('  https://myaccount.google.com/permissions\n');
    process.exit(1);
  }

  writeEnvValue('GCAL_REFRESH_TOKEN', tokens.refresh_token);
  console.error('\n✓ GCAL_REFRESH_TOKEN written to .env');
  console.error('  Set GCAL_MOCK_MODE=false in .env to go live.\n');
}

main().catch((err) => {
  console.error('\n✗ Setup error:', err.message, '\n');
  process.exit(1);
});
