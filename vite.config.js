import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

let commit = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch {
  /* git absent (CI tarball build) — 牌记 degrades, never breaks the build */
}

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { app: 'index.html', design: 'design.html' } } },
  define: {
    /* 牌记 — every distributed build carries version + commit + date
       (刊例第六条); consumed by Settings 关于区. */
    __MNEMOS_BUILD__: JSON.stringify({
      version: pkg.version,
      commit,
      builtAt: new Date().toISOString().slice(0, 10),
    }),
  },
})
