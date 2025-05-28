import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-coop-coep-headers',
      configureServer(server) {
        server.middlewares.use((_, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
          res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
          next()
        })
      },
    },
  ],
})
