import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'firebase/app':
        fileURLToPath(new URL('node_modules/firebase/app/dist/index.esm.js', import.meta.url)),
      'firebase/firestore':
        fileURLToPath(new URL('node_modules/firebase/firestore/dist/index.esm.js', import.meta.url)),
      'firebase/auth':
        fileURLToPath(new URL('node_modules/firebase/auth/dist/index.esm.js', import.meta.url)),
      'firebase/analytics':
        fileURLToPath(new URL('node_modules/firebase/analytics/dist/index.esm.js', import.meta.url)),
    }
  }
})
