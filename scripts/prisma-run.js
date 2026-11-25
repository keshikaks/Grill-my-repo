const fs = require('fs');
const { spawnSync } = require('child_process');

function normalizeUrl(url) {
  if (!url) return '';
  let u = url.trim().replace(/^"|"$/g, '');
  if (!u.startsWith('postgres://') && !u.startsWith('postgresql://')) {
    if (u.includes('@')) {
      const parts = u.split('@');
      if (!parts[0].includes(':')) {
        u = 'postgresql://neondb_owner:' + u;
      } else {
        u = 'postgresql://' + u;
      }
    } else {
      u = 'postgresql://' + u;
    }
  }
  return u;
}

if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^"|"$/g, '');
      if (k === 'DATABASE_URL') {
        process.env.DATABASE_URL = normalizeUrl(val);
      } else if (k === 'DIRECT_URL') {
        process.env.DIRECT_URL = normalizeUrl(val);
      } else if (!process.env[k]) {
        process.env[k] = val;
      }
    }
  }
}

const args = process.argv.slice(2);
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 0);
