import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensures assets use relative paths (./), so Electron can find them in the dist folder
  base: './', 
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Ensures the code is compatible with the version of Chromium inside Electron
    target: 'chrome120', 
    assetsDir: 'assets',
  },
  // We keep this clean to avoid the 'deprecated' warnings you saw earlier
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
