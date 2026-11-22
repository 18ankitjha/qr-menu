import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served under /super-admin/ on the shared host (dev gateway on :8080, reverse proxy in production).
// The proxy lets this app also work when opened directly on its own port.
const API_TARGET = 'http://localhost:5001'

export default defineConfig({
  base: '/super-admin/',
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
})
