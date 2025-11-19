import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'tests/playwright/**/*.{ts,tsx,js,jsx}',
      'playwright.config.{ts,js,mjs,cjs}',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
