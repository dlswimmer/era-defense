import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works both locally and under GitHub Pages (/era-defense/).
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
