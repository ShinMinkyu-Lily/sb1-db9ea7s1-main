// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // firebase/app 은 이 경로에 있습니다
      'firebase/app':       path.resolve(__dirname, 'node_modules/firebase/app/dist/esm/index.esm.js'),
      // firebase/auth
      'firebase/auth':      path.resolve(__dirname, 'node_modules/firebase/auth/dist/esm/index.esm.js'),
      // firebase/firestore
      'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/firestore/dist/esm/index.esm.js'),
      // firebase/analytics
      'firebase/analytics': path.resolve(__dirname, 'node_modules/firebase/analytics/dist/esm/index.esm.js'),
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
})
