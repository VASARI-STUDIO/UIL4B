// Guidelines pages for theme 08, Riso: contents, intro, personality, voice, write-this, messaging. Styles are in css-p-front.js (rf-).
// The frame, the crosses and the drum helpers come from the gate (guidelines-r.js). Open pages carry no crosses; only a printed
// sheet does, at its corners, and each sheet carries its job line under it: the drums it used and the paper, worked out from the inks
// it actually prints in. Only the brand's real colours: no tints, no overprints, no tint under text.
import { A } from './helpers.js';
import { page, corners, cross, drums, drumNo, paper, byRole, inkOn, readInk, Word, isSurface } from './guidelines-r.js';

const low = (s) => s.toLowerCase();
const hx = (h) => String(h).toLowerCase();
// a drum's own ink for words at a size, where it passes on the paper (4.5 : 1, or 3 : 1 at 24 px and over); else the text colour
const inkAt = (ctx, hex, px) => { const L = ctx.roles.light; return ctx.ratio(hex, L.surface) >= (px >= 24 ? 3 : 4.5) ? hex : L.text; };
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const nameOfHex = (ctx, hex) => { const c = ctx.colours.find((x) => hx(x.hex) === hx(hex)) || ctx.tones.find((x) => hx(x.hex) === hx(hex)); return c ? c.name : ''; };

// the job line, copied from p-image.js so every lane prints one form: each drum the sheet prints, in drum order, its name in its own
// ink where that reads, then what it carries; whatever is in the paper's colour is the paper showing through; a tone that is no drum
// is named as it is. uses: [hex, what] pairs.
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    const c = drumOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hx(hex) === hx(p.hex)) through.push(what); else other.push([nameOfHex(ctx, hex), what]);
  }
  const used = D.filter((c) => by.has(c));
  const parts = used.map((c) => `<span class="rf-jd"><i class="rf-sw" style="background:${c.hex}"></i><b style="color:${readInk(ctx, c.hex)}">Drum ${drumNo(ctx, c)} ${A(c.name)}</b>: ${by.get(c).join(', ')}.</span>`);
  const n = used.length, lead = `<span class="rf-jn">${Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span>`;
  const show = through.length ? ` <span>The paper shows through for ${through.join(', ')}.</span>` : '';
  const rest = other.map(([nm, what]) => ` <span>${A(nm)}: ${what}.</span>`).join('');
  const ph = photo ? ' <span class="rf-jn">The photograph keeps its own colour: no drum prints over it.</span>' : '';
  return `<p class="rf-job">${lead} ${parts.join(' ')}${show}${rest}${ph}</p>`;
}
// a sheet printed in two drums carries both drums' crosses: one drum on the falling diagonal, the other on the rising one
const corners2 = (a, b, s) => (hx(a) === hx(b) ? corners(a, s) : ['tl', 'tr', 'bl', 'br'].map((k, i) => `<span class="r-xc r-xc--${k}">${cross(i === 0 || i === 3 ? a : b, s)}</span>`).join(''));
// crop marks for a piece imposed on a sheet, drawn only where a cut line meets the sheet's margin (never between pieces)
const ticks = (row, col, rows, cols) => [
  row === 0 && ['t', 'l'], row === 0 && ['t', 'r'], row === rows - 1 && ['b', 'l'], row === rows - 1 && ['b', 'r'],
  col === 0 && ['l', 't'], col === 0 && ['l', 'b'], col === cols - 1 && ['r', 't'], col === cols - 1 && ['r', 'b'],
].filter(Boolean).map(([side, at]) => `<i class="rf-tk rf-tk--${side} rf-tk--${side}${at}" aria-hidden="true"></i>`).join('');
const words = (ctx, s) => ctx.real(s).trim().split(/\s+/).length;
// the page's name in the contents is its H1: one name per page
const titleOf = (ctx, id) => A(ctx.pages.find((p) => p.id === id).title);
const top = (h, lead) => `<div class="r-top"><h1 class="r-h1">${h}</h1>${lead ? `<p class="r-lead">${lead}</p>` : ''}</div>`;

export const pFront = {
  // the sections in two columns, each led by its number large in the action drum, its pages run in under the title with folios;
  // the columns split by page count and spread to the foot margin, both ending on the same line
  contents(ctx) {
    const act = byRole(ctx, 'action'), nk = inkAt(ctx, act.hex, 48), S = ctx.sections;
    const total = S.reduce((n, s) => n + s.pages.length + 1, 0);
    let run = 0, cut = S.length;
    for (let i = 0; i < S.length; i++) { run += S[i].pages.length + 1; if (run >= total / 2) { cut = i + 1; break; } }
    const sec = (s) => `<li class="rf-cs"><span class="rf-cs__n num" style="color:${nk}">${s.n}</span><div><h2 class="rf-cs__t">${A(s.title)}</h2>`
      + `<ol class="rf-cs__p">${s.pages.map((p) => `<li>${A(p.title)} <span class="num rf-q">${p.no}</span></li>`).join('')}</ol></div></li>`;
    const col = (list) => `<ol class="rf-tc">${list.map(sec).join('')}</ol>`;
    return page(ctx, 'contents', `${top('Contents')}<div class="rf-toc">${col(S.slice(0, cut))}${col(S.slice(cut))}</div>`);
  },

  // who we are set large across the page, what it does and who it serves under it in two unequal columns, and pinned to the foot
  // margin the key to the rest of the book: the drums in order, and the paper
  intro(ctx) {
    const B = ctx.brand, D = drums(ctx), p = paper(ctx);
    const key = `<div class="rf-key"><p class="rf-key__t">This book is set as riso printed matter. Each colour that prints is a drum, numbered by how much of a page it covers. ${A(p.name)} is the paper and takes no ink.</p>`
      + `<ul class="rf-key__d">${D.map((c) => `<li><i style="background:${c.hex}"></i><span class="rf-key__n">Drum ${drumNo(ctx, c)}</span> ${A(c.name)}</li>`).join('')}<li><i class="r-hair" style="background:${p.hex}"></i><span class="rf-key__n">Paper</span> ${A(p.name)}</li></ul></div>`;
    return page(ctx, 'intro', `${top(titleOf(ctx, 'intro'))}<div class="rf-body rf-in${ctx.edition === 'slot' ? ' rf-in--slot' : ''}">`
      + `<p class="disp rf-in__d ph-tight">${A(B.description)}</p>`
      + `<div class="rf-in__two"><section><h2 class="rf-h2">What it does</h2><p class="rf-p">${A(B.product)}</p></section><section><h2 class="rf-h2">Who it serves</h2><p class="rf-p">${A(B.audience)}</p></section></div>`
      + `${key}</div>`);
  },

  // the traits in three ruled rows, each word large and roman flush left with what it means hung from its cap height; the rows take
  // the page to the slip. The lines that say the brand in a breath print as a one-drum slip, the way the cover prints its line: the
  // action drum's ink on the paper (or the text ink, if that reads better), the sheet's crosses in the same ink
  personality(ctx) {
    const B = ctx.brand, T = B.personality, lines = [B.lines.primary, ...(B.lines.others || [])];
    const sk = inkAt(ctx, byRole(ctx, 'action').hex, 24);
    const traits = T.map((t) => `<li class="rf-tr"><h2 class="disp rf-tr__w ph-tight">${A(t.trait)}</h2><p class="rf-p rf-tr__m">${A(t.means)}</p></li>`).join('');
    const slip = `<figure class="rf-slip"><div class="r-sheet rf-slip__sh">${corners(sk, 13)}<div class="rf-slip__pr" style="color:${sk}">`
      + `${lines.map((l, i) => `<p class="disp ${i ? 'rf-slip__l2' : 'rf-slip__l1'}">${A(l)}</p>`).join('')}</div></div>`
      + `<figcaption><h2 class="rf-h2">In a breath</h2>${job(ctx, [[sk, 'the lines']])}</figcaption></figure>`;
    return page(ctx, 'personality', `${top('Personality', `${Word(T.length)} traits.`)}<div class="rf-body rf-pe${ctx.edition === 'slot' ? ' rf-slot' : ''}"><ol class="rf-trs">${traits}</ol>${slip}</div>`);
  },

  // the habits as labels, a step and repeat of equal labels two to a row on one sheet that runs to the foot margin; crop marks only
  // in the sheet's margin, one pair per cut line. Each label carries its example at the label's own size, its habit printed under it
  voice(ctx) {
    const P = ctx.brand.voice.principles, ink = ctx.roles.light.text, cols = 2, rows = Math.ceil(P.length / cols);
    const labels = P.map((p, i) => `<li class="rf-lb"><div class="rf-lb__c">${ticks(Math.floor(i / cols), i % cols, rows, cols)}<p class="rf-lb__x">${A(p.example)}</p></div>`
      + `<p class="rf-lb__h">${A(p.title)}</p></li>`).join('');
    const sheet = `<figure class="rf-vo"><div class="r-sheet rf-vo__sh">${corners(ink, 15)}<ol class="rf-lbs" style="--r:${rows}">${labels}</ol></div><figcaption>${job(ctx, [[ink, 'the examples'], [ink, 'the habits']])}</figcaption></figure>`;
    const n = Word(P.length);
    return page(ctx, 'voice', `${top(titleOf(ctx, 'voice'), `${n} habits, each printed as a label, ${low(n)} to a sheet, cut at the marks.`)}<div class="rf-body rf-vb${ctx.edition === 'slot' ? ' rf-slot' : ''}">${sheet}</div>`);
  },

  // one two-drum sheet holds every rewrite: the line in the text ink, its reason in the action drum. What we never say runs in one
  // column on the open page to its right, each line beside its pair: the sheet's edge is the line between what goes to press and
  // what never does. The sheet runs to the foot margin.
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis, act = byRole(ctx, 'action'), ink = ctx.roles.light.text, rk = inkAt(ctx, act.hex, 13);
    const rows = W.map((x, i) => `<li class="rf-wr" style="grid-row:${i + 2}"><div class="rf-wr__p"><p class="rf-wr__w">${A(x.write)}</p><p class="rf-wr__b" style="color:${rk}">${A(x.because)}</p></div>`
      + `<p class="rf-wr__t">${A(x.not)}</p></li>`).join('');
    const rk2 = drums(ctx).find((c) => low(c.hex) === low(rk));
    const lead = `${Word(W.length)} lines, rewritten. The sheet is how we say it, the line in ${A(byRole(ctx, 'text').name)} and the reason in ${A((rk2 || byRole(ctx, 'text')).name)}. Beside it is what we never say: it never goes to press.`;
    const grid = `<div class="rf-wt__g" style="--n:${W.length}"><div class="r-sheet rf-wt__sh" aria-hidden="true">${corners2(ink, rk, 11)}</div>`
      + `<p class="rf-wr__k rf-wt__k1">Write this</p><p class="rf-wr__k rf-wt__k2">Not that</p><ol>${rows}</ol></div>`;
    return page(ctx, 'write-this', `${top(titleOf(ctx, 'write-this'), lead)}<div class="rf-body rf-wrs${ctx.edition === 'slot' ? ' rf-slot' : ''}">${grid}${job(ctx, [[ink, 'the lines'], [rk, 'the reasons']])}</div>`);
  },

  // the lines in use as a poster: the first set very large on the accent drum's plate, the next under it in the action drum; then
  // the two boilerplates side by side, their word counts as heads, and how to write the name across the foot
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, all = [B.lines.primary, ...(B.lines.others || [])];
    const acc = byRole(ctx, 'accent'), act = byRole(ctx, 'action'), ink = ctx.roles.light.text, on = inkOn(ctx, acc.hex), lk = inkAt(ctx, act.hex, 28);
    const uses = [[acc.hex, 'the plate'], [on, 'the first line'], ...(all.length > 1 ? [[lk, `the ${all.length > 2 ? 'other lines' : 'second line'}`]] : [])];
    const poster = `<figure class="rf-ms"><div class="r-sheet rf-ms__sh">${corners(ink, 15)}<div class="rf-ms__pl" style="background:${acc.hex};color:${on}"><p class="disp rf-ms__l1 ph-tight">${A(all[0])}</p></div>`
      + `${all.slice(1).map((l) => `<p class="disp rf-ms__l2 ph-tight" style="color:${lk}">${A(l)}</p>`).join('')}</div><figcaption>${job(ctx, uses)}</figcaption></figure>`;
    const bp = (h, s, cls) => `<section class="${cls}"><h2 class="rf-h2">${h}</h2><p class="rf-p">${A(s)}</p></section>`;
    return page(ctx, 'messaging', `${top(titleOf(ctx, 'messaging'), `What we say. ${Word(all.length)} lines in use, and the boilerplate.`)}<div class="rf-body rf-mg">${poster}`
      + `<div class="rf-mg__bp">${bp(`Short boilerplate, <span class="num">${words(ctx, V.boilerplate25)}</span> words`, V.boilerplate25, 'rf-mg__s')}${bp(`Long boilerplate, <span class="num">${words(ctx, V.boilerplate50)}</span> words`, V.boilerplate50, 'rf-mg__lg')}</div>`
      + `<section class="rf-mg__nm"><h2 class="rf-h2">Writing the name</h2><p class="rf-p">${A(V.nameRules)}</p></section></div>`);
  },
};
