import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true, 
    allowedHosts: [
      "potter-continues-rouge-prescence.trycloudflare.com",
      "somewhere-grove-interval-boxed.trycloudflare.com",
    ],
    port: 5173,
    strictPort: true
  },
});



