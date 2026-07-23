import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use relative asset paths for the production build so the app works when
  // served from a subpath (e.g. GitHub Pages: /<repo>/). Dev keeps root '/'.
  base: command === 'build' ? './' : '/',
  server: {
    host: true,
    port: 5173,
  },
}))
