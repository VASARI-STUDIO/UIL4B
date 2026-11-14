// Lane g1 for theme 28 (Riso): the brand and voice pages (contents, personality, voice, write-this, messaging, summary, contact-scope).
// Every page is one sheet off the press, made by sheet(): a plate, a pass and a hit. On these pages the hit numeral is a real count taken from
// ctx (sections, traits, habits, lines, inks, pages), and the words beside it say what it counts, so the biggest ink on the sheet is a true number.
// Brand copy is printed whole through A(); text is measured only to choose a size, and the browser wraps it, so a slot placeholder still fits.
import { sheet, A, fitW, wrap, inkW, faceFor, faceCss, pressOf, logoOnPlate, val, X0 } from './sheet.js';
import { bookBrand } from './copy.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const no3 = (n) => String(n).padStart(3, '0');
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
const nLines = (st, t, size, w) => wrap(st, String(t || ''), size, w - 12).length;
// the largest [size, line] at which every text keeps to maxLines in width w
// (a line of one word never wraps, so one line is also held to the measure by its ink width)
const fit = (st, texts, sizes, w, maxLines) => sizes.find(([s]) => texts.every((t) => nLines(st, t, s, w) <= maxLines && (maxLines > 1 || inkW(st, String(t || ''), s) <= w - 12))) || sizes[sizes.length - 1];
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = 578) => `<i class="a g1-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;

export function css() {
  return `.pg .g1-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .g1-mk{position:absolute;width:6px;height:9px;background:var(--key)}
.pg .g1-not{text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--key)}
.pg .g1-chip{position:absolute;top:0;height:40px}
`;
}

export const guidelines = {
  // Contents: the collation sheet. The hit is the number of sections; each section's row carries one mark per sheet it holds, so the
  // run's length can be read without a single number, and the first folio of each section sits under its marks.
  contents(ctx) {
    const S = ctx.sections, n = S.length, top = 412, rowH = Math.min(68, Math.floor((1036 - top) / n));
    const dst = stem(ctx, 'display', 500), titles = S.map((s) => s.title);
    const [ts] = fit(dst, titles, [[22], [20], [18], [16]], 182, 1);
    const rows = S.map((s, i) => {
      const y = top + i * rowH, k = s.pages.length, mx = 627 - (k * 9 - 3);
      const marks = s.pages.map((_, j) => `<i class="g1-mk" style="left:${mx + j * 9}px;top:${y + 13}px"></i>`).join('');
      return `${hair(y)}<p class="a c-value" style="left:49px;top:${y + 12}px">${String(s.n).padStart(2, '0')}</p>
<p class="a nw" style="left:103px;top:${y + 9}px;${faceCss(ctx, 'display', 500)};font-size:${ts}px;line-height:${ts + 4}px">${A(s.title)}</p>
<p class="a c-note" style="left:285px;top:${y + 11}px;width:276px">${s.pages.map((p) => A(p.title)).join(', ')}</p>${marks}
<p class="a c-value" style="right:167px;top:${y + 28}px">${no3(ctx.pageNo(s.pages[0].id))}</p>`;
    }).join('');
    const inner = `${plateLabel('Contents', 49)}
${plateNote(`<b style="font-weight:600">${Word(n)} sections</b><br>${ctx.pages.length} pages, cover to close.`, 403, 290, 224)}${rows}`;
    // the foot names a page with no section "Cover" (sheet.js); this sheet is the contents, so its foot says so
    return sheet(ctx, 'contents', { hp: 380, hit: { text: String(n), x: 49, base: 332, size: 280, maxW: 300 } }, inner).replace('>Cover</span>', '>Contents</span>');
  },

  // Personality: the traits set as the page's big type, one to a band of paper, with what each one means beside it.
  personality(ctx) {
    const B = bookBrand(ctx), T = B.personality, n = T.length, top = 264, rowH = Math.floor((1036 - top) / n);
    const dst = stem(ctx, 'display', 500), bst = stem(ctx, 'body', 400);
    const [S] = fit(dst, T.map((t) => t.trait), [[96], [88], [80], [72], [64], [56], [48]], 342, 1);
    const [ms, ml] = fit(bst, T.map((t) => t.means), [[16, 24], [15, 22], [14, 21]], 224, Math.floor((rowH - 40) / 24));
    const rows = T.map((t, i) => {
      const y = top + i * rowH;
      return `${hair(y)}<h2 class="a nw" style="left:49px;top:${y + 16}px;margin:0;${faceCss(ctx, 'display', 500)};font-size:${S}px;line-height:${Math.round(S * 1.1)}px;letter-spacing:-.01em">${A(t.trait)}</h2>
<p class="a" style="left:403px;top:${y + 24}px;width:224px;${faceCss(ctx, 'body', 400)};font-size:${ms}px;line-height:${ml}px">${A(t.means)}</p>`;
    }).join('');
    const inner = `${plateLabel('Personality')}
${plateNote(`${Word(n)} traits shape how ${A(B.name)} sounds and behaves.`, 403, 72, 224)}${rows}`;
    return sheet(ctx, 'personality', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Voice: a deep plate holds the habits, each as a heading in the display face with the brand's own example under it; the hit, the number of
  // habits, stands at the right of the plate. The paper below carries only who the voice is written for.
  voice(ctx) {
    const B = bookBrand(ctx), Pr = B.voice.principles, n = Pr.length, dst = stem(ctx, 'display', 500), bst = stem(ctx, 'body', 400);
    const PH = 680, room = PH - 32 - 96, gap = 32;
    // the largest heading size at which every heading keeps to two lines and the whole stack fits the plate
    let pick = null;
    for (const [s, l] of [[40, 46], [36, 42], [32, 38], [30, 36], [28, 34], [26, 32], [24, 30], [22, 28], [20, 26]]) {
      const h = Pr.reduce((a, p) => a + nLines(dst, p.title, s, 330) * l + 6 + nLines(bst, p.example, 14, 330) * 21, 0) + gap * (n - 1);
      pick = { s, l }; if (h <= room && Pr.every((p) => nLines(dst, p.title, s, 330) <= 2)) break;
    }
    const items = Pr.map((p) => `<div><h2 style="margin:0;${faceCss(ctx, 'display', 500)};font-size:${pick.s}px;line-height:${pick.l}px;letter-spacing:-.01em;color:var(--ptxt)">${A(p.title)}</h2>
<p style="margin-top:6px;${faceCss(ctx, 'body', 400)};font-size:14px;line-height:21px;color:var(--ptxt)">${A(p.example)}</p></div>`).join('');
    const [as, al] = fit(dst, [B.audience], [[40, 48], [36, 44], [32, 40], [28, 36], [26, 34], [24, 32], [22, 30], [20, 28]], 520, 5);
    const inner = `${plateLabel('How we sound', 49)}
<div class="a" style="left:49px;top:96px;width:330px;display:flex;flex-direction:column;gap:${gap}px">${items}</div>
${plateNote(`${Word(n)} habits keep every line in the voice.`, 403, 96, 224)}
<p class="a c-label" style="left:49px;top:${PH + 40}px">Who we write for</p>
<p class="a" style="left:49px;top:${PH + 64}px;width:520px;${faceCss(ctx, 'display', 500)};font-size:${as}px;line-height:${al}px">${A(B.audience)}</p>`;
    return sheet(ctx, 'voice', { hp: PH, hit: { text: String(n), x: 403, base: PH - 48, size: 300, maxW: 224 } }, inner);
  },

  // Write this, not that: the plate is the head of a proof. Each line the brand writes is set firm on the left; the line it replaces is struck
  // through on the right, as a proofreader marks a correction, with the reason under it.
  'write-this'(ctx) {
    const B = bookBrand(ctx), R = B.voice.writeThis, n = R.length, bst = stem(ctx, 'body', 400), wst = stem(ctx, 'body', 600);
    const top = 308, floor = 1036;
    const sets = [[26, 34, 19, 28], [22, 30, 17, 25], [20, 28, 16, 24], [17, 24, 15, 22], [16, 23, 14, 21], [15, 22, 13, 19]];
    let L = null;
    for (const [ws, wl, ns, nl] of sets) {
      const hs = R.map((r) => Math.max(nLines(wst, r.write, ws, 272) * wl, nLines(bst, r.not, ns, 282) * nl + 6 + nLines(bst, r.because, 12, 282) * 17));
      L = { ws, wl, ns, nl, hs }; if (hs.reduce((a, b) => a + b, 0) + n * 32 <= floor - top) break;
    }
    const gapR = Math.min(88, Math.floor((floor - top - L.hs.reduce((a, b) => a + b, 0)) / n));
    let y = top, rows = '';
    R.forEach((r, i) => {
      // the struck line and its reason flow as one block, so the reason sits under the line however the browser wraps it
      rows += `${hair(y)}<p class="a" style="left:49px;top:${y + 14}px;width:272px;${faceCss(ctx, 'body', 600)};font-size:${L.ws}px;line-height:${L.wl}px">${A(r.write)}</p>
<div class="a" style="left:345px;top:${y + 14}px;width:282px"><p class="g1-not" style="${faceCss(ctx, 'body', 400)};font-size:${L.ns}px;line-height:${L.nl}px">${A(r.not)}</p>
<p class="c-note" style="margin-top:6px">${A(r.because)}</p></div>`;
      y += L.hs[i] + gapR;
    });
    const inner = `${plateLabel('Write this, not that')}
${plateNote(`${Word(n)} lines ${A(B.name)} writes, beside the lines they replace.`, 403, 72, 224)}
<p class="a c-label" style="left:49px;top:284px">Write this</p><p class="a c-label" style="left:345px;top:284px">Not that</p>${rows}`;
    return sheet(ctx, 'write-this', { hp: 248, hit: { text: String(n), x: 49, base: 216, size: 200, maxW: 300 } }, inner);
  },

  // Lines and boilerplate: a shallow plate, so the brand's lines can run large across the paper; the boilerplate in its two lengths sits under
  // them in two columns, and the name closes the sheet beside the rule for writing it.
  messaging(ctx) {
    const B = bookBrand(ctx), V = B.voice, lines = [B.lines.primary, ...(B.lines.others || [])], n = lines.length;
    const dst = stem(ctx, 'display', 500), bst = stem(ctx, 'body', 400);
    // a line keeps to one line of type where it can at 36 px or more; only a longer line is let run to two
    const SZ = [[64, 70], [56, 62], [52, 58], [48, 54], [44, 50], [40, 46], [36, 42], [32, 38], [28, 34]];
    const [ls, ll] = fit(dst, lines, SZ.slice(0, 6), 578, 2);
    let y = 256, ln = '';
    for (const t of lines) { ln += `<p class="a" style="left:49px;top:${y}px;width:578px;${faceCss(ctx, 'display', 500)};font-size:${ls}px;line-height:${ll}px;letter-spacing:-.01em">${A(t)}</p>`; y += nLines(dst, t, ls, 578) * ll + 24; }
    y += 48;
    const bh = Math.max(nLines(bst, V.boilerplate25, 16, 272), nLines(bst, V.boilerplate50, 16, 282)) * 24;
    const bp = `${hair(y)}<p class="a c-label" style="left:49px;top:${y + 12}px">Boilerplate, short</p><p class="a c-label" style="left:345px;top:${y + 12}px">Boilerplate, long</p>
<p class="a" style="left:49px;top:${y + 34}px;width:272px;${faceCss(ctx, 'body', 400)};font-size:16px;line-height:24px">${A(V.boilerplate25)}</p>
<p class="a" style="left:345px;top:${y + 34}px;width:282px;${faceCss(ctx, 'body', 400)};font-size:16px;line-height:24px">${A(V.boilerplate50)}</p>`;
    y += 34 + bh + 56;
    // the name as it is typed in a sentence: the body face, since a brand may keep its display face (or its capitals) for the wordmark alone
    const nm = `${hair(y)}<p class="a c-label" style="left:49px;top:${y + 12}px">Writing the name</p>
<p class="a nw" style="left:49px;top:${y + 34}px;${faceCss(ctx, 'body', 600)};font-size:48px;line-height:54px">${A(B.name)}</p>
<p class="a c-body" style="left:345px;top:${y + 34}px;width:282px">${A(V.nameRules)}</p>`;
    const inner = `${plateLabel('Lines and boilerplate')}
${plateNote(`${Word(n)} line${n === 1 ? '' : 's'} in use, and the boilerplate in two lengths.`, 403, 72, 224)}
<p class="a c-label" style="left:49px;top:232px">Lines in use</p>${ln}${bp}${nm}`;
    return sheet(ctx, 'messaging', { hp: 200, hit: { text: String(n), x: 49, base: 168, size: 160, maxW: 300 } }, inner);
  },

  // The brand on one page: the logo printed clean on the plate, and the hit is how many inks the press runs for this brand. On the paper: the
  // brand's own rules, its colours by share as one strip, and its two faces.
  summary(ctx) {
    const B = ctx.brand, P = pressOf(ctx), G = B.guideB || {}, rules = G.rules || [], nd = P.drums.length;
    const dst = stem(ctx, 'display', 500), bst = stem(ctx, 'body', 400);
    const lw = fitW(ctx, 'colour', 330, 150);
    const logo = `<div class="a" style="left:49px;top:96px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: logoOnPlate(ctx), label: 'Your logo goes here' })}</div>`;
    const inks = `Printed in ${word(nd)} ink${nd === 1 ? '' : 's'} on ${A((ctx.colours.find((c) => c.hex.toUpperCase() === P.paper.toUpperCase()) || { name: 'Offset' }).name)}: ${andList(P.drums.map((d) => A(d.name)))}.`;
    let y = 472, rw = '';
    for (const r of rules) {
      const tx = r.text || r.body || '', th = nLines(dst, r.title, 20, 224) * 26, bh = nLines(bst, tx, 14, 342) * 21;
      rw += `${hair(y)}<p class="a" style="left:49px;top:${y + 14}px;width:224px;${faceCss(ctx, 'display', 500)};font-size:20px;line-height:26px">${A(r.title)}</p>
<p class="a c-body" style="left:285px;top:${y + 16}px;width:342px">${A(tx)}</p>`;
      y += Math.max(th, bh) + 40;
    }
    // the colours by share: one strip, each chip as wide as its share; a chip the colour of the paper gets a hairline edge
    y += 8;
    const cols = ctx.colours.slice().sort((a, b) => b.share - a.share), tot = cols.reduce((a, c) => a + c.share, 0);
    let x = 0, strip = '', labs = '';
    for (const c of cols) {
      const w = Math.round((c.share / tot) * 578), edge = ctx.ratio(c.hex, P.paper) < 1.3;
      strip += `<i class="g1-chip" style="left:${x}px;width:${w}px;background:${c.hex}${edge ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"></i>`;
      x += w;
    }
    // the key under the strip: one column a colour, in the strip's order, so a colour with a sliver of share is still named
    const per = Math.min(cols.length, 5), cw = Math.floor(578 / per);
    cols.forEach((c, i) => {
      const lx = 49 + (i % per) * cw, ly = y + 52 + Math.floor(i / per) * 40, edge = ctx.ratio(c.hex, P.paper) < 1.3;
      labs += `<i class="a" style="left:${lx}px;top:${ly + 2}px;width:10px;height:10px;background:${c.hex}${edge ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"></i><p class="a c-note nw" style="left:${lx + 16}px;top:${ly}px;font-weight:600">${A(c.name)}</p><p class="a c-value nw" style="left:${lx + 16}px;top:${ly + 16}px">${Math.round(c.share * 100)}%</p>`;
    });
    const sw = `<div class="a" style="left:49px;top:${y}px;width:578px;height:40px">${strip}</div>${labs}`;
    y += 120 + (Math.ceil(cols.length / per) - 1) * 40;
    const F = B.fonts, face = (f, role, x0) => `<p class="a nw" style="left:${x0}px;top:${y}px;${faceCss(ctx, role, role === 'display' ? 500 : 400)};font-size:56px;line-height:60px">Aa</p>
<p class="a c-body nw" style="left:${x0}px;top:${y + 68}px;font-weight:600">${A(f.family)}</p><p class="a c-value nw" style="left:${x0}px;top:${y + 90}px">${f.weights.join(', ')}</p>`;
    const inner = `${plateLabel('The brand on one page', 49)}${logo}
${plateNote(inks, 49, 360, 330)}${rw}${sw}${face(F.display, 'display', 49)}${face(F.body, 'body', 345)}`;
    return sheet(ctx, 'summary', { hp: 440, hit: { text: String(nd), x: 403, base: 392, size: 300, maxW: 224 } }, inner);
  },

  // Contact and scope: the colophon at the back of the run. The hit is the number of pages in this edition; the plate says who owns the
  // document, and the paper holds the colophon, what this document leaves out, and the version history.
  'contact-scope'(ctx) {
    const B = ctx.brand, P = pressOf(ctx), C = B.contact || {}, np = ctx.pages.length, ns = ctx.sections.length;
    const bst = stem(ctx, 'body', 400);
    const not = (B.guideB && B.guideB.notIn) || ['Logo files, palettes and fonts. They are in the brand kit.', 'Interface components and tokens. They are in the UI kit.', 'Print specifications. Ask your printer for a proof.'];
    const paperName = (ctx.colours.find((c) => c.hex.toUpperCase() === P.paper.toUpperCase()) || { name: 'Offset' }).name;
    const F = B.fonts, fam = [...new Set([F.display.family, F.body.family])];
    const colo = `This edition runs to ${np} pages in ${word(ns)} sections. Printed in ${word(P.drums.length)} ink${P.drums.length === 1 ? '' : 's'} on ${A(paperName)}: ${andList(P.drums.map((d) => A(d.name)))}. Set in ${andList(fam.map(A))}, with values in Sono Mono.`;
    // the address is a value set in Sono Mono (0.6 em a character, at .92 of the line's size), so the size is capped where the address alone fits the measure
    const emCap = 222 / (String(C.email || '').length * 0.6 * 0.92);
    const [os, ol] = fit(bst, [`${C.owner} owns this document. Write to ${C.email} for a logo file, a missing asset or an exception.`], [[18, 27], [16, 24], [15, 22], [14, 21], [13, 19]].filter(([s], i, a) => s <= emCap || i === a.length - 1), 224, 8);
    let y = 600, nl = '';
    for (const t of not) { nl += `<p class="a c-body" style="left:345px;top:${y}px;width:282px">${A(t)}</p>`; y += nLines(bst, t, 14, 282) * 21 + 12; }
    const vy = Math.max(y, 600 + nLines(bst, colo, 14, 272) * 21) + 40;
    const inner = `${plateLabel('Contact and scope', 49)}
<p class="a c-label" style="left:403px;top:96px;color:var(--ptxt)">Who to ask</p>
<p class="a" style="left:403px;top:120px;width:224px;${faceCss(ctx, 'body', 400)};font-size:${os}px;line-height:${ol}px;color:var(--ptxt)">${A(C.owner)} owns this document. Write to ${val(C.email)} for a logo file, a missing asset or an exception.</p>
${plateNote(`Pages in this edition.`, 403, 452, 224)}
${hair(552)}<p class="a c-label" style="left:49px;top:568px">Colophon</p><p class="a c-label" style="left:345px;top:568px">Not in this document</p>
<p class="a c-body" style="left:49px;top:600px;width:272px">${colo}</p>${nl}
${hair(vy)}<p class="a c-label" style="left:49px;top:${vy + 16}px">Version history</p>
<p class="a c-value" style="left:49px;top:${vy + 44}px">${A(B.version.number)}</p><p class="a c-note" style="left:103px;top:${vy + 42}px">${A(ctx.date)}</p><p class="a c-note" style="left:345px;top:${vy + 42}px">First release.</p>`;
    return sheet(ctx, 'contact-scope', { hp: 520, hit: { text: String(np), x: 49, base: 472, size: 280, maxW: 330 } }, inner);
  },
};
