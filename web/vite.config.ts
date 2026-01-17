import { defineConfig } from 'vite'

export default defineConfig({
  // Override with BASE_PATH env var for subpath deployments
  base: process.env.BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    },
    allowedHosts: ['localhost', 'vibebox.lan'],
  },
  build: {
    // Ensure assets use relative paths from base
    assetsDir: 'assets',
  }
})
