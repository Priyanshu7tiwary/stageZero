import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Settings the app requires at import time (no real database is used in tests).
    env: { JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long', APP_TIMEZONE: 'Asia/Kolkata' },
  },
});
