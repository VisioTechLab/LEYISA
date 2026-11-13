import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En développement, les écrans appellent /api ; Vite relaie vers le backend NestJS local.
    proxy: {
      '/api': {
        target: process.env.LEYISA_API_TARGET ?? 'http://127.0.0.1:3000',
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/auth': 'http://127.0.0.1:3000',
    },
  },
})
