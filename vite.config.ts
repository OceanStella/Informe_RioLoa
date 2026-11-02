import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Same PORT the API reads from .env, so the two never drift apart.
  const { PORT } = loadEnv(mode, process.cwd(), 'PORT')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${PORT || 8080}`,
          changeOrigin: true,
        },
      },
    },
  }
})
