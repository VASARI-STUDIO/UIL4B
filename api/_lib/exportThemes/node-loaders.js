// The reads the export engine makes, for a Node server: font files from ./fonts, icons from ./icons.js, logo drawings
// from the brand registry. This is the only file in the engine that touches the disk.
//   fontFile(stem, 'woff2' | 'ttf') -> Buffer (Uint8Array)
//   icon(name)                      -> the icon's inner svg markup
//   logoPlugin(slug)                -> the brand's logo function, or undefined
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.js';
import { BRANDS } from './brands/index.js';

const FONT_DIR = fileURLToPath(new URL('./fonts/', import.meta.url));
const cache = new Map();

export const nodeLoaders = {
  fontFile(stem, ext) {
    if (!/^[A-Za-z0-9_-]+$/.test(stem) || (ext !== 'woff2' && ext !== 'ttf')) throw new Error(`fontFile: bad request ${stem}.${ext}`);
    const name = `${stem}.${ext}`;
    if (!cache.has(name)) {
      try { cache.set(name, fs.readFileSync(FONT_DIR + name)); } catch { throw new Error(`fontFile: no file ${name} in fonts/`); }
    }
    return cache.get(name);
  },
  icon(name) {
    const inner = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : undefined;
    if (inner === undefined) throw new Error(`icon: no icon "${name}" in icons.js`);
    return inner;
  },
  logoPlugin(slug) {
    return Object.prototype.hasOwnProperty.call(BRANDS, slug) ? BRANDS[slug].logo : undefined;
  },
};

export default nodeLoaders;
