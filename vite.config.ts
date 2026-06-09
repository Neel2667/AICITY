import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Pin root to repo root — only index.html here is the city app
  root: '.',

  // Only serve the main index.html — exclude docs/ and server/admin/
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
    outDir: 'dist',
  },

  // Exclude server/ and docs/ from being scanned by Vite
  server: {
    fs: {
      // Allow serving files from the repo root
      allow: ['.'],
    },
  },

  // Explicitly tell Vite not to treat server/ or docs/ as part of the app
  optimizeDeps: {
    exclude: [],
    entries: [
      'src/main.ts',
    ],
  },
});
