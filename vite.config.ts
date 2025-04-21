// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // firebase/app 풀 SDK ESM 진입점
      'firebase/app': path.resolve(
        __dirname,
        'node_modules/firebase/app/dist/esm/index.js'
      ),
      // firebase/auth 풀 SDK ESM 진입점
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/auth/dist/esm/index.js'
      ),
      // firebase/firestore 풀 SDK는 @firebase/firestore 패키지 내부에 있습니다
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/@firebase/firestore/dist/index.esm.js'
      ),
      // firebase/analytics 풀 SDK ESM 진입점
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/analytics/dist/index.esm.js'
      ),
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
