import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts'],
      reporter: ['text'],
      // Line-coverage floor from the Testing Contract. Never lower this to make a run pass.
      thresholds: { lines: 80 },
    },
  },
});
