// Theme 09 Blueprint, wave 2 run B: typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Every redline prints the length it draws. A drawn-down page (grid, layouts, social, signage) says its scale and prints real sizes.
import { A, std, cell } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

// Lettering sheets. The guide lines (baseline, x-height, cap height, descender) and every size a redline prints come from the font file
// itself (opentype.js), not from a guess, so a printed number is the real size of the glyph at that point size.
const fm = (ctx, face, weight) => {
  const F = ctx.brand.fonts[face], have = F.weights.includes(weight) ? weight : F.weights.reduce((b, w) => (Math.abs(w - weight) < Math.abs(b - weight) ? w : b)), stem = `${F.file}-${have}`;  // a face without this weight is measured at its nearest
  const f = ctx.loadFont(stem), u = f.unitsPerEm, bb = (c) => f.charToGlyph(c).getBoundingBox();
  return { f, asc: f.tables.hhea.ascender / u, desc: f.tables.hhea.descender / u, cap: bb('H').y2 / u, xh: bb('x').y2 / u, dn: -bb('p').y1 / u };
};
const n1 = (n) => String(+n.toFixed(1));
// distance from the top of a line box to its baseline. Chrome rounds the ascent and descent to whole px and floors the half-leading (checked with a probe in the page).
const baseOf = (m, size, line) => { const a = Math.round(m.asc * size), d = Math.round(-m.desc * size); return Math.floor((line - (a + d)) / 2) + a; };
const fam = (face) => (face === 'display' ? 'var(--display)' : face === 'mono' ? 'var(--bmono)' : 'var(--body)');
// one line of lettering, positioned by the top of its line box
const lt = (ctx, { face, weight, size, line, x, y, text, st = '' }) => `<span class="b-lt${face === 'display' ? ' disp' : ''}" style="left:${x}px;top:${y}px;font:${weight} ${size}px/${line}px ${fam(face)};${st}">${A(text)}</span>`;
const gl = (x, y, w, kind) => `<i class="b-g b-g--${kind}" style="left:${x}px;top:${Math.round(y)}px;width:${w}px"></i>`;
const guides = (ctx, { face, weight, size, line, x, y, w, kinds = ['base'] }) => {
  const m = fm(ctx, face, weight), b = y + baseOf(m, size, line), at = { base: b, cap: b - m.cap * size, x: b - m.xh * size, dn: b + m.dn * size };
  return kinds.map((k) => gl(x, at[k], w, k)).join('');
};
// word-wrap with real advance widths (summed per glyph: opentype.js cannot shape this font's GSUB), so every line of a drawn paragraph is known and can sit on its own baseline
const wrap = (ctx, face, weight, size, text, maxW, ls = 0) => {
  const f = fm(ctx, face, weight).f, adv = (s) => [...s].reduce((a, c) => a + f.charToGlyph(c).advanceWidth * size / f.unitsPerEm + ls * size, 0), out = [];
  let cur = '';
  for (const w of text.split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && adv(t) > maxW) { out.push(cur); cur = w; } else cur = t; }
  out.push(cur);
  return out;
};

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const px = (k) => (n) => +(n * k).toFixed(2);
const sentence = (s) => s.split(/(?<=\.)\s+/)[0];
const shotTitle = (s) => s.slot.split(':')[0];
// a redline with its number set in a gap in the line, as on a drawing. bg is the ground the number sits on.
// below: the number sits under the line, for a segment too short to hold it in a gap
const dh = (x, y, w, label, { bg = 'var(--ground)', below = false } = {}) => `<i class="rl h" style="left:${x}px;top:${y}px;width:${w}px"></i>` + (below
  ? `<b class="rn" style="left:${x + w / 2}px;top:${y + 8}px;transform:translateX(-50%)">${A(label)}</b>`
  : `<b class="rn rn--gap" style="left:${x + w / 2}px;top:${y - 6}px;background:${bg}">${A(label)}</b>`);
const dv = (x, y, h, label, { side = 'right', bg = 'var(--ground)', gap = false } = {}) => {
  const line = `<i class="rl v" style="left:${x}px;top:${y}px;height:${h}px"></i>`;
  if (gap) return `${line}<b class="rn rn--vgap" style="left:${x}px;top:${y + h / 2}px;background:${bg}">${A(label)}</b>`;
  return `${line}<b class="rn" style="${side === 'right' ? `left:${x + 8}px` : `left:${x - 8}px;transform:translateX(-100%)`};top:${y + h / 2 - 6}px">${A(label)}</b>`;
};
const ic = (ctx, n) => ctx.ui.icon(n, 16);
// a strike across a tile for anything that is not done
const cross = (cls = '') => `<svg class="b-xx ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" vector-effect="non-scaling-stroke"/></svg>`;

const own = {
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, mo = F.mono, sc = ctx.brand.type.scale;
    const dw = cssNum(d.weights[d.weights.length - 1]), W = 682;
    const wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 800: 'Extra bold' };
    const tokensOf = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const tag = (x, y, t) => `<span class="b-gt" style="left:${x}px;top:${Math.round(y) - 15}px">${A(t)}</span>`;
    // sheet 1: the display face at 148 px on drawn guides, with the sizes of its cap height, x-height and descender
    const S1 = 148, T1 = 20, m1 = fm(ctx, 'display', dw), base1 = T1 + baseOf(m1, S1, S1);
    const cap1 = m1.cap * S1, x1 = m1.xh * S1, dn1 = m1.dn * S1, H1 = Math.ceil(base1 + dn1 + 20);
    const g1 = { face: 'display', weight: dw, size: S1, line: S1, x: 0, y: T1 };
    const sheet1 = `<div class="b-sheet" style="height:${H1}px">${lt(ctx, { ...g1, text: 'Aa', st: 'letter-spacing:-0.02em' })}${guides(ctx, { ...g1, w: W, kinds: ['cap', 'x', 'base', 'dn'] })}
${tag(240, base1 - cap1, 'Cap height')}${tag(240, base1 - x1, 'x-height')}${tag(240, base1, 'Baseline')}${tag(240, base1 + dn1, 'Descender')}
${dv(440, T1, S1, String(S1))}${dv(504, base1 - cap1, cap1, n1(cap1))}${dv(568, base1 - x1, x1, n1(x1))}${dv(632, base1, dn1, n1(dn1))}${tag(448, T1 + 2, 'Size')}</div>`;
    const tb1 = `<div class="tb b-ftb"><div class="tbl">${cell('Display face', d.family, true)}${cell('Weight', `${d.weights.join(', ')}. One line a page, never more than two.`)}</div><div class="tbr">${cell('Used for', tokensOf('display'))}${cell('Scale', 'Drawn at 148 px. Every number is px.')}</div></div>`;
    // the character set, each line on its own guides
    const GS = 28, GL = 34, rows = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
    const glyphs = `<div class="b-sheet" style="height:${GL * 3}px">${rows.map((r, i) => { const g = { face: 'display', weight: dw, size: GS, line: GL, x: 0, y: i * GL }; return lt(ctx, { ...g, text: r }) + guides(ctx, { ...g, w: W, kinds: i === 1 ? ['x', 'base'] : ['cap', 'base'] }); }).join('')}</div>`;
    // sheet 2: the body face, one weight a row
    const LC = 150, RH = 52, BS = 24, BL = 32, sample = ctx.brand.lines.primary;
    const wrows = b.weights.map((w, i) => {
      const y = i * RH, top = y + (RH - BL) / 2, m = fm(ctx, 'body', w), bs = top + baseOf(m, BS, BL), g = { face: 'body', weight: w, size: BS, line: BL, x: LC, y: top };
      return `<span class="cap b-wl" style="top:${y + 12}px"><b>${wname[w] || w}</b><span class="num">${w}</span></span>${lt(ctx, { ...g, x: LC + 8, text: sample })}${guides(ctx, { ...g, w: 520 - LC, kinds: ['cap', 'x', 'base'] })}${dv(540, bs - m.cap * BS, m.cap * BS, n1(m.cap * BS))}${dv(620, bs - m.xh * BS, m.xh * BS, n1(m.xh * BS))}`;
    }).join('');
    const bodySheet = `<div class="b-sheet" style="height:${RH * b.weights.length}px">${wrows}${tag(532, 4, 'Cap height')}${tag(612, 4, 'x-height')}</div>`;
    // the mono face, one line
    const MS = 20, ML = 28, mw = cssNum(mo.weights[0]), mm = fm(ctx, 'mono', mw), mtop = 16, mbs = mtop + baseOf(mm, MS, ML), gm = { face: 'mono', weight: mw, size: MS, line: ML, x: LC, y: mtop };
    const mono = `<div class="b-sheet b-sheet--mono" style="height:${mtop + ML + 28}px"><span class="cap b-wl" style="top:12px"><b>${A(mo.family)}, weight ${mo.weights.join(', ')}</b>Only for a hex, a token or a code string.</span>${lt(ctx, { ...gm, x: LC + 8, text: ctx.roles.light.action })}${guides(ctx, { ...gm, w: 520 - LC, kinds: ['cap', 'base'] })}${dv(540, mbs - mm.cap * MS, mm.cap * MS, n1(mm.cap * MS))}</div>`;
    const lic = `<p class="cap b-licence">${A(d.family)} and ${A(mo.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts.</p>`;
    return std(ctx, 'typefaces', `<p class="lead">One family does the work. ${A(d.family)} Extra bold sets the line you read first, and its lighter weights carry everything after it.</p><div class="b-faces">${sheet1}${tb1}<div class="b-gap">${glyphs}</div><div class="b-fhead"><h2 class="b-fname b-fname--body">${A(b.family)}</h2><p class="cap"><b>Body, weights ${b.weights.join(', ')}</b>Used for ${A(tokensOf('body'))}.</p></div>${bodySheet}${mono}${lic}</div>`);
  },

  hierarchy(ctx) {
    const S = ctx.brand.type, c = ctx.brand.ui.screen.content;
    const samples = { display: c.paid, headline: 'Quoted once.', title: 'Measured twice.', lead: ctx.brand.lines.others[0], label: c.form.book, body: sentence(S.sample.paragraph), caption: S.sample.caption };
    const LX = 176, SX = 200, GE = 596, CX = 612, XX = 654;
    const rows = S.scale.map((t) => {
      const H = Math.round(t.size * t.line), m = fm(ctx, t.face, t.weight), Rh = Math.max(H, 64), top = 16 + (Rh - H) / 2, bs = top + baseOf(m, t.size, H);
      const g = { face: t.face, weight: t.weight, size: t.size, line: H, x: SX, y: top };
      return `<li class="b-sc" style="height:${Rh + 32}px"><p class="cap b-sc__k"><b>${A(ctx.cap(t.token))}</b>${t.size} px, line ${t.line}, weight ${t.weight}. ${A(t.use)}</p>${dv(LX, top, H, String(H), { side: 'left' })}${guides(ctx, { ...g, w: GE - SX, kinds: ['cap', 'x', 'base'] })}${lt(ctx, { ...g, text: samples[t.token] || t.use, st: `color:var(--ink)${t.face === 'display' ? ';letter-spacing:-0.01em' : ''}` })}${dv(CX, bs - m.cap * t.size, m.cap * t.size, n1(m.cap * t.size))}${dv(XX, bs - m.xh * t.size, m.xh * t.size, n1(m.xh * t.size))}</li>`;
    }).join('');
    const head = `<li class="b-sch" aria-hidden="true"><span style="left:${LX - 28}px">Line box</span><span style="left:${CX - 6}px">Cap</span><span style="left:${XX - 16}px">x-height</span></li>`;
    const body = tok(ctx, 'body'), cap = tok(ctx, 'caption');
    return std(ctx, 'hierarchy', `<p class="lead">${S.scale.length} steps, each with one job. Reading text is ${body.size} px and captions are ${cap.size} px. Nothing sits between. The redlines are the height of the line box, the cap height and the x-height, in px.</p><ol class="b-scale">${head}${rows}</ol>`);
  },

  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const fam = (t) => ctx.brand.fonts[t.face].family;
    const W = 440, NX = W + 56, TOP = 40;
    const parts = [];
    let y = TOP;
    const setBlock = (t, text, ls = 0) => {
      const pitch = +(t.size * t.line).toFixed(2), m = fm(ctx, t.face, t.weight), lines = wrap(ctx, t.face, t.weight, t.size, text, W, ls);
      const first = y + baseOf(m, t.size, pitch), top = y;
      lines.forEach((ln, i) => {
        const g = { face: t.face, weight: t.weight, size: t.size, line: pitch, x: 0, y: top + i * pitch };
        parts.push(guides(ctx, { ...g, w: W, kinds: i === 0 ? ['cap', 'x', 'base'] : ['base'] }) + lt(ctx, { ...g, text: ln, st: `color:var(--ink);white-space:nowrap${ls ? `;letter-spacing:${ls}em` : ''}` }));
      });
      y += lines.length * pitch;
      return { top, first, pitch, m, n: lines.length, t };
    };
    const note = (top, name, t) => `<div class="b-nt" style="left:${NX}px;top:${Math.round(top)}px"><p class="cap"><b>${name}</b>${t ? `${t.size} px, line ${t.line}, ${A(fam(t))} ${t.weight}` : 'The site shot. Wide crop, camera level, daylight only.'}</p></div>`;
    const A1 = setBlock(h, S.sample.headline, -0.01); y += 32;
    const B1 = setBlock(bd, S.sample.paragraph); y += 32;
    const PH = 276, photoTop = y; y += PH + 16;
    const C1 = setBlock(cp, S.sample.caption);
    const photo = `<div class="b-ab b-uph" style="left:0;top:${photoTop}px;width:${W}px;height:${PH}px">${ctx.photo('site', { style: 'width:100%;height:100%' })}</div>`;
    const dims = `${dh(0, 12, W, `${W} px`)}${dv(-14, A1.first - A1.m.cap * h.size, A1.m.cap * h.size, n1(A1.m.cap * h.size), { side: 'left' })}${A1.n > 1 ? dv(W + 12, A1.first, A1.pitch, n1(A1.pitch)) : ''}${dv(-14, B1.first - B1.m.xh * bd.size, B1.m.xh * bd.size, n1(B1.m.xh * bd.size), { side: 'left' })}${B1.n > 1 ? dv(W + 12, B1.first, B1.pitch, n1(B1.pitch)) : ''}${dv(W + 12, photoTop, PH, String(PH))}`;
    const notes = note(A1.first - A1.m.cap * h.size, 'Headline', h) + note(B1.first - B1.m.cap * bd.size, 'Paragraph', bd) + note(photoTop, 'Photo', null) + note(C1.first - C1.m.cap * cp.size, 'Caption', cp);
    const sheet = `<div class="b-sheet b-uses" style="height:${Math.ceil(y)}px">${parts.join('')}${photo}${dims}${notes}</div>`;
    return std(ctx, 'type-in-use', `<p class="lead">A headline, a paragraph and a caption, set the way ${A(ctx.brand.name)} sets them. The top redline is the width of the text column, the others are cap height, x-height and the line to line distance.</p>${sheet}<div class="grow"></div><div class="tb b-sgtb"><div class="tbl">${cell('Drawing', 'Type in use', true)}${cell('Faces', [...new Set([fam(h), fam(bd)])].join(' and '))}</div><div class="tbr">${cell('Scale', '1 to 1. Every number is px.')}${cell('Sizes', `${h.size}, ${bd.size} and ${cp.size} px`)}</div></div>`);
  },

  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, action = ctx.roles.light.action;
    const prices = c.deliveries.slice(0, 3).map((d) => d.price);
    const DH = 72;
    const dsp = (txt, st = '') => `<span class="disp b-d" style="font-size:28px;line-height:32px;${st}">${A(txt)}</span>`;
    const col = (st) => `<span class="b-col num" style="${st}">${prices.map((p) => `<span>${A(p)}</span>`).join('')}</span>`;
    const mdisp = fm(ctx, 'display', ctx.brand.fonts.display.weights.at(-1)), m4 = fm(ctx, 'body', 400), m5 = fm(ctx, 'body', 500), m6 = fm(ctx, 'body', 600), mm = fm(ctx, 'mono', 400);
    // a guide for one line of a demo: the demo centres its lines in DH px, so the top is known
    const gd = (m, size, line, top, kinds) => { const b = top + baseOf(m, size, line); const at = { base: b, cap: b - m.cap * size, x: b - m.xh * size }; return kinds.map((k) => gl(0, at[k], 301, k)).join(''); };
    const ctr = (line) => (DH - line) / 2;
    const demos = [
      [dsp('Quoted once.'), dsp('Quoted once.', 'text-transform:uppercase;letter-spacing:0.14em;font-size:22px'), gd(mdisp, 28, 32, ctr(32), ['cap', 'x', 'base']), gd(mdisp, 22, 32, ctr(32), ['cap', 'base'])],
      [`<span class="b-d" style="font-size:16px;line-height:24px">${A(c.riderNote)}</span>`, `<span class="b-d" style="font-size:9px;line-height:12px">${A(c.riderNote)}</span>`, gd(m4, 16, 24, ctr(24), ['x', 'base']), gd(m4, 9, 12, ctr(12), ['x', 'base'])],
      [`<span class="b-d b-two"><span style="font-size:16px;font-weight:600;line-height:22px">${A(c.rider)}</span><span style="font-size:13px;line-height:18px;color:var(--quiet)">${A(c.riderNote)}</span></span>`, `<span class="b-none">Not drawn. Faded text cannot be measured against its ground, so it is never used.</span>`, gd(m6, 16, 22, ctr(40), ['x', 'base']) + gd(m4, 13, 18, ctr(40) + 22, ['x', 'base']), ''],
      [col('text-align:right;font-variant-numeric:tabular-nums;border-right:1px solid var(--accent);padding-right:8px;width:104px'), col('text-align:left;font-variant-numeric:proportional-nums'), [0, 1, 2].map((i) => gd(m5, 16, 20, ctr(60) + i * 20, ['base'])).join(''), [0, 1, 2].map((i) => gd(m5, 16, 20, ctr(60) + i * 20, ['base'])).join('')],
      [`<span class="b-mono b-d">${A(action)}</span>`, `<span class="b-mono b-d">${A(c.form.book)}</span>`, gd(mm, 13, 18.2, ctr(18.2), ['cap', 'base']), gd(mm, 13, 18.2, ctr(18.2), ['cap', 'base'])],
    ];
    const rows = R.slice(0, demos.length).map((r, i) => `<li class="b-rule"><span class="b-bubble b-bubble--s b-nb num">${i + 1}</span><div class="b-rule__c"><div class="b-demo">${demos[i][2]}${demos[i][0]}</div><p class="b-rt">${ic(ctx, 'check')}<span>${A(r.do)}</span></p></div><div class="b-rule__c"><div class="b-demo b-demo--no">${demos[i][3]}${demos[i][1]}${cross('b-xs')}</div><p class="b-rt b-rt--no">${ic(ctx, 'x')}<span>${A(r.dont)}</span></p></div></li>`).join('');
    return std(ctx, 'type-rules', `<p class="lead">${Math.min(R.length, demos.length)} rules for setting type. Each says what to do, and what never happens. Every example sits on its drawn baseline.</p><div class="b-rulehead"><span></span><h3 class="b-h3">Do</h3><h3 class="b-h3">Don't</h3></div><ul class="b-rules">${rows}</ul>`);
  },

  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const W = 682, H = 400, typeW = Math.round(W / 3);
    const level = Math.round(H * 0.62);
    const frame = `<div class="b-pd" style="height:${H}px"><div class="b-pd__img">${ctx.photo('site', { style: `width:100%;height:100%;padding:16px ${typeW + 32}px 16px 16px` })}</div>
<i class="rl h" style="left:0;top:${level}px;width:${W - typeW}px"></i><span class="b-tag" style="left:12px;top:${level - 28}px">Camera level</span>
<i class="b-typezone" style="left:${W - typeW + 16}px;top:16px;width:${typeW - 32}px;height:${H - 32}px"></i><span class="b-tag" style="left:${W - typeW + 28}px;top:28px">One line of type goes here</span></div>
<div class="b-pdd">${dh(0, 18, W - typeW, 'Two thirds: the room')}${dh(W - typeW, 18, typeW, 'One third: the line')}</div>`;
    // the five lines of direction are the notes of the sheet, set in its title block
    const tb = `<div class="tb b-pdtb"><div class="tbl">${cell('Subject', D.subject)}${cell('Light', D.light)}${cell('Crop', D.crop)}</div><div class="tbr">${cell('Colour', D.colour)}${cell('People', D.people)}${cell('Drawing', 'Photography', true)}</div></div>`;
    return std(ctx, 'photo-direction', `<p class="lead">Rooms being measured, built and finished, in daylight, with the camera held level. Five lines cover every photograph.</p><div class="b-pdw">${frame}</div>${tb}`);
  },

  'shot-list'(ctx) {
    // a drawing register: one row a shot, with its frame, the brief and where the picture comes from
    const rows = ctx.brand.imagery.shots.map((s, i) => {
      const note = s.slot.split(': ').slice(1).join(': ').replace(/^./, (m) => m.toUpperCase());
      const body = s.photo ? ctx.photo(s.id, { style: 'width:100%;height:100%' }) : `<div class="photo-slot b-slot" role="img" aria-label="${A('Photo slot. ' + s.slot)}"></div>`;
      return `<li class="b-reg"><span class="b-bubble b-bubble--s b-nb num">${i + 1}</span><div class="b-reg__f">${body}</div><div class="b-reg__t"><h3 class="b-reg__h">${A(shotTitle(s))}</h3><p>${A(note)}</p></div><p class="cap b-reg__s">${s.photo ? `Photo from ${A(s.credit)}` : 'Art-directed, to be shot to this brief'}</p></li>`;
    }).join('');
    const head = '<li class="b-reg b-reg--h" aria-hidden="true"><span>Shot</span><span>Frame</span><span>Subject, crop and light</span><span>Source</span></li>';
    return std(ctx, 'shot-list', `<p class="lead">Six shots cover a job from first measure to finished room. Each one says the subject, the crop and the light.</p><ol class="b-regs">${head}${rows}</ol>`);
  },

  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, line = ctx.brand.lines.others[0], rev = ctx.brand.logo.colourways.reversed;
    const [r, g, b] = ctx.C.hexToRgb(ctx.roles.light.action);
    const full = 'width:100%;height:100%';
    const room = '<i class="b-wall"></i><i class="b-bench"></i>';
    const tilt = (deg, sc = 1.2) => `<div class="b-tilt" style="transform:rotate(${deg}deg) scale(${sc})">${ctx.photo('site', { slotNote: false, style: full })}${room}</div>`;
    const doT = [
      `${ctx.photo('site', { slotNote: false, style: full })}${room}<i class="rl h" style="left:0;right:0;top:50%"></i>`,
      `${ctx.photo('site', { slotNote: false, style: full })}${room}`,
      `${ctx.photo('site', { slotNote: false, style: full })}${room}<span class="disp b-onph" style="right:16px;top:16px;width:150px;font-size:20px;line-height:22px;text-align:left">${A(line)}</span>`,
      `<div class="b-flat">${ctx.logo.html('reversed', { width: 150, colourway: 'reversed', color: rev.name })}</div>`,
    ];
    const dontT = [
      `${tilt(-6)}`,
      `${ctx.photo('site', { slotNote: false, style: full })}${room}<i class="b-wash" style="background:rgba(${r},${g},${b},0.45)"></i>`,
      `<div class="b-tilt" style="transform:scale(2.2);transform-origin:30% 20%">${ctx.photo('site', { slotNote: false, style: full })}${room}</div><span class="disp b-onph" style="left:16px;top:42px;width:280px;font-size:24px;line-height:26px">${A(line)}</span>`,
      `${ctx.photo('site', { slotNote: false, style: full })}<i class="b-busy" style="left:12%"></i><i class="b-busy" style="left:34%"></i><i class="b-busy b-busy--t" style="left:57%"></i><i class="b-busy" style="left:78%"></i><span class="b-onph" style="left:50%;top:50%;transform:translate(-50%,-50%)">${ctx.logo.html('colour', { width: 140, label: 'Logo' })}</span>`,
    ];
    // each rule is a detail on the sheet: a bubble and a rule, then the right way, then the wrong way
    const det = (i) => `<section class="b-dt"><div class="b-dt__h"><span class="b-bubble b-bubble--s b-nb">${'ABCD'[i]}</span><span class="b-dt__n">Detail ${'ABCD'[i]}</span></div><div class="b-ir__tile">${doT[i]}</div><p class="cap b-ir__cap">${ic(ctx, 'check')}<span><b>Do</b>${A(R[i].do)}</span></p><div class="b-ir__tile b-ir__tile--no">${dontT[i]}${cross()}</div><p class="cap b-ir__cap">${ic(ctx, 'x')}<span><b>Don't</b>${A(R[i].dont)}</span></p></section>`;
    return std(ctx, 'imagery-rules', `<p class="lead">Four rules for any photograph. Each is shown done properly, and the way it goes wrong.</p><div class="b-irs">${R.slice(0, 4).map((_, i) => det(i)).join('')}</div>`);
  },

  grid(ctx) {
    const G = ctx.gridMeasures, k = 0.5, p = px(k), OX = 56, OY = 48;
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const PW = p(G.page.w), PH = p(G.page.h);
    const bars = Array.from({ length: G.columns }, (_, i) => `<i class="b-gcol" style="left:${p(colX(i))}px;top:${p(G.margin)}px;height:${p(G.page.h - 2 * G.margin)}px;width:${p(G.col)}px"></i>`).join('');
    const hl = tok(ctx, 'headline');
    const head = ctx.brand.lines.others[0];
    const page = `<div class="b-gpage" style="left:${OX}px;top:${OY}px;width:${PW}px;height:${PH}px">${bars}
<h2 class="disp b-gh" style="left:${p(colX(0))}px;top:${p(G.margin + 128)}px;width:${p(span(6))}px;font-size:${p(hl.size)}px;line-height:${hl.line}">${A(head)}</h2>
<div class="b-gph" style="left:${p(colX(7))}px;top:${p(G.margin)}px;width:${p(span(5))}px;height:${p(G.page.h - 2 * G.margin)}px">${ctx.photo('site', { slotNote: false, style: 'width:100%;height:100%' })}</div></div>`;
    const dims = `${dh(OX, 20, PW, `${G.page.w} px`)}${dv(24, OY, PH, `${G.page.h} px`, { gap: true })}
${dv(OX + p(colX(9)), OY, p(G.margin), String(G.margin), { side: 'right' })}
<i class="rl h" style="left:${OX}px;top:${OY + p(G.page.h * 0.62)}px;width:${p(G.margin)}px"></i><b class="rn" style="left:${OX + 2}px;top:${OY + p(G.page.h * 0.62) - 16}px">${G.margin}</b>
<i class="b-box" style="left:${OX}px;top:${OY}px;width:${p(colX(2))}px;height:${p(G.margin + 60)}px"></i><span class="b-bubble b-bubble--s" style="left:${OX + p(colX(2)) + 8}px;top:${OY}px">A</span>`;
    // detail A: the margin and the first three columns at twice the sheet scale
    const S2 = 2, d2 = px(S2), DXo = OX, DYo = OY + PH + 64;
    const edges = [0, G.margin, G.margin + G.col, G.margin + G.col + G.gutter, G.margin + 2 * G.col + G.gutter, G.margin + 2 * G.col + 2 * G.gutter, G.margin + 3 * G.col + 2 * G.gutter];
    const names = [String(G.margin), ctx.fmt(G.col), String(G.gutter), ctx.fmt(G.col), String(G.gutter), ctx.fmt(G.col)];
    const cdims = names.map((n, i) => { const x = d2(edges[i]), w = d2(edges[i + 1] - edges[i]), y = i % 2 ? 56 : 28; return `<i class="rl h" style="left:${x}px;top:${y}px;width:${w}px"></i><b class="rn" style="left:${x + w / 2}px;top:${y - 16}px;transform:translateX(-50%)">${n}</b>`; }).join('');
    const cbars = [0, 1, 2].map((i) => `<i class="b-gcol" style="left:${d2(colX(i))}px;top:72px;height:72px;width:${d2(G.col)}px"></i>`).join('');
    const detail = `<div class="b-det" style="left:${DXo}px;top:${DYo}px"><p class="cap" style="position:absolute;left:${d2(edges[6]) + 40}px;top:28px;width:200px"><b>Detail A</b>The margin and the first three columns, drawn at 2 : 1. The numbers are real sizes.</p>${cdims}${cbars}</div>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns} of ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const meas = `<div class="b-meas" style="left:${OX + PW + 40}px;top:${OY}px">${m.map(([a, v]) => `<p class="cap"><b>${a}</b><span class="num">${A(v)}</span></p>`).join('')}</div>`;
    const note = `<p class="cap b-gn" style="left:${OX + PW + 40}px;top:${OY + 224}px">Twelve columns, ${G.margin} px margins and ${G.gutter} px gutters, all multiples of the ${G.base} px base. The photo takes five columns and the type takes six.</p>`;
    return std(ctx, 'grid', `<p class="lead">The sheet is drawn at ${Math.round(k * 100)}%. Every number on it is the real size in px.</p><div class="b-gd" style="height:${OY + PH + 64 + 150}px">${page}${dims}${meas}${note}${detail}</div>`);
  },

  layouts(ctx) {
    const G = ctx.gridMeasures, hl = tok(ctx, 'headline'), k = 0.27, p = px(k);
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const a = (x, y, w, h, st, inner = '') => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}">${inner}</div>`;
    const hd = (x, y, w, txt, size, st = '') => `<div class="disp b-ab b-th" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;font-size:${p(size)}px;line-height:1;${st}">${txt}</div>`;
    const bars = (x, y, w, n) => Array.from({ length: n }, (_, i) => a(x, y + i * 28, i === n - 1 ? w * 0.6 : w, 10, 'background:var(--hair)')).join('');
    const cols = (from, n) => Array.from({ length: n }, (_, i) => a(colX(from + i), 0, G.col, G.page.h, 'background:var(--ground)')).join('');
    const full = 'width:100%;height:100%';
    const photoW = colX(8) - G.gutter / 2;
    const rev = ctx.brand.logo.colourways.reversed;
    const T = (inner) => `<div class="b-thumb" style="width:${p(G.page.w)}px;height:${p(G.page.h)}px">${inner}</div>`;
    const poster = T(`${a(0, 0, photoW, G.page.h, '', ctx.photo('site', { slotNote: false, style: full }))}${a(photoW, 0, G.page.w - photoW, G.page.h, 'background:var(--dark)')}${hd(colX(8), G.margin, span(4), A(ctx.brand.lines.others[0]), 56, 'color:var(--dark-ink)')}<div class="b-ab" style="left:${p(colX(8))}px;top:${p(G.page.h - G.margin - 60)}px">${ctx.logo.html('reversed', { width: Math.round(p(span(4))), colourway: 'reversed', color: rev.name, label: 'Logo' })}</div>`);
    const quote = T(`${cols(0, 5)}${hd(colX(0), G.margin, span(5), A(ctx.brand.type.sample.headline), hl.size)}${bars(colX(0), 420, span(4), 5)}${a(colX(6), G.margin, span(6), G.page.h - 2 * G.margin, '', ctx.photo('site', { slotNote: false, style: full }))}`);
    const stmt = T(`${cols(0, 9)}${hd(colX(0), G.margin, span(9), A(ctx.brand.lines.primary).replace('. ', '.<br>'), 72)}${[0, 1, 2].map((i) => `${a(colX(i * 4), 500, span(4), 2, 'background:var(--ink)')}${bars(colX(i * 4), 530, span(4) - G.gutter, 3)}`).join('')}`);
    const W = G.page.w * k, gap = 24, X = [0, W + gap, 2 * (W + gap)];
    const spans = [[[0, photoW, '8 columns'], [photoW, G.page.w - photoW, '4 columns']], [[0, colX(5) - G.gutter, '5 columns'], [colX(6), colX(12) - G.gutter - colX(6), '6 columns']], [[0, colX(9) - G.gutter, '9 columns']]];
    const dimsOf = (i) => spans[i].map(([x0, w, n]) => dh(X[i] + p(x0), p(G.page.h) + 24, p(w), n)).join('');
    const caps = [['Poster', `Photo across 8 of ${G.columns} columns. The line and the logo take the other 4, on Bluestone.`], ['Quote', 'Headline on 5 columns, the text on 4, the photo on 6. Leave a column between them.'], ['Statement', 'The line runs across 9 columns. Three notes sit under it, 4 columns each.']];
    const figs = [poster, quote, stmt].map((t, i) => `<figure class="b-lay" style="left:${X[i]}px;width:${p(G.page.w)}px">${t}<figcaption class="cap" style="margin-top:56px"><b>${caps[i][0]}</b>${A(caps[i][1])}</figcaption></figure>`).join('');
    return std(ctx, 'layouts', `<p class="lead">Three layouts on the same twelve columns, each drawn at ${Math.round(k * 100)}%. The numbers are real column counts.</p><div class="b-lays" style="height:${p(G.page.h) + 160}px">${figs}${dimsOf(0)}${dimsOf(1)}${dimsOf(2)}</div><div class="grow"></div><div class="tb b-sgtb"><div class="tbl">${cell('Drawing', 'Page layouts', true)}${cell('Grid', `${G.columns} columns, ${G.margin} px margin, ${G.gutter} px gutter`)}</div><div class="tbr">${cell('Scale', `${Math.round(k * 100)}%. Numbers are column counts.`)}${cell('Page', `${G.page.w} × ${G.page.h} px`)}</div></div>`);
  },

  social(ctx) {
    const k = 0.18, p = px(k), S = ctx.brand.applications.social, rev = ctx.brand.logo.colourways.reversed, c = ctx.brand.ui.screen.content;
    const full = 'width:100%;height:100%';
    const post = (w, h, bg, inner) => `<div class="b-post" style="width:${p(w)}px;height:${p(h)}px;background:${bg}">${inner}</div>`;
    const at = (x, y, w, st, inner) => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;${w ? `width:${p(w)}px;` : ''}${st}">${inner}</div>`;
    const hl = (x, y, w, size, color, txt) => at(x, y, w, `color:${color};font-size:${p(size)}px;line-height:1`, `<span class="disp b-th">${A(txt)}</span>`);
    const rule = (x, y, w) => `<i class="rl h" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px"></i>`;
    const lg = (w, o) => ctx.logo.html('horizontal', { width: Math.round(p(w)), label: 'Logo', ...o });
    const square = post(1080, 1080, 'var(--ground)', `${hl(96, 120, 888, 150, 'var(--ink)', S[0])}${rule(96, 620, 888)}${at(96, 900, 0, '', lg(380))}`);
    const portrait = post(1080, 1350, 'var(--dark)', `${at(0, 0, 1080, `height:${p(860)}px`, ctx.photo('site', { slotNote: false, style: full }))}${hl(72, 920, 936, 96, 'var(--dark-ink)', S[1])}${at(72, 1236, 0, '', lg(330, { colourway: 'reversed', color: rev.name }))}`);
    const story = post(1080, 1920, 'var(--dark)', `${at(0, 0, 1080, `height:${p(1120)}px`, ctx.photo('site', { slotNote: false, style: full }))}${hl(72, 1190, 936, 112, 'var(--dark-ink)', S[2])}${at(72, 1590, 460, `height:${p(120)}px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font:500 ${p(44)}px/1 var(--body)`, A(c.form.book))}${at(72, 1760, 0, '', lg(300, { colourway: 'reversed', color: rev.name }))}`);
    const W = 1080 * k, gap = 50, X = [0, W + gap, 2 * (W + gap)];
    const fig = (el, i, n, w, h, cp) => `<figure class="b-sfig" style="left:${X[i]}px">${el}<figcaption class="cap"><b>${n}</b>${A(cp)}</figcaption></figure>${dh(X[i], 14, p(w), `${w} px`)}${dv(X[i] + p(w) + 12, 36, p(h), `${h}`, { gap: true })}`;
    return std(ctx, 'social', `<p class="lead">Three formats. The line comes first, the logo last, and Brick goes only on the one action.</p><div class="b-socials" style="height:${p(1920) + 150}px">${fig(square, 0, 'Square', 1080, 1080, 'The line on Plaster, a redline under it, the horizontal logo.')}${fig(portrait, 1, 'Portrait', 1080, 1350, 'A photo, then the line on Bluestone.')}${fig(story, 2, 'Story', 1080, 1920, 'A photo, the line, then the one action. Keep type 250 px clear of the top and bottom.')}</div>`);
  },

  signage(ctx) {
    const B = ctx.brand, [spec0, head0] = B.applications.signage.split(': '), rev = B.logo.colourways.reversed;
    const [BW, BH] = (spec0.match(/(\d+) x (\d+)/) || [0, 2400, 1200]).slice(1).map(Number);
    const name = spec0.split(',')[0], head = head0 || B.lines.others[0];
    const k = 0.24, m = (mm) => +(mm * k).toFixed(2), BX = 92, BY = 48, MG = 100, FS = 180, LW = 700;
    const board = `<div class="b-board" style="left:${BX}px;top:${BY}px;width:${m(BW)}px;height:${m(BH)}px"><h2 class="disp b-bh" style="left:${m(MG)}px;top:${m(MG)}px;width:${m(BW - 2 * MG)}px;font-size:${m(FS)}px;line-height:${m(FS)}px">Your kitchen,<br>on the date we said.</h2><div class="b-ab" style="left:${m(MG)}px;bottom:${m(MG)}px">${ctx.logo.html('reversed', { width: Math.round(m(LW)), colourway: 'reversed', color: rev.name, label: 'Your logo goes here' })}</div><span class="b-bu" style="right:${m(MG)}px;bottom:${m(MG)}px;font-size:${m(70)}px">${A(B.applications.site.url)}</span></div>`;
    const dims = `${dh(BX, 22, m(BW), `${BW} mm`)}${dv(28, BY, m(BH), `${BH} mm`, { gap: true })}${dv(BX - 14, BY, m(MG), String(MG), { side: 'left' })}${dv(BX - 14, BY + m(MG), m(2 * FS), String(2 * FS), { side: 'left' })}
${dh(BX, BY + m(BH) + 26, m(MG), String(MG), { below: true })}${dh(BX + m(MG), BY + m(BH) + 26, m(LW), String(LW))}${dh(BX + m(MG + LW), BY + m(BH) + 26, m(BW - 2 * MG - LW), String(BW - 2 * MG - LW))}${dh(BX + m(BW - MG), BY + m(BH) + 26, m(MG), String(MG), { below: true })}`;
    const posts = [0.12, 0.82].map((x) => `<i class="b-sp" style="left:${BX + m(BW * x)}px;top:${BY + m(BH)}px;height:150px"></i>`).join('');
    const ground = `<i class="b-gl" style="left:0;right:0;top:${BY + m(BH) + 150}px"></i>`;
    const tb = `<div class="tb b-sgtb"><div class="tbl">${cell('Drawing', name, true)}${cell('Size', `${BW} × ${BH} mm`)}</div><div class="tbr">${cell('Scale', `${k} px to the millimetre. Every number is millimetres.`)}${cell('Line', head)}</div></div>`;
    return std(ctx, 'signage', `<p class="lead">The site hoarding, drawn side-on at ${k} px to the millimetre.</p><div class="b-sg" style="height:${BY + m(BH) + 190}px">${board}${posts}${ground}${dims}</div>${tb}`);
  },

  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card;
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const LW = 190;
    const sig = `<div class="b-sig"><div class="b-sig__logo" style="width:${LW}px">${dh(0, -16, LW, `${LW} px`, { bg: "var(--card)" })}${ctx.logo.html('horizontal', { width: LW, label: 'Your logo goes here' })}</div><p class="b-sig__n">${A(e.person)}</p><p class="b-sig__r">${A(e.role)}</p><p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p><p class="b-sig__l">${A(B.lines.primary)}</p></div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p><span>From</span>${A(e.person)}, ${A(c.contact)}</p><p><span>To</span>${A(g.to)}</p><p><span>Subject</span><b>${A(g.subject)}</b></p><p class="b-mail__t num">${A(g.time)}</p></div><div class="b-mail__b">${lines}${sig}</div></div>`;
    const specs = [['Logo', `${ctx.logo.labels.horizontal} version, ${LW} px wide. ${B.logo.when.horizontal}`], ['Type', `${A(B.fonts.body.family)}. Name at 16 px, weight 600. Role and contact at 13 px.`], ['Text', 'Live text, not a picture, so it still reads with images off. Use Arial where Commissioner is not installed.']];
    const tb = `<div class="tb b-sgtb"><div class="tbl">${cell('Drawing', 'Email signature', true)}${cell(specs[0][0], specs[0][1])}${cell(specs[1][0], specs[1][1])}</div><div class="tbr">${cell(specs[2][0], specs[2][1])}${cell('Scale', '1 to 1. The redline is px.')}</div></div>`;
    return std(ctx, 'email-signature', `<p class="lead">The signature as it renders in a mail client: the logo, a name, a role and a way to reach us.</p><div class="b-mailwrap">${mail}</div><div class="grow"></div>${tb}`);
  },

  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, pct = Math.round(S.progress * 100);
    const track = `<div class="b-trk"><div class="b-trk__top">${ui.statusChip('booked', { label: S.status })}<span class="b-trk__t">${A(B.ui.screen.title)}</span></div><h2 class="ui-display b-trk__eta">${A(S.eta)}</h2><div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div><div class="b-trk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p class="b-trk__p">${A(S.pickup)}</p>
<div class="b-trk__rider"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div><p class="b-trk__rn">${A(S.rider)}</p><p class="b-trk__rs">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', iconLeft: 'phone' })}</div>
<div class="b-trk__facts"><div><p class="b-trk__fl">${A(S.deliverToLabel)}</p><p class="b-trk__fv">${A(S.deliverTo)}</p></div><div><p class="b-trk__fl">${A(S.paidLabel)}</p><p class="b-trk__fv num">${A(S.paid)}</p></div></div></div>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="b-bar__logo">${ctx.logo.html('horizontal', { width: 130, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links([['Quote', 'receipt'], ['Schedule', 'calendar']], 1)}</div>${ui.btn(S.form.book, { size: 'sm' })}</nav>`;
    const win = `<div class="ui b-win"><div class="b-win__url"><span>${A(B.applications.site.url)}/schedule</span></div>${bar}<div class="b-win__body">${track}<aside class="b-dl"><h3 class="b-dl__h">Your jobs</h3>${ui.deliveryRows(3)}</aside></div></div>`;
    return std(ctx, 'digital', `<p class="lead">The schedule screen from the UI kit. The bar is 56 px, and the redline is its height.</p><div class="b-digi"><div class="b-digi__w">${win}${dv(-24, 37, 56, '56', { side: 'left' })}</div></div>`);
  },

  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, d = f.display, b = f.body, LH = Math.round(ctx.logo.geos.colour.h * 360 / ctx.logo.geos.colour.w);
    const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${c.share}"><i style="background:${c.hex}${c.hex.toLowerCase() === ctx.roles.light.raised.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></i></li>`).join('');
    const legend = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li class="cap"><b>${A(c.name)}</b><span class="num">${Math.round(c.share * 100)}%</span> <span class="b-mono">${A(c.hex)}</span></li>`).join('');
    const rules = G.rules.map((r, i) => `<li><span class="b-rn num">${i + 1}</span><h3 class="b-rh">${A(r.title)}</h3><p class="b-rp">${A(r.text)}</p></li>`).join('');
    const lines = [B.lines.primary, ...B.lines.others].map((l) => `<li>${A(l)}</li>`).join('');
    // the sheet is divided into lettered zones, as a drawing sheet is, each with its own ruled header
    const zh = (k, t) => `<div class="b-zh"><span class="b-bubble b-bubble--s b-nb">${k}</span><span class="b-zh__t">${t}</span></div>`;
    const logo = `<div class="b-z">${zh('A', 'Logo')}<div class="b-sum__logo" style="position:relative;margin-left:32px;width:360px;height:${LH}px">${ctx.logo.html('colour', { width: 360, label: 'Your logo goes here' })}${dv(-24, 0, LH, String(LH), { side: 'left' })}</div></div>`;
    const two = `<div class="b-sum__row"><div class="b-z">${zh('B', 'Lines')}<ul class="b-lines">${lines}</ul></div><div class="b-z">${zh('C', 'Faces')}<div class="b-faces2"><p><span class="b-aa2 disp">Aa</span><span class="cap"><b>${A(d.family)}</b>Display, ${d.weights.join(', ')}</span></p><p><span class="b-aa2 b-aa2--body">Aa</span><span class="cap"><b>${A(b.family)}</b>Body, ${b.weights.join(', ')}</span></p></div></div></div>`;
    const col = `<div class="b-z">${zh('D', 'Colour')}<ul class="b-strip">${strip}</ul><ul class="b-leg">${legend}</ul></div>`;
    const rl = `<div class="b-z">${zh('E', 'Rules')}<ol class="b-rules3">${rules}</ol></div>`;
    return std(ctx, 'summary', `<div class="b-sum">${logo}${two}${col}${rl}</div>`);
  },

  'contact-scope'(ctx) {
    const B = ctx.brand;
    const secs = ctx.sections.map((s) => `<li><span class="num b-sn">${s.n}</span>${A(s.title)}</li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c], i) => `<li><span class="b-bubble b-bubble--s b-nb num">${i + 1}</span><p><b>${a}.</b> ${c}</p></li>`).join('');
    // the page is the sheet's revision block, its index and its notes, with a full title block at the foot
    const tb = `<div class="tb b-sgtb"><div class="tbl">${cell('Document', `${B.name} brand guidelines`, true)}${cell('Owner', B.contact.owner)}</div><div class="tbr">${cell('Revision', B.version.number)}${cell('Date', ctx.date)}</div></div>`;
    return std(ctx, 'contact-scope', `<div class="b-cs"><div class="b-cs__c"><h2 class="b-h3">Who to ask</h2><p class="b-cs__p">${A(B.contact.owner)} owns this document. Write to <span class="b-mono">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p></div>
<div class="b-cs__c"><h2 class="b-h3">Revisions</h2><table class="b-vt"><thead><tr><th>Rev</th><th>Date</th><th>Description</th></tr></thead><tbody><tr><td class="num">${A(B.version.number)}</td><td>${A(ctx.date)}</td><td>First release.</td></tr></tbody></table></div>
<div class="b-cs__c b-cs__2"><h2 class="b-h3">In this document</h2><ol class="b-in">${secs}</ol></div>
<div class="b-cs__c b-cs__2"><h2 class="b-h3">Not in this document</h2><ul class="b-not">${not}</ul></div></div><div class="grow"></div>${tb}`);
  },
};

export const guidelinesB = own;
