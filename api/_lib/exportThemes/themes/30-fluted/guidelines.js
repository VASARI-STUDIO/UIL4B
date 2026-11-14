// The gate pages of theme 30, Fluted. Geometry is from the spec (section 5) as amended in the run-2 hand-off; copy and proportions come from the brand's data.
import { plateImg } from '../../engine/plate.js';
import { A, initial, put, shell, rect, halfDisc, logoHtml, tokens, fitSize, adv, paths, capH, xH, facetCut, onFill, GX, PW, PH, TXT, FIELD_MIN } from './helpers.js';
import { paletteCols, paletteFields, glassBand, glassTone, warpPath } from './glass.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { DESCRIPTORS } from '../../engine/placeholders.js';

const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ---- 001 cover: the strong field runs the full height at the right; the band reeds it ----
function cover(ctx) {
  const T = tokens(ctx), B = ctx.brand, SX = 678, SW = 1080 - SX;  // 678 = 56 reeds + 6: the field edge falls on a reed centre, so that reed mirrors it
  const strongRect = rect(SX, 0, SW, 1350, T.strong);
  const track = -0.02, size = fitSize(ctx, 'display', 'guidelines', 96, (SX - 24 - 64) / 1.03, track);  // the browser sets the wide faces up to 3% wider than the advance sum (measured on Kerbside's Archivo)
  const logo = `<div class="a" style="left:64px;top:96px">${logoHtml(ctx, T, 'colour', { width: 360 })}</div>`;
  const head = put(ctx, { x: 64, y: 488, w: 580, cls: 'disp', size, line: 96, html: `<div style="color:var(--ink);font-size:${size}px;line-height:96px">Brand</div><div style="color:var(--quiet);font-size:${size}px;line-height:96px">guidelines</div>` });
  // the cover says what the brand is (the first sentence of its description); the brand's lines are each printed once, on the personality page
  // the slot edition does not print the sample brand's words: the engine's descriptor for the description (label, what to write, how long) in the dashed frame the other slots use
  const dsc = DESCRIPTORS.description;
  // the frame must end above the band (y 768), so it is two lines (label with the length, then what to write) and starts at y 696, 10 px under the headline's descender
  const line = put(ctx, { x: 64, y: ctx.edition === 'slot' ? 696 : 712, w: 480, cls: 'body', html: ctx.placeholders ? A(B.description) : ctx.edition === 'slot'
    ? `<div style="border:1.5px dashed var(--quiet);padding:6px 12px 7px;box-sizing:border-box"><div class="kn">${A(dsc.label)}<span class="k" style="margin-left:12px">${A(dsc.length)}.</span></div><div style="color:var(--ink)">${A(dsc.what)}</div></div>`
    : A((/^(.*?[.!?])(\s|$)/.exec(B.description) || [0, B.description])[1]) });
  const ver = put(ctx, { x: 64, y: 1184, w: 480, cls: 'k', html: A(`Version ${B.version.number}, ${longDate(B.version.date)}`) });
  // the band shows what is behind it: the ground and the strong field, which runs flat above, reeded in the glass, and flat below
  // the band's copy of the field starts 5 px left of the flat edge, so the reed that holds the edge (672 to 684) sees the field on both its halves: the mirrored dark half of its
  // fringe (a black tick at 0.5x) is gone and the edge steps 6 px left in the glass, the way a real reed would shift it
  const bandRect = rect(SX - 5, 0, SW + 5, 1350, T.strong);
  // The glass moment: a big initial (the brand's own first letter, in the display face) stands in the page's ink with its lower part in the band, so the page refracts one simple shape
  // as the intro's numeral does. It is all curves and vertical stems. Cap height 380, right edge 1016, baseline 1110 (22 px of it clear above the band, 42 px of band below it).
  // Its straight vertical edges (the stem's left side, the foot's ends) are moved to the nearest reed boundary, the intro's rule, so the glass shows no detached bar of them.
  const BS = 380 / capH(ctx, 'display', 1000, ctx.weights.heading) * 1000, pB = paths(ctx, 'display', initial(ctx), BS, -0.02), BX = 1016 - pB.x2, BB = 1110;
  const bd = snapVertical(pB.d, BX), letter = `<path transform="translate(${BX} ${BB})" d="${bd}" fill="${T.ink}"/>`;
  // In the band the B is not mirrored per reed (run 10): a per-reed mirror of a curve steps 28 px from reed to reed and the bowls broke into sawteeth with a starburst at the waist. It is drawn once, over the
  // reeds, with a smooth sideways displacement (warpPath), so the curves bend across each reed and nothing steps.
  const wd = warpPath(bd, BX, BB, {}), over = wd ? `<path d="${wd}" fill="${T.ink}"/>` : '';
  return shell(ctx, 'cover', T, { flat: strongRect + letter, shape: wd ? bandRect : bandRect + letter, band: { over }, fields: false, html: logo + head + line + ver, strongFrom: SX });
}

// A glyph path (absolute M, L, Q, C, Z; local coordinates, drawn at page x = local x + off) with every straight vertical edge's x moved to the nearest multiple of `pitch` on the page.
// Every vertex and control point that shares that x moves with it, so the edge stays vertical and its neighbours follow.
function snapVertical(d, off, pitch = 12) {
  const cmds = []; for (const t of d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || []) { if (/[A-Za-z]/.test(t)) cmds.push({ c: t, n: [] }); else cmds[cmds.length - 1].n.push(Number(t)); }
  if (cmds.some((k) => !'MLQCZ'.includes(k.c))) return d;
  const key = (x) => x.toFixed(2), V = new Set(); let px = null;
  for (const k of cmds) { if (!k.n.length) continue; const x = k.n[k.n.length - 2]; if (k.c === 'L' && px != null && Math.abs(x - px) < 0.01) V.add(key(x)); px = x; }
  const snap = (x) => (V.has(key(x)) ? Math.round((x + off) / pitch) * pitch - off : x);
  return cmds.map((k) => k.c + k.n.map((v, i) => (i % 2 === 0 ? snap(v) : v)).map((v) => Math.round(v * 100) / 100).join(' ')).join('');
}

// ---- 002 opener, section 01: the glass runs the whole page; the numeral crosses the strong field's edge so both refract ----
function intro(ctx) {
  const T = tokens(ctx), sec = ctx.sections[0], SX = 546;
  const num = String(sec.n).padStart(2, '0');
  const pn = paths(ctx, 'display', num, 560, -0.02);
  const tx = 1010 - pn.x2, g1 = num.slice(-1), p0 = paths(ctx, 'display', num.slice(0, 1), 560, -0.02), p1 = paths(ctx, 'display', g1, 560, -0.02);
  const o1 = adv(ctx, 'display', num, 560, -0.02) - adv(ctx, 'display', g1, 560, -0.02);  // where the last digit starts
  const ink = (x1, x2) => `<svg x="${x1}" y="0" width="${x2 - x1}" height="${PH}" viewBox="${x1} 0 ${x2 - x1} ${PH}"><path transform="translate(${tx} 1250)" d="${pn.d}" fill="${T.ink}"/></svg>`;
  // The last digit's straight vertical edges (the foot's ends, the stem's two sides, the flag's left end) are each moved to the nearest reed boundary, no further than 6 px: a reed whose
  // centre holds a straight edge shows a thin detached bar of it mirrored, with a notch of field between the bar and the next reed, and the flag tip and the stem top showed the same.
  // On a boundary no reed sees the edge, so the digit's sides end clean. The round first digit is left to refract (its curves are what read as glass).
  // The last digit's sloped flag stepped into teeth when each reed mirrored it, so it is drawn once over the reeds with the smooth displacement (warpPath, run 10); the round first digit still refracts per reed.
  const od = snapVertical(p1.d, tx + o1), wo = warpPath(od, tx + o1, 1250, {}), firstEnd = tx + p0.x2 + 6, one = `<path transform="translate(${tx + o1} 1250)" d="${od}" fill="${T.ink}"/>`;
  const shape = rect(SX, 0, PW - SX, PH, T.strong) + ink(0, firstEnd) + (wo ? '' : one);
  const over = wo ? `<path d="${wo}" fill="${T.ink}"/>` : '';
  // text sits on the reeds at the left. Rather than knock the facets out under it (which left a blank rectangle in the glass), each run takes the first of its own
  // colour, the soft text and the ink that holds 4.5 against the ground and every facet tone under it
  const tones = [T.ground, ...[1, -1, ...(T.light ? [] : [2])].map((d) => glassTone(ctx, T.ground, d))];
  const holds = (c) => tones.every((g) => ctx.ratio(c, g) >= 4.5), fit = (c) => [c, T.soft, T.ink].find(holds) || T.ink;
  const rowC = fit(T.soft), numC = fit(T.quiet), footC = fit(T.quiet);
  const size = fitSize(ctx, 'display', sec.title, 64, 412, -0.02);
  const title = put(ctx, { x: 64, y: 80, w: 440, cls: 'disp', html: `<div style="font-size:${size}px;line-height:64px">${A(sec.title)}</div>` });
  const nextSec = ctx.sections.find((x) => x.n === sec.n + 1), n = sec.pages.length;
  const rowAt = (i, title, no, tc, nc) => put(ctx, { x: 64, y: 176 + i * 28, w: 412, h: 28, cls: 'row', html: `<span style="color:${tc};font:400 16px/28px var(--body)">${A(title)}</span><span class="num" style="position:absolute;right:0;top:0;font:400 ${TXT}px/28px var(--dm);color:${nc}">${String(no).padStart(3, '0')}</span>` });
  // the sub-contents ends on the next section's first page ("Voice 005"): one more row in the same tone and rhythm, so the list reads as the way on
  const rows = sec.pages.map((p, i) => rowAt(i, p.title, p.no, rowC, numC)).join('')
    + (nextSec ? rowAt(n, nextSec.title, nextSec.pages[0].no, rowC, numC) : '');
  const foot = `<style>.pg[data-page="intro"] .ft{color:${footC}}</style>`;
  return shell(ctx, 'intro', T, { shape, fields: false, band: { y0: 0, h: PH, edges: false, over }, html: foot + title + rows, strongFrom: SX, title: '', folio: String(sec.pages[0].no - 1).padStart(3, '0') });
}

// a hyphen inside display type: the face's hyphen is wide, and at tracking -0.02em it runs into the next letter and reads as a long dash. It is set smaller, with its
// tracking restored and a hair of room either side, so it reads as a hyphen
const hy = (t) => t.replace(/-/g, '<span style="font-size:0.8em;letter-spacing:0.04em;margin:0 0.06em 0 0.02em">-</span>');

// the primary line in two: at the comma, else at the full stop, else the last word goes to line 2
function splitLine(s) {
  let m = /^(.*?,)\s+(.+)$/.exec(s) || /^(.*?[.!?])\s+(.+)$/.exec(s);
  if (m) return [m[1], m[2]];
  const w = s.split(' '); return [w.slice(0, -1).join(' '), w[w.length - 1]];
}

// ---- 004 personality: headline, three traits, one line of the brand's voice large above the band, and a half disc reeded inside it ----
function personality(ctx) {
  const T = tokens(ctx), B = ctx.brand, track = -0.02;
  const [l1, l2] = splitLine(B.lines.primary);
  const hs = Math.min(64, fitSize(ctx, 'display', l1.length > l2.length ? l1 : l2, 64, 777, track, ctx.weights.heading, 40));
  const head = put(ctx, { x: 64, y: 96, w: 777, cls: 'disp', html: `<div style="font-size:${hs}px;line-height:64px;color:var(--ink)">${A(l1)}</div><div style="font-size:${hs}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` });
  const RY = 256, STEP = 96;
  const rows = B.personality.slice(0, 3).map((p, i) => {
    const y = RY + i * STEP;
    return `<div class="hair" style="left:64px;top:${y - 16}px;width:710px"></div>`
      + put(ctx, { x: 64, y, w: 226, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${hy(A(p.trait))}</div>` })
      + put(ctx, { x: 306, y, w: 468, cls: 'body', html: A(p.means) });
  }).join('');
  // the band's hard shape: an arch (a window), 264 wide, its round top clear of the band edge (top y 712, the band starts at 768) and its two vertical sides running down
  // through the glass to y 1000, so the page goes flat, reeded, flat in one object. Curves and wide vertical stems are what the glass refracts well (a half disc or a
  // diagonal does not); the arch's side edges sit on reed boundaries (744 and 1008), so each reed holds only one side and the edges stay crisp (on a reed centre they showed a detached bar and a dark gap). Its top sits under the end of the voice line.
  const AX0 = 744, AX1 = 1008, AR = (AX1 - AX0) / 2, ATOP = 712, AY = 1000;
  const arch = `<path d="M${AX0} ${AY} V${ATOP + AR} A${AR} ${AR} 0 0 1 ${AX1} ${ATOP + AR} V${AY} Z" fill="${T.strong}"/>`;
  // The voice line is as large as one line allows between the margins, live type in ink wholly above the band. (Set through the glass it measured as unreadable:
  // a 200 px line has stems under three reeds wide, and every letter scrambles into glitch.) Its lowest ink clears the arch by 24 px and its cap top clears the
  // traits by 40 px (traits end at the third row's three-line worst case).
  const traitsEnd = RY + 2 * STEP + 75, WL = 1016 - 64 - 24;  // the browser sets this face about 2% wider than the advance sum, so keep a margin
  const pick = B.lines.others.map((t) => ({ t, s: fitSize(ctx, 'display', t, 220, WL, track, ctx.weights.heading, 40) })).reduce((a, b) => (b.s > a.s ? b : a));
  let size = pick.s, base, pp;
  for (; ; size--) {
    pp = paths(ctx, 'display', pick.t, size, track); base = ATOP - 24 - Math.max(0, Math.round(pp.y2));
    if (base - capH(ctx, 'display', size) >= traitsEnd + 40) break;
    if (size <= 40) throw new Error(`personality: no size of "${pick.t}" clears the traits (end ${traitsEnd}) and the band edge`);
  }
  const voice = put(ctx, { x: 64, baseline: base, w: WL + 24, cls: 'disp', role: 'display', size, line: Math.round(size * 1.1), html: `<div style="font-size:${size}px;line-height:${Math.round(size * 1.1)}px;color:var(--ink)">${A(pick.t)}</div>` });
  // the footer lists only the lines that are not already set large above, so each line prints once
  const rest = B.lines.others.filter((t) => t !== pick.t);
  const keyL = put(ctx, { x: 64, y: 1184, w: 200, cls: 'k', html: rest.length ? 'Also in use' : '', style: 'color:var(--quiet)' });
  const keyR = put(ctx, { x: 306, y: 1184, w: 710, cls: 'k', html: A(rest.join('  ')), style: 'white-space:pre' });
  // In the glass the arch is trimmed to 120 either side of its centre (x 756 to 996, both on reed boundaries): its round shoulders past that would show as a row of scalloped fins, and
  // inside it the sides run straight down to the base. At the band's top edge the arch is 216 wide, so only the first two or three teeth remain.
  const AC = (AX0 + AX1) / 2, archGlass = `<svg x="${AC - 120}" y="0" width="240" height="${PH}" viewBox="${AC - 120} 0 240 ${PH}">${arch}</svg>`;
  // Run 10: the arch is drawn once over the reeds at its full width, with the smooth displacement (warpPath), instead of trimmed and mirrored per reed: the trim left a flat ear 12 px wide at the
  // top of each side where the glass starts, and the shoulders no longer step into teeth. Its sides sit on reed boundaries (744, 1008), where the displacement is zero.
  const pts = [[AX0, AY], [AX0, ATOP + AR]]; for (let a = 180; a <= 360; a += 0.5) pts.push([AC + AR * Math.cos(a * Math.PI / 180), ATOP + AR + AR * Math.sin(a * Math.PI / 180)]); pts.push([AX1, ATOP + AR], [AX1, AY]);
  const wa = warpPath(`M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`, 0, 0, {});
  return shell(ctx, 'personality', T, { flat: arch, shape: wa ? '' : archGlass, band: { over: wa ? `<path d="${wa}" fill="${T.strong}"/>` : '' }, omit: [T.strong], html: head + rows + voice + keyL + keyR });
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lch = (s) => { const [L, C, H] = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(s).slice(1, 4).map(Number), z = (v) => v.toFixed(2).replace(/^0./, ".");  return `${z(L)} ${z(C)} ${Math.round(H)}`; };

// ---- 006 palette: the fields are the page, by share, full bleed, running on under the glass to 1152 ----
function palette(ctx) {
  const T = tokens(ctx);
  const cols = paletteCols(ctx, { ground: T.ground, actionHex: T.strong, minW: FIELD_MIN });
  const Y0 = 96, H = 1152 - Y0;
  // the strong field's copy in the glass starts 6 px left of its flat edge (the next reed boundary), so the reed that holds the edge (a reed centre) sees the field on both its halves: its
  // mirrored fringe, a stray bar of the field beside a stray dark reed, is gone, and the edge steps 6 px left in the glass (the cover does the same)
  const fieldsSvg = cols.map((c) => { const s = c.hex.toLowerCase() === T.strong.toLowerCase() && c.x > 0 ? 6 : 0; return `<rect x="${c.x - s}" y="${Y0}" width="${c.w + s}" height="${H}" fill="${c.hex}"/>`; }).join('');
  // the fields are divs under the glass so the text on each has an opaque ancestor of its own colour
  const under = cols.map((c, i) => {
    const col = ctx.colours.find((k) => k.hex.toLowerCase() === c.hex.toLowerCase());
    if (!col) return rect0(c, Y0, H, '');
    const fg = onFill(ctx, T, c.hex, TXT, 400), pad = i === 0 ? 64 : 16, near = ctx.ratio(c.hex, T.ground) < 1.25;
    const vals = [`HEX ${col.hex.toUpperCase()}`, `RGB ${hexRgb(col.hex).join(' ')}`, `OKLCH ${lch(col.oklch)}`];
    const need = Math.max(...vals.map((v) => adv(ctx, 'dm', v, TXT, 0, 400)), adv(ctx, 'body', col.name, 16, 0, ctx.weights.medium));
    if (pad + need + 16 > c.w) console.warn(`30-fluted palette: ${col.name} values need ${Math.ceil(need)} px, the field leaves ${c.w - pad - 16}`);
    const inner = `<div style="position:absolute;left:${pad}px;top:16px;color:${fg};white-space:nowrap"><div style="font:${ctx.weights.medium} 16px/20px var(--body)">${A(col.name)}</div>`
      + `<div style="margin-top:8px;font:400 ${TXT}px/20px var(--dm)">${vals.map(A).join('<br>')}</div></div>`;
    return rect0(c, Y0, H, inner, near ? 'box-shadow:inset 0 0 0 1px var(--hair);' : '');
  }).join('');
  // each caption sits under its own field, at the same left edge as the field's text (64 on the first field, else 16 in) and no wider than the field less 16 px either side.
  // `lands` is the brand's own sentences, as many as fit in 4 lines at that width (the key must clear the footer line at y 1292)
  const wrap = (text, w) => { let n = 1, at = 0; for (const wd of text.split(' ')) { const a = adv(ctx, 'chrome', wd, TXT, 0, 400), sp = at ? adv(ctx, 'chrome', ' ', TXT, 0, 400) : 0; if (at + sp + a > w && at) { n++; at = a; } else at += sp + a; } return n; };
  const key = cols.filter((c) => ctx.colours.some((k) => k.hex.toLowerCase() === c.hex.toLowerCase())).slice(0, 4).map((c) => {
    const col = ctx.colours.find((k) => k.hex.toLowerCase() === c.hex.toLowerCase());
    const cx = c.x === 0 ? 64 : c.x + 16, cw = Math.min(c.x === 0 ? c.w - 64 - 16 : c.w - 32, 360), sentences = col.lands.split(/(?<=\.)\s+/);
    // a first sentence that alone runs past 4 lines is cut at its first colon (the browser sets this face a little wider than the advance sum, so the fit uses 90% of the width)
    let land = sentences[0]; if (wrap(land, cw * 0.9) > 4 && land.includes(':')) land = `${land.split(':')[0]}.`;
    for (const s of sentences.slice(1)) { if (wrap(`${land} ${s}`, cw * 0.9) <= 4) land = `${land} ${s}`; else break; }
    return put(ctx, { x: cx, y: 1176, w: cw, cls: 'k', style: 'white-space:normal', html: `<div class="kn">${A(col.name)}</div><div>${A(land)}</div>` });
  }).join('');
  return shell(ctx, 'palette', T, { under, shape: fieldsSvg, fields: false, html: key });
}
const rect0 = (c, y, h, inner, extra = '') => `<div class="a" style="left:${c.x}px;top:${y}px;width:${c.w}px;height:${h}px;background:${c.hex};${extra}">${inner}</div>`;

// ---- 008 typefaces: the names and the weights at the left, one huge "Hg" in the strong colour standing in the glass ----
function typefaces(ctx) {
  const T = tokens(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, S = B.ui.screen.content, track = -0.02;
  const same = d.family === b.family, W = ctx.weights;
  // each family's name is set in that family (the body's at the regular weight, the mono's at its own), so the page shows the faces it names
  const own = { body: `font-family:var(--body);font-weight:${W.regular};letter-spacing:-0.01em`, mono: `font-family:var(--mono);font-weight:${m ? m.weights[0] : 400}` };
  const title = (x, y, text, face) => put(ctx, { x, y, w: 468, cls: face ? 'a' : 'disp', html: `<div style="font-size:28px;line-height:32px;color:var(--ink);${face ? own[face] : ''}">${A(text)}</div>` });
  const sub = (x, y, text) => put(ctx, { x, y, w: 468, cls: 'body', html: A(text) });
  const used = [...d.weights].sort((a, c) => a - c);
  const weights = put(ctx, { x: 64, y: 176, w: 777, cls: 'disp', style: 'white-space:pre', html: `<span style="font:${W.heading} 28px/32px var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em">`
    + `<span style="color:var(--ink)">${A(listAnd(used))}</span></span>` });
  let html = put(ctx, { x: 64, y: 96, w: 777, cls: 'disp', html: `<div style="font-size:64px;line-height:64px;color:var(--ink)">${A(d.family)}</div>` }) + weights
    + sub(64, same ? 264 : 224, same ? 'Display and text. Open Font License.' : 'Display. Open Font License.');
  let my = 360;
  // two families: the stack is packed up so the mono sample (ends y 432) clears the top of the "A" at y 448
  if (!same) { html += title(64, 272, b.family, 'body') + sub(64, 312, 'Text. Open Font License.'); my = 360; }
  const mono = m ? m.family : 'DM Mono';
  const sample = [S.from, S.time, T.strong.toUpperCase()].join('  ');
  html += title(64, my, mono, 'mono') + put(ctx, { x: 64, y: my + 48, w: 468, cls: 'mono', style: 'font-size:16px;line-height:24px;color:var(--soft);white-space:pre', html: A(sample) });
  // the hero pair "Oo": round bowls only (they refract into the stepped, magnified curves of real reeded glass; diagonals and thin stems shard). Right edge 1016, as large as fits right of the left column
  // (its left edge no further left than x 496), baseline 868, so the band takes the lower 100 px of the O and the lower part of both bowls.
  const PAIR = 'Oo', size = fitSize(ctx, 'display', PAIR, 560, 1016 - 496, track), pa = paths(ctx, 'display', PAIR, size, track), ax = 1016 - pa.x2, BASE = 868;
  const shape = `<path transform="translate(${ax} ${BASE})" d="${pa.d}" fill="${T.strong}"/>`;
  // the alphabet in the display face, then the three sizes in use (64, 28, 16) on the empty left. The O's left edge is a curve with its widest point at mid height, so a specimen ends 40 px left of its left edge
  const aLeft = ax + pa.x1;
  const alpha = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ'].map((r) => r.split('').join(' '));  // the whole alphabet, in two lines of thirteen
  // The three sizes are the brand's own scale (headline, title, body), set at exactly that size, line height and weight in that token's face; the number beside each row and the key
  // below read the same token, so no number on the page is one the page does not set. A row's box (stepsY, stepsLh) is fixed; the text is centred in it.
  const toks = ['headline', 'title', 'body'].map((tk) => B.type.scale.find((x) => x.token === tk));
  const stepsY = [540, 628, 676], stepsLh = [64, 32, 24];
  const room = aLeft - 40 - 112;
  const fam = (t) => (t.face === 'body' ? b : d), words = d.family.split(' ');
  const word = (t) => (t.face === 'body' ? [b.family, b.family.split(' ')[0]] : [d.family, words[0], words[0].slice(0, 4)]).find((s) => adv(ctx, t.face === 'body' ? 'body' : 'display', s, t.size, track, t.weight) <= room) || PAIR;
  html += put(ctx, { x: 64, y: 464, w: 468, cls: 'disp', style: 'white-space:pre', html: alpha.map((r) => `<div style="font-size:28px;line-height:32px;color:var(--soft)">${A(r)}</div>`).join('') });
  html += toks.map((t, i) => { const tl = Math.round(t.size * t.line), z = t.size;
    return put(ctx, { x: 64, y: stepsY[i], w: 48, cls: 'v', role: 'dm', size: TXT, line: 20, style: `top:${stepsY[i] + stepsLh[i] - 20 - Math.round(z * 0.17)}px`, html: String(z) })
      + put(ctx, { x: 112, y: stepsY[i] + (stepsLh[i] - tl) / 2, w: room, cls: t.face === 'body' ? 'body' : 'disp', style: `font-weight:${t.weight}`, html: `<div style="font-size:${z}px;line-height:${tl}px;color:var(--ink)">${A(word(t))}</div>` }); }).join('');
  const sc = (t) => `${t.size} / ${Math.round(t.size * t.line)}, ${t.weight}`;
  const key = [['Headline', 0], ['Title', 1], ['Body', 2]].map(([n, i]) => put(ctx, { x: GX[[0, 3, 6][i]], y: 1184, w: 300, cls: 'k', html: `${n} ${sc(toks[i])}` })).join('');
  // run 10: in the glass the "Oo" is drawn once over the reeds with the smooth displacement (warpPath); mirrored per reed its bowls stepped into sawteeth
  const wp = warpPath(pa.d, ax, BASE, {});
  return shell(ctx, 'typefaces', T, { flat: shape, shape: wp ? '' : shape, band: { over: wp ? `<path d="${wp}" fill="${T.strong}"/>` : '' }, omit: [T.strong], html: html + key });
}
const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// the colourway key drawn on a given ground, else the one whose name colour reads best on it
const cwOn = (ctx, bg) => {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
};
// the UI kit's tokens and components, scoped for art pages (the same recipe as theme 01's kit)
function kitCss(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}\n.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}\n${componentsCss(ctx)}\n.ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}\n.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

// ---- 012 business card: the web app on a laptop, and the card front and back, both photographed; the band below reeds the palette ----
function businessCard(ctx) {
  const T = tokens(ctx), B = ctx.brand, S = B.ui.screen.content, card = B.applications.card, mode = T.light ? 'light' : 'dark';
  const R = T.R, R2 = T.light ? ctx.roles.dark : ctx.roles.light;
  // art A: the app, 1440 x 900, at the edition's own mode
  const act = ctx.ratio(R.action, R.surface) >= 3 ? R.action : R.text;
  const nav = [['Track', 'map-pin'], ['Book', 'plus'], ['History', 'clock']];
  const bar = `<nav class="ui-topbar" style="height:64px;padding:0 48px;gap:24px;display:flex;align-items:center;border-bottom:1px solid var(--divider)"><span style="display:block;width:44px">${ctx.logo.html('symbol', { width: 44, colourway: cwOn(ctx, R.surface), label: '' })}</span><span style="font:500 20px/24px var(--ff-body);margin-right:24px">${A(B.ui.screen.title)}</span><div class="ui-topbar__links">${ctx.ui.links(nav, 0)}</div></nav>`;
  const pg = Math.round(S.progress * 100);
  const left = `<div style="position:absolute;left:64px;top:152px;width:560px"><div class="ui-display" style="font-size:112px;line-height:112px;letter-spacing:-0.02em;color:var(--text)">${A(S.time)}</div>`
    + `<div class="ui-display" style="margin-top:24px;font-size:40px;line-height:48px;color:${act}">${A(S.eta)}</div>`
    + `<div style="position:relative;margin-top:72px;height:1px;background:var(--divider)"><i style="position:absolute;left:0;top:-1px;width:${pg}%;height:3px;background:var(--action)"></i><i style="position:absolute;left:calc(${pg}% - 8px);top:-8px;width:16px;height:16px;border-radius:50%;background:var(--action)"></i></div>`
    + `<div style="display:flex;justify-content:space-between;margin-top:24px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`
    + `<p style="margin-top:56px;font:400 24px/36px var(--ff-body);color:var(--text-soft)">${A(S.pickup)}</p></div>`;
  // zoom scales an element's own left and width too, so the zoomed column sits inside a plain box: 728 + 648 = 1376, 64 px clear of the screen's right edge
  const right = `<div style="position:absolute;left:728px;top:128px;width:648px"><div style="width:432px;zoom:1.5">${ctx.ui.deliveryRows(5)}</div></div>`;
  // a flat parallelogram in the mode's own text colour at 6%: the glare on the glass (no gradient). On a dark screen it lifts; on a white screen it is a faint dark wedge
  const glare = `<div style="position:absolute;inset:0;background:${R.text};opacity:0.06;clip-path:polygon(56% 0,80% 0,52% 100%,28% 100%)"></div>`;
  const artA = `<div class="ui" data-theme="${mode}" style="position:relative;width:1440px;height:900px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body)">${bar}${left}${right}${glare}</div>`;
  const urlA = ctx.mockup('late-laptop-desk', { 'screen-laptop': { html: ctx.artPage(artA, { w: 1440, h: 900, css: kitCss(ctx) }), w: 1440, h: 900 } });

  // art B: the card, 1050 x 642. The front carries the horizontal logo and a mini band; the back is the other mode
  const cw = 1050, ch = 642, MX = 738;
  const mini = glassBand(ctx, { id: 'fx-card', behind: `<rect x="${MX - 40}" y="-10" width="${cw - MX + 80}" height="${ch + 20}" fill="${T.ground}"/><g transform="translate(${MX} 0)">${paletteFields(ctx, { ground: T.ground, y: 0, h: ch, W: cw - MX, actionHex: T.strong, snap: 6 })}</g>`, light: T.light, ground: T.ground, pitch: 6, x0: MX, w: cw - MX, y0: 0, h: ch, edges: false });
  const hz = ctx.logo.geos.horizontal, lw = 340, lh = lw * hz.h / hz.w;
  // the slot's frame and label are sized for the photographed card (the art is shown at about 0.3 of its size): a 5 px dash and a 40 px label
  const front = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${T.ground}"><div style="position:absolute;left:64px;top:${ch - 64 - lh}px">${logoHtml(ctx, T, 'horizontal', { width: lw, colourway: cwOn(ctx, T.ground), label: 'Your logo here', fs: 40, bw: 5, color: T.soft })}</div>${mini}</div>`;
  // the back's lines are set large (60 / 44 px in the art) because the photograph shrinks the card to about 0.3 and tilts it: they land at 12 px or more in the photo
  const back = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${R2.surface};color:${R2.text}">`
    + `<div class="disp" style="position:absolute;left:64px;top:56px;font-size:60px;line-height:68px;color:${R2.text}">${A(card.person)}</div>`
    + `<div style="position:absolute;left:64px;top:132px;font:400 44px/52px var(--body);color:${R2.quiet}">${A(card.role)}</div>`
    + `<div style="position:absolute;left:64px;top:${ch - 56 - 104}px;font:400 44px/52px var(--body);color:${R2.text}">${A(card.contact)}<br>${A(B.applications.site.url)}</div></div>`;
  const urlB = ctx.mockup('late-box-office', { 'card-front': { html: ctx.artPage(front, { w: cw, h: ch }), w: cw, h: ch }, 'card-back': { html: ctx.artPage(back, { w: cw, h: ch }), w: cw, h: ch } });

  // Two photographs, each flush on the band at y 768. The laptop (A) is shown at 0.65625, so its 486 px screen fills a 500 px panel (y 96 to 768). The cards (B) are shown at 0.395,
  // so the front and the back card both sit whole inside a 436 px panel (the cards span 1064 of the photograph's 1536 px) and the panel is the photograph's whole height (404 px).
  // The band under each photo carries the photograph on: its lower part mirrored in y about y 768 (a reflection), which each reed then refracts in x. The source is 1536 x 1024, too
  // short to run on at this scale, so the reflection is what continues it.
  const PA = { x: 64, w: 500, y: 96, h: 672, s: 0.65625, ml: -Math.round(650 * 0.65625), url: urlA, alt: `${B.name} web app, ${B.ui.screen.title} screen, on a laptop` };
  const PB = { x: 580, w: 436, y: 768 - 404, h: 404, s: 0.395, ml: -85, url: urlB, alt: `${B.name} business card, front and back, on a box-office counter at night` };
  const photo = (P) => `<div class="a" style="left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px;overflow:hidden">${plateImg(`${A(P.url)}`, `${A(P.alt)}`, `display:block;height:${P.h}px;width:${Math.round(1536 * P.s * 10) / 10}px;max-width:none;margin-left:${P.ml}px`)}</div>`;
  const reflect = (P) => `<svg x="${P.x}" y="768" width="${P.w}" height="384" viewBox="0 0 ${P.w} 384"><g transform="scale(1 -1)"><image href="${A(P.url)}" x="${P.ml}" y="${-P.h}" width="${Math.round(1536 * P.s * 10) / 10}" height="${P.h}" preserveAspectRatio="none"/></g></svg>`;
  // Run 11: the 436 x 268 space above the cards (y 96 to 364) holds the brand's third application, its sign, drawn flat to the shape the brand's own signage line gives (the size before the colon:
  // "6 x 3 m" is 2:1, "1185 x 1750 mm" is portrait), in the strong colour with the logo on it, and the spec as its caption. The sign's own words are not printed (the brand's lines stay on the personality page).
  const sgn = String(B.applications.signage || ''), spec = sgn.split(':')[0].trim(), dm = /(\d[\d.]*)\s*x\s*(\d[\d.]*)/i.exec(spec), asp = dm ? parseFloat(dm[1]) / parseFloat(dm[2]) : 2;
  const SW = Math.min(436, Math.round(244 * asp)), SH = Math.round(SW / asp), lgw = Math.round(SW * (asp >= 1 ? 0.55 : 0.7)), lgh = lgw * ctx.logo.geo.height / ctx.logo.geo.width;
  const sfg = onFill(ctx, T, T.strong, TXT, 400), cwS = cwOn(ctx, T.strong);
  // a portrait sign leaves the width beside it empty, so the caption goes beside it (at most 150 wide, wrapped) and the sign and caption are centred as a pair in the 436 px
  const side = SW < 300, specW = adv(ctx, 'chrome', spec + '.', TXT, 0, 400), capW = side ? Math.min(150, 436 - SW - 24) : 436, capLines = Math.ceil(specW / (capW * 0.9));
  const pairW = side ? SW + 24 + Math.min(capW, Math.ceil(specW)) : SW, SX0 = 580 + Math.round((436 - pairW) / 2);
  const sign = `<div class="a" style="left:${side ? SX0 : 580}px;top:96px;width:${SW}px;height:${SH}px;background:${T.strong}"><div class="a" style="left:${Math.round((SW - lgw) / 2)}px;top:${Math.round((SH - lgh) / 2)}px">${logoHtml(ctx, T, 'colour', { width: lgw, colourway: cwS, color: sfg })}</div></div>`;
  const signCap = put(ctx, { x: side ? SX0 + SW + 24 : 580, y: side ? 96 + SH - 20 * capLines : 96 + SH + 8, w: capW, cls: 'k', style: 'white-space:normal', html: A(spec + '.') });
  const html = photo(PA) + photo(PB) + sign + signCap
    + put(ctx, { x: 64, y: 1184, w: 480, cls: 'k', html: A(`The web app, ${B.ui.screen.title} screen, on a laptop.`) })
    + put(ctx, { x: 580, y: 1184, w: 436, cls: 'k', html: 'Business card, front and back.' });
  return shell(ctx, 'business-card', T, { html, shape: reflect(PA) + reflect(PB), fields: false, band: { photo: true } });
}

// ---- 016 logo: the primary logo in its clear space, the symbol standing behind the band and reeded again, the colourways as tiles ----
function logoPage(ctx) {
  const T = tokens(ctx), B = ctx.brand, g = ctx.logo.geo, cws = B.logo.colourways, keys = Object.keys(cws).slice(0, 6);
  // the logo sets in a clear-space rectangle from y 184 down to 452, so the symbol's top (469) stays clear of it
  const RY = 184, RB = 452, k = (g.height + 2 * g.unit) / g.width;
  const lw = Math.floor(Math.min((RB - RY) / k, 720 / (1 + 2 * g.unit / g.width))), u = g.unit * lw / g.width, lh = lw * g.height / g.width;
  const rw = lw + 2 * u, rh = lh + 2 * u;
  const logo = `<div class="a" style="left:${px(64 + u)};top:${px(RY + u)}">${logoHtml(ctx, T, 'colour', { width: lw, colourway: cwOn(ctx, T.ground) })}</div>`;
  const box = `<div class="a" style="left:64px;top:${RY}px;width:${px(rw)};height:${px(rh)};border:1px solid var(--hair);box-sizing:border-box"></div>`;
  // the clear-space unit x, drawn as a 1 px dimension line with end stops across each margin (left, top, right, bottom), the "x" beside its middle
  const xl = (cx, cy) => put(ctx, { x: cx - 10, y: cy - 10, w: 20, cls: 'v', role: 'dm', size: TXT, line: 20, align: 'center', style: 'line-height:20px', html: 'x' });
  const tk = (x, y, w, h) => `<div class="a" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:var(--quiet)"></div>`;
  const hTick = (x, y) => tk(x, y, u, 1) + tk(x, y - 5, 1, 11) + tk(x + u - 1, y - 5, 1, 11);   // a horizontal dimension of length u from (x, y)
  const vTick = (x, y) => tk(x, y, 1, u) + tk(x - 5, y, 11, 1) + tk(x - 5, y + u - 1, 11, 1);
  const mx = 64 + rw / 2, my = RY + rh / 2;
  const labels = hTick(64, my) + hTick(64 + rw - u, my) + vTick(mx, RY) + vTick(mx, RY + rh - u)
    + xl(64 + u / 2, my - 18) + xl(64 + rw - u / 2, my - 18) + xl(mx + 18, RY + u / 2) + xl(mx + 18, RY + rh - u / 2);
  const wm = B.logo.showcase.wordmark, capOf = wm === wm.toLowerCase() ? 'l' : [...wm][0];
  const unitNote = put(ctx, { x: 64, y: RY + rh + 12, w: 400, cls: 'k', html: ctx.placeholders ? 'x = cap height of the wordmark' : `x = cap height of the ${A(capOf)}` });
  const tx = 64 + rw + 32;
  // the slot edition does not print the sample brand's words: the engine's own descriptor for this copy (label, what to write, how long) in the dashed frame the other slots use
  const dsc = DESCRIPTORS['logo.idea'];
  const idea = put(ctx, { x: tx, y: RY, w: 1016 - tx, cls: 'body', html: ctx.placeholders ? A(B.logo.idea) : ctx.edition === 'slot'
    ? `<div style="border:1.5px dashed var(--quiet);padding:8px 12px 10px;box-sizing:border-box"><div class="kn">${A(dsc.label)}</div><div style="color:var(--ink)">${A(dsc.what)}</div><div class="k">${A(dsc.length)}.</div></div>`
    : A(B.logo.idea) });
  // the symbol, in ink (a mark on a line: see below), 300 tall with its foot on y 1000 and about 60% of it inside the band (y 700 to 1000): smaller than the logo it explains. A symbol made of
  // reeds of its own (four or more subpaths in one part) is drawn as the plain half disc it is cut from, so the band's reeds are the only reeds on the page.
  const sg = ctx.logo.geos.symbol, made = (p) => (p.d.match(/M/g) || []).length >= 4, reeded = sg.parts.some(made);
  // (run 10: the symbol is 648 wide, 54 reeds, so its horizon bar ends and the disc's feet sit on reed boundaries and its top stands at about y 618, 140 px under the logo's unit note instead of 250)
  let sw = 648, sk = sw / sg.w, sh = sg.h * sk, sx = 540 - sw / 2, sy = 1000 - sh;
  if (!reeded) {
    // a mark standing on a line (a letter and its kerb): the mark stays flat and clear above the band, ending 24 px above it (y 744), and the line, the part under it, runs through
    // the glass. The mark's foot is the lowest y of the first part (its own translate applied); the symbol is as large as fits 480 wide and clears the logo's clear space (y 470).
    const m0 = sg.parts[0], ty = Number(((m0.tf || '').match(/translate\(\s*-?[\d.]+[ ,]+(-?[\d.]+)/) || [0, 0])[1]), ys = (m0.d.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter((_, i) => i % 2 === 1);
    const top = ys.length ? Math.min(...ys) + ty : 0;
    // run 10: the lockup is 640 wide (it was 480), its mark's top on y 470, so the K comes down through the top of the band and the kerb sits in its middle; the K-to-kerb gap is the lockup's own, scaled
    sk = 640 / sg.w; sw = sg.w * sk; sh = sg.h * sk; sx = 540 - sw / 2; sy = 470 - top * sk;
  }
  const plain = (p) => {
    if ((p.d.match(/M/g) || []).length < 4) return p.d;
    const n = p.d.match(/-?\d+(\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1), x1 = Math.min(...xs), x2 = Math.max(...xs), y2 = Math.max(...ys), r = (x2 - x1) / 2;
    return `M${x1} ${y2} A${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };
  // A mark standing on a kerb: the kerb (the part that is not the letter) takes the colourway's own colour for that role (Signal on Kerbside's white), as in the lockup. Its vertical edges
  // are snapped to reed boundaries in kerbPath below (run 9; on reed centres they showed four detached 6 px bars).
  if (!reeded) sx = Math.round((sx - 6) / 12) * 12 + 6;
  const cwk = cws[cwOn(ctx, T.ground)], fillOf = (p) => (!reeded && p.role && p.role !== 'name' && cwk[p.role] ? cwk[p.role] : T.ink);
  // A reeded half disc is trimmed for the glass: the disc to DH either side of the centre and the horizon bar to BH, every cut on a reed boundary. The curve's shoulders past the trim
  // would show as a row of tall teeth, and a bar end on a reed centre as a ghost bar outside it; on a boundary no reed sees the edge, so it ends clean. The flat part above the band
  // is untouched (at y 768 the disc is 360 to 720 wide).
  // The kerb (a stepped bar of straight M, H, V edges) is drawn in page coordinates with every vertical edge on the nearest reed boundary: the colour fringe from an edge on a reed centre showed as four
  // detached 6 px bars beside the kerb, and on a boundary no reed sees the edge, so the bar's ends run clean. The step keeps its overlap (the lower bar still starts inside the upper one).
  const kerbPath = (d, ox, oy, k) => {
    const t = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || [];
    if (t.some((c) => /[A-Za-z]/.test(c) && !'MHVLZ'.includes(c))) return null;
    let x = 0, y = 0, c = null, out = ''; const sn = (v) => Math.round((ox + v * k) / 12) * 12, r = (v) => Math.round(v * 100) / 100;
    for (let i = 0; i < t.length; i++) {
      if (/[A-Za-z]/.test(t[i])) { c = t[i]; if (c === 'Z') out += 'Z'; continue; }
      const v = Number(t[i]);
      if (c === 'M' || c === 'L') { x = v; y = Number(t[++i]); out += `${c}${r(sn(x))} ${r(oy + y * k)}`; } else if (c === 'H') { x = v; out += `L${r(sn(x))} ${r(oy + y * k)}`; } else if (c === 'V') { y = v; out += `L${r(sn(x))} ${r(oy + y * k)}`; }
    }
    return out;
  };
  // The glass draws the mark once, over the reeds, with the smooth displacement of warpPath (run 10; trimming the disc and mirroring it per reed left a row of teeth on its shoulders). Its
  // vertical edges stay on reed boundaries, where the displacement is zero. The horizon bar and the kerb are straight, so they are drawn as they are.
  const polyD = (pts) => `M${pts.map(([x, y]) => `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`).join('L')}Z`;
  let over = '';
  const partSvg = (p, trim) => {
    const kd = !reeded && !p.tf ? kerbPath(p.d, sx, sy, sk) : null;
    const g = kd ? `<path d="${kd}" fill="${fillOf(p)}"/>` : `<g transform="translate(${sx} ${sy}) scale(${sk})"><path d="${plain(p)}" fill="${fillOf(p)}"${p.tf ? ` transform="${p.tf}"` : ''}/></g>`;
    return g;
  };
  // the K, in page coordinates (its own translate and the scale applied), its vertical edges on reed boundaries
  const kPage = (p) => {
    const n = p.d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || [], tt = (p.tf.match(/-?[\d.]+/g) || [0, 0]).map(Number); let out = '', c;
    // only absolute x,y pair commands can be moved point by point; any other path is drawn as it is
    if (n.some((t) => /[A-Za-z]/.test(t) && !'MLQCZ'.includes(t))) return null;
    // each pair is spaced from the one before it, or a curve's points run together into one number
    for (let i = 0; i < n.length; i++) { if (/[A-Za-z]/.test(n[i])) { c = n[i]; out += c; } else { out += `${/[A-Za-z]$/.test(out) ? '' : ' '}${Math.round((sx + (Number(n[i]) + tt[0]) * sk) * 100) / 100} ${Math.round((sy + (Number(n[++i]) + tt[1]) * sk) * 100) / 100}`; } }
    return snapVertical(out, 0);
  };
  const slot = ctx.edition === 'slot';
  let sym, symGlass;
  if (slot) sym = symGlass = `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="${T.quiet}" stroke-width="1.5" stroke-dasharray="8 6"/>`;
  else if (reeded) {
    // the half disc (a polyline of its arc) and the bar under it
    const disc = sg.parts.find(made), bar = sg.parts.find((p) => !made(p)), n = disc.d.match(/-?\d+(\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), r = (x2 - x1) / 2 * sk, cx = sx + (x1 + x2) / 2 * sk, by = sy + Math.max(...ys) * sk, pts = [];
    for (let a = 180; a <= 360; a += 0.5) pts.push([cx + r * Math.cos(a * Math.PI / 180), by + r * Math.sin(a * Math.PI / 180)]);
    const bm = bar && /M\s*(-?[\d.]+)\s+(-?[\d.]+)\s*H\s*(-?[\d.]+)\s*V\s*(-?[\d.]+)/.exec(bar.d), by1 = bm ? sy + Number(bm[2]) * sk : 0, by2 = bm ? sy + Number(bm[4]) * sk : 0;
    const dd = polyD(pts), bd = bm ? polyD([[sx, by1], [sx + sw, by1], [sx + sw, by2], [sx, by2]]) : '';
    sym = `<path d="${dd}" fill="${T.ink}"/>${bd ? `<path d="${bd}" fill="${T.ink}"/>` : ''}`;
    const wd = warpPath(dd, 0, 0, {});
    over = `<path d="${wd}" fill="${T.ink}"/>${bd ? `<path d="${bd}" fill="${T.ink}"/>` : ''}`; symGlass = '';
  } else {
    const k = sg.parts.find((p) => p.tf), kd = k ? kPage(k) : null, wk = kd ? warpPath(kd, 0, 0, {}) : null;
    if (kd && wk) { const rest = sg.parts.filter((p) => p !== k).map((p) => partSvg(p, false)).join(''); sym = `<path d="${kd}" fill="${fillOf(k)}"/>${rest}`; over = `<path d="${wk}" fill="${fillOf(k)}"/>`; symGlass = rest; }
    else { sym = symGlass = sg.parts.map((p) => partSvg(p, false)).join(''); }
  }
  // tiles: each colourway on its own ground, the logo 112 wide centred
  const tile = (key, i) => {
    const c = cws[key], near = ctx.ratio(c.ground, T.ground) < 1.25, lg = ctx.logo.geo;
    const lhh = 112 * lg.height / lg.width;
    return `<div class="a" style="left:${64 + 160 * i}px;top:1176px;width:152px;height:72px;background:${c.ground};${near ? 'box-shadow:inset 0 0 0 1px var(--hair);' : ''}"><div class="a" style="left:20px;top:${px((72 - lhh) / 2)};color:${ctx.ratio(T.ink, c.ground) >= ctx.ratio(T.ground, c.ground) ? T.ink : T.ground}">${ctx.logo.html('colour', { width: 112, colourway: key, label: '' })}</div></div>`;
  };
  const nameOf = (key) => {
    if (key === 'colour') return 'Colour';
    if (key.startsWith('on-')) { const col = B.colours.find((x) => x.hex.toLowerCase() === cws[key].ground.toLowerCase()); return `on ${col ? col.name : key.slice(3)}`; }
    return key.replace(/-/g, ' ');
  };
  // each tile carries its own name under it, one per 160 px column
  const names = keys.map((key, i) => put(ctx, { x: 64 + 160 * i, y: 1254, w: 152, cls: 'k', html: A(nameOf(key)), h: 20 })).join('');
  return shell(ctx, 'logo', T, { flat: sym, shape: symGlass, band: { over }, fields: false, html: box + logo + labels + unitNote + idea + keys.map(tile).join('') + names });
}
const px = (n) => `${Math.round(n * 100) / 100}px`;

export const guidelines = { cover, intro, personality, palette, typefaces, 'business-card': businessCard, logo: logoPage };
