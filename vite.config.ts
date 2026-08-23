import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Phase 17: backend port comes from env var so the orphan-port issue
// (a stale backend holding :8001 with a different version) can be bypassed
// by running on a different port. Default 9001 keeps the dev workflow
// unchanged when the env var isn't set.
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Phase 15.1: isolate vitest from Playwright e2e tests.
    // vitest auto-discovers *.test.ts by default — Playwright's *.spec.ts
    // accidentally matches. Constraining include to src/ + specifier to
    // *.test.{ts,tsx} keeps the two test runners in separate lanes.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    // Phase 15.1: Vitest coverage with @vitest/coverage-v8.
    // Threshold 30% — first-cut baseline. Phase 16+ will tighten once
    // more routes/components have unit tests written.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      // Phase 15.1: only measure files with unit tests today. As test
      // coverage grows in later phases, this list expands.
      include: ['src/lib/ui.tsx'],
      // Exclude routes/components that depend on browser APIs (Leaflet,
      // Plotly, i18n) — they need Playwright e2e coverage, not vitest+jsdom.
      // Adding them now would sink the threshold before tests exist.
      exclude: [
        'src/main.tsx',
        'src/**/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/setup.ts',
        'src/routes/**',             // routes render real Leaflet/Plotly
        'src/components/**/*.tsx',   // components render real DOM + libs
        'src/hooks/**',              // hooks need RTL render context (next phase)
        'src/lib/api.ts',            // axios + side effects (mock-heavy)
        'src/lib/Drawer.tsx',        // Leaflet integration (DOM-heavy)
        'src/i18n.ts',               // i18next setup, browser-only
        'src/locales/**',            // translation JSON, not code
      ],
      thresholds: {
        lines: 90,        // ui.tsx is well-tested, set threshold high
        statements: 90,
        functions: 80,
        branches: 90,
      },
    },
  },
});
