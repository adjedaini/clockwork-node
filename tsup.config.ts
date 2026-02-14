import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: false,
  noExternal: [
    '@adjedaini/clockwork-transport-http',
    '@adjedaini/clockwork-shared',
  ],
  // Keep core, plugin packages external (require('node:os'), async_hooks etc. fail when inlined).
  external: [
    '@adjedaini/clockwork-core',
    '@adjedaini/clockwork-plugins',
    '@adjedaini/clockwork-db-interceptor',
    '@adjedaini/clockwork-log-interceptor',
  ],
});
