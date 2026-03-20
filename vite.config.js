import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages project deployments live under `/repo-name/`, not `/`.
  // Workflow sets `VITE_BASE=/${{ github.event.repository.name }}/`.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
})
