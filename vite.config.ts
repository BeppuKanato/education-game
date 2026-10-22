import { defineConfig } from 'vitest/config';
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { manualChunks: (id: string) => id.includes('/node_modules/phaser/') ? 'phaser' : undefined } },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
