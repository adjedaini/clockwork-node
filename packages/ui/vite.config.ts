import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const clockworkPath = (process.env.VITE_CLOCKWORK_PATH ?? '/__clockwork').replace(/\/$/, '') || '/__clockwork';
const clockworkPathEscaped = clockworkPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default defineConfig({
  base: `${clockworkPath}/app/`,
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // only on dev mode
  server: {
    port: 5174,
    proxy: {
      [`^${clockworkPathEscaped}$`]: { target: 'http://localhost:3001', changeOrigin: true },
      [`^${clockworkPathEscaped}/(?!app)`]: { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
