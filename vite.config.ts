import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills(), wasm(), topLevelAwait()],
  resolve: {
    dedupe: [
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/onchain-runtime-v3',
    ],
  },
});