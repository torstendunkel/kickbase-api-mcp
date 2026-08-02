#!/usr/bin/env tsx
// Quick smoke test — run with: npx tsx test.ts
// Reads credentials from .env in the same directory.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
try {
  const env = readFileSync(resolve(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
} catch {
  console.error('No .env file found — set KICKBASE_EMAIL and KICKBASE_PASSWORD manually.');
}

import { apiGet } from './src/client.js';

async function run() {
  console.log('1. Fetching user profile...');
  const profile = await apiGet('/v4/user/me');
  console.log(JSON.stringify(profile, null, 2));

  console.log('\n2. Fetching leagues...');
  const leagues = await apiGet('/v4/leagues');
  console.log(JSON.stringify(leagues, null, 2));
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
