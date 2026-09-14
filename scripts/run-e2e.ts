#!/usr/bin/env tsx
/**
 * Detailed E2E Test Runner for Leilões Portugal
 *
 * Runs end-to-end user journeys via Playwright against the local server (port 3000).
 * Usage:
 *   npx tsx scripts/run-e2e.ts
 *   npm run test:e2e
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';

const TEST_URL = process.env.TEST_URL || (
  process.env.APP_URL && !process.env.APP_URL.includes('.run.app')
    ? process.env.APP_URL
    : 'http://127.0.0.1:3000'
);

function checkHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parsed = new URL(`${url}/api/health`);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get({
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      timeout: 5000,
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('\x1b[1m\x1b[36m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   LEILÕES PORTUGAL — COMPREHENSIVE E2E TEST RUNNER        \x1b[0m');
  console.log('\x1b[1m\x1b[36m============================================================\x1b[0m\n');

  console.log(`Checking server availability at \x1b[33m${TEST_URL}\x1b[0m ...`);
  const healthy = await checkHealth(TEST_URL);
  if (!healthy) {
    console.error(`\x1b[31m✖ Error: Server at ${TEST_URL} is not responding or not healthy.\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m✔ Server is healthy! Launching Playwright E2E test suites...\x1b[0m\n`);

  const specFile = process.argv[2] || 'e2e/detailed-e2e.spec.ts';

  const args = [
    'playwright',
    'test',
    specFile,
    '--reporter=list',
  ];

  console.log(`Executing: \x1b[34mnpx ${args.join(' ')}\x1b[0m\n`);

  const start = Date.now();
  const child = spawn('npx', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEST_URL,
    },
  });

  child.on('close', (code) => {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n\x1b[1m\x1b[36m============================================================\x1b[0m');
    if (code === 0) {
      console.log(`\x1b[1m\x1b[32m✔ ALL E2E TEST JOURNEYS PASSED SUCCESSFULLY in ${duration}s!\x1b[0m`);
    } else {
      console.log(`\x1b[1m\x1b[31m✖ E2E TESTS COMPLETED WITH EXIT CODE ${code} in ${duration}s.\x1b[0m`);
    }
    console.log('\x1b[1m\x1b[36m============================================================\x1b[0m\n');
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
