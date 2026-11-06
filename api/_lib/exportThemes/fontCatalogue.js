// Which font families a brand may name, and which bundled face stands in for a family the bundle does not hold.
// A family is allowed when it is one of the sample brands' bundled families, in the app's bundled font list
// (the Font Gallery's offline catalogue), or in the Google Fonts family table the app ships for licences.
import { FALLBACK_FONTS } from '../../../src/data/fallbackFonts.js';
import licences from '../../../src/data/fontLicences.json' with { type: 'json' };
import { BRANDS } from './brands/index.js';

// The table is keyed by the lower-cased family with everything but letters and digits removed.
export const familyKey = (family) => String(family).toLowerCase().split('').filter((ch) => /[a-z0-9]/.test(ch)).join('');

const BUNDLED = new Set(Object.values(BRANDS).flatMap((b) => Object.values(b.data.fonts).map((f) => f.family)));
const OFFLINE = new Map(FALLBACK_FONTS.map((f) => [f.family, f]));

export const isBundledFamily = (family) => BUNDLED.has(family);
export const catalogueEntry = (family) => OFFLINE.get(family) || null;
export const isKnownFamily = (family) => typeof family === 'string' && (BUNDLED.has(family) || OFFLINE.has(family) || Object.prototype.hasOwnProperty.call(licences, familyKey(family)));

// Families whose .ttf files are in fonts/ at every weight listed: the engine measures and outlines from these.
export const TTF_FAMILIES = {
  'Barlow': { file: 'Barlow', weights: [400, 500, 600] },
  'Commissioner': { file: 'Commissioner', weights: [400, 500, 600, 800] },
  'Barlow Condensed': { file: 'BarlowCondensed', weights: [600, 700] },
  'Unbounded': { file: 'Unbounded', weights: [600, 700] },
  'Young Serif': { file: 'YoungSerif', weights: [400] },
  'Goudy Bookletter 1911': { file: 'GoudyBookletter1911', weights: [400] },
  'IBM Plex Mono': { file: 'IBMPlexMono', weights: [400] },
};

// The stand-in for a family that has no .ttf here, chosen by its Google Fonts category and the role it plays.
// Measuring and the outlined logo use the stand-in's metrics; the exported CSS still names the user's own family.
//   sans-serif             Commissioner (four weights, neutral grotesque)
//   serif                  Young Serif for headings, Goudy Bookletter 1911 for body (the only serif .ttf files held)
//   monospace              IBM Plex Mono
//   display, handwriting   Unbounded for headings; body text takes the sans-serif stand-in
// A missing or unrecognised category counts as sans-serif.
export const STAND_IN = {
  'sans-serif': { heading: 'Commissioner', body: 'Commissioner' },
  serif: { heading: 'Young Serif', body: 'Goudy Bookletter 1911' },
  monospace: { heading: 'IBM Plex Mono', body: 'IBM Plex Mono' },
  display: { heading: 'Unbounded', body: 'Commissioner' },
  handwriting: { heading: 'Unbounded', body: 'Commissioner' },
};
export const CATEGORIES = Object.keys(STAND_IN);
export const standInFor = (category, role) => (STAND_IN[category] || STAND_IN['sans-serif'])[role];
