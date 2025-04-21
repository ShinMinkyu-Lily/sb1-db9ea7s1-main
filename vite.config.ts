// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Core
      'firebase/app': path.resolve(
        __dirname,
        'node_modules/firebase/dist/app/index.esm.js'
      ),
      // Full Firestore SDK
      'firebase/firestore': path.resolve(
        __dirname,
        'node_modules/firebase/dist/firestore/index.esm.js'
      ),
      // (필요 시) auth, analytics 등도 함께 매핑
      'firebase/auth': path.resolve(
        __dirname,
        'node_modules/firebase/dist/auth/index.esm.js'
      ),
      'firebase/analytics': path.resolve(
        __dirname,
        'node_modules/firebase/dist/analytics/index.esm.js'
      )
    }
  }
})
