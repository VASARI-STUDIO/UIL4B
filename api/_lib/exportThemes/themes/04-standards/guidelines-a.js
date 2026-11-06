// Guidelines pages for theme 04, run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Styles are in css-a.js (classes start a-). Helpers are in helpers.js.
// The standards manual: every page is a numbered clause (title column on the left), and the work is drawn the way the manual draws it:
// chip sheets with tint tear-strips, construction sheets on an x grid, plates with a ruled header, rulers at true size, misuse drawn on the applications.
import { A, std, crop, VIEWS, wharfPanel, drawnLogo } from './helpers.js';

const hexName = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
const isGround = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();
const sentences = (s) => s.split(/(?<=\.)\s+/);
const words = (s) => s.trim().split(/\s+/).length;
const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0] || '');
const label = (t) => `<span style="font-weight:600;color:var(--ink)">${A(t)}</span>`;
// the unit x in screen px for a logo drawn at a given width, and a length printed as a multiple of x
const xOf = (ctx) => ctx.logo.geo.x || ctx.logo.geo.cap / 10;
const mult = (v, x) => `${Math.round((v / x) * 10) / 10}x`;
const px1 = (n) => (Math.round(n * 10) / 10).toString();
const refOf = (ctx, id) => ctx.pages.find((p) => p.id === id)?.ref || '';
// the colour that reads best on a brand colour: the pair the brand lists for it, else the better of text and ground
const inkOn = (ctx, hex) => {
  const p = ctx.pairs.find((q) => q.bgHex.toLowerCase() === hex.toLowerCase());
  if (p) return p.fgHex;
  const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g;
};
// a caption with its clause number in the left column
const fc = (no, b, t, cls = '') => `<figcaption class="cap a-fc ${cls}"><span class="num">${no}</span><span><b>${b}</b>${t}</span></figcaption>`;
let uid = 0;

// dimension lines for the drawings: a line with an end tick at each end and its label
const dimV = (x, y1, y2, text, side = 1) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}"/><line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}"/><text x="${x + side * 10}" y="${(y1 + y2) / 2 + 4}" text-anchor="${side > 0 ? 'start' : 'end'}">${A(text)}</text>`;
const dimH = (y, x1, x2, text, anchor = 'middle', tx) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/><text x="${tx ?? (x1 + x2) / 2}" y="${y - 8}" text-anchor="${anchor}">${A(text)}</text>`;
const guide = (y, x1, x2) => `<line class="g" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;

// the departures board: the brand's own rows from the product content, the boarding row on the highlight colour
const board = (ctx, n = 3) => {
  const st = Object.fromEntries(ctx.brand.ui.status.map((s) => [s.id, s.label]));
  const rows = ctx.brand.ui.screen.content.deliveries.filter((d) => /^\d\d:\d\d/.test(ctx.real(d.when))).slice(0, n);
  // the time and its note are split in the showcase only; the slot edition shows the whole placeholder in the time column
  const slot = ctx.edition === 'slot';
  return `<ul class="a-board${slot ? ' a-board--slot ph-tight' : ''}">${rows.map((d, i) => { const [t, ...r] = ctx.edition === 'slot' ? [d.when] : d.when.split(', ');
    return `<li class="${i === 0 ? 'a-bd--on' : ''}"><span class="a-bt disp num">${A(t)}</span><span class="a-bto">${A(d.to)}</span>${slot ? '' : `<span class="a-bw num">${A(r.join(', '))}</span>`}<span class="a-bs">${A(st[d.status] || '')}</span></li>`; }).join('')}</ul>`;
};

const SMALLX = `<svg class="a-sx" viewBox="0 0 12 12" width="12" height="12" role="img" aria-label="Not that"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" fill="none"/></svg>`;
// registration marks at the four corners of a plate
const REG = '<i class="a-reg a-r1"></i><i class="a-reg a-r2"></i><i class="a-reg a-r3"></i><i class="a-reg a-r4"></i>';

// clear space drawn round a logo of width lw: the clear zone is a ring of x squares round the protected area
function zone(ctx, lw, { marks = true } = {}) {
  const L = ctx.logo, g = L.geos.colour, cw = ctx.brand.logo.colourways.colour, s = lw / g.w, lh = g.h * s, X = L.geo.unit * s;
  const zw = lw + 2 * X, zh = lh + 2 * X, ux = mult(L.geo.unit, xOf(ctx)), id = `zg${++uid}`;
  const m = (st) => `<span class="a-zm" style="${st}"><b>${ux}</b></span>`;
  const labels = marks ? m(`left:${X}px;top:0;width:${lw}px;height:${X}px`) + m(`left:${X}px;bottom:0;width:${lw}px;height:${X}px`) + m(`left:0;top:${X}px;width:${X}px;height:${lh}px`) + m(`right:0;top:${X}px;width:${X}px;height:${lh}px`) : '';
  // the grid is one x square; below 5 px it would read as a solid tone, so it is left out
  const grid = X >= 5 ? `<svg class="a-zg" width="${zw.toFixed(1)}" height="${zh.toFixed(1)}" aria-hidden="true"><defs><pattern id="${id}" width="${X.toFixed(3)}" height="${X.toFixed(3)}" patternUnits="userSpaceOnUse"><path d="M${X.toFixed(3)} 0V${X.toFixed(3)}M0 ${X.toFixed(3)}H${X.toFixed(3)}" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>` : '';
  return { w: zw, h: zh, X, html: `<div class="a-zone" style="width:${zw.toFixed(1)}px;height:${zh.toFixed(1)}px">${grid}<div class="a-zin" style="left:${X.toFixed(1)}px;top:${X.toFixed(1)}px;width:${lw}px;height:${lh.toFixed(1)}px">${L.html('colour', { width: lw, color: cw.name, label: lw < 140 ? 'Logo' : 'Your logo goes here' })}</div>${labels}</div>` };
}

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand, [first, ...rest] = sentences(B.description), ref = refOf(ctx, 'intro');
    // the plate is dimensioned like a drawing: the width of each column above the rows
    const dims = (ctx.edition === 'slot' ? ['to fit', 'to fit', '110 px'] : ['124 px', 'to fit', '150 px', '110 px']).map((t) => `<span>${t}</span>`).join('');
    const work = `<div class="a-intro"><div class="a-i1"><span class="num a-no">${ref}.3</span><h1 class="disp a-h1">${A(first)}</h1></div>
<figure class="a-plate">${REG}<div class="a-bdim${ctx.edition === 'slot' ? ' a-bdim--slot' : ''} num" aria-hidden="true">${dims}</div>${board(ctx)}${fc(`${ref}.4`, 'The next departures', `As a passenger sees them. The boarding row is the one row on ${A(hexName(ctx, ctx.brand.logo.colourways['on-buoy'].ground))}.`)}</figure></div>`;
    return std(ctx, 'intro', { lead: A(rest.join(' ')), rules: [`${label('What it does.')} ${A(B.product)}`, `${label('Who it serves.')} ${A(B.audience)}`], work });
  },

  personality(ctx) {
    const B = ctx.brand, n = B.personality.length, [l1, l2] = B.lines.others, ref = refOf(ctx, 'personality');
    const num = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][n] || n;
    const rows = B.personality.map((t, i) => `<li><span class="num a-no">${ref}.${i + 1}</span><h2 class="disp a-trait">${A(t.trait)}</h2><p class="a-means">${A(t.means)}</p></li>`).join('');
    const work = `<div class="a-pers"><ul class="a-traits" style="grid-template-columns:repeat(${n <= 3 ? n : 2},minmax(0,1fr))">${rows}</ul><p class="a-lines"><span class="num a-no">${ref}.${n + 1}</span><span class="disp">${A(l1)}</span><span class="disp">${A(l2)}</span></p></div>`;
    return std(ctx, 'personality', { lead: `${num} traits shape how ${A(B.name)} sounds and behaves. Two lines say it in a breath.`, work });
  },

  voice(ctx) {
    const B = ctx.brand, P = B.voice.principles, ref = refOf(ctx, 'voice');
    const rows = P.map((p, i) => `<li><span class="a-vn disp num">${ref}.${i + 1}</span><div><b class="a-vb">${A(p.title)}</b><p class="disp a-vx">${A(p.example)}</p></div></li>`).join('');
    return std(ctx, 'voice', { lead: `${P.length} habits keep ${A(B.name)} sounding like itself. Each one is shown as a passenger would read it.`, work: `<ol class="a-vlist">${rows}</ol>` });
  },

  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis, ref = refOf(ctx, 'write-this');
    const rows = W.map((r, i) => `<li><span class="num a-no">${ref}.${i + 1}</span><div class="a-wc"><p class="disp a-w">${A(r.write)}</p><p class="a-n">${SMALLX}<span class="a-nl">Not that</span><s>${A(r.not)}</s></p></div><p class="a-b">${A(r.because)}</p></li>`).join('');
    const work = `<div class="a-wt"><div class="a-th"><span></span><span>Write this</span><span>Because</span></div><ul>${rows}</ul></div>`;
    return std(ctx, 'write-this', { lead: `${W.length} lines as a passenger would say them, beside the lines they replace.`, work });
  },

  messaging(ctx) {
    const B = ctx.brand, V = B.voice, all = [B.lines.primary, ...B.lines.others], ref = refOf(ctx, 'messaging');
    const r0 = sentences(V.nameRules).length; // the title column already numbers the name rules
    const lines = all.map((l, i) => `<li class="${i ? '' : 'a-first'}"><span class="num a-no">${ref}.${r0 + i + 1}</span><span class="disp">${A(l)}</span></li>`).join('');
    const n = r0 + all.length;
    const work = `<div class="a-msg"><div><h3 class="h3">Lines in use</h3><ul class="a-linelist">${lines}</ul></div>
<div class="a-bp"><div><h3 class="h3"><span class="num a-no">${ref}.${n + 1}</span>Short boilerplate, ${words(ctx.real(V.boilerplate25))} words</h3><p class="a-bpt">${A(V.boilerplate25)}</p></div><div><h3 class="h3"><span class="num a-no">${ref}.${n + 2}</span>Long boilerplate, ${words(ctx.real(V.boilerplate50))} words</h3><p class="a-bpt">${A(V.boilerplate50)}</p></div></div></div>`;
    return std(ctx, 'messaging', { lead: `Three lines to use, two boilerplates to paste, and one way to write the name.`, rules: sentences(V.nameRules).map(A), work });
  },

  // the construction sheet: the logo on a grid of x squares, the clear zone dashed round it, every length dimensioned in x
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, g = L.geos.colour, show = ctx.edition === 'showcase', ref = refOf(ctx, 'logo');
    const lw = 520, s = lw / g.w, x = xOf(ctx) * s, cap = L.geo.cap * s, h = g.h * s, U = L.geo.unit * s, gap = 2, CW = 721, CH = 530;
    const snap = (v) => Math.round(v / x) * x, ox = snap(64), oy = snap((CH - h) / 2 - 16), tx = lw + 28, id = `lg${++uid}`;
    const f = (n) => +n.toFixed(2);
    // ruler ticks on the top and left edges at every 6x, counted from the logo's own corner
    let ruler = '';
    for (let k = 1; ox + k * 6 * x < CW - 40; k++) ruler += `<text x="${f(ox + k * 6 * x)}" y="12" text-anchor="middle">${k * 6}</text>`;
    for (let k = 1; oy - k * 6 * x > 24; k++) ruler += `<text x="${f(ox - 8)}" y="${f(oy - k * 6 * x + 4)}" text-anchor="end">${k * 6}</text>`;
    for (let k = 1; oy + h + k * 6 * x < CH - 10; k++) ruler += `<text x="${f(ox - 8)}" y="${f(oy + h + k * 6 * x + 4)}" text-anchor="end">${k * 6}</text>`;
    let d = '';
    if (show) {
      d += guide(0, lw, tx + 40) + guide(cap, lw, tx + 40) + guide(cap + gap * x, lw, tx + 40) + guide(h, lw, tx + 40);
      d += dimV(tx, 0, cap, mult(cap, x)) + dimV(tx, cap, cap + gap * x, mult(gap * x, x)) + dimV(tx, cap + gap * x, h, mult(h - cap - gap * x, x));
      d += dimV(tx + 44, 0, h, mult(h, x));
      d += dimH(h + 36, 0, 6 * x, '', 'start') + `<text x="${f(6 * x + 10)}" y="${f(h + 40)}">Repeats every 6x</text>`;
      d += dimH(h + 78, 0, lw, 'The wake is as long as the name');
    } else {
      d += dimV(tx, 0, h, mult(h, x)) + dimH(h + 36, 0, lw, 'Width of the logo');
    }
    const ux = mult(L.geo.unit, xOf(ctx)), zy = oy + h / 2;
    const sheet = `<svg class="a-grid" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true"><defs><pattern id="${id}a" width="${f(x)}" height="${f(x)}" patternUnits="userSpaceOnUse"><path d="M${f(x)} 0V${f(x)}M0 ${f(x)}H${f(x)}" fill="none"/></pattern><pattern id="${id}b" width="${f(6 * x)}" height="${f(6 * x)}" patternUnits="userSpaceOnUse"><path d="M${f(6 * x)} 0V${f(6 * x)}M0 ${f(6 * x)}H${f(6 * x)}" fill="none"/></pattern></defs><rect width="${CW}" height="${CH}" fill="url(#${id}a)" class="m1"/><rect width="${CW}" height="${CH}" fill="url(#${id}b)" class="m6"/></svg>`;
    const over = `<svg class="a-dim" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true">${ruler}<rect class="zone" x="${f(ox - U)}" y="${f(oy - U)}" width="${f(lw + 2 * U)}" height="${f(h + 2 * U)}"/>${dimH(zy, ox - U, ox, ux, 'end', ox - U - 6)}<g transform="translate(${f(ox)} ${f(oy)})">${d}</g></svg>`;
    const work = `<figure class="a-lg"><div class="a-draw" style="width:${CW}px;height:${CH}px">${sheet}<div class="a-dlogo" style="left:${f(ox)}px;top:${f(oy)}px">${L.html('colour', { width: lw, color: cw.name, label: 'Your logo goes here' })}</div>${over}</div>${fc(`${ref}.${sentences(B.logo.idea).length}`, A(L.labels.colour), `${A(B.logo.when.colour)} One square of the grid is x. The dashed line is the clear zone.`)}</figure>`;
    const idea = sentences(B.logo.idea);
    return std(ctx, 'logo', { lead: A(idea[0]), rules: idea.slice(1).map(A), work });
  },

  'clear-space'(ctx) {
    const L = ctx.logo, x = xOf(ctx), m = L.minSize, ref = refOf(ctx, 'clear-space');
    const px = (lw) => px1(x * lw / L.geos.colour.w);
    const plate = (k, t, w, marks) => { const z = zone(ctx, w, { marks });
      return `<figure class="a-pl"><div class="a-plh"><span class="num">${ref}.${k + 3}</span><b>${t}</b><span>x is ${px(w)} px at ${w} px wide.</span></div><div class="a-plz">${z.html}</div></figure>`; };
    const work = `<div class="a-cs">${plate(1, 'Drawn at 680 px wide', 680, true)}${plate(2, '300 px wide', 300, false)}${plate(3, `${m.screenPx} px wide, the smallest`, m.screenPx, false)}</div>`;
    const unit = ctx.edition === 'slot' ? `x is ${L.clearShare}% of the logo's height.` : `x is the stroke of the wake, ${L.clearShare}% of the logo's height.`;
    return std(ctx, 'clear-space', { lead: `Keep a clear zone round the logo, ${mult(L.geo.unit, x)} on every side. ${A(unit)}`, rules: ['Measure from the edge of the logo, on all four sides.', 'Nothing enters the zone: no type, no other logos, no edges.', 'Photo edges count as edges.'], work });
  },

  // minimum size at true size, each with a ruler: pixels for the screen, millimetres for print
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour, x = xOf(ctx), mmPx = (mm) => (mm * 96) / 25.4, ref = refOf(ctx, 'min-size');
    const ruler = (unitPx, len, minor, mid, major, unit) => {
      let t = '';
      for (let i = 0; i <= len; i += minor) { const big = i % major === 0, med = i % mid === 0, hgt = big ? 12 : med ? 8 : 5, X = (i * unitPx).toFixed(2);
        t += `<line x1="${X}" y1="0" x2="${X}" y2="${hgt}"/>${big && i ? `<text x="${X}" y="24" text-anchor="middle">${i}</text>` : ''}`; }
      const end = (len * unitPx).toFixed(2);
      return `<svg class="a-dim a-ruler" width="${(len * unitPx + 40).toFixed(1)}" height="30" viewBox="-1 0 ${(len * unitPx + 40).toFixed(1)} 30" aria-hidden="true"><line x1="0" y1="0" x2="${end}" y2="0"/>${t}<text x="${(len * unitPx + 24).toFixed(1)}" y="24" text-anchor="start">${unit}</text></svg>`;
    };
    const panel = (k, title, w, wText, hText, note, rl) => `<figure class="a-pl"><div class="a-plh"><span class="num">${ref}.${k + 3}</span><b>${title}: ${wText} wide</b><span>${hText} high. ${note}</span></div><div class="a-msbox"><div class="a-mslogo">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}<svg class="a-dim" width="${(w + 2).toFixed(1)}" height="24" viewBox="-1 0 ${(w + 2).toFixed(1)} 24" aria-hidden="true">${dimH(18, 0, w, wText)}</svg>${rl}</div></div></figure>`;
    const scr = Math.ceil((m.screenPx + 20) / 20) * 20, prn = Math.ceil((m.printMm + 3) / 5) * 5;
    const work = `<div class="a-ms2">${panel(1, 'Screen', m.screenPx, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or screen.', ruler(1, scr, 4, 4, 20, 'px'))}${panel(2, 'Print', mmPx(m.printMm), `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.', ruler(mmPx(1), prn, 1, 5, 10, 'mm'))}</div>`;
    const wake = px1(x * m.screenPx / L.geos.colour.w);
    return std(ctx, 'min-size', { lead: 'The logo never goes smaller than these widths. Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.', rules: [`On screen, ${m.screenPx} px wide. The wake is ${wake} px thick.`, `In print, ${m.printMm} mm wide.`, 'Below either width, use the symbol, or leave the logo out.'], work });
  },

  // the versions as four numbered clauses in a strict grid, each logo at one size on its own ground
  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, ref = refOf(ctx, 'logo-grounds');
    const keys = ['colour', 'on-buoy', 'reversed'];
    const desc = (c) => (c.name.toLowerCase() === (c.wake || c.name).toLowerCase() ? `all ${hexName(ctx, c.name)}` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.wake)} wake`);
    const cell = (k, i) => { const c = cw[k];
      return `<figure class="a-g"><div class="a-gt ${isGround(ctx, c.ground) ? 'hairline' : ''}" style="background:${c.ground}">${L.html('colour', { width: 240, colourway: k, color: c.name, label: 'Logo' })}</div>${fc(`${ref}.${i + 2}`, `On ${A(hexName(ctx, c.ground))}`, A(desc(c)))}</figure>`; };
    const md = cw['mono-dark'];
    const photo = `<figure class="a-g"><div class="a-gt a-gt--photo hairline">${crop(ctx, [-30, -88, 140, 100], { label: 'Drawing of the ferry crossing, standing in for a photograph', wharf: true, cls: 'a-fillimg' })}<span class="a-onphoto">${L.html('mono-dark', { width: 152, colourway: 'mono-dark', color: md.name, label: 'Logo' })}</span></div>${fc(`${ref}.6`, 'On a photo', 'Mono dark on a light, quiet part; mono light on a dark one. Drawn here until photographs are shot.')}</figure>`;
    const work = `<div class="a-ggrid">${cell('on-buoy', 1)}${cell('colour', 2)}${cell('reversed', 3)}${photo}</div>`;
    const grounds = keys.map((k) => hexName(ctx, cw[k].ground));
    return std(ctx, 'logo-grounds', { lead: `The logo sits on ${A(join(grounds))}, each in its own colourway. On a photo it takes mono dark or mono light, on a quiet area.`, rules: ['Each ground has one colourway. Do not mix them.', 'Keep the logo clear of faces and edges.'], work });
  },

  // the don'ts drawn on the applications they happen on (the wharf panel, the hull, the poster), one numbered clause each
  'logo-misuse'(ctx) {
    const L = ctx.logo, hull = ctx.roles.light.text, ref = refOf(ctx, 'logo-misuse');
    const act = byRole(ctx, 'action'), off = ctx.C.toOklch(act.hex), wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    // the logo on a panel at height h, its width from its own proportions; tf and filter are the misuse
    const onPanel = (id, h, x, y, o = {}) => drawnLogo(ctx, id, x, y, h, { colourway: id, frame: id === 'reversed' ? 'var(--dark-ink)' : 'var(--ink)', ...o });
    const g = L.geos.reversed, h0 = (40 * g.h) / g.w, gc = L.geos.colour, hc = (44 * gc.h) / gc.w;
    const boxed = `<rect class="dr-pl" x="5" y="3" width="50" height="${+(h0 + 10).toFixed(2)}" style="stroke-width:2"/>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', wharfPanel(ctx, onPanel('reversed', h0, 8, 8, { transform: 'translate(8 8) scale(2 0.55) translate(-8 -8)' }), { label: 'Drawing: the logo stretched across a wharf panel' })],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', crop(ctx, VIEWS.topsides, { label: 'Drawing: the name on the hull in the wrong colour', ferry: { logoFill: wrong } })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', crop(ctx, VIEWS.topsides, { label: 'Drawing: the name on the hull tilted', ferry: { logoTf: 'rotate(-12 80 -6.3)' } })],
      ['Effects', 'No shadows, glows or bevels.', wharfPanel(ctx, onPanel('colour', hc, 8, 10, { filter: `drop-shadow(3px 4px 2px rgba(${ctx.C.hexToRgb(hull).join(',')},0.55))` }), { dark: false, label: 'Drawing: the logo with a drop shadow on a timetable poster' })],
      ['Busy ground', 'Never on a busy picture. Use mono on a quiet part of one.', crop(ctx, [28, -32, 104, 40], { label: 'Drawing: the logo over the wheelhouse and rails', wharf: true, extra: drawnLogo(ctx, 'colour', 46, -19, 6, { colourway: 'colour', frame: 'var(--ink)' }) })],
      ['Outlined or boxed', 'No outlines, no boxes, no frames round it.', wharfPanel(ctx, `${onPanel('reversed', h0, 10, 8)}${boxed}`, { label: 'Drawing: the logo boxed on a wharf panel' })],
    ];
    const tile = ([t, cap, html], i) => `<figure class="a-m"><div class="a-mt">${html}</div>${fc(`${ref}.${i + 1}`, t, cap)}</figure>`;
    return std(ctx, 'logo-misuse', { lead: 'Six ways the logo goes wrong, each drawn on the piece it happens on. Use the supplied files as they are, and none of these.', work: `<div class="a-mgrid">${items.map(tile).join('')}</div>` });
  },

  // the chip sheet: large square chips in a strict grid, each with its clause number
  palette(ctx) {
    const cs = ctx.colours, action = byRole(ctx, 'action'), V = ctx.brand.voice.principles, W = ctx.brand.voice.writeThis, sample = ctx.brand.type.sample, ref = refOf(ctx, 'palette');
    const lead = `${cs.length} colours, each named for where it lands. ${action.name} is the one action on a screen, and ${byRole(ctx, 'highlight').name} is fill only.`;
    const texts = [sample.headline, V[0].example, W[2].write, ctx.brand.lines.others[1], V[1].example];
    const chip = (c, i) => `<figure><div class="a-ch ${ctx.ratio(ctx.roles.light.surface, c.hex) < 1.3 ? 'hairline' : ''}" style="background:${c.hex};color:${inkOn(ctx, c.hex)}"><span class="num a-cno">${ref}.${i + 1}</span><span class="${i < 2 ? 'disp ' : ''}a-ptext">${A(texts[i % texts.length])}</span><span class="a-pn">${A(c.name)}</span></div><figcaption class="cap"><b>${A(c.name)}, ${A(ctx.cap(c.role))}</b>${A(c.lands)}</figcaption></figure>`;
    const vref = refOf(ctx, 'colour-values');
    const tones = `<figure><div class="a-ch a-ch--t hairline">${ctx.tones.map((t) => `<span><i class="a-sw ${isGround(ctx, t.hex) ? 'hairline' : ''}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></span></span>`).join('')}</div><figcaption class="cap"><b>Tones</b>${vref ? `Their ramps and values are at ${vref}.` : 'Rules and quiet text.'}</figcaption></figure>`;
    return std(ctx, 'palette', { lead, work: `<div class="a-pal">${cs.map(chip).join('')}${tones}</div>` });
  },

  proportion(ctx) {
    // ordered by share: the largest is the ground, the next the second field, the rest sit side by side; areas are true to the percent
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = (c) => Math.round(c.share * 100), ref = refOf(ctx, 'proportion');
    const [g, p, ...rest] = cs, total = cs.reduce((s, c) => s + c.share, 0), col2 = 1 - g.share / total, pH = p.share / total / col2, restW = rest.reduce((s, c) => s + c.share, 0);
    // a block thinner than its own number goes unlabelled; the list beside the page carries every number
    const block = (c, i) => `<div style="background:${c.hex};color:${inkOn(ctx, c.hex)}">${c.share / total >= 0.03 ? `<span class="num a-bn">${ref}.${i + 1}</span>` : ''}</div>`;
    const page = `<div class="a-pg hairline" style="grid-template-columns:${(g.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr">${block(g, 0)}<div class="a-pgcol" style="grid-template-rows:${(pH * 100).toFixed(2)}fr ${((1 - pH) * 100).toFixed(2)}fr">${block(p, 1)}<div class="a-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map((c, i) => block(c, i + 2)).join('')}</div></div></div>`;
    const list = cs.map((c, i) => `<li><span class="num a-no">${ref}.${i + 1}</span><span class="a-pcn"><i class="a-sw ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></i>${A(c.name)}</span><span class="a-pct disp num">${pc(c)}%</span><span class="a-bar hairline" aria-hidden="true"><i style="width:${pc(c)}%;background:${c.hex}"></i></span></li>`).join('');
    const work = `<div class="a-prop"><figure><div class="a-br" aria-hidden="true"></div>${page}<figcaption class="cap"><b>One page, drawn to scale</b>Each colour's area is its share of the page.</figcaption></figure><ul class="a-plist">${list}</ul></div>`;
    const lead = `Most of every page is ${g.name}. ${p.name} carries the ${p.role}. ${join(rest.map((c) => `${c.name} ${pc(c)}`))} per cent, so they stay the loudest things on the page.`;
    return std(ctx, 'proportion', { lead: A(lead), work });
  },

  // the tint table: one column per colour, a chip, its ramp as perforated tear-strips, its values in a spec block
  'colour-values'(ctx) {
    const surf = ctx.roles.light.surface, ink = ctx.roles.light.text, ref = refOf(ctx, 'colour-values');
    const steps = Object.keys(ctx.colours[0].ramp);
    const strip = (c, k) => { const hx = c.ramp[k];
      return `<i class="a-ts ${+k === c.rampBase ? 'a-ts--base ' : ''}${ctx.ratio(hx, surf) < 1.25 ? 'hairline' : ''}" style="background:${hx}"><span class="num">${k}</span></i>`; };
    const col = (c, i) => `<div class="a-vcol"><div class="a-vchip ${isGround(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex};color:${inkOn(ctx, c.hex)}"><span class="num">${ref}.${i + 2}</span></div><b class="a-vnm">${A(c.name)}</b>
${c.rampBase === 50 ? `<p class="a-vnote">The ground. No tints.</p>` : `<span class="a-tint">${steps.map((k) => strip(c, k)).join('')}</span>`}
<dl class="a-spec"><dt>HEX</dt><dd class="a-mono">${A(c.hex)}</dd><dt>RGB</dt><dd class="a-mono">${A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))}</dd><dt>OKLCH</dt><dd class="a-mono a-ok">${A(c.oklch).replace(/^(oklch\([\d.]+) /, "$1<br>")}</dd></dl></div>`;
    const tones = ctx.tones.map((t, i) => `<li><i class="a-sw ${isGround(ctx, t.hex) ? 'hairline' : ''}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></span></li>`).join('');
    const work = `<div class="a-vals"><div class="a-vgrid">${ctx.colours.map(col).join('')}</div><div><h3 class="h3">Tones</h3><ul class="a-tones">${tones}</ul></div></div>`;
    return std(ctx, 'colour-values', { lead: `Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(byRole(ctx, 'action').name)} to the proof.`, rules: ['Every ramp step is in the palette files in the brand kit. The bar beside a step marks the colour itself.'], work });
  },
};
