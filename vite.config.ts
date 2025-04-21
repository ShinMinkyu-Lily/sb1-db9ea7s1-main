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
        'node_modules/firebase/app/dist/esm/index.js'
      ),
      // full SDK firestore
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/firebase/firestore/dist/index.mjs'
      ),
      // auth, analytics 등도 필요하다면 함께 설정
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/auth/dist/index.mjs'
      ),
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/analytics/dist/index.esm.js'
      )
    }
  }
});
