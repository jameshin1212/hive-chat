import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  entry: ['src/index.tsx'],
  format: 'esm',
  outDir: 'dist',
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  deps: {
    neverBundle: [
      'hyperswarm',
      'b4a',
      'hypercore-crypto',
      'sodium-native',
      'sodium-universal',
      'hyperdht',
      'dht-rpc',
      '@hyperswarm/dht',
    ],
  },
})
