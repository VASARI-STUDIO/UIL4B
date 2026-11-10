// Guidelines pages: contents, intro, personality, voice, write-this, messaging. Styles are in css-p-front.js (classes start tf-).
// Open pages on Stock, built from the ticket's parts and never from whole tickets: the perforation as a rule (vertical between a body
// and a stub column, horizontal between rows), serials as running numbers, fact fields label over value, the condensed stub face for
// small labels. The Voice section (voice, write-this, messaging) is the queue at night: Night ground, the one night run in the front matter.
// Brand copy is only ever printed whole through A(); word counts parse ctx.real(). No hex is written here.
import { A } from './helpers.js';
import { page, perf, fields, serial, NUM } from './gate.js';

// the perforation on an open page: holes 3 px across at a 9 px pitch, in the page's ink, on the left edge (or top edge) of its column
const pv = () => perf('currentColor', { d: 3, p: 9, cls: 'tf-perf' });
const ph = () => perf('currentColor', { d: 3, p: 9, dir: 'h', cls: 'tf-perf' });
const words = (ctx, s) => ctx.real(s).trim().split(/\s+/).length;
// a line set one sentence to a block, so a time ("Doors at 8.") never breaks from its "at". Showcase parses the line through ctx.real (the same
// sentence split the layouts statement uses); the slot edition keeps the placeholder whole
const sents = (ctx, line) => (ctx.edition === 'slot' ? A(line) : ctx.real(line).split(/(?<=\.)\s+/).map((s) => `<span class="tf-sent">${A(s)}</span>`).join(''));

export const pFront = {
  // the running order: the counts at the top right, one perforation under the title row, then the sections top-aligned under it,
  // the section names the large thing (the condensed stub face at the title step) and their pages listed under them by page number.
  // Open columns split by gutters, not perforations; the tagline lives on the cover and voice, not here.
  // Nine sections do not fit one row at the title step (Applications alone runs about 150 px at 34 px), so the run wraps to rows of five.
  contents(ctx) {
    const S = ctx.sections, n = S.reduce((t, s) => t + s.pages.length, 0) + 2; // with the cover and this page
    const cols = S.map((s, i) => `<li class="tf-cs"><span class="tk-sn">${serial(i + 1, 2)}</span><h2 class="tf-cs__t">${A(s.title)}</h2>
<ol class="tf-cs__set">${s.pages.map((p) => `<li><span class="tf-no num">${p.no}</span><span>${A(p.title)}</span></li>`).join('')}</ol></li>`).join('');
    const top = `<div class="tf-ct__top">${fields([['Sections', `<span class="num">${S.length}</span>`], ['Pages', `<span class="num">${n}</span>`]], 'tf-ff')}</div>`;
    return page(ctx, 'contents', `${top}<div class="tf-ct__strip">${ph()}<ol class="tf-cs__row">${cols}</ol></div>`, 'tf tf--contents');
  },

  // the body you keep and its stub: who the brand is, at the title step and top-aligned on 8 of 12 columns; what it does,
  // who it serves and where, as fields on the stub. The serial is this page's own number (the cover carries 0001).
  intro(ctx) {
    const B = ctx.brand;
    const no = (ctx.sections.flatMap((s) => s.pages).find((p) => p.id === 'intro') || {}).no;
    const body = `<div class="tf-in__body">${no ? `<span class="tk-sn">${serial(no, 4)}</span>` : ''}<h1 class="disp tf-in__d">${A(B.description)}</h1></div>`;
    const stub = `<div class="tf-in__stub">${pv()}${fields([['What it does', A(B.product)], ['Who it serves', A(B.audience)], ['City', A(B.city)]], 'tf-ff tf-ff--stack')}</div>`;
    return page(ctx, 'intro', `<div class="tf-in">${body}${stub}</div>`, `tf tf--intro${ctx.edition === 'slot' ? ' tf--in-slot' : ''}`);
  },

  // the traits as a run: the first on the body, set biggest; the others on the stub beyond the perforation, a row each;
  // the two lines that say it in a breath along the foot, torn off below
  personality(ctx) {
    const B = ctx.brand, P = B.personality, [l1, l2] = B.lines.others, slot = ctx.edition === 'slot';
    // the trait names are sized to their column: the expanded face runs about 1 em a letter (the lead column is 640 px, the stub 440 px)
    const len = (t) => Math.max(1, ctx.real(t.trait).length);
    const f0 = Math.min(160, Math.floor(640 / len(P[0]))), fs = Math.min(48, ...P.slice(1).map((t) => Math.floor(440 / (len(t) * 1.02))));
    const trait = (t, i) => `<div class="tf-pe__t${i ? '' : ' tf-pe__t--lead'}">${i > 1 ? ph() : ''}<span class="tk-sn">${serial(i + 1, 2)}</span><h2 class="disp tf-pe__n"${slot ? '' : ` style="font-size:${i ? fs : f0}px"`}>${A(t.trait)}</h2><p class="tf-pe__m">${A(t.means)}</p></div>`;
    const lead = `<p class="tk-lead tf-lead">${NUM[P.length] || P.length} traits shape how ${A(B.name)} sounds and behaves. Two lines say it in a breath.</p>`;
    const run = `<div class="tf-pe">${trait(P[0], 0)}<div class="tf-pe__stub">${pv()}${P.slice(1).map((t, k) => trait(t, k + 1)).join('')}</div></div>`;
    const foot = `<div class="tf-pe__foot">${ph()}<p class="tf-pe__l">${A(l1)}</p><p class="tf-pe__l">${pv()}${A(l2)}</p></div>`;
    return page(ctx, 'personality', `${lead}${run}${foot}`, `tf tf--personality${slot ? ' tf--slot' : ''}`);
  },

  // the queue at night. The primary line is the event line, as big as the page allows (its home in the document); the habits
  // run under one perforation, split by gutters: the serial in the stub face, the rule in the body face, its example under it
  voice(ctx) {
    const B = ctx.brand, V = B.voice.principles;
    const habits = V.map((p, i) => `<li class="tf-vo__h"><span class="tk-sn">${serial(i + 1, 2)}</span><p class="tf-vo__k">${A(p.title)}</p><p class="tf-vo__ex">${A(p.example)}</p></li>`).join('');
    return page(ctx, 'voice', `<h1 class="disp tf-vo__line">${ctx.edition === 'slot' ? `<span class="tf-vo__tag">${A(B.lines.primary)}</span>` : sents(ctx, B.lines.primary)}</h1><div class="tf-vo__strip">${ph()}<ol class="tf-vo__hs">${habits}</ol></div>`, 'tf tf--voice tf-night');
  },

  // each "Write this" on the body you keep, with its reason under it; its "Not that" on the stub side of one long perforation.
  // Open rows, not tickets; the first row is set biggest
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis, slot = ctx.edition === 'slot';
    const rows = W.map((r, i) => `<li class="tf-wt__r${i ? '' : ' tf-wt__r--lead'}"><div class="tf-wt__keep"><span class="tk-sn">${serial(i + 1, 2)}</span><div><p class="disp tf-wt__w">${A(r.write)}</p><p class="tf-wt__b">${A(r.because)}</p></div></div><p class="tf-wt__not">${A(r.not)}</p></li>`).join('');
    const head = `<div class="tf-wt__hd"><span class="tf-wt__k">Write this</span><span class="tf-wt__k">Not that</span></div>`;
    return page(ctx, 'write-this', `<div class="tf-wt"><div class="tf-tear" aria-hidden="true">${pv()}</div>${head}<ol class="tf-wt__rs">${rows}</ol></div>`, `tf tf--write tf-night${slot ? ' tf--slot' : ''}`);
  },

  // the stub carries the small print (how to write the name, the short boilerplate); the body carries the lines as a run of
  // serials, the primary line biggest, and the long boilerplate under them
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, L = [B.lines.primary, ...B.lines.others];
    const wc = (s) => `<span class="num">${words(ctx, s)}</span> words`;
    const lines = L.map((l, i) => `<li class="tf-ms__l${i ? '' : ' tf-ms__l--lead'}"><span class="tk-sn">${serial(i + 1, 2)}</span><p class="disp">${sents(ctx, l)}</p></li>`).join('');
    const block = (k, v) => `<div class="tf-ms__b"><p class="tf-ms__k">${k}</p><p class="tf-ms__v">${A(v)}</p></div>`;
    const stub = `<div class="tf-ms__stub">${block('Writing the name', V.nameRules)}${block(`Short boilerplate, ${wc(V.boilerplate25)}`, V.boilerplate25)}</div>`;
    const body = `<div class="tf-ms__body">${pv()}<ol class="tf-ms__ls">${lines}</ol><div class="tf-ms__long">${ph()}${block(`Long boilerplate, ${wc(V.boilerplate50)}`, V.boilerplate50)}</div></div>`;
    return page(ctx, 'messaging', `<div class="tf-ms">${stub}${body}</div>`, 'tf tf--messaging tf-night');
  },
};
