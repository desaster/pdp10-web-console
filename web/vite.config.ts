import { defineConfig } from 'vite'

export default defineConfig({
  // Override with BASE_PATH env var for subpath deployments
  base: process.env.BASE_PATH || '/',
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:11180',
        ws: true
      }
    },
  },
  build: {
    // Ensure assets use relative paths from base
    assetsDir: 'assets',
  }
})
