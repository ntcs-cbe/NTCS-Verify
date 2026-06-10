import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ensure the configuration object is explicitly returned and exported as default
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});