import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_CLOCKWORK_BASE ?? '/__clockwork/app/',
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5174,
    proxy: {
      '^/__clockwork$': { target: 'http://localhost:3001', changeOrigin: true },
      '^/__clockwork/(?!app)': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
