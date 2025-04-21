// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Firebase 풀 SDK ESM 번들로 통합
      'firebase/app':       path.resolve(__dirname, 'node_modules/firebase/dist/esm/index.esm.js'),
      'firebase/auth':      path.resolve(__dirname, 'node_modules/firebase/dist/esm/index.esm.js'),
      'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/dist/esm/index.esm.js'),
      'firebase/analytics': path.resolve(__dirname, 'node_modules/firebase/dist/esm/index.esm.js'),
    }
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/analytics'
    ]
  }
});
