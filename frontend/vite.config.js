import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// PDF.js requests decoder files by their original names. Serve the installed
// package's assets locally in development and include the same files in builds.
function pdfDecoders() {
  const require = createRequire(import.meta.url)
  const directory = join(dirname(require.resolve('pdfjs-dist/package.json')), 'wasm')
  const files = readdirSync(directory)
  return {
    name: 'pdf-decoder-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0] || ''
        if (!pathname.startsWith('/pdfjs/wasm/')) return next()
        const name = pathname.slice('/pdfjs/wasm/'.length)
        if (!files.includes(name)) return next()
        response.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.js') ? 'text/javascript' : 'text/plain')
        response.end(readFileSync(join(directory, name)))
      })
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({ type: 'asset', fileName: `pdfjs/wasm/${name}`, source: readFileSync(join(directory, name)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pdfDecoders()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
