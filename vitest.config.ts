import { defineConfig } from 'vitest/config';

// Unit tests live next to the code (src/**/*.test.ts); browser tests in e2e/ run with Playwright.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
