import { defineConfig } from 'vitest/config';

/* Unit tests for the pure exchange logic (src/utils/exchange). Scoped to src/ so vitest never
   walks the bc.game mirror or the backend trees beside this app. */
export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
});
