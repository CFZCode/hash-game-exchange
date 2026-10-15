// The PNGs of the parker567 wordmark and mark, transparent, at 1x and 2x.
//   node branding/render-png.mjs          (uses sharp from frontend/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.join(here, '../frontend/package.json'))('sharp');

const jobs = [
  ['parker567-logo.svg', 'parker567-logo.png', 288, 64],
  ['parker567-logo.svg', 'parker567-logo@2x.png', 576, 128],
  ['parker567-mark.svg', 'parker567-mark.png', 128, 128],
  ['parker567-mark.svg', 'parker567-mark@2x.png', 256, 256],
];

for (const [src, out, w, h] of jobs) {
  const density = 72 * (w / (src.includes('logo') ? 288 : 128));
  await sharp(path.join(here, src), { density })
    .resize(w, h)
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(here, out));
  console.log(out, `${w}x${h}`);
}
