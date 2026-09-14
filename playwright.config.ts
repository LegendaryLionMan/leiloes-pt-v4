import { defineConfig } from '@playwright/test';

// In Google AI Studio containers, external *.run.app domains route through an interactive
// authentication gateway (__cookie_check.html). Headless test runners run against the local server.
const targetUrl = process.env.TEST_URL || (
  process.env.APP_URL && !process.env.APP_URL.includes('.run.app')
    ? process.env.APP_URL
    : 'http://127.0.0.1:3000'
);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: targetUrl,
    headless: true,
  },
});
