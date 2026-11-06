// Logo engine: outlines text from the display face with opentype.js (never live text), builds every version from the
// brand's geometries, and draws the slot frame for the slot edition. The drawing itself is the brand's:
// brands/<slug>/logo.js, reached through loaders.logoPlugin(slug). A brand without one gets a plain outlined wordmark
// in the display face and a one-letter monogram.
import { esc } from './brand.js';

// Path data from opentype.js commands. Its own toPathData writes NaN for some float offsets (e.g. x = 175.60000000000002), which silently drops every later glyph.
const num = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
export function pathData(p) {
  return p.commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'C' ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}` : c.type === 'Q' ? `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}` : `${c.type}${num(c.x)} ${num(c.y)}`).join('');
}

// Lay out text glyph by glyph (opentype.js GSUB shaping fails on some Google fonts); returns path data on a baseline at y=0, y up negative.
export function outline(font, text, size, track) {
  let x = 0, prev = null; const d = []; let x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    const p = g.getPath(x, 0, size);
    const bb = p.getBoundingBox();
    if (p.commands.length) { x1 = Math.min(x1, bb.x1); x2 = Math.max(x2, bb.x2); y1 = Math.min(y1, bb.y1); y2 = Math.max(y2, bb.y2); }
    d.push(pathData(p));
    x += g.advanceWidth * size / font.unitsPerEm + track * size;
    prev = g;
  }
  return { d: d.join(' '), x1, x2, y1, y2 };
}
// Cap height in px at a size: the font's own value, else measured from an H.
export function capHeight(font, size) {
  const c = font.tables.os2 && font.tables.os2.sCapHeight;
  return c ? (c / font.unitsPerEm) * size : -outline(font, 'H', size, 0).y1;
}

// The fallback: the brand name outlined in the display face, and its first letter as the symbol.
function plainLogo({ brand, font, outline: ol, capHeight: ch }) {
  const size = 100, track = -0.01, word = (brand.logo && brand.logo.showcase && brand.logo.showcase.wordmark) || brand.name;
  const cap = ch(font, size);
  const part = (o) => ({ w: o.x2 - o.x1, h: o.y2 - o.y1, parts: [{ d: o.d, role: 'name', tf: `translate(${(-o.x1).toFixed(2)} ${(-o.y1).toFixed(2)})` }] });
  const primary = part(ol(font, word, size, track));
  const symbol = part(ol(font, [...word][0], size, 0));
  const move = (parts, dx, dy, sc) => parts.map((p) => ({ role: p.role, d: p.d, tf: `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${sc}) ${p.tf}`.trim() }));
  const sc = 1.6, sgap = cap;
  const horizontal = { w: symbol.w * sc + sgap + primary.w, h: Math.max(symbol.h * sc, primary.h), parts: [] };
  horizontal.parts = [...move(symbol.parts, 0, (horizontal.h - symbol.h * sc) / 2, sc), ...move(primary.parts, symbol.w * sc + sgap, (horizontal.h - primary.h) / 2, 1)];
  const stacked = { w: Math.max(symbol.w * sc, primary.w), h: symbol.h * sc + sgap + primary.h, parts: [...move(symbol.parts, 0, 0, sc), ...move(primary.parts, 0, symbol.h * sc + sgap, 1)] };
  return { primary, horizontal, stacked, symbol, clearUnit: cap, roles: { name: 'name' }, geo: { cap } };
}

export function makeLogo(ctx) {
  const B = ctx.brand, S = (B.logo && B.logo.showcase) || {};
  // the wordmark is outlined in the display face at its logo weight (fonts.display.logoWeight, else the first listed), upright
  const logoFace = ctx.faces.find((x) => x.role === 'display' && x.style !== 'italic' && x.weight === ctx.weights.logo) || ctx.faces.find((x) => x.role === 'display');
  const font = ctx.loadFont(logoFace.stem);
  const plugin = ctx.loaders.logoPlugin(ctx.slug);
  if (plugin && typeof plugin !== 'function') throw new Error(`the logo plugin for ${ctx.slug} must be a function`);
  const made = (plugin || plainLogo)({ brand: B, faces: ctx.faces, font, loadFont: ctx.loadFont, outline, capHeight, edition: ctx.edition });
  const { primary, horizontal, stacked, symbol, clearUnit } = made;
  for (const [k, g] of Object.entries({ primary, horizontal, stacked, symbol })) if (!g || !(g.w > 0) || !(g.h > 0) || !Array.isArray(g.parts)) throw new Error(`logo plugin for ${ctx.slug}: ${k} must be { w, h, parts: [{ d, role, tf }] }`);
  if (!(clearUnit > 0)) throw new Error(`logo plugin for ${ctx.slug}: clearUnit must be a positive number`);
  const geos = { colour: primary, 'mono-dark': primary, 'mono-light': primary, reversed: primary, horizontal, stacked, symbol };
  const labels = { colour: 'Full colour', 'mono-dark': 'Mono dark', 'mono-light': 'Mono light', reversed: 'Reversed', horizontal: 'Horizontal', stacked: 'Stacked', symbol: 'Symbol' };
  const colourwayOf = (id) => (['colour', 'mono-dark', 'mono-light', 'reversed'].includes(id) ? id : 'colour');
  // a part's colour: the plugin's role map names a colourway key (or gives a function); a role it does not map takes the name colour
  const roleMap = made.roles || {};
  const fillOf = (role, cw, cwName) => { const r = roleMap[role]; const v = typeof r === 'function' ? r(cw, cwName) : cw[r || role]; return v || cw.name; };

  const pad = 0;
  function svg(id, { colourway, width, height, title = `${B.name} logo`, fill } = {}) {
    const g = geos[id]; const cwName = colourway || colourwayOf(id); const cw = B.logo.colourways[cwName];
    if (!cw) throw new Error(`the brand's logo.colourways has no "${cwName}"`);
    const vb = `0 0 ${(g.w + pad * 2).toFixed(2)} ${(g.h + pad * 2).toFixed(2)}`;
    const dims = width ? ` width="${width}" height="${(width * g.h / g.w).toFixed(2)}"` : height ? ` width="${(height * g.w / g.h).toFixed(2)}" height="${height}"` : '';
    const body = g.parts.map((p) => `<path d="${p.d}" fill="${fill || fillOf(p.role, cw, cwName)}"${p.tf ? ` transform="${p.tf}"` : ''}/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${dims} role="img" aria-label="${esc(title)}">${body}</svg>`;
  }
  // the slot frame: same proportion as the primary logo, labelled, never a logo
  // the label weight is the chrome face weight nearest 400 (a chrome face loaded at one weight, say 500, must not be asked for 400)
  const chromeWs = ((ctx.theme && ctx.theme.chrome && ctx.theme.chrome.faces) || []).map((f) => f.weight);
  const slotWeight = chromeWs.length ? chromeWs.reduce((b, w) => (Math.abs(w - 400) < Math.abs(b - 400) ? w : b)) : 400;
  function slotHtml({ width, color = 'currentColor', label = 'Your logo goes here' }) {
    const h = width * primary.h / primary.w;
    return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${width}px;height:${h.toFixed(1)}px;box-sizing:border-box;border:1.5px dashed ${color};color:${color};display:flex;align-items:center;justify-content:center;font:${slotWeight} ${Math.max(11, Math.min(13, width / 14))}px/1.2 var(--chrome, var(--ff-body, sans-serif));text-align:center">${esc(label)}</div>`;
  }
  const slotSvgFile = () => {
    const w = 900, h = w * primary.h / primary.w, ink = ctx.roles.light.quiet;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" role="img" aria-label="Logo slot"><rect x="1.5" y="1.5" width="${w - 3}" height="${(h - 3).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="14 10"/><text x="${w / 2}" y="${(h / 2 + 8).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="22" fill="${ink}">Your logo goes here. Proportion ${primary.w.toFixed(0)} : ${primary.h.toFixed(0)}.</text></svg>`;
  };

  const logo = {
    // measurements for themes: width/height/aspect of the primary logo, the clear-space unit (also as cap), plus anything the plugin adds
    geo: { ...(made.geo || {}), unit: clearUnit, cap: (made.geo && made.geo.cap) || clearUnit, aspect: primary.w / primary.h, height: primary.h, width: primary.w, symbolAspect: symbol.w / symbol.h },
    versions: Object.keys(geos), labels, geos, svg, slotSvgFile, colourwayOf,
    // markup for a page: the logo in the showcase edition, the slot frame in the slot edition
    html(id, { width = 200, colourway, color, label } = {}) {
      if (ctx.edition === 'slot') { const g = geos[id]; return slotHtml({ width, color, label }).replace(/height:[\d.]+px/, `height:${(width * g.h / g.w).toFixed(1)}px`); }
      return svg(id, { colourway, width });
    },
    // the logo drawn as a flat-colour block for misuse examples (showcase) or the slot (slot edition)
    forMisuse(width, { fill } = {}) {
      if (ctx.edition === 'slot') return slotHtml({ width, color: fill || 'currentColor' });
      return svg('colour', { width, fill });
    },
    clearShare: Math.round((clearUnit / primary.h) * 100),
    minSize: { screenPx: S.minScreenPx || 80, printMm: S.minPrintMm || 20, screenH: Math.round((S.minScreenPx || 80) * primary.h / primary.w), printH: +((S.minPrintMm || 20) * primary.h / primary.w).toFixed(1) },
  };
  return logo;
}
