import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@reconcilo/shared': path.resolve(__dirname, 'shared/src/index.ts'),
    },
  },
});
