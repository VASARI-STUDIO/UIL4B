// Guidelines pages for theme 05, Catalogue: contents, intro, personality, voice, write-this, messaging. Styles are in css-p-front.js
// (classes start kf-). Every page is an open sheet from the gate (call number top left, rod hole at the foot) carrying one piece of
// the catalogue's furniture: guide cards with third-cut tabs, the card's two indentions (ruled as Rod hairlines on the pages with
// no other drawn object, each line starting at the first block set on its stop so it never crosses type), See references and the
// tracings line. Text starts only on the margin, the first indention or the second
// (kIndent1, kIndent2 in css-p-front.js). No catalogue cards here: cards belong to the colour, type and business card pages.
// Brand copy is read only through A(); a string that has to be counted goes through ctx.real() first.
import { A } from './helpers.js';
import { sheet } from './guidelines-k.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const count = (ctx, s) => ctx.real(s).trim().split(/\s+/).length;
const range = (s) => { const a = s.pages[0].no, z = s.pages.at(-1).no; return a === z ? `page ${a}` : `pages ${a} to ${z}`; };
// a See also reference to another page of this document: its title and its page number
const see = (ctx, id) => { const p = ctx.pages.find((x) => x.id === id); return p ? `${A(p.title)}, page <span class="num">${ctx.pageNo(id)}</span>.` : ''; };
const CUTS = ['l', 'c', 'r']; // third-cut guide cards: the tab steps left, centre, right, then starts again
// a guide card seen from above as a section divider: the tab cut at its third, the card's top edge running the full width
// (the typefaces page's guide set, at text size). The kf-tab class tells the slot edition to set a tab's words as a compact label
const guide = (cut, tab, body, cls = '') => `<section class="kf-gc kf-gc--${cut} ${cls}"><h2 class="kf-gct kf-tab">${tab}</h2><div class="kf-gcb">${body}</div></section>`;

export const pFront = {
  // the drawer pulled open: one guide card per section, filed front to back, each tab in the next third-cut position.
  // The tab carries the section number large and its pages; the card face carries the title and its contents note
  contents(ctx) {
    const cards = ctx.sections.map((s, i) => `<li class="kf-gd kf-gd--${CUTS[i % 3]}" style="z-index:${i + 1}">
<span class="kf-gtab"><b class="kf-gn num">${s.n}</b><span class="kf-gr num">${range(s)}</span></span>
<h2 class="k-disp kf-gt">${A(s.title)}</h2><p class="kf-cn">${s.pages.map((p) => A(p.title)).join(', ')}</p></li>`).join('');
    const inner = `<div class="kf-body kf-body--ct"><div class="kf-drw"><ol class="kf-gds" aria-label="Sections">${cards}</ol><span class="kf-lip"></span></div>
<p class="kf-ctl">${A(ctx.brand.lines.others[0])}</p></div>`;
    return sheet(ctx, 'contents', inner, 'kf-pg kf-pg-ct');
  },

  // the main entry, read at page size: the name as the heading at the first indention; the description as the title paragraph,
  // a hanging indention from the second back to the first; the notes at the second; the tracings and a See also reference at the
  // first, at the foot. Each indention is ruled from the first block set on it down to the tracings
  intro(ctx) {
    const B = ctx.brand;
    const traced = B.personality.map((t, i) => `<span class="num">${i + 1}.</span> ${A(t.trait)}.`).join(' ');
    const inner = `<div class="kf-body kf-body--in"><div class="kf-ruled">
<p class="k-disp kf-ihd kf-r1">${A(B.name)}</p>
<p class="k-disp kf-desc">${A(B.description)}</p>
<div class="kf-notes kf-r2"><p class="kf-note"><b>What it does.</b> ${A(B.product)}</p><p class="kf-note"><b>Who it serves.</b> ${A(B.audience)}</p></div></div>
<div class="kf-foot kf-foot--in"><p class="kf-trace">${traced}</p><p class="kf-see"><b>See also</b> ${see(ctx, 'personality')} ${see(ctx, 'voice')}</p></div>
</div>`;
    return sheet(ctx, 'intro', inner, 'kf-pg kf-pg-in');
  },

  // the ruled card at page size: the lede and the two lines at the head, then each trait set large on the card's own stops,
  // the margin, the first indention and the second; each indention is ruled from the trait set on it down to the foot
  personality(ctx) {
    const B = ctx.brand, n = B.personality.length, m = B.lines.others.length;
    const lines = B.lines.others.map((l) => `<li class="k-disp kf-pline">${A(l)}</li>`).join('');
    const traits = B.personality.map((t, i) => `<li class="kf-trait${i ? ' kf-trait--r' : ''}" style="--k:${Math.min(i, 2)}"><h2 class="k-disp kf-tw">${A(t.trait)}</h2><p class="kf-tm">${A(t.means)}</p></li>`).join('');
    const inner = `<div class="kf-body kf-body--pe">
<p class="k-lead kf-pretty">${A(B.name)} has ${word(n)} traits. ${cap(word(m))} lines carry them, and the traits explain how to write more.</p>
<ul class="kf-plines">${lines}</ul>
<ul class="kf-trs kf-ruled ph-tight">${traits}</ul></div>`;
    return sheet(ctx, 'personality', inner, 'kf-pg kf-pg-pe');
  },

  // a guide set, one guide card per habit, cut left, centre, right and round again; the line that does the habit is filed under
  // its tab at the first indention. The main line is traced at the foot, with a See also to the messaging page
  voice(ctx) {
    const B = ctx.brand, P = B.voice.principles;
    const rows = P.map((p, i) => guide(CUTS[i % 3], `<b class="num">${i + 1}</b> <span>${A(p.title)}</span>`, `<p class="k-disp kf-vx">${A(p.example)}</p>`)).join('');
    const inner = `<div class="kf-body kf-body--vo">
<p class="k-lead kf-pretty">${cap(word(P.length))} habits keep ${A(B.name)} sounding like itself. Each one comes with a line that does it.</p>
<div class="kf-vps">${rows}</div>
<div class="kf-foot"><p class="kf-trace"><b>Main line.</b> ${A(B.lines.primary)}</p><p class="kf-see"><b>See also</b> ${see(ctx, 'messaging')}</p></div></div>`;
    return sheet(ctx, 'voice', inner, 'kf-pg kf-pg-vo');
  },

  // the line to write is the entry, with its reason as the note. The line it replaces is filed as a See reference: look it up,
  // and it sends you to the entry. The first entry is set large
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    const rows = W.map((r, i) => `<li class="kf-we ${i ? '' : 'kf-we--first'}"><span class="kf-wn num">${i + 1}</span>
<p class="k-disp kf-ww">${A(r.write)}</p><p class="kf-wb">${A(r.because)}</p>
<p class="kf-wr"><span class="kf-wnot">${A(r.not)}</span> <span class="kf-wsee"><b>See</b> ${A(r.write)}</span></p></li>`).join('');
    const inner = `<div class="kf-body kf-body--wt">
<p class="k-lead kf-pretty">${cap(word(W.length))} lines, written the way ${A(ctx.brand.name)} writes. Each line it replaces is filed as a See reference, which sends the reader on to the line to write.</p>
<ol class="kf-wes ph-tight">${rows}</ol></div>`;
    return sheet(ctx, 'write-this', inner, 'kf-pg kf-pg-wt');
  },

  // the lines from the top down by size, then the two boilerplates in one column at the second indention, short then long, each
  // closed by its length as the collation line; the indentions ruled from the other lines down to the guide card that files the
  // name and how to write it
  messaging(ctx) {
    const B = ctx.brand, V = B.voice;
    const others = B.lines.others.map((l) => `<li class="k-disp kf-mol">${A(l)}</li>`).join('');
    const bp = (s) => `<p class="kf-bt">${A(s)}</p><p class="kf-coll"><span class="num">${count(ctx, s)}</span> words.</p>`;
    const name = `<p class="k-disp kf-nmn">${A(B.name)}</p><p class="kf-nmr">${A(V.nameRules)}</p>`;
    const inner = `<div class="kf-body kf-body--ms">
<div class="kf-ruled kf-mru">
<p class="k-disp kf-mp">${A(B.lines.primary)}</p>
<ul class="kf-mo kf-r1 kf-r2">${others}</ul>
<div class="kf-bps">${bp(V.boilerplate25)}${bp(V.boilerplate50)}</div>
</div>
${guide('l', 'The name, in a sentence', name, 'kf-nm')}
</div>`;
    return sheet(ctx, 'messaging', inner, 'kf-pg kf-pg-ms');
  },
};
