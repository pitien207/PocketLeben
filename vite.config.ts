import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants as zlib, gzipSync } from 'node:zlib'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Static files in public/ that the service worker should also keep offline. */
const PUBLIC_PRECACHE = ['manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']

/**
 * PWA (M9): writes dist/sw.js from pwa/sw-template.js with the list of built files,
 * so the whole game works offline after the first visit. No extra dependency needed.
 */
function serviceWorker(): Plugin {
  return {
    name: 'pocket-leben-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html' && !(/\.(ogg|mp3|m4a)$/.test(f) && !/sfx-/.test(f)))
      const precache = ['./', ...[...files, ...PUBLIC_PRECACHE].map((f) => `./${f}`)]
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 10)
      const source = readFileSync('pwa/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

/**
 * Bandwidth: write .br and .gz copies of every text file next to it at build time. The Node server
 * (server/index.mjs) sends the smallest one the browser accepts — e.g. the physics engine goes
 * from 2.3 MB to ~0.7 MB. Compressing once here costs nothing at request time.
 */
function precompress(): Plugin {
  return {
    name: 'pocket-leben-precompress',
    apply: 'build',
    writeBundle(options, bundle) {
      const dir = options.dir ?? 'dist'
      for (const name of Object.keys(bundle)) {
        if (!/.(js|mjs|css|html|svg|json|webmanifest|wasm|txt|bin)$/.test(name)) continue
        const file = join(dir, name)
        if (statSync(file).size < 1024) continue
        const data = readFileSync(file)
        writeFileSync(`${file}.br`, brotliCompressSync(data, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_SIZE_HINT]: data.length } }))
        writeFileSync(`${file}.gz`, gzipSync(data, { level: 9 }))
      }
    },
  }
}

/** Long-lived vendor chunks: game updates don't force re-downloading three.js or the physics engine. */
const VENDOR_CHUNKS: [string, RegExp][] = [
  // (+ Vite's tiny preload helper, so the title screen never depends on the big chunks)
  ['react', /node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\/|vite\/preload-helper/],
  ['three', /node_modules\/(three|three-stdlib|three-mesh-bvh|@react-three\/(fiber|drei)|@monogrid|troika-[^/]+|camera-controls|maath|meshline|stats-gl|suspend-react|its-fine)\//],
  ['physics', /node_modules\/(@dimforge|@react-three\/rapier)\//],
]

/** Accounts + multiplayer server (server/index.mjs). */
const SERVER = process.env.VH_SERVER ?? 'http://localhost:8787'
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker(), precompress()],
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  // host: true exposes the dev server on your LAN so you can open it on a phone.
  // /api and /ws go to the game server (npm run server). VH_SERVER overrides the address.
  server: {
    host: true,
    proxy: {
      '/api': SERVER,
      '/ws': { target: SERVER.replace(/^http/, 'ws'), ws: true },
    },
  },
  preview: { host: true },
  build: {
    // The physics engine ships its WebAssembly inlined (~2 MB); that's expected.
    chunkSizeWarningLimit: 2400,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // A group also pulls in its dependencies, so the more basic libraries claim their modules first.
          groups: VENDOR_CHUNKS.map(([name, test], i) => ({ name, test, priority: VENDOR_CHUNKS.length - i })),
        },
      },
    },
  },
})
