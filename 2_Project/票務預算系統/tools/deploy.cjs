// Update the existing web-app deployment to the code last pushed, keeping the same URL.
// Usage: npm run deploy -- "1117 說明"
const { execFileSync } = require('child_process');
const DEPLOYMENT_ID = 'AKfycbxiynBz0M4MGeVSllNRAGiBMw4-qPpHbvwBgV6kXvYB-JvpUQbhjpiYMx4Ih0y4WYg7';
const desc = process.argv.slice(2).join(' ').trim();
if (!desc) { console.error('請加上這次部署的說明，例如：npm run deploy -- "1117 銷售分頁"'); process.exit(1); }
execFileSync('npx', ['clasp', 'deploy', '-i', DEPLOYMENT_ID, '-d', desc], { stdio: 'inherit' });
