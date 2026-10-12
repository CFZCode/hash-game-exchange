/**
 * Turbopack loader for src/**\/*.{js,jsx}: `import x from './a.png'` -> `import x from './a.png?url'`.
 *
 * Under Vite an image import IS its URL string. Next hands back a StaticImageData object instead,
 * and the only Turbopack setting that turns that into a URL (`type: 'asset'`) also applies to the
 * same file when a stylesheet reaches it through `url()`, which then stops being rewritten and
 * 404s. So the JS imports are told apart by a query — added here, at build time, so no source
 * file changes — and next.config.mjs gives only `?url` images the `asset` type. Stylesheets keep
 * Next's own url() handling. `?raw` and any other query are left alone.
 */
const IMAGE_IMPORT = /(\bimport\s+[\w$]+\s+from\s+)(['"])([^'"?]+\.(?:png|jpe?g|avif|webp|gif|svg))\2/g;

module.exports = function assetUrlLoader(source) {
  return source.replace(IMAGE_IMPORT, (_m, head, q, spec) => `${head}${q}${spec}?url${q}`);
};
