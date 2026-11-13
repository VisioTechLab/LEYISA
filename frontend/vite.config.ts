import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En développement, /auth est relayé vers NestJS : même origine, donc le cookie
    // de session (SameSite=Strict) fonctionne sans configuration CORS.
    proxy: {
      '/auth': 'http://localhost:3000',
    },
  },
})
