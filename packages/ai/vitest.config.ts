import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one database; run files sequentially so the
    // harness's DROP SCHEMA / CREATE SCHEMA setup doesn't race across files.
    fileParallelism: false,
  },
});
