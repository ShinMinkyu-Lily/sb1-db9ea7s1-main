// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // firebase core: 개별 ESM 엔트리
      'firebase/app': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/app/index.esm.js'
      ),

      // firestore를 루트 ESM 번들로 매핑
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/index.esm.js'
      ),

      // auth, analytics 등도 동일한 루트 번들에서 가져옵니다
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/index.esm.js'
      ),
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/index.esm.js'
      ),
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
