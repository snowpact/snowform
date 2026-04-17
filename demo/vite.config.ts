import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  base: '/snowform/',
  build: {
    outDir: resolve(__dirname, '../demo-dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@snowpact/snowform': resolve(__dirname, '../src'),
    },
  },
});
