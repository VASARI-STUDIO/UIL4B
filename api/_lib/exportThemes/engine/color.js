// Colour maths: hex, sRGB, OKLCH, WCAG contrast, ramps.
export const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const l2s = (c) => { c = Math.max(0, Math.min(1, c)); return (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255; };
export const luminance = (hex) => { const [r, g, b] = hexToRgb(hex).map(s2l); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const ratio = (a, b) => { const la = luminance(a), lb = luminance(b); const [hi, lo] = la > lb ? [la, lb] : [lb, la]; return (hi + 0.05) / (lo + 0.05); };
// One decimal, rounded; a ratio just under a threshold is never rounded up to it.
export const fmt = (n) => { let v = Math.round(n * 10) / 10; for (const t of [3, 4.5, 7]) if (n < t && v >= t) v = Math.floor(n * 10) / 10; return v.toFixed(1); };

export function toOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(s2l);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb); let H = (Math.atan2(bb, a) * 180) / Math.PI; if (H < 0) H += 360;
  return { L, C, H };
}
export function fromOklch(L, C, H) {
  for (;;) {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4) || C < 1e-4) return rgbToHex(rgb.map(l2s));
    C -= 0.001;
  }
}
export const oklchString = (hex) => { const { L, C, H } = toOklch(hex); return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${C < 0.002 ? 0 : H.toFixed(1)})`; };
export const rgbString = (hex) => { const [r, g, b] = hexToRgb(hex); return `R${r} G${g} B${b}`; };
// CMYK as the brand supplies it ([c, m, y, k], 0 to 100), never worked out from the hex. null when the colour carries none.
export const cmykParts = (c) => (c && Array.isArray(c.cmyk) && c.cmyk.length === 4 ? c.cmyk.map(String) : null);
export const cmykOf = (c) => { const p = cmykParts(c); return p ? `C ${p[0]} M ${p[1]} Y ${p[2]} K ${p[3]}` : null; };

// A 10-step ramp (50..900) holding the base colour's hue; chroma follows the base but is capped on the light steps.
// The base sits at the step whose lightness is nearest its own (a near-white base lands at 50, a near-black one at 900),
// so the ramp always runs light to dark. rampBase() names that step.
const RAMP_L = { 50: 0.97, 100: 0.93, 200: 0.87, 300: 0.8, 400: 0.73, 500: 0.66, 600: 0.6, 700: 0.52, 800: 0.44, 900: 0.36 };
export function rampBase(hex) {
  const { L } = toOklch(hex);
  return +Object.keys(RAMP_L).reduce((best, k) => (Math.abs(RAMP_L[k] - L) < Math.abs(RAMP_L[best] - L) ? k : best), '500');
}
export function ramp(hex) {
  const { C, H } = toOklch(hex);
  const cap = { 50: 0.025, 100: 0.05, 200: 0.09, 300: 0.14, 400: 0.19 };
  const base = rampBase(hex);
  const out = {};
  for (const k of Object.keys(RAMP_L).map(Number)) out[k] = k === base ? hex.toUpperCase() : fromOklch(RAMP_L[k], Math.min(C, cap[k] ?? C), H);
  return out;
}
// Mix toward white (t>0) or toward ink in OKLCH lightness; used for tints.
export const tint = (hex, L2, Cmax) => { const { C, H } = toOklch(hex); return fromOklch(L2, Math.min(C, Cmax ?? C), H); };

// A text pair must reach 4.5, or 3 when large (24 px, or 18.66 px bold). Throws on a miss.
export function pair(fg, bg, { size = 16, weight = 400, what = '' } = {}) {
  const r = ratio(fg, bg);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  const need = large ? 3 : 4.5;
  if (r < need) throw new Error(`Contrast ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${need}:1 (${size}px/${weight}) ${what}`);
  return r;
}
export const isLarge = (size, weight = 400) => size >= 24 || (size >= 18.66 && weight >= 700);
