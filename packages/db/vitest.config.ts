import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration files share ONE database and the harness resets it with
    // `DROP SCHEMA public CASCADE` in beforeAll. Run test files one at a time:
    // in parallel they race, and the loser fails with `schema "public" already
    // exists` — or worse, passes against a schema another file is dropping.
    //
    // Unit tests don't need this, but the cost is a few hundred ms and the
    // alternative (a database per file) is not worth the machinery.
    fileParallelism: false,
  },
});
