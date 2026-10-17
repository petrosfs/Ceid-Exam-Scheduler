/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/**
 * Writes dist/sw.js: a small service worker that pre-caches every built file (and the public files),
 * so the app opens and works offline after the first visit. The cache name changes with each build.
 */
function serviceWorker(): Plugin {
  let files: string[] = [];
  return {
    name: 'ceid-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const publicFiles = fs.readdirSync(path.resolve(__dirname, 'public'));
      files = ['./', ...Object.keys(bundle).filter(f => !f.endsWith('.map')), ...publicFiles].map(f => (f === './' ? f : `./${f}`));
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const template = fs.readFileSync(path.resolve(__dirname, 'sw-template.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)),
      });
    },
  };
}

export default defineConfig({
  // Relative base so the build works under any path (e.g. GitHub Pages /<repo>/).
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), serviceWorker()],
  build: {
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
