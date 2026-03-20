import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: 'esm',
  outDir: 'dist',
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
