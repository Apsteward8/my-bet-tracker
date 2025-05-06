import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // This allows connections from any IP
    port: 5173,       // Using the default Vite port
    strictPort: true, // Don't try other ports if 5173 is taken
    allowedHosts: [
      'localhost',
      'app.ronbets.com',  // Add your custom domain here
    ],
    proxy: {
      '/api': {
        target: 'https://flask-backend.ronbets.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
