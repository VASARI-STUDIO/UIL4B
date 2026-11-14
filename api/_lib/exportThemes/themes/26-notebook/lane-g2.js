// Theme 26, Notebook, lane g2: the logo spreads after the dense proof (logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// The same kept notebook: dot-grid leaves, the fold and its thread, prints held by tape, cards cut from the brand's grounds. Each spread takes
// its layout from something a careful person does in a site book: lengths cut from each ground and wrapped round the fore-edge like a thumb
// index, the logo cut out with exactly its clear space, a size test run down the leaf with tape cut to length as the ruler, a paint chip of
// the grounds beside a print of the logo out on a ute, and five tries struck out in graphite under a print of the one that went wrong.
// Coordinates are leaf-local (see helpers.js); edges land on dots and baselines on dot rows wherever the brand's proportions allow.
import {
  A, U, row, px, nb, tokens, brandRoles, readable, nearPaper, block, advance, wrap, lineOffset,
  stick, labelStripW, sceneCrop, printHtml, sceneImg, spread, numberWord, photoAt,
} from './helpers.js';
import { artKit } from './art.js';

const DX = (i) => 23 + U * i;                                   // dot column i on a leaf
const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';
const MM = 96 / 25.4;                                            // CSS px in a millimetre: the PDF prints 1:1 on A4
const nearDot = (v, o) => { const d = ((v - o) % U + U) % U; return Math.min(d, U - d) < 3; };
const r1 = (n) => Math.round(n * 10) / 10;

// a piece of label tape with no print under it (as lane g1's): 1 unit tall, as wide as its label plus 20, in whole units
function tapeLabel(T, x, y, text) {
  const w = labelStripW(T, 'c-label', text);
  return `<div class="tape tab c-label" style="left:${px(x)};top:${px(y)};width:${w}px;height:${U}px">${A(text)}</div>`;
}
// A paper box behind a mark set straight on the dots, so no dot touches it. Each edge sits midway between two dots: a dot closer than 6 px
// to the mark is covered whole, any other is left whole.
function paperBox(x0, y0, x1, y1) {
  const lo = (v, o) => { const d = o + U * Math.floor((v - o) / U); return v - d < 6 ? d - U / 2 : d + U / 2; };
  const hi = (v, o) => { const d = o + U * Math.ceil((v - o) / U); return d - v < 6 ? d + U / 2 : d - U / 2; };
  const l = Math.max(0, lo(x0, 23)), r = Math.min(559, hi(x1, 23)), t = lo(y0, 17), b = hi(y1, 17);
  return `<div class="ko" style="left:${px(l)};top:${px(t)};width:${px(r - l)};height:${px(b - t)}"></div>`;
}
// the logo in a positioned box; the slot frame's label is dropped where the frame is too small to hold it
function logoAt(ctx, id, { x, y, w, colourway, color, extra = '' }) {
  const label = w < 150 ? '' : undefined;
  return `<div class="g2-lg" style="left:${px(x)};top:${px(y)};width:${px(w)};${extra}">${ctx.logo.html(id, { width: w, colourway, color, label })}</div>`;
}
// the brand colour's name for a hex, or the hex when the colourway uses one that is not in the palette
const nameOf = (ctx, hex) => (ctx.brand.colours.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || {}).name || String(hex).toUpperCase();
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
// a colourway's share of the logo's height as words when it is a plain fraction
const shareWords = (s) => { const f = [[0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half']].find(([v]) => Math.abs(s - v) < 0.02); return f ? f[1] : `${Math.round(s * 100)}%`; };

export const guidelines = {
  // ---- logo versions: every version is a length cut from its own ground and wrapped round the fore-edge, like the thumb index on the
  // contents spread. The four colourways of the primary logo run off the verso's left edge, the three shapes off the recto's right edge; what
  // each is for is written on the paper beside it, on the fold side. Full colour, the default, gets the longest cut. ----
  'logo-versions': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), lg = ctx.logo, geo = lg.geos;
    const lead = `${numberWord(lg.versions.length)} versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.`;
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'logo-versions')], baseline: 93, cls: 'b-title' }).html
      + block(T['b-body'], { x: 42, w: 380, top: 131, text: lead, cls: 'b-body' }).html;
    // one length of ground: [x0, x1] on the leaf, the logo inset 28 px from the inner end of the bleed side, the words on the fold side
    const cut = (id, { y, h, x0, x1, recto, tx, tw, extra = [] }) => {
      const wy = B.logo.colourways[lg.colourwayOf(id)], g = geo[id];
      const ink = readable(ctx, wy.ground, [wy.name, R.text, R.ground.hex], `version ${id}`);
      const room = x1 - x0 - 42 - 28, lh = Math.min(h * 0.5, room * g.h / g.w), lw = lh * g.w / g.h;
      const lx = recto ? x0 + 28 : 42;
      let out = `<div class="g2-cut${nearPaper(ctx, wy.ground) ? ' edge' : ''}${recto ? ' r' : ''}" style="left:${x0}px;top:${y}px;width:${x1 - x0}px;height:${h}px;background:${wy.ground}"></div>`
        + logoAt(ctx, id, { x: lx, y: y + (h - lh) / 2, w: lw, color: ink });
      let bl = y + U;
      out += block(T['c-strong'], { x: tx, w: tw, baseline: bl, lines: [lg.labels[id]], cls: 'c-strong' }).html;
      for (const t of [B.logo.when[id], ...extra]) {
        const ls = wrap(T['c-note'].stem, 13, t, tw);
        out += block(T['c-note'], { x: tx, w: tw, baseline: bl + U, lines: ls, cls: 'c-note' }).html;
        bl += U * ls.length;
      }
      return { html: out, end: bl };
    };
    // verso: the colour cut is 6 units, the others 4, two units apart; each list of words must end above the next cut's first line
    let y = row(12), prevEnd = 0;
    for (const id of ['colour', 'mono-dark', 'mono-light', 'reversed']) {
      const h = id === 'colour' ? 6 * U : 4 * U;
      if (prevEnd && prevEnd + U > y) y = prevEnd + U;
      const c = cut(id, { y, h, x0: 0, x1: DX(14), recto: false, tx: DX(16), tw: 517 - DX(16) });
      vc += c.html; prevEnd = c.end; y += h + 2 * U;
    }
    if (prevEnd > 739) throw new Error(`logo-versions: the verso runs to ${prevEnd}`);
    // recto: the three shapes, level with the verso's first cuts; the symbol carries its own note too
    let rc = ''; y = row(12); prevEnd = 0;
    for (const [id, h] of [['horizontal', 4 * U], ['stacked', 8 * U], ['symbol', 5 * U]]) {
      if (prevEnd && prevEnd + U > y) y = prevEnd + U;
      const extra = id === 'symbol' && B.logo.showcase.symbolNote ? [B.logo.showcase.symbolNote] : [];
      const c = cut(id, { y, h, x0: DX(13), x1: 559, recto: true, tx: 42, tw: DX(11) - 42, extra });
      rc += c.html; prevEnd = c.end; y += h + 2 * U;
    }
    if (prevEnd > 739) throw new Error(`logo-versions: the recto runs to ${prevEnd}`);
    return spread(ctx, 'logo-versions', { verso: vc, recto: rc });
  },

  // ---- clear space: on the verso the logo is cut out of its own ground with exactly its clear space and nothing more, so the card's edge is
  // the rule; four squares of tape, each x by x, sit in its corners as the unit. On the recto the three other shapes keep the same x, shown
  // the notebook's way: the dots stop where the clear space ends. ----
  'clear-space': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), lg = ctx.logo, geo = lg.geos, unit = lg.geo.unit;
    const share = unit / geo.colour.h, cw = B.logo.colourways.colour;
    // the card is 5 units tall when the logo then fits the leaf's width, else 4: the logo's height is the card's less x top and bottom
    let H, W, X, ch;
    for (const n of [6, 5, 4, 3]) {
      ch = n * U; H = ch / (1 + 2 * share); W = H * geo.colour.w / geo.colour.h; X = share * H;
      if (W + 2 * X <= 475) break;
    }
    const cwid = W + 2 * X, cy = row(10);
    const ink = readable(ctx, cw.ground, [cw.name, R.text], 'clear-space card');
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'clear-space')], baseline: 93, cls: 'b-title' }).html;
    vc += `<div class="g2-card stuck${nearPaper(ctx, cw.ground) ? ' edge' : ''}" style="left:42px;top:${cy}px;width:${px(cwid)};height:${ch}px;background:${cw.ground}">`
      + `<div style="position:absolute;left:${px(X)};top:${px(X)};width:${px(W)}">${lg.html('colour', { width: W, color: ink })}</div>`
      + [[0, 0], [cwid - X, 0], [0, ch - X], [cwid - X, ch - X]].map(([x, y]) => `<div class="g2-unit" style="left:${px(x)};top:${px(y)};width:${px(X)};height:${px(X)}"></div>`).join('')
      + '</div>';
    // the unit named once, beside the top-right square, on the paper
    const nb_ = row(Math.ceil((cy + ch - 17) / U) + 2);
    vc += block(T['c-note'], { x: 42, w: 475, baseline: nb_, lines: [`x is ${shareWords(share)} of the logo's height: ${r1(X)} px at this size.`], cls: 'c-note' }).html;
    vc += block(T['b-body'], { x: 42, w: 380, baseline: nb_ + 2 * U, text: 'Keep x clear on all four sides, measured from the edge of the logo. Nothing enters it: no type, no edge, no other logo. As the logo grows or shrinks, x goes with it.', cls: 'b-body' }).html;

    // recto: horizontal across the head, stacked and symbol under it. Each zone's width gives way a pixel at a time, and the logo moves right
    // and down by up to 9 px, until no zone edge lands within 3 px of a dot, so every dot is either whole or gone
    const clear = [];
    let rc = '';
    const zoneFor = (id, lx0, lbot0, w0) => {
      const g = geo[id];
      for (const dw of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8]) {
        const w = w0 + dw, h = w * g.h / g.w, x = unit * w / g.w;
        const dx = [...Array(10).keys()].find((d) => ![lx0 + d - x, lx0 + d + w + x].some((v) => nearDot(v, 23)));
        const dy = [...Array(10).keys()].find((d) => ![lbot0 + d - h - x, lbot0 + d + x].some((v) => nearDot(v, 17)));
        if (dx === undefined || dy === undefined) continue;
        const lx = lx0 + dx, lbot = lbot0 + dy;
        return { w, h, x, lx, lbot, z: { x: lx - x, y: lbot - h - x, w: w + 2 * x, h: h + 2 * x } };
      }
      throw new Error(`clear-space: no zone for ${id} keeps every dot whole`);
    };
    const place = (id, lx0, lbot0, w0) => {
      const f = zoneFor(id, lx0, lbot0, w0), z = f.z;
      clear.push({ recto: true, x: z.x, y: z.y, w: z.w, h: z.h });
      rc += logoAt(ctx, id, { x: f.lx, y: f.lbot - f.h, w: f.w, color: R.text });
      rc += [[z.x, z.y], [z.x + z.w - f.x, z.y], [z.x, z.y + z.h - f.x], [z.x + z.w - f.x, z.y + z.h - f.x]]
        .map(([x, y]) => `<div class="g2-unit" style="left:${px(x)};top:${px(y)};width:${px(f.x)};height:${px(f.x)}"></div>`).join('');
      const bl = row(Math.ceil((z.y + z.h - 17) / U) + 1);
      rc += block(T['c-strong'], { x: Math.max(42, Math.round(z.x)), w: 228, baseline: bl, lines: [lg.labels[id]], cls: 'c-strong' }).html
        + block(T['c-mono'], { x: Math.max(42, Math.round(z.x)), w: 228, baseline: bl + U, lines: [`x = ${r1(f.x)} px`], cls: 'c-mono' }).html;
      return bl + U;
    };
    // horizontal: as wide as the leaf allows with its zone inside x 61 to 498; stacked and symbol in half-leaf boxes
    const gh = geo.horizontal, hx = unit / gh.w;
    const hw = Math.min(380, Math.floor(437 / (1 + 2 * hx)), Math.floor(152 * gh.w / gh.h));
    const hX = unit * hw / gh.w, hBot = row(Math.ceil((74 + hX + hw * gh.h / gh.w - 17) / U) + 1);
    const e1 = place('horizontal', 61 + hX, hBot, hw);
    const fitBox = (g, bw, bh) => Math.floor(Math.min(bw / (1 + 2 * unit / g.w), bh * g.w / g.h / (1 + 2 * unit / g.h)));
    const sTop = row(Math.ceil((e1 - 17) / U) + 3);
    const gs = geo.stacked, sw = fitBox(gs, 209, 228), sX = unit * sw / gs.w, sBot = sTop + sX + sw * gs.h / gs.w;
    const gy = geo.symbol, yw = fitBox(gy, 171, 171), yX = unit * yw / gy.w, yBot = sTop + yX + yw * gy.h / gy.w;
    const e2 = place('stacked', 61 + sX, sBot, sw);
    const e3 = place('symbol', 308 + yX, yBot, yw);
    if (Math.max(e2, e3) > 739) throw new Error(`clear-space: the recto runs to ${Math.max(e2, e3)}`);
    return spread(ctx, 'clear-space', { verso: vc, recto: rc, clear });
  },

  // ---- minimum size: a size test run down each leaf, the way you would test it on paper. The logo steps down from twice the minimum to the
  // minimum, which gets a length of tape cut to exactly its width as the ruler; one step smaller is struck out. Screen on the verso in px,
  // print on the recto in true millimetres, the recto's test hung from the fore-edge so the two read as a pair across the fold. ----
  'min-size': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, lg = ctx.logo, g = lg.geos.colour, sh = B.logo.showcase, R = brandRoles(ctx);
    const steps = [2, 1.5, 1.25, 1, 0.75];
    const test = (recto, unitLabel, minW, val) => {
      let out = '', bl = row(13);
      steps.forEach((f, i) => {
        const w = minW * f, h = w * g.h / g.w;
        if (i) bl = row(Math.ceil((bl + (steps[i - 1] === 1 ? 2 * U : 0) + U + h - 17) / U));
        const x = recto ? 517 - w : 42, struck = f < 1;
        out += paperBox(x, bl - h, x + w, bl) + logoAt(ctx, 'colour', { x, y: bl - h, w, color: R.text });
        const v = val(f), vx = recto ? 42 : 346;
        out += block(T['c-mono'], { x: vx, w: 171, baseline: bl, lines: [v], cls: `c-mono${struck ? ' g2-struck' : ''}` }).html;
        if (f === 1) {
          // the ruler: tape cut to the minimum's exact width, a unit under the logo, labelled with the size
          out += `<div class="tape tab c-label g2-ruler" style="left:${px(x)};top:${px(bl + U / 2)};width:${px(w)};height:${U}px">${A(v)}</div>`;
          out += block(T['c-strong'], { x: vx, w: 171, baseline: bl + U, lines: ['The minimum'], cls: 'c-strong' }).html;
        }
        if (struck) {
          out += `<div class="g2-strike" style="left:${px(x - 6)};top:${px(bl - h / 2 - 0.75)};width:${px(w + 12)}"></div>`;
          out += block(T['c-note'], { x: vx, w: 171, baseline: bl + U, lines: ['Too small'], cls: 'c-note' }).html;
        }
      });
      if (bl + U > 739) throw new Error(`min-size: the ${unitLabel} test runs to ${bl + U}`);
      return out;
    };
    const fmt = (n) => String(Math.round(n * 100) / 100);
    let vc = block(T['b-title'], { x: 42, w: 475, lines: ['On screen'], baseline: 93, cls: 'b-title' }).html
      + block(T['b-body'], { x: 42, w: 285, top: 131, text: `Never smaller than ${sh.minScreenPx} px wide. Each step here is drawn one pixel to the pixel.`, cls: 'b-body' }).html
      + test(false, 'screen', sh.minScreenPx, (f) => `${fmt(sh.minScreenPx * f)} px`);
    let rc = block(T['b-title'], { x: 42, w: 475, lines: ['In print'], baseline: 93, cls: 'b-title' }).html
      + block(T['b-body'], { x: 42, w: 285, top: 131, text: `Never smaller than ${sh.minPrintMm} mm wide. Print this page at 100% and each step is true to the millimetre.`, cls: 'b-body' }).html
      + test(true, 'print', sh.minPrintMm * MM, (f) => `${fmt(sh.minPrintMm * f)} mm`);
    return spread(ctx, 'min-size', { verso: vc, recto: rc });
  },

  // ---- logo on colour and photos: the grounds as one paint chip, a band per brand colour the logo may sit on, in the colourway that goes
  // there, with what is on it written beside each band. On the verso, a print of the logo out on a ute: a magnet of the brand's ground on a
  // dark door, which is how a ground travels onto a photograph. ----
  'logo-grounds': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), lg = ctx.logo, CW = B.logo.colourways, g = lg.geos.colour;
    const lc = (h) => String(h).toLowerCase();
    // one band per brand colour that some colourway uses as its ground, in palette share order; the colourway that is a named version wins
    const pref = ['colour', 'reversed', 'mono-dark', 'mono-light'];
    const rank = (k) => (pref.indexOf(k) < 0 ? (k.startsWith('mono') ? 5 : 2.5) : pref.indexOf(k) === 0 ? 0 : pref.indexOf(k) === 1 ? 1 : 4);
    const cols = [...B.colours].sort((a, b) => b.share - a.share);
    const bands = [], off = [];
    for (const c of cols) {
      const keys = Object.keys(CW).filter((k) => lc(CW[k].ground) === lc(c.hex)).sort((a, b) => rank(a) - rank(b));
      if (keys.length) bands.push({ c, key: keys[0] }); else off.push(c.name);
    }
    const bh = Math.min(6 * U, Math.floor(627 / bands.length / U) * U), chX = 42, chW = 285, chY = row(5);
    const anyEdge = bands.some((b) => nearPaper(ctx, b.c.hex));
    let rc = `<div class="tape piece" style="left:${chX - U}px;top:${px(chY - U / 2)};width:${5 * U}px;height:${U}px"></div>`
      + `<div class="g2-card stuck${anyEdge ? ' edge' : ''}" style="left:${chX}px;top:${chY}px;width:${chW}px;height:${bh * bands.length}px">`;
    let words = '';
    bands.forEach(({ c, key }, i) => {
      const wy = CW[key], y = bh * i;
      const ink = readable(ctx, wy.ground, [wy.name, R.text, R.ground.hex], `ground band ${key}`);
      const lh = Math.min(bh * 0.4, (chW - 56) * g.h / g.w), lw = lh * g.w / g.h;
      rc += `<div style="position:absolute;left:0;top:${y}px;width:100%;height:${bh}px;background:${wy.ground}">`
        + `<div style="position:absolute;left:28px;top:${px((bh - lh) / 2)};width:${px(lw)}">${lg.html('colour', { width: lw, colourway: key, color: ink, label: lw < 150 ? '' : undefined })}</div></div>`;
      // beside the band: the ground, then the colours of the logo on it, then its hex
      const parts = [...new Set(Object.keys(wy).filter((k) => k !== 'ground').map((k) => nameOf(ctx, wy[k])))];
      const label = lg.versions.includes(key) ? `${lg.labels[key]}: ` : '';
      const desc = wrap(T['c-note'].stem, 13, `${label}${andList(parts)}`, 171);
      const bl = chY + y + U;
      words += block(T['b-name'], { x: DX(17), w: 171, baseline: bl, lines: [c.name], cls: 'b-name' }).html
        + block(T['c-note'], { x: DX(17), w: 171, baseline: bl + U, lines: desc, cls: 'c-note' }).html
        + block(T['c-mono'], { x: DX(17), w: 171, baseline: bl + U * (desc.length + 1), lines: [c.hex.toUpperCase()], cls: 'c-mono' }).html;
    });
    rc += '</div>' + words;
    const chEnd = chY + bh * bands.length;
    if (off.length) rc += block(T['c-note'], { x: 42, w: 475, baseline: row(Math.ceil((chEnd - 17) / U) + 2), lines: [`Never on ${andList(off)}.`], cls: 'c-note' }).html;

    // verso: the title, the grounds in one sentence, the photo rule, and the print low on the leaf
    const names = bands.map((b) => b.c.name);
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'logo-grounds')], baseline: 93, cls: 'b-title' }).html
      + block(T['b-body'], { x: 42, w: 380, top: 131, text: `The logo sits on ${andList(names)}, each in its own colourway, and on nothing else.`, cls: 'b-body' }).html;
    const pb = row(11);
    // a brand with photographs shows the rule on one of them (mono light on a quiet, dark part of the picture); one without shows the logo
    // out on a vehicle, so the heading says what the picture shows
    const phs = (B.imagery.shots || []).filter((s) => s.photo), ps = phs[2] || phs[1] || phs[0];
    const P = { x: 42, y: row(20), w: 456, h: 304 };
    if (ps) {
      vc += block(T['c-strong'], { x: 42, w: 380, baseline: pb, lines: [`On a photo: ${lg.labels['mono-light']}`], cls: 'c-strong' }).html
        + block(T['b-body'], { x: 42, w: 380, baseline: pb + U, text: B.logo.when['mono-light'], cls: 'b-body' }).html;
      const lw = 133, mono = CW['mono-light'];
      const inner = photoAt(ctx, ps.id, { style: 'width:100%;height:100%' })
        + `<div style="position:absolute;left:${px(P.w * 0.05)};top:${px(P.h * 0.64)};width:${lw}px;z-index:1">${lg.html('colour', { width: lw, colourway: 'mono-light', color: mono.name, label: '' })}</div>`;
      const cap = `${lg.labels['mono-light']}, on a quiet part of the photograph`;
      return spread(ctx, 'logo-grounds', { verso: vc + printHtml({ ...P, inner, label: cap }) + stick(T, { ...P, label: cap }), recto: rc });
    }
    vc += block(T['c-strong'], { x: 42, w: 380, baseline: pb, lines: ['Out on a vehicle'], cls: 'c-strong' }).html
      + block(T['b-body'], { x: 42, w: 380, baseline: pb + U, text: `On a dark door the logo keeps its own ground: a ${nameOf(ctx, CW.colour.ground)} magnet, in ${lg.labels.colour.toLowerCase()}.`, cls: 'b-body' }).html;
    // the magnet: the brand's colour colourway ground, the stacked logo and the site address (1.6 : 1, the door panel's own shape)
    const sc = ctx.sceneInfo('kerb-ute-kerbside'), a = sc.quads[0].aspect, aw = 800, ah = Math.round(aw / a);
    const cw = CW.colour, gs = lg.geos.stacked, b = B.fonts.body, W = ctx.weights;
    const slh = Math.min(ah * 0.5, 340 * gs.h / gs.w), slw = slh * gs.w / gs.h;
    const magnet = ctx.artPage(`<div style="position:absolute;inset:0;background:${cw.ground}">`
      + `<div style="position:absolute;left:56px;top:56px;width:${px(slw)}">${lg.html('stacked', { width: slw })}</div>`
      + `<div style="position:absolute;left:56px;bottom:52px;font-family:'${b.family}',sans-serif;font-weight:${W.strong};font-size:40px;line-height:48px;color:${ctx.roles.light.text}">${A(B.applications.site.url)}</div></div>`, { w: aw, h: ah });
    const url = ctx.mockup('kerb-ute-kerbside', [{ html: magnet, w: aw, h: ah }]);
    const cap = `On the ute: ${lg.labels.colour.toLowerCase()} on a ${nameOf(ctx, cw.ground)} magnet`;
    vc += printHtml({ ...P, inner: sceneImg(url, sceneCrop(sc, P.w, P.h, 0.42), cap), label: cap }) + stick(T, { ...P, label: cap });
    return spread(ctx, 'logo-grounds', { verso: vc, recto: rc });
  },

  // ---- logo misuse: the one that goes wrong in the wild is a print on the verso, the logo laid over a busy photograph and crossed out; the
  // five drawing mistakes run down the recto as tries on the paper, each in its own patch of stopped dots, crossed in graphite, with why. ----
  'logo-misuse': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, lg = ctx.logo, g = lg.geos.colour, R = brandRoles(ctx);
    const act = ctx.C.toOklch(R.action), wrong = ctx.C.fromOklch(Math.min(act.L, 0.42), Math.max(act.C, 0.08), (act.H + 180) % 360);
    const shadow = ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',');
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', (w) => ({ w, extra: 'transform:scale(1.32,0.7)' })],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions spread.', (w) => ({ w, fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', (w) => ({ w, extra: 'transform:rotate(-12deg)' })],
      ['Effects', 'No shadows, glows or bevels. The logo is flat colour.', (w) => ({ w, extra: `filter:drop-shadow(5px 6px 4px rgba(${shadow},0.5))` })],
      ['Outlined or boxed', 'No outlines, boxes or frames. Its clear space is the only frame it needs.', (w) => ({ w: w - 40, box: true })],
    ];
    const busy = ['Busy ground', 'Never on a busy photo. On a photo, use mono light on a quiet part of the picture.'];
    const n = items.length + 1;
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'logo-misuse')], baseline: 93, cls: 'b-title' }).html
      + block(T['b-body'], { x: 42, w: 380, top: 131, text: `${numberWord(n)} ways the logo goes wrong. Use the supplied files as they are, and none of these.`, cls: 'b-body' }).html;

    // the cross: two graphite strokes corner to corner over a box, on a paper-coloured underlay so it reads on a photo as well as on the dots
    const cross = (x, y, w, h) => `<svg class="g2-cross" style="left:${px(x)};top:${px(y)}" width="${px(w)}" height="${px(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true">`
      + [[0, 0, w, h], [0, h, w, 0]].map(([a, b, c, d]) => `<line x1="${r1(a)}" y1="${r1(b)}" x2="${r1(c)}" y2="${r1(d)}" class="u"/><line x1="${r1(a)}" y1="${r1(b)}" x2="${r1(c)}" y2="${r1(d)}" class="o"/>`).join('') + '</svg>';

    // verso: the print. A brand photograph when the brand has one, else the bench of shavings from the scene library, cropped to the shavings
    const P = { x: 42, y: row(19), w: 456, h: 304 };
    const phs = (B.imagery.shots || []).filter((s) => s.photo), shot = phs[2] || phs[1] || phs[0];
    let inner;
    if (shot) inner = photoAt(ctx, shot.id, { style: 'width:100%;height:100%' });
    else {
      const sc = ctx.sceneInfo('bench-cards-offcuts'), s = P.w / 600;
      const kit = artKit(ctx);
      inner = sceneImg(ctx.mockup('bench-cards-offcuts', { 'card-front': kit.cardFront(340, 208), 'card-back': kit.cardBack(340, 208) }), { left: 0, top: 0, iw: sc.w * s, ih: sc.h * s }, 'Shavings on a workbench');
    }
    const ow = 300, oh = ow * g.h / g.w, ox = (P.w - ow) / 2, oy = P.h * 0.36 - oh / 2;
    inner += `<div style="position:absolute;left:${px(ox)};top:${px(oy)};width:${ow}px;z-index:1">${lg.forMisuse(ow)}</div>` + cross(ox - 12, oy - 12, ow + 24, oh + 24);
    vc += printHtml({ ...P, inner, label: `${busy[0]}: the logo on a busy photograph, crossed out` }) + stick(T, { ...P, label: busy[0] });
    vc += block(T['c-note'], { x: 42, w: 475, baseline: P.y + P.h + 2 * U, text: busy[1], cls: 'c-note' }).html;

    // recto: five tries, each in a 12 x 6 unit patch of stopped dots with its corners on dots, the words beside it on the fore-edge side
    let rc = ''; const clear = [];
    items.forEach(([name, why, make], i) => {
      const zy = row(3 + 7 * i), zx = 42, zw = 12 * U, zh = 6 * U;
      clear.push({ recto: true, x: zx, y: zy, w: zw, h: zh });
      const m = make(150), w = m.w, h = w * g.h / g.w, lx = zx + (zw - w) / 2, ly = zy + (zh - h) / 2;
      const art = lg.forMisuse(w, m.fill ? { fill: m.fill } : {});
      if (m.box) {
        const pad = 14;
        rc += `<div class="g2-lg g2-boxed" style="left:${px(lx - pad)};top:${px(ly - pad)};width:${px(w + 2 * pad)};height:${px(h + 2 * pad)};border-color:${B.logo.colourways.colour.name}"><div style="position:absolute;left:${pad - 2}px;top:${pad - 2}px;width:${px(w)}">${art}</div></div>`;
      } else rc += `<div class="g2-lg" style="left:${px(lx)};top:${px(ly)};width:${px(w)};${m.extra || ''}">${art}</div>`;
      rc += cross(zx + 19, zy + 9.5, zw - 38, zh - 19);
      rc += block(T['c-strong'], { x: 289, w: 228, baseline: zy + U, lines: [name], cls: 'c-strong' }).html
        + block(T['c-note'], { x: 289, w: 228, baseline: zy + 2 * U, text: why, cls: 'c-note' }).html;
    });
    return spread(ctx, 'logo-misuse', { verso: vc, recto: rc, clear });
  },
};

export function css() {
  return `.pg .g2-lg{position:absolute;z-index:2;transform-origin:50% 50%}
.pg .g2-lg svg{display:block}
.pg .g2-cut{z-index:1;box-sizing:border-box;box-shadow:0 1px 0 oklch(0.3 0.01 245 / 0.10),0 4px 10px -4px oklch(0.3 0.01 245 / 0.22)}
.pg .g2-cut.edge{border:1px solid var(--fold);border-left:0}
.pg .g2-cut.edge.r{border:1px solid var(--fold);border-right:0}
.pg .g2-card{z-index:1;box-sizing:border-box;overflow:hidden}
.pg .g2-card.edge{border:1px solid var(--fold)}
.pg .g2-unit{position:absolute;z-index:3;box-sizing:border-box;border:1px solid var(--graphite)}
.pg .g2-ruler{padding:0;text-align:center;line-height:19px}
.pg .g2-struck{text-decoration:line-through;text-decoration-thickness:1px}
.pg .g2-strike{position:absolute;z-index:3;height:1.5px;background:var(--graphite-ink)}
.pg .g2-cross{position:absolute;z-index:3;overflow:visible}
.pg .g2-cross .u{stroke:var(--paper);stroke-width:4}
.pg .g2-cross .o{stroke:var(--graphite-ink);stroke-width:1.5}
.pg .g2-boxed{box-sizing:border-box;border:2px solid}`;
}
