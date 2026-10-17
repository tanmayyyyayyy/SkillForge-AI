import { defineConfig } from 'vitest/config';

/**
 * Subphase 2K test isolation.
 *
 * `setupFiles` points the JSON store at a throwaway per-worker temp file so the
 * test run never reads or writes the real `server/db/data.json`, and parallel
 * workers cannot collide with each other over one shared file.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./server/tests/setup.ts']
  }
});
