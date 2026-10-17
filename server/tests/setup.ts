import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Subphase 2K, Phase 7 — test isolation from production data.
 *
 * The JSON store defaults to `server/db/data.json`, a generated demo store that is
 * part of the project. Tests must never read or write that file: doing so both
 * pollutes real demo data (past runs left stray users behind) and makes parallel
 * vitest workers clobber one another, since they would all share a single file.
 *
 * Each worker therefore points the store at its own throwaway file under the OS
 * temp directory. The path is resolved only once per worker (the store singleton
 * caches it at import time), so stale leftovers are cleared before the first load
 * and later `setupFiles` runs in the same worker leave the file alone.
 */
if (!process.env.SKILLFORGE_DB_FILE) {
  const workerId = process.env.VITEST_WORKER_ID ?? String(process.pid);
  const dir = path.join(os.tmpdir(), 'skillforge-tests');
  const file = path.join(dir, `data-${workerId}.json`);

  fs.mkdirSync(dir, { recursive: true });
  fs.rmSync(file, { force: true });

  process.env.SKILLFORGE_DB_FILE = file;
}
