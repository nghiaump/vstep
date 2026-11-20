/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 3500 }, // the lazy-loaded exam data chunk is ~3.2 MB of JSON
  test: { include: ['tests/**/*.test.ts'] },
});
