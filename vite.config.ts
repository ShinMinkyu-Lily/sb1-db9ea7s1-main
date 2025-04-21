// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
      'firebase/analytics'
    ]
  },
});
