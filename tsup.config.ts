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
  ],
  // Keep plugin packages external so Node loads them at runtime (they use require('async_hooks') etc., which fails when inlined into ESM).
  external: [
    '@adjedaini/clockwork-plugins',
    '@adjedaini/clockwork-db-interceptor',
    '@adjedaini/clockwork-log-interceptor',
  ],
});
