// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // firebase core
      'firebase/app': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/app/index.esm.js'
      ),
      // full SDK firestore → index.esm.js 로 지정
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/firestore/index.esm.js'
      ),
      // auth, analytics 등 필요하다면 같이 설정
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/auth/index.esm.js'
      ),
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/analytics/index.esm.js'
      )
    }
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
      'firebase/analytics'
    ]
  }
});
