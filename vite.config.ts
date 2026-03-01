import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/node_modules/three/examples/')) return 'three-examples';
          if (id.includes('/node_modules/three/')) return 'three-core';
          if (id.includes('/node_modules/cannon-es/')) return 'physics';
          return undefined;
        },
      },
    },
  },
  server: { 
    host: true, 
    allowedHosts: [
      "searches-acquisitions-detection-pharmacology.trycloudflare.comq",
    ],
    port: 5173,
    strictPort: true
  },
});

