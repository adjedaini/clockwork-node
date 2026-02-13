import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: false,
  noExternal: [
    '@adjedaini/clockwork-core',
    '@adjedaini/clockwork-transport-http',
    '@adjedaini/clockwork-shared',
    '@adjedaini/clockwork-plugins',
    '@adjedaini/clockwork-db-interceptor',
    '@adjedaini/clockwork-log-interceptor',
  ],
});
