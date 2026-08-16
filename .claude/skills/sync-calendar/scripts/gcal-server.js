#!/usr/bin/env node

/**
 * Google Calendar MCP Server
 * Provides Google Calendar API v3 operations for the Planner sync flow.
 *
 * Supports two modes:
 * - Mock mode (default): in-memory calendar, no network, for development/testing
 * - Real mode: hand-rolled OAuth2 refresh-token flow + fetch against Calendar API v3
 *
 * Security:
 * - Only communicates with official Google endpoints (oauth2.googleapis.com, www.googleapis.com)
 * - No new runtime dependencies — uses built-in fetch
 * - No local system command execution
 * - Credentials read from process.env only (loaded from project-root .env)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// Load .env from project root before reading process.env
// ---------------------------------------------------------------------------

function loadEnvFile(p) {
  try {
    const content = readFileSync(p, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  } catch {
    // .env not found — skip
  }
}

loadEnvFile(path.resolve(PROJECT_ROOT, '.env'));

const MOCK_MODE = process.env.GCAL_MOCK_MODE !== 'false';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_CALENDAR_ID = process.env.GCAL_CALENDAR_ID || 'primary';

// ---------------------------------------------------------------------------
// Real Google Calendar API Client (OAuth2 refresh-token flow)
// ---------------------------------------------------------------------------

class GCalApiClient {
  constructor({ clientId, clientSecret, refreshToken, calendarId }) {
    if (!clientId) throw new Error('GCAL_CLIENT_ID is required');
    if (!clientSecret) throw new Error('GCAL_CLIENT_SECRET is required');
    if (!refreshToken) throw new Error('GCAL_REFRESH_TOKEN is required (run: npm run cal:auth)');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.calendarId = calendarId || DEFAULT_CALENDAR_ID;
    this._accessToken = null;
    this._expiresAt = 0; // epoch ms
  }

  // Exchange the refresh token for a short-lived access token. Cached until ~1 min before expiry.
  async _getAccessToken() {
    const now = Date.now();
    if (this._accessToken && now < this._expiresAt - 60_000) {
      return this._accessToken;
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error_description || data?.error || JSON.stringify(data);
      throw new Error(`OAuth token refresh failed (${res.status}): ${msg}`);
    }

    this._accessToken = data.access_token;
    this._expiresAt = now + (data.expires_in || 3600) * 1000;
    return this._accessToken;
  }

  async _request(method, urlPath, { query, body } = {}) {
    const token = await this._getAccessToken();
    let url = `${API_BASE}${urlPath}`;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // DELETE returns 204 with no body
    if (res.status === 204) return {};

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      throw new Error(`Calendar API ${res.status}: ${msg}`);
    }
    return data;
  }

  _cal() {
    return encodeURIComponent(this.calendarId);
  }

  async listEvents({ timeMin, timeMax, q, maxResults } = {}) {
    const query = {
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(maxResults || 250),
    };
    if (timeMin) query.timeMin = timeMin;
    if (timeMax) query.timeMax = timeMax;
    if (q) query.q = q;
    const data = await this._request('GET', `/calendars/${this._cal()}/events`, { query });
    return data.items || [];
  }

  async createEvent(event) {
    return this._request('POST', `/calendars/${this._cal()}/events`, { body: event });
  }

  async updateEvent(eventId, event) {
    return this._request('PATCH', `/calendars/${this._cal()}/events/${encodeURIComponent(eventId)}`, {
      body: event,
    });
  }

  async deleteEvent(eventId) {
    await this._request('DELETE', `/calendars/${this._cal()}/events/${encodeURIComponent(eventId)}`);
    return { deleted: true, id: eventId };
  }

  async checkToken() {
    // A cheap authenticated call confirms the credentials work.
    const data = await this._request('GET', `/calendars/${this._cal()}`);
    return { valid: true, calendar_id: this.calendarId, summary: data.summary };
  }
}

// ---------------------------------------------------------------------------
// Mock client — in-memory calendar
// ---------------------------------------------------------------------------

class MockGCalClient {
  constructor() {
    this.db = new Map();
    this.nextId = 1;
  }

  _normalize(event) {
    return {
      id: event.id,
      summary: event.summary || '',
      description: event.description || '',
      location: event.location || '',
      start: event.start || {},
      end: event.end || {},
      recurrence: event.recurrence || undefined,
      status: event.status || 'confirmed',
      htmlLink: `https://calendar.google.com/event?eid=${event.id}`,
    };
  }

  async listEvents({ timeMin, timeMax, q } = {}) {
    let items = [...this.db.values()];
    const startOf = (e) => e.start?.dateTime || e.start?.date || '';
    if (timeMin) items = items.filter((e) => startOf(e) >= timeMin || !startOf(e));
    if (timeMax) items = items.filter((e) => startOf(e) <= timeMax || !startOf(e));
    if (q) items = items.filter((e) => (e.summary || '').includes(q));
    return items.sort((a, b) => startOf(a).localeCompare(startOf(b)));
  }

  async createEvent(event) {
    const id = `mock_gcal_${this.nextId++}`;
    const stored = this._normalize({ ...event, id });
    this.db.set(id, stored);
    return stored;
  }

  async updateEvent(eventId, event) {
    const existing = this.db.get(eventId);
    if (!existing) throw new Error(`Mock event not found: ${eventId}`);
    const merged = this._normalize({ ...existing, ...event, id: eventId });
    this.db.set(eventId, merged);
    return merged;
  }

  async deleteEvent(eventId) {
    this.db.delete(eventId);
    return { deleted: true, id: eventId };
  }

  async checkToken() {
    return { valid: true, calendar_id: 'mock_primary', summary: 'Mock Calendar' };
  }
}

// ---------------------------------------------------------------------------
// Initialize client
// ---------------------------------------------------------------------------

let gcalClient;
if (MOCK_MODE) {
  console.error('Google Calendar MCP Server running in MOCK MODE');
  gcalClient = new MockGCalClient();
} else {
  console.error('Google Calendar MCP Server running in LIVE MODE');
  gcalClient = new GCalApiClient({
    clientId: process.env.GCAL_CLIENT_ID,
    clientSecret: process.env.GCAL_CLIENT_SECRET,
    refreshToken: process.env.GCAL_REFRESH_TOKEN,
    calendarId: process.env.GCAL_CALENDAR_ID,
  });
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'alfred-gcal-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const TZ = 'Asia/Taipei';

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gcal_check_token',
        description:
          'Verify Google Calendar credentials are valid and return the target calendar info',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'gcal_list_events',
        description:
          'List events from the calendar within an optional time window. Returns id, summary, start, end, recurrence.',
        inputSchema: {
          type: 'object',
          properties: {
            time_min: {
              type: 'string',
              description: 'RFC3339 lower bound, e.g. 2026-05-01T00:00:00+08:00',
            },
            time_max: {
              type: 'string',
              description: 'RFC3339 upper bound, e.g. 2026-05-31T23:59:59+08:00',
            },
            q: { type: 'string', description: 'Free-text search filter on event summary' },
            max_results: { type: 'number', description: 'Max events to return (default 250)' },
          },
        },
      },
      {
        name: 'gcal_create_event',
        description:
          'Create a calendar event. For timed events pass start/end as RFC3339; for all-day pass YYYY-MM-DD. Pass recurrence as an array of RRULE strings for recurring meetings.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Event title' },
            description: { type: 'string', description: 'Event details' },
            location: { type: 'string', description: 'Event location' },
            start: {
              type: 'string',
              description: 'Start: RFC3339 datetime (timed) or YYYY-MM-DD (all-day)',
            },
            end: {
              type: 'string',
              description: 'End: RFC3339 datetime (timed) or YYYY-MM-DD (all-day, exclusive)',
            },
            all_day: { type: 'boolean', description: 'True for all-day events (default false)' },
            recurrence: {
              type: 'array',
              items: { type: 'string' },
              description: 'RRULE strings, e.g. ["RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260929T000000Z"]',
            },
          },
          required: ['summary', 'start'],
        },
      },
      {
        name: 'gcal_update_event',
        description: 'Update fields of an existing event by ID (PATCH semantics — only pass changed fields)',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Google Calendar event ID' },
            summary: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            all_day: { type: 'boolean' },
            recurrence: { type: 'array', items: { type: 'string' } },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'gcal_delete_event',
        description: 'Delete (cancel) an event by ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Google Calendar event ID' },
          },
          required: ['event_id'],
        },
      },
    ],
  };
});

// Build a Google Calendar event resource from flat tool args.
function buildEventResource(args) {
  const { summary, description, location, start, end, all_day, recurrence } = args;
  const event = {};
  if (summary !== undefined) event.summary = summary;
  if (description !== undefined) event.description = description;
  if (location !== undefined) event.location = location;

  if (start !== undefined) {
    event.start = all_day ? { date: start } : { dateTime: start, timeZone: TZ };
  }
  if (end !== undefined) {
    event.end = all_day ? { date: end } : { dateTime: end, timeZone: TZ };
  }
  // All-day single-day event with no explicit end: GCal needs an end (exclusive next day).
  if (all_day && start !== undefined && end === undefined) {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    event.end = { date: d.toISOString().slice(0, 10) };
  }
  if (recurrence !== undefined) event.recurrence = recurrence;
  return event;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'gcal_check_token': {
        const result = await gcalClient.checkToken();
        return jsonContent({ success: true, ...result });
      }

      case 'gcal_list_events': {
        const events = await gcalClient.listEvents({
          timeMin: args.time_min,
          timeMax: args.time_max,
          q: args.q,
          maxResults: args.max_results,
        });
        return jsonContent({
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            summary: e.summary,
            start: e.start,
            end: e.end,
            recurrence: e.recurrence,
            status: e.status,
            htmlLink: e.htmlLink,
          })),
        });
      }

      case 'gcal_create_event': {
        const event = buildEventResource(args);
        const result = await gcalClient.createEvent(event);
        return jsonContent({
          success: true,
          event_id: result.id,
          htmlLink: result.htmlLink,
          summary: result.summary,
        });
      }

      case 'gcal_update_event': {
        const { event_id } = args;
        const event = buildEventResource(args);
        const result = await gcalClient.updateEvent(event_id, event);
        return jsonContent({
          success: true,
          event_id: result.id,
          htmlLink: result.htmlLink,
          summary: result.summary,
        });
      }

      case 'gcal_delete_event': {
        const result = await gcalClient.deleteEvent(args.event_id);
        return jsonContent({ success: true, ...result });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }],
      isError: true,
    };
  }
});

function jsonContent(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj) }] };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Calendar MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
