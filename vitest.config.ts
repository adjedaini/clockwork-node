import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@adjedaini/clockwork-node': path.resolve(__dirname, 'src/index.ts'),
    },
  },
});
