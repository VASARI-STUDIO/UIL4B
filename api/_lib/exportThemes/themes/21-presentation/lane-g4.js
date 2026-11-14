// Lane g4 for theme 21 (imagery and layout): photo-direction, shot-list, imagery-rules, grid. Layouts is one of 21's round 1 pages and stays as it is.
// The pages speak the slide language of guidelines-r1.js: fields in the brand's role colours meeting at straight edges, one big thing a slide,
// everything else at 12 to 15 px, and the one running head at y 28. Nothing is laid over a photograph; type that cannot sit on a photo sits on a field
// beside it. A brand with no photographs gets photo slots on the panel colour, each carrying its own brief, so the page is still a designed page.
// Colours come by role, never by id. Body text wraps in the browser (it has to, because in the slot edition the brand's words become placeholder
// frames of their own height); only display lines are fitted with the brand's font files. Styles: g4- classes below, plus the r- classes of css-r1.js.
import { plateImg } from '../../engine/plate.js';
import { A } from './helpers.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { icon } from '../../engine/components.js';
import { applyPlaceholders } from '../../engine/placeholders.js';

// ---- the slot edition: the brand's words become placeholders ---------------------------------------------------------------------
// With the engine's placeholders on (ctx.placeholders) the lane uses ctx as it is. For a slot built without them this lane makes its own placeholder view of the brand: a child of ctx with a copied brand,
// copied colours and copied pairs, so the shared ctx (and every other lane's pages) keep the real words. The engine's file writer swaps the
// placeholder strings for descriptor frames when the page is written.
const slotViews = new WeakMap();
function view(ctx) {
  if (ctx.edition !== 'slot' || ctx.placeholders) return ctx; // with the engine's placeholders on, ctx already holds the sentinels
  if (slotViews.has(ctx)) return slotViews.get(ctx);
  const c = Object.create(ctx);
  c.brand = structuredClone(ctx.brand);
  c.colours = ctx.colours.map((k) => ({ ...k }));
  c.pairs = (ctx.pairs || []).map((p) => ({ ...p }));
  applyPlaceholders(c);
  slotViews.set(ctx, c);
  return c;
}
const isPh = (s) => typeof s === 'string' && s.includes('');

// ---- measuring (display lines only) --------------------------------------------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
// the largest display size from hi down to lo at which one line fits maxW
const fitOne = (ctx, text, hi, lo, maxW, track = -0.01) => { for (let s = hi; s > lo; s--) if (textW(ctx, 'display', dispW(ctx), text, s, track) <= maxW) return s; return lo; };
const px = (n) => +(+n).toFixed(2);
const sentences = (s) => (s || '').split(/(?<=[.!?]) /).map((x) => x.trim()).filter(Boolean);

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
// running text a step below the ink on a ground: the soft text where it reads, else the dark soft text on a dark ground, else the ink
const softOn = (ctx, hex) => {
  const ink = inkOn(ctx, hex);
  if (ink === L(ctx).text) return ctx.ratio(L(ctx).textSoft, hex) >= 4.5 ? L(ctx).textSoft : ink;
  return ctx.ratio(ctx.roles.dark.textSoft, hex) >= 4.5 ? ctx.roles.dark.textSoft : ink;
};

const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a${cls ? ' ' + cls : ''}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const field = (x, y, w, h, hex) => box(x, y, w, h, `background:${hex}`);

// the one running head: section number and title left, document name and a three-digit folio right, each in the chrome colour of the ground under it
function head(ctx, id, { left, right } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(p.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}
const page = (id, inner, bg) => `<section class="pg pg--r g4" data-page="${id}" style="background:${bg}">${inner}</section>`;

// the 12-column grid of the slide (margin 56, gutter 16): the brand's own layout when its page is this slide, else the slide's own grid
function deckGrid(ctx) {
  const b = ctx.brand.layout || {}, W = ctx.size.w, H = ctx.size.h;
  const own = b.page && b.page.w === W && b.page.h === H;
  const g = own ? { margin: b.margin, gutter: b.gutter, columns: b.columns, base: b.base || 4 } : { margin: 56, gutter: 16, columns: b.columns || 12, base: b.base || 4 };
  const cw = (W - 2 * g.margin - (g.columns - 1) * g.gutter) / g.columns;
  return { ...g, own, W, H, cw, col: (n) => g.margin + n * (cw + g.gutter), span: (k) => k * cw + (k - 1) * g.gutter };
}

// ---- photographs -----------------------------------------------------------------------------------------------------------------
function jpegSize() { throw new Error('theme 21: photograph files are not read by the server export'); }
// the shot's safe box: its crop where the brand gives one, else the whole frame
const safeBox = (ctx, s) => { const n = jpegSize(); return { n, c: s.crop || { x: 0, y: 0, w: n.w, h: n.h } }; };
// a photograph cropped from the centre of its safe box to fill a w x h box, with nothing laid over it
function photo(ctx, s, x, y, w, h) {
  const { n, c } = safeBox(ctx, s);
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) * (s.focus && s.focus.x != null ? s.focus.x / 100 : 0.5), oy = (h - c.h * k) / 2; // focus.x: where across the safe box a narrower frame sits (0 left, 100 right)
  return box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt)}`, `position:absolute;display:block;max-width:none;width:${px(n.w * k)}px;height:${px(n.h * k)}px;left:${px(ox - c.x * k)}px;top:${px(oy - c.y * k)}px`)}`);
}
// photographs the brand shot of its riders, rooms or work: scenes (a blank poster panel waiting for art) are for mockups, not for showing the look
const looks = (ctx) => ctx.brand.imagery.shots.filter((s) => s.photo && !(s.use || []).includes('scene'));
// a shot's brief split into its name and the rest: "The handover: hands passing..." or "The long room empty before opening. Shot from..."
function briefParts(t) {
  if (!t || isPh(t)) return { name: '', rest: t || '' };
  const colon = t.indexOf(': '), stop = t.search(/[.!?] /);
  const at = colon > 0 && (stop < 0 || colon < stop) ? colon : stop;
  if (at < 0) return { name: '', rest: t };
  const rest = t.slice(at + 2).trim();
  return { name: t.slice(0, at), rest: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

// four corner marks of a camera frame, drawn in a box: how a photo slot reads as a frame waiting for its photograph
const frameMarks = (w, h, color, inset = 16, len = 16) => [[inset, inset, 'top', 'left'], [w - inset - len, inset, 'top', 'right'], [inset, h - inset - len, 'bottom', 'left'], [w - inset - len, h - inset - len, 'bottom', 'right']]
  .map(([x, y, a, b]) => box(x, y, len, len, `border-${a}:1px solid ${color};border-${b}:1px solid ${color}`)).join('');

// ---- the logo, or in the slot edition a dashed frame at its proportion ----------------------------------------------------------
const colourwayOn = (ctx, hex) => { const e = Object.entries(ctx.brand.logo.colourways).filter(([, v]) => v.ground.toLowerCase() === hex.toLowerCase()); return (e.find(([k]) => !k.startsWith('mono')) || e[0] || [])[0]; };
function logo(ctx, id, width, colourway, ink) {
  const g = ctx.logo.geos[id], h = (width * g.h) / g.w;
  if (ctx.edition === 'slot') return `<div role="img" aria-label="Logo slot" style="width:${px(width)}px;height:${px(h)}px;box-sizing:border-box;border:1.5px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:500 12px/16px var(--body);white-space:nowrap">${h >= 20 ? 'Logo' : ''}</div>`;
  return ctx.logo.svg(id, { colourway, width });
}

export const guidelines = {
  // Photography: the brand's photograph is the slide, across the last seven columns from the head to the foot. The direction runs down the first
  // five: the line that says what the subject is, then the five settings (subject, light, crop, colour, people) as rows. With no photograph the
  // seven columns are a photo slot on the panel colour: the first shot's brief, set as the frame's caption, inside four camera corner marks.
  'photo-direction'(ctx0) {
    const ctx = view(ctx0), B = ctx.brand, D = B.imagery.direction, g = deckGrid(ctx), W = g.W, H = g.H, white = L(ctx).surface, ink = L(ctx).text;
    const px0 = g.col(5) - g.gutter, pw = W - px0, ph = H - 72;
    const s = looks(ctx).find((x) => (x.use || []).includes('poster')) || looks(ctx)[0];
    let right;
    if (s) right = photo(ctx, s, px0, 72, pw, ph);
    else {
      // the slot: the first shot's brief, its name large and the rest under it, at the foot of the frame
      const panel = L(ctx).sunken, sh = B.imagery.shots[0] || {}, bp = briefParts(sh.slot || D.subject), q = chromeOn(ctx, panel);
      right = field(px0, 72, pw, ph, panel) + box(px0, 72, pw, ph, '', frameMarks(pw, ph, q, 24, 20)) +
        box(px0 + 56, 72 + 56, pw - 112, 0, `color:${q}`, `<p class="r-t12 num">Photo slot, shot 1 of ${B.imagery.shots.length}</p>`) +
        box(px0 + 56, 0, pw - 112, 0, `top:auto;bottom:56px;color:${inkOn(ctx, panel)}`, `<div class="g4-stack">${bp.name ? `<h2 class="disp g4-t26">${A(bp.name)}</h2>` : ''}<p class="r-t15">${A(bp.rest)}</p></div>`);
    }
    // the subject's last sentence is the line; its other sentences stay in the subject row
    const subj = sentences(D.subject), many = !isPh(D.subject) && subj.length > 1;
    const line = many ? subj[subj.length - 1] : D.subject;
    const rows = Object.entries(D).map(([k, v]) => [ctx.cap(k), k === 'subject' ? (many ? subj.slice(0, -1).join(' ') : '') : v]).filter(([, v]) => v);
    const list = rows.map(([k, v]) => `<li class="g4-row" style="border-top:1px solid ${L(ctx).divider}"><p class="r-t12 r-w600" style="color:${ink}">${A(k)}</p><p class="r-t15" style="color:${softOn(ctx, white)}">${A(v)}</p></li>`).join('');
    const cw = px0 - 56 - 48;
    const left = box(56, 96, cw, 0, `color:${ink}`, `<p class="r-lead">${A(line)}</p>`) +
      box(56, 0, cw, 0, 'top:auto;bottom:40px', `<ul class="g4-list">${list}</ul>`);
    return page('photo-direction', left + right + head(ctx, 'photo-direction'), white);
  },

  // Shot list: every shot in the brief, in order, as one strip of frames meeting at straight edges. The photographs the brand has run across the top
  // at their own safe crops, edge to edge, captioned on the white under them; the shots still to be made follow as panel-colour frames, each carrying
  // its own brief. A brand with no photographs is a row of frames from the head to the foot, one per shot.
  'shot-list'(ctx0) {
    const ctx = view(ctx0), B = ctx.brand, W = ctx.size.w, H = ctx.size.h, white = L(ctx).surface, ink = L(ctx).text, quiet = chromeOn(ctx, white);
    const shots = B.imagery.shots, n = shots.length, panel = L(ctx).sunken, onPanel = inkOn(ctx, panel), qPanel = chromeOn(ctx, panel), gap = 2;
    const shot = shots.map((s, i) => ({ s, i })), taken = shot.filter((x) => x.s.photo), todo = shot.filter((x) => !x.s.photo);
    let out = '', top = 72;
    if (taken.length) {
      // the photographs at their safe crops, scaled to one height so they fill the width edge to edge
      const asp = taken.map((x) => { const { c } = safeBox(ctx, x.s); return c.w / c.h; });
      const rowH = Math.min(todo.length ? 300 : 520, (W - gap * (taken.length - 1)) / asp.reduce((a, b) => a + b, 0));
      const k = (W - gap * (taken.length - 1)) / asp.reduce((a, b) => a + b * rowH, 0);
      let x = 0;
      taken.forEach((t, j) => {
        const w = j === taken.length - 1 ? W - x : asp[j] * rowH * k, cx = j === 0 ? 56 : x + 16;
        out += photo(ctx, t.s, x, top, w, rowH) +
          box(cx, top + rowH + 16, Math.min(w - (cx - x) - 16, 360), 0, '', `<p class="r-t12 r-w600" style="color:${ink}"><span class="num g4-n">${t.i + 1}</span>${A(t.s.caption || t.s.alt)}</p>${t.s.generated ? '' : `<p class="r-t12" style="color:${quiet}">Photographed. Credit: ${A(t.s.credit)}</p>`}`);
        x += w + gap;
      });
      top += rowH + 16 + 32 + 24;
    }
    if (todo.length) {
      // the frames still to be shot: equal widths, the number at the top, the brief at the foot, the space between left for the photograph
      const fw = (W - gap * (todo.length - 1)) / todo.length, fh = H - top, pad = todo.length > 4 ? 24 : 32;
      todo.forEach((t, j) => {
        const x = j * (fw + gap), w = j === todo.length - 1 ? W - x : fw, bp = briefParts(t.s.slot), lx = j === 0 && pad < 56 ? 56 : x + pad, lw = x + w - pad - lx;
        out += field(x, top, w, fh, panel) +
          box(lx, top + (taken.length ? 24 : 56), lw, 0, `color:${qPanel}`, `<p class="r-t12 num">${t.i + 1} of ${n}. To be shot</p>`) +
          box(lx, 0, lw, 0, `top:auto;bottom:${pad + (taken.length ? 0 : 8)}px;color:${onPanel}`, `<div class="g4-stack">${bp.name ? `<h2 class="disp ${todo.length > 4 ? 'g4-t20' : 'g4-t26'}">${A(bp.name)}</h2>` : ''}<p class="${todo.length > 4 ? 'r-t12' : 'r-t15'}">${A(bp.rest)}</p></div>`);
      });
    }
    return page('shot-list', out + head(ctx, 'shot-list'), white);
  },

  // Imagery rules: two fields meeting at a straight edge. On White, each rule's "do" over its example: one of the brand's photographs, a photo slot
  // with its brief, or (for a rule about the logo) the logo on a flat brand colour. On the text colour under it, the matching "don't", in the same column,
  // so each pair reads top to bottom.
  'imagery-rules'(ctx0) {
    const ctx = view(ctx0), B = ctx.brand, R = B.imagery.rules, n = R.length, g = deckGrid(ctx), W = g.W, H = g.H;
    const white = L(ctx).surface, ink = L(ctx).text, dark = byRole(ctx, 'text').hex, onDark = inkOn(ctx, dark), act = byRole(ctx, 'action').hex, panel = L(ctx).sunken;
    // columns: the twelve split evenly when they divide, else equal shares of the measure
    const per = g.columns % n === 0 ? g.columns / n : 0, cw = per ? g.span(per) : (W - 2 * g.margin - (n - 1) * g.gutter) / n;
    const cx = (i) => (per ? g.col(i * per) : g.margin + i * (cw + g.gutter));
    const fy = 96, fh = Math.round(cw * 1.1), split = 568;
    const photos = looks(ctx).slice(), slots = B.imagery.shots.filter((s) => !s.photo);
    // in the real brand's words: a rule about the logo is shown with the logo (ctx0 keeps the real words, so the slot edition makes the same choice)
    const realRule = (i) => { const r = ctx0.brand.imagery.rules[i], rl = ctx0.real || String; return `${rl(r.do)} ${rl(r.dont)}`; };
    const aboutLogo = (i) => /\blogo\b/i.test(realRule(i));
    let out = field(0, split, W, H - split, dark);
    R.forEach((r, i) => {
      const x = cx(i);
      let ex;
      if (aboutLogo(i)) {
        // the ground is the brand colour the rule names ("a flat Wall"), so the tile matches its caption; a rule that names none ("a flat colour") gets the action colour
        const rule = realRule(i), named = B.colours.find((c) => new RegExp(`\\b${(ctx0.real || String)(c.name)}\\b`).test(rule));
        const cwy = (named && colourwayOn(ctx, named.hex)) || colourwayOn(ctx, act) || 'reversed', ground = B.logo.colourways[cwy].ground, lw = Math.min(cw - 64, 200);
        // a ground the same as the page gets a hairline so the tile still reads as a tile
        ex = box(x, fy, cw, fh, `background:${ground}${ground.toLowerCase() === white.toLowerCase() ? `;box-shadow:inset 0 0 0 1px ${L(ctx).divider}` : ''}`) + box(x + 32, fy + 32, lw, 0, '', logo(ctx, 'colour', lw, cwy, inkOn(ctx, ground)));
      } else if (photos.length) ex = photo(ctx, photos.shift(), x, fy, cw, fh);
      else {
        const s = slots.shift(), q = chromeOn(ctx, panel), idx = B.imagery.shots.indexOf(s), bp = briefParts(s && s.slot);
        ex = field(x, fy, cw, fh, panel) + box(x, fy, cw, fh, '', frameMarks(cw, fh, q, 12, 12)) +
          box(x + 24, fy + 24, cw - 48, 0, `color:${inkOn(ctx, panel)}`, `<p class="r-t15 r-w600">${A(bp.name || 'Photo slot')}</p>`) +
          box(x + 24, 0, cw - 48, 0, `top:auto;bottom:${H - fy - fh + 24}px;color:${q}`, `<p class="r-t12">Shot ${idx + 1}, brief on page ${String(ctx.pageNo('shot-list')).padStart(3, '0')}</p>`);
      }
      out += ex +
        box(x, fy + fh + 20, cw, 0, `color:${ink}`, `<p class="r-t12 r-w600 g4-key">${icon(ctx, 'check', 16)}Do</p><p class="r-t15">${A(r.do)}</p>`) +
        box(x, split + 32, cw, 0, `color:${onDark}`, `<p class="r-t12 r-w600 g4-key">${icon(ctx, 'x', 16)}Don’t</p><p class="r-t15" style="color:${softOn(ctx, dark)}">${A(r.dont)}</p>`);
    });
    return page('imagery-rules', out + head(ctx, 'imagery-rules'), white);
  },

  // The grid: drawn on this slide at full size. The columns rise from the foot as panel-colour fields, numbered, with the margin, a column and a gutter
  // measured over them; the slide's one line, the column count, is set across the first eight columns so it sits on the grid it names.
  grid(ctx0) {
    const ctx = view(ctx0), B = ctx.brand, g = deckGrid(ctx), W = g.W, H = g.H, white = L(ctx).surface, ink = L(ctx).text, panel = L(ctx).sunken;
    const quiet = chromeOn(ctx, white), qPanel = chromeOn(ctx, panel), soft = softOn(ctx, white), dw = dispW(ctx);
    const big = `${g.columns} columns`, size = fitOne(ctx, big, 200, 64, g.span(8));
    const f = loadFont(face(ctx, 'display', dw).stem), asc = f.ascender / f.unitsPerEm, desc = -f.descender / f.unitsPerEm;
    // the display line's cap top on y 104: the box top sits above it by the half-leading and the ascender less the cap height
    const capH = (f.tables.os2 && f.tables.os2.sCapHeight ? f.tables.os2.sCapHeight : f.ascender * 0.7) / f.unitsPerEm;
    const lineTop = 104 - ((size * 0.9 - (asc + desc) * size) / 2 + (asc - capH) * size);
    const fmt = (v) => ctx.fmt(v);
    const lead = `Every slide in this document sits on ${g.columns} columns, with a ${g.margin} px margin at each side and a ${g.gutter} px gutter between columns. Spacing steps by ${g.base} px.`;
    const bl = B.layout;
    const print = g.own ? '' : `${B.name}’s own page for print is ${bl.page.w} × ${bl.page.h} px: ${bl.columns} columns, a ${bl.margin} px margin and a ${bl.gutter} px gutter.`;
    const bandTop = 432;
    let cols = '';
    for (let i = 0; i < g.columns; i++) cols += field(g.col(i), bandTop, g.cw, H - bandTop, panel) + box(g.col(i) + 12, bandTop + 12, g.cw - 24, 0, `color:${qPanel}`, `<p class="r-t12 num">${i + 1}</p>`);
    // measures over the band: a 1 px line with end ticks, its value centred above it
    const measure = (x, w, label) => box(x, bandTop - 20, w, 12, `border:1px solid ${ink};border-top:0`) + box(x + w / 2 - 40, bandTop - 44, 80, 0, `color:${ink};text-align:center`, `<p class="r-t12 num">${label}</p>`);
    const ms = measure(0, g.margin, `${g.margin}`) + measure(g.col(1), g.cw, fmt(g.cw)) + measure(g.col(2) - g.gutter, g.gutter, `${g.gutter}`) +
      box(g.col(3), bandTop - 44, g.span(4), 0, `color:${quiet}`, '<p class="r-t12">Margin, column and gutter in px, at full size on this slide.</p>');
    const inner = box(g.col(0), lineTop, g.span(8), 0, `color:${ink};font-size:${size}px;line-height:0.9`, `<h2 class="disp r-nw">${A(big)}</h2>`) +
      box(g.col(8), 100, g.span(4), 0, '', `<p class="r-t15" style="color:${soft}">${A(lead)}</p>${print ? `<p class="r-t15" style="color:${soft};margin-top:16px">${A(print)}</p>` : ''}`) +
      box(g.col(8), 0, g.span(4), 0, `top:auto;bottom:${H - bandTop + 32}px;color:${quiet}`, `<p class="r-t12 num">Page ${W} × ${H} px. Column ${fmt(g.cw)} px.</p>`) +
      cols + ms + head(ctx, 'grid');
    return page('grid', inner, white);
  },
};

export function css() {
  return `
.pg.g4 h2{margin:0;font-size:inherit}
.pg.g4 .g4-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}
.pg.g4 .g4-row{padding-top:12px;display:flex;flex-direction:column;gap:4px}
.pg.g4 .g4-stack{display:flex;flex-direction:column;gap:12px}
.pg.g4 .g4-t26{font-size:26px;line-height:30px;text-wrap:balance}
.pg.g4 .g4-t20{font-size:20px;line-height:24px;text-wrap:balance}
.pg.g4 .g4-n{display:inline-block;min-width:20px}
.pg.g4 .g4-key{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pg.g4 .r-t15,.pg.g4 .r-t12,.pg.g4 .r-lead{text-wrap:pretty}
`;
}
