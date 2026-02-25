import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true, 
    allowedHosts: [
      "hansen-reaction-mug-brings.trycloudflare.com",
    ],
    port: 5173,
    strictPort: true
  },
});


