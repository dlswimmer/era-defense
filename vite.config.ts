import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Build info shown on the Options screen, so it's easy to tell when the live game updated.
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev';
  }
}
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const commit = gitCommit();
const date = new Date().toISOString();

export default defineConfig({
  // Relative base so the build works both locally and under GitHub Pages (/era-defense/).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(date),
  },
  plugins: [
    {
      // version.json lets an installed copy of the game ask whether a newer build is live
      // (src/ui/update.ts).
      name: 'version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ commit, date, version: pkg.version }),
        });
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
