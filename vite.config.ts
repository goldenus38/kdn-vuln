import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 프로젝트 페이지 경로 (goldenus38.github.io/kdn-vuln/)
  base: command === 'build' ? '/kdn-vuln/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5175
  }
}))
