import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'tsup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  outDir: 'dist',
  tsconfig: path.join(__dirname, 'tsconfig.build.json'),
});
