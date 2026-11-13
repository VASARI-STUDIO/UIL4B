// Swiss Field, lane g1: the brand and voice pages (contents, personality, voice, write-this, messaging, summary, contact-scope).
// Every page stands on the share ruler (swiss.js). A field rises only where the page means something by it: the text field beside the traits (ink is where
// the voice is read), the action field beside the lines in use (the brand's loudest words land on it), every field on the summary (it closes the book as the
// cover opens it), and the action colour turns the ground on the Voice opener, as it does on the Introduction. Contents, write-this and contact-scope stand
// on the ruler alone. Nothing here names a colour id, a hex or a sample brand's words; brand copy is printed whole.
import {
  A, nb, M, PAGE_W, PAGE_H, RULER_Y, CHROME, at, box, page, model, valuesBlock, contentR, textWidth, wrap, faceStem, titleHtml, spell, cap1, longDate,
} from './swiss.js';
import { loadFont } from '../../engine/nodeFont.js';

const r2 = (n) => Math.round(n * 100) / 100;
const hair = (x, y, w, color = 'var(--hair)') => box(`left:${r2(x)}px;top:${y}px;width:${r2(w)}px;height:1px;background:${color}`);
const head = (t, color = 'var(--ink)') => `<div class="c-head" style="color:${color}">${A(t)}</div>`;
const note = (t, color = 'var(--quiet)', cls = '') => `<div class="c-note ${cls}" style="color:${color}">${nb(t)}</div>`;
const pad3 = (n) => String(n).padStart(3, '0');
const MOD = 256, col = (k) => M + MOD * k; // the theme's grid: 80, 336, 592, 848, 1104, 1360, 1616
const stemD = (ctx) => faceStem(ctx, 'display', ctx.weights.heading);
const stemB = (ctx, w) => faceStem(ctx, 'body', w ?? ctx.weights.regular);
const dispLh = (s) => (s >= 56 ? 0.95 : 1);
// the largest size in `sizes` at which every text sets in at most `max` lines at width w (else the last size)
const fitAll = (stem, texts, sizes, w, max, track = -0.01) => sizes.find((s) => texts.every((t) => wrap(stem, t, s, w, track).length <= max)) ?? sizes[sizes.length - 1];
// a page where nothing rises may set its title the full 1000 wide, whatever the ground's width
const TW = 1000;
const lineCount =(stem, t, s, w, track = 0) => wrap(stem, t, s, w, track).length;

// Folios follow the Free twelve in swiss.js (FREE_PAGES), not ctx.pageNo. contents, voice, messaging and contact-scope stay drafted here but are not exported (index.js).
const wrapPage = (ctx, id, opts) => page(ctx, id, opts);

export function css() {
  return `.pg .g1-sup{display:inline-block;font:500 20px/24px var(--chrome);font-variant-numeric:tabular-nums;color:var(--quiet);vertical-align:top;position:relative;margin-left:8px}
.pg .g1-ix{white-space:nowrap}
.pg .g1-ix>span+span{margin-left:var(--g1-gap)}
.pg .g1-not{text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--quiet)}
.pg .g1-bf{font-family:var(--body);text-wrap:pretty}`;
}

// ---------------------------------------------------------------- contents
// Cape's big index: the section titles run in as one paragraph across the whole page, each with the page it starts on raised beside it.
// Lines are packed here and emitted one by one, so the count laid out is the count that renders.
function contents(ctx) {
  const stem = stemD(ctx), secs = ctx.sections, maxW = (PAGE_W - 2 * M) * 0.99;
  const supW = (no) => 8 + textWidth(CHROME[500], no, 20);
  const items = secs.map((s) => ({ t: s.title, no: pad3(s.pages[0].no) }));
  const pack = (S) => {
    const gap = Math.round(S * 0.32), lines = [[]]; let x = 0;
    for (const it of items) {
      const w = textWidth(stem, it.t, S, -0.01) + supW(it.no);
      if (lines[lines.length - 1].length && x + gap + w > maxW) { lines.push([]); x = 0; }
      x += (lines[lines.length - 1].length ? gap : 0) + w; lines[lines.length - 1].push(it);
    }
    return { lines, gap };
  };
  const S = [152, 144, 136, 128, 120, 112, 104, 96].find((s) => pack(s).lines.length <= 3) ?? 96;
  const { lines, gap } = pack(S), lh = Math.round(S * dispLh(S));
  // the raised number hangs from the cap height of the word beside it
  const f = loadFont(stem), asc = f.ascender / f.unitsPerEm, desc = -f.descender / f.unitsPerEm, capH = (f.tables.os2.sCapHeight || f.unitsPerEm * 0.7) / f.unitsPerEm;
  const capTop = (lh - (asc + desc) * S) / 2 + (asc - capH) * S;
  const supTop = Math.round(capTop - 5);
  const html = lines.map((ln) => `<div class="disp g1-ix" style="--g1-gap:${gap}px;height:${lh}px;color:var(--ink)">${ln.map((it) => `<span>${A(it.t)}<span class="g1-sup" style="top:${supTop}px">${it.no}</span></span>`).join('')}</div>`).join('');
  const index = box(`left:${M}px;bottom:${PAGE_H - 944}px;width:${PAGE_W - 2 * M}px;font-size:${S}px;line-height:${lh}px`, html);
  const title = titleHtml(ctx, 'Contents', [`${cap1(spell(secs.length))} sections, each with the page it starts on.`, `${cap1(spell(secs.length))} sections and their pages.`], { w: TW });
  return wrapPage(ctx, 'contents', { body: title + index });
}

// ---------------------------------------------------------------- personality
// The text field rises: ink is where the voice is read. The title carries the brand's two lines; the three traits are the big thing, one row each.
function personality(ctx) {
  const m = model(ctx), B = ctx.brand, tx = m.text, rise = new Map([[tx.id, 'compact']]), R = contentR(ctx, rise);
  const lines = [B.lines.primary, B.lines.others[0]].filter(Boolean);
  const title = titleHtml(ctx, 'Personality', [lines.join(' '), lines[0]], { w: Math.min(1000, R - M) });
  const traits = B.personality, n = traits.length, stem = stemD(ctx);
  // the trait word takes the first column; what it means sits on the third grid line (the second where the ground is narrow), at most 640 wide
  const mx = R - M >= 1100 ? col(3) : col(2), mw = Math.min(640, R - mx), tw = mx - M - 48;
  const S = [104, 96, 88, 80, 72, 64, 56].find((s) => traits.every((t) => textWidth(stem, t.trait, s, -0.01) <= tw * 0.98)) ?? 56;
  const bs = fitAll(stemB(ctx), traits.map((t) => t.means), [24, 22, 20], mw, 4, 0), blh = bs === 24 ? 34 : bs === 22 ? 32 : 30;
  const top = 384, rowH = Math.floor((944 - top) / n);
  const rows = traits.map((t, i) => {
    const y = top + rowH * i;
    return hair(M, y, R - M)
      + at(M, y + 20, `<div class="disp nw" style="font-size:${S}px;line-height:${Math.round(S * dispLh(S))}px;color:var(--ink)">${A(t.trait)}</div>`)
      + at(mx, y + 28, `<div class="g1-bf" style="font-weight:${ctx.weights.regular};font-size:${bs}px;line-height:${blh}px;color:var(--ink)">${nb(t.means)}</div>`, { w: mw });
  }).join('');
  return wrapPage(ctx, 'personality', { rise, body: title + rows });
}

// ---------------------------------------------------------------- voice (a section opener on a turned ground)
// The principles are set large on the action colour; each example sits on the white beside it, on the same row, as it would be printed.
function voice(ctx) {
  const m = model(ctx), B = ctx.brand, a = m.action, lab = m.label[a.id], P = B.voice.principles, n = P.length, stem = stemD(ctx);
  const maxW = m.groundW - 2 * M, x0 = m.groundW + 48, w = PAGE_W - M - x0;
  // one size for every principle: the largest that keeps each to one line at 48 or more, else the largest that keeps each to two (a wide face stays large),
  // as long as the rows still start below the title on the white (y 336). The example is a step under the rule it shows, never larger.
  const tryS = (S, max) => {
    if (!P.every((p) => lineCount(stem, p.title, S, maxW, -0.01) <= max)) return null;
    const sLh = Math.round(S * dispLh(S));
    const ES = fitAll(stem, P.map((p) => p.example), [36, 32, 28, 24].filter((s) => s <= S * 0.6), w, 2), eLh = Math.round(ES * 1.1);
    const tLines = Math.max(...P.map((p) => lineCount(stem, p.title, S, maxW, -0.01))), eLines = Math.max(...P.map((p) => lineCount(stem, p.example, ES, w, -0.01)));
    const rowH = Math.max(136, 20 + Math.max(tLines * sLh, eLines * eLh) + 28), top = 944 - rowH * n;
    return top >= 336 ? { S, sLh, ES, eLh, rowH, top } : null;
  };
  const tries = [[64, 1], [56, 1], [52, 1], [48, 1], [64, 2], [56, 2], [52, 2], [48, 2], [44, 2], [40, 2], [36, 2], [32, 2]];
  let fit = null;
  for (const [s, mx] of tries) { fit = tryS(s, mx); if (fit) break; }
  const { S, sLh, ES, eLh, rowH, top } = fit || tryS(32, 3) || { S: 32, sLh: 32, ES: 24, eLh: 26, rowH: 152, top: 944 - 152 * n };
  let turnedBody = valuesBlock(ctx, { ...m.segOf(a), w: 999 }, 'turned', M), body = '';
  P.forEach((p, i) => {
    const y = top + rowH * i;
    turnedBody += hair(M, y, maxW, lab) + at(M, y + 20, `<div class="disp" style="font-size:${S}px;line-height:${sLh}px;color:${lab}">${A(p.title)}</div>`, { w: maxW });
    body += hair(x0, y, w) + at(x0, y + 20 + Math.max(0, Math.round((sLh - eLh) / 2)), `<div class="disp" style="font-size:${ES}px;line-height:${eLh}px;color:var(--ink)">${A(p.example)}</div>`, { w });
  });
  const title = titleHtml(ctx, 'Voice', [`${cap1(spell(n))} rules for how we write. Beside each, a line as we would print it.`, `${cap1(spell(n))} rules, each beside a line as we would print it.`, `${cap1(spell(n))} rules, and a line for each.`], { x: x0, w });
  return wrapPage(ctx, 'voice', { turned: a, turnedBody, head: 'turned', body: title + body });
}

// ---------------------------------------------------------------- write-this
// Nothing rises: the table takes the whole width. What to write is set in the brand's display face, what not to write in the body face struck through.
function writeThis(ctx) {
  const B = ctx.brand, rows = B.voice.writeThis, n = rows.length, stem = stemD(ctx), bstem = stemB(ctx);
  const xW = M, wW = col(3) - 48 - M, xN = col(3), wN = col(5) - 48 - col(3), xB = col(5), wB = PAGE_W - M - col(5);
  const top = 336;
  // the largest write size whose rows all fit between the column heads and the content floor
  const layout = (S) => {
    const lh = Math.round(S * 1.12);
    const hs = rows.map((r) => Math.max(lineCount(stem, r.write, S, wW, -0.01) * lh, lineCount(bstem, r.not, 20, wN) * 30, lineCount(CHROME[400], r.because, 17, wB) * 24) + 40);
    return { S, lh, hs, total: hs.reduce((t, h) => t + h, 0) };
  };
  const L = [40, 36, 32, 28, 24].map(layout).find((l) => l.total <= 944 - top) ?? layout(24);
  // the heads sit just above the first row, wherever the rows start
  let y = 944 - L.total, out = '';
  const hy = y - 40, heads = at(xW, hy, head('Write this')) + at(xN, hy, head('Not that', 'var(--quiet)')) + at(xB, hy, head('Because', 'var(--quiet)'));
  rows.forEach((r, i) => {
    out += hair(M, y, PAGE_W - 2 * M)
      + at(xW, y + 20, `<div class="disp" style="font-size:${L.S}px;line-height:${L.lh}px;color:var(--ink)">${A(r.write)}</div>`, { w: wW })
      + at(xN, y + 20 + Math.max(0, Math.round((Math.min(L.lh, 48) - 30) / 2)), `<div class="g1-bf g1-not" style="font-weight:${ctx.weights.regular};font-size:20px;line-height:30px;color:var(--quiet)">${A(r.not)}</div>`, { w: wN })
      + at(xB, y + 24 + Math.max(0, Math.round((Math.min(L.lh, 48) - 30) / 2)), note(r.because, 'var(--ink)'), { w: wB });
    y += L.hs[i];
  });
  const title = titleHtml(ctx, 'Write this', [`${cap1(spell(n))} lines as we write them, the words we leave out, and why.`, `${cap1(spell(n))} lines as we write them, and why.`], { w: TW });
  return wrapPage(ctx, 'write-this', { body: title + heads + out });
}

// ---------------------------------------------------------------- messaging
// The action field rises: the brand's lines are its loudest words, and they land on that colour. The lines in use are the big thing;
// the two boilerplates and the name rule sit under them as one row of three, widest for the longest.
function messaging(ctx) {
  const m = model(ctx), B = ctx.brand, V = B.voice, a = m.action, rise = new Map([[a.id, 'compact']]), R = contentR(ctx, rise), maxW = R - M, stem = stemD(ctx);
  const lines = [B.lines.primary, ...B.lines.others];
  const S = fitAll(stem, lines, [72, 64, 56, 48, 40], maxW, 1), lh = Math.round(S * dispLh(S));
  const words = (s) => String(ctx.real(s)).trim().split(/\s+/).length;
  const cols = [
    ['Short boilerplate', `${words(V.boilerplate25)} words`, V.boilerplate25, 1],
    ['Long boilerplate', `${words(V.boilerplate50)} words`, V.boilerplate50, 1.5],
    ['The name', '', V.nameRules, 1],
  ];
  const g = 48, unit = (maxW - g * 2) / cols.reduce((t, c) => t + c[3], 0), bstem = stemB(ctx);
  let x = M;
  const geo = cols.map((c) => { const w = Math.floor(unit * c[3]); const o = { x, w }; x += w + g; return o; });
  const bh = Math.max(...cols.map((c, i) => lineCount(bstem, c[2], 20, geo[i].w) * 30)) + 40;
  const yCols = 944 - bh;
  const row = cols.map((c, i) => hair(geo[i].x, yCols, geo[i].w)
    + at(geo[i].x, yCols + 16, `<div class="c-head" style="color:var(--ink)">${A(c[0])}${c[1] ? ` <span class="c-value" style="color:var(--quiet);margin-left:8px">${c[1]}</span>` : ''}</div>`, { w: geo[i].w })
    + at(geo[i].x, yCols + 48, `<div class="g1-bf" style="font-weight:${ctx.weights.regular};font-size:20px;line-height:30px;color:var(--ink)">${nb(c[2])}</div>`, { w: geo[i].w })).join('');
  // the lines: the first in ink, the rest in the second tone (32 px and over only), stacked one to a line, the block's foot 80 above the row
  const lineBlock = box(`left:${M}px;bottom:${PAGE_H - (yCols - 80)}px;width:${maxW}px;font-size:${S}px;line-height:${lh}px`,
    lines.map((l, i) => `<div class="disp nw" style="color:${i ? 'var(--tone2)' : 'var(--ink)'}">${A(l)}</div>`).join(''));
  const linesLabel = at(M, yCols - 80 - lines.length * lh - 40, head('Lines in use'));
  const title = titleHtml(ctx, 'Messaging', ['The lines, a short and a long boilerplate, and how to write the name.', 'The lines, two boilerplates and the name.'], { w: Math.min(1000, maxW) });
  return wrapPage(ctx, 'messaging', { rise, body: title + linesLabel + lineBlock + row });
}

// ---------------------------------------------------------------- summary
// The brand on one page. Every field rises with its values, as on the cover, so the book closes on the palette it opened on.
// The ground holds the logo and the lines on the left, the three rules on the right and the two faces at the foot.
function summary(ctx) {
  const m = model(ctx), B = ctx.brand, rise = new Map(m.segs.slice(1).map((s) => [s.c.id, 'compact'])), R = m.R, stem = stemD(ctx);
  const title = titleHtml(ctx, 'Summary', ['The brand on one page.']);
  const lw = Math.min(400, Math.round((R - M) * 0.42)), rx = M + lw + 64, rw = R - rx;
  const logo = at(M, 304, ctx.logo.html('colour', { width: Math.min(360, lw) }));
  // the lines, two tones, under the logo
  const t1 = B.lines.primary, t2 = B.lines.others[0] || '';
  const ls = fitAll(stem, [t1, t2].filter(Boolean), [40, 36, 32], lw, 2);
  const linesH = [t1, t2].filter(Boolean).reduce((t, s) => t + lineCount(stem, s, ls, lw, -0.01), 0) * Math.round(ls * 1.05);
  const faceRows = 2 * 72;
  const yLines = 944 - faceRows - 64 - linesH;
  const lineBlock = at(M, yLines, `<div class="disp" style="font-size:${ls}px;line-height:${Math.round(ls * 1.05)}px;color:var(--ink)">${A(t1)}</div>${t2 ? `<div class="disp" style="font-size:${ls}px;line-height:${Math.round(ls * 1.05)}px;color:var(--tone2)">${A(t2)}</div>` : ''}`, { w: lw });
  // the faces: each name set in itself, with its weights as values
  const d = B.fonts.display, b = B.fonts.body;
  const faceRow = (y, name, style, use, ws) => hair(M, y, lw) + at(M, y + 16, `<div class="nw" style="${style};font-size:32px;line-height:36px;color:var(--ink)">${A(name)}</div>`)
    + at(M, y + 16 + 40, `<div class="c-note nw" style="color:var(--quiet)">${use} <span class="c-value">${ws.join(' ')}</span></div>`);
  const faces = faceRow(944 - faceRows, d.family, 'font-family:var(--display);font-stretch:' + (d.stretch || 100) + '%;font-weight:' + ctx.weights.heading + ';letter-spacing:-0.01em', 'Display', [...d.weights].sort())
    + faceRow(944 - 72, b.family, `font-family:var(--body);font-weight:${ctx.weights.regular}`, 'Body', [...b.weights].sort());
  // the three rules: plain strings or a title with its text, as the brand gives them
  const rules = (B.guideB && B.guideB.rules) || [];
  const rs = rules.map((r) => (typeof r === 'string' ? { t: '', x: r } : { t: r.title, x: r.text }));
  // the rows flow from the content floor up, so each takes the height its text sets in and the gaps stay even
  const ruleHtml = rs.length ? box(`left:${rx}px;bottom:${PAGE_H - 944}px;width:${rw}px`,
    head(`${cap1(spell(rs.length))} rules`, 'var(--quiet)')
    + rs.map((r) => `<div style="margin-top:16px;padding:16px 0 16px;border-top:1px solid var(--hair)">${r.t ? head(r.t) : ''}<div class="c-body" style="color:var(--ink);${r.t ? 'margin-top:4px' : ''}">${nb(r.x)}</div></div>`).join('')) : '';
  // the theme's credit sits in the ruler's ground segment, before the folio
  const credit = at(0, RULER_Y + 10, '<span class="c-head rl" style="color:var(--quiet)">Made with UIL4B</span>', { style: `left:auto;right:${PAGE_W - R + 64}px` });
  return wrapPage(ctx, 'summary', { rise, body: title + logo + lineBlock + faces + ruleHtml + credit });
}

// ---------------------------------------------------------------- contact-scope
// The last page stands on the ruler alone. Who to ask is the big thing: the address set large. Under it, one row of three: the edition,
// what this document holds, and what it leaves to the other files.
function contactScope(ctx) {
  const B = ctx.brand, stem = stemD(ctx), maxW = PAGE_W - 2 * M;
  const title = titleHtml(ctx, 'Contact and scope', ['Who to ask, which edition this is, and what it covers.'], { w: TW });
  const es = [120, 112, 104, 96, 88, 80, 72, 64, 56, 48].find((s) => textWidth(stem, B.contact.email, s, -0.01) <= Math.min(maxW, 1500) * 0.98) ?? 48;
  const yRow = 720;
  const yMail = yRow - 96 - Math.round(es * 0.95);
  const ask = at(M, yMail - 72, `<div class="c-body" style="color:var(--ink)">${A(B.contact.owner)} looks after this document. Write for a logo file, a missing asset or an exception.</div>`, { w: 720 });
  const mail = at(M, yMail, `<div class="disp nw" style="font-size:${es}px;line-height:${Math.round(es * 0.95)}px;color:var(--ink)">${A(B.contact.email)}</div>`);
  const sections = ctx.sections.map((s) => s.title);
  const inList = `${sections.slice(0, -1).join(', ')} and ${sections[sections.length - 1]}.`;
  const not = [['Logo files, the palette and the fonts', 'are in the brand kit.'], ['Interface components and tokens', 'are in the UI kit.'], ['CMYK and Pantone values', 'are not set here. Ask your printer for a proof.']];
  const colX = [M, col(2), col(4)], colW = [col(2) - 48 - M, col(4) - 48 - col(2), PAGE_W - M - col(4)];
  const group = (k, label, inner) => hair(colX[k], yRow, colW[k]) + at(colX[k], yRow + 16, head(label, 'var(--quiet)') + `<div style="margin-top:8px">${inner}</div>`, { w: colW[k] });
  const edition = `<div class="c-body nw" style="color:var(--ink)">Version <span class="c-value" style="font-size:20px;line-height:30px">${A(B.version.number)}</span></div><div class="c-body" style="color:var(--ink)">${A(longDate(B.version.date))}</div>`;
  const row = group(0, 'This edition', edition)
    + group(1, 'In this document', `<div class="c-body" style="color:var(--ink)">${A(inList)}</div>`)
    + group(2, 'Not in this document', not.map(([a, b]) => `<div class="c-body" style="color:var(--ink)">${A(a)} <span style="color:var(--quiet)">${A(b)}</span></div>`).join(''));
  return wrapPage(ctx, 'contact-scope', { body: title + ask + mail + row });
}

export const guidelines = { contents, personality, voice, 'write-this': writeThis, messaging, summary, 'contact-scope': contactScope };
