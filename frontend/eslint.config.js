import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 'bc.game' and 'bc images' are saved copies of the live site kept for reference —
  // linting their minified bundles produces thousands of meaningless errors.
  //
  // 'backend' and 'backend copy' are SEPARATE PROJECTS that happen to sit inside this working
  // tree: thirteen package.json files between them, their own dependencies, and at least one
  // eslintrc of their own. This config is the front end's — browser globals, React hooks, React
  // refresh — so running it over Node service code reports ~8,700 errors that mean nothing, and
  // it would also be linting whatever those trees vendor. Each keeps its own setup; if they are
  // meant to be linted from here, they want their own flat-config block scoped to their files
  // rather than this one. Same rule the note at the foot of CLAUDE.md states for the mirrors:
  // anything that walks the project needs the exclusions.
  globalIgnores(['dist', '.next', 'bc.game', 'bc images', 'backend', 'backend copy']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // `process.env.NEXT_PUBLIC_*` is inlined by Next at build time.
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
