// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // firebase 모듈별로 ESM 빌드가 들어 있는 dist/esm 하위 경로를 정확히 가리킵니다
      'firebase/app': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/app/index.js'
      ),
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/firestore/index.js'
      ),
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/auth/index.js'
      ),
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/dist/esm/analytics/index.js'
      )
    }
  }
})
