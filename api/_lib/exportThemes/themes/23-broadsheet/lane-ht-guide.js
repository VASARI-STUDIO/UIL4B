// Theme 23, Broadsheet, lane ht: the guidelines as the paper's web edition (guideSite). Every page is a story: the folio bar over the
// thin-thick rule, the page's name as the headline, a deck, the section's other pages in the fourth column, and the copy in three ruled
// columns. Under the story the printed page is pasted in at its own size (the replica edition), zoomed to the column on narrower screens, so
// the phone reads the story and still sees the page. A page the paper has not printed yet runs with a halftone plate from the brand's own
// photographs. The front (index.html) is the front page: the nameplate, the lead with its plate, the index and the section contents.
// Copy comes from brand.json or is the template's own description of the page; every value is read from ctx.
import { guidelines as R1 } from './guidelines.js';
import { guidelines as G1 } from './lane-g1.js';
import { guidelines as G2 } from './lane-g2.js';
import { guidelines as G3 } from './lane-g3.js';
import { guidelines as G4 } from './lane-g4.js';
import { guidelines as G5 } from './lane-g5.js';
const listAnd = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
import { siteUnits } from '../../engine/guide-site.js';
import { plateOf, plateSvg } from './lane-bk-plates.js';
import { A, head, sizeFor, mono, masthead, folio, pageNo, jumps, foot, also, fitK } from './lane-ht-parts.js';

// the printed pages: round 1's, then every guidelines lane's (lane-g1.js and on), merged in file order as the loader merges them
const PDF = { ...R1, ...G1, ...G2, ...G3, ...G4, ...G5 };

const PART = 'brand guidelines';
const pct = (n) => `${Math.round(n * 100)}%`;
const h = (t) => ({ h: t });
const nameOf = (ctx, hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || ctx.tones.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || { name: hex.toUpperCase() }).name;
const rgb = (ctx, hex) => ctx.C.hexToRgb(hex).join(' ');

// ---- the stories: a deck and the copy for every page, from the brand's data -----------------------------------------------------------
// an item is a paragraph (a string of markup) or { h } (a subhead)
const STORY = {
  intro: (ctx) => { const B = ctx.brand; return { deck: B.description, copy: [h('What it does'), A(B.product), h('Who it serves'), A(B.audience)] }; },
  personality: (ctx) => { const P = ctx.brand.personality; return { deck: `${P.length} traits: ${listAnd(P.map((p) => p.trait))}. Read them in order; the first leads.`, copy: P.flatMap((p) => [h(p.trait), A(p.means)]) }; },
  voice: (ctx) => { const V = ctx.brand.voice; return { deck: `${V.principles.length} principles, each with the line that shows it.`, copy: [...V.principles.flatMap((p) => [h(p.title), A(p.example)]), h('Writing the name'), A(V.nameRules)] }; },
  'write-this': (ctx) => { const W = ctx.brand.voice.writeThis; return { deck: W[0].write, copy: W.flatMap((r) => [h(r.write), `<b>Not</b> ${A(r.not)}`, A(r.because)]) }; },
  messaging: (ctx) => { const B = ctx.brand, V = B.voice; return { deck: B.lines.primary, copy: [h('The other lines'), ...B.lines.others.map(A), h('The brand in 25 words'), A(V.boilerplate25), h('The brand in 50 words'), A(V.boilerplate50)] }; },
  logo: (ctx) => { const B = ctx.brand, L = ctx.logo; return { deck: B.logo.idea, copy: L.versions.filter((id) => B.logo.when[id]).flatMap((id) => [h(L.labels[id]), A(B.logo.when[id])]) }; },
  'logo-versions': (ctx) => { const B = ctx.brand, L = ctx.logo; return { deck: `${L.versions.length} versions, all drawn from one mark.`, copy: L.versions.flatMap((id) => [h(L.labels[id]), A(B.logo.when[id] || `Use it where the ${L.labels[id].toLowerCase()} fits the space.`)]) }; },
  'clear-space': (ctx) => ({ deck: `Keep ${ctx.logo.clearShare}% of the logo&rsquo;s height clear on every side.`, copy: ['Nothing else enters that space: no type, no edge of a photograph, no other mark.', 'Where a piece is tight, use a smaller logo, never a smaller margin.'] }),
  'min-size': (ctx) => {
    const m = ctx.logo.minSize;
    return ctx.edition === 'slot' ? { deck: 'The smallest size is set once the logo is in place.', copy: ['It is the width at which every part of the logo still reads as one mark.'] }
      : { deck: `Never smaller than ${m.screenPx} px wide on screen or ${m.printMm} mm in print.`, copy: [h('Screen'), `${mono(`${m.screenPx} px`)} wide.`, h('Print'), `${mono(`${m.printMm} mm`)} wide.`] };
  },
  'logo-grounds': (ctx) => { const B = ctx.brand, cw = B.logo.colourways; return { deck: `${Object.keys(cw).length} grounds, each with the version made for it.`, copy: Object.keys(cw).flatMap((k) => [h(cw[k].name || ctx.cap(k.replace(/-/g, ' '))), A(B.logo.when[k] || `${cw[k].name || k}.`)]) }; },
  'logo-misuse': () => ({ deck: 'The logo is used only as it is drawn.', copy: ['Do not stretch, squash or skew it.', 'Do not rotate it.', 'Do not recolour it outside its versions.', 'Do not outline it, box it, or add shadows or other effects.', 'Do not set it on a busy part of a photograph.'] }),
  palette: (ctx) => ({ deck: `${ctx.colours.length} colours, and the share of a piece each one takes.`, copy: ctx.colours.flatMap((c) => [h(c.name), `${A(c.lands)} ${mono(c.hex.toUpperCase())}, ${pct(c.share)}.`]) }),
  proportion: (ctx) => {
    const c = [...ctx.colours].sort((a, b) => b.share - a.share);
    return { deck: `${A(c[0].name)} carries ${pct(c[0].share)} of a piece. ${A(c[c.length - 1].name)} gets ${pct(c[c.length - 1].share)}.`, copy: [...c.map((x) => `<b>${A(x.name)}</b> ${pct(x.share)}. ${A(x.lands)}`), h('The tones'), ...ctx.tones.map((t) => `<b>${A(t.name)}</b> ${A(t.lands || t.role || '')} ${mono(t.hex.toUpperCase())}`)] };
  },
  // the summary names the pairs and says what each group may do; the ratios are printed once, in the table of the page below
  contrast: (ctx) => {
    const nm = (p) => { const f = nameOf(ctx, p.fgHex), b = nameOf(ctx, p.bgHex); return f.endsWith(` on ${b}`) ? f : / on /.test(f) ? `${f}, over ${b}` : `${f} on ${b}`; };
    const body = ctx.pairs.filter((p) => !p.large), big = ctx.pairs.filter((p) => p.large), un = ctx.unusedPairs || [];
    return {
      deck: `${ctx.pairs.length} pairs carry text, measured with the WCAG formula. Body text needs 4.5:1; type at 24 px and over needs 3:1.`,
      copy: [
        ...(body.length ? [h('Body text'), `${body.length === 1 ? 'One pair clears' : `${body.length} pairs clear`} 4.5:1: ${listAnd(body.map((p) => A(nm(p))))}.`] : []),
        ...(big.length ? [h('Large type only'), `${big.length === 1 ? 'One pair is' : `${big.length} pairs are`} cleared for type at 24 px and over only: ${listAnd(big.map((p) => A(nm(p))))}. Never smaller.`] : []),
        ...(un.length ? [h('Kept off text'), `${un.length === 1 ? 'One pair falls' : `${un.length} pairs fall`} under its mark and never carries text.`] : []),
        h('The ratios'), 'Each pair and its ratio, on a scale of 1 to 21, is in the table on the printed page below.',
      ],
    };
  },
  'colour-values': (ctx) => ({ deck: 'Every colour as HEX, RGB and OKLCH, for screen and print files.', copy: [...ctx.colours, ...ctx.tones].flatMap((c) => [h(c.name), `HEX ${mono(c.hex.toUpperCase())}<br>RGB ${mono(rgb(ctx, c.hex))}${ctx.C.cmykOf(c) ? `<br>CMYK ${mono(ctx.C.cmykOf(c))}` : ''}`]) }),
  typefaces: (ctx) => {
    const F = ctx.brand.fonts, w = (f) => listAnd(f.weights.map(String));
    return { deck: `${F.display.family} for the big line, ${F.body.family} for reading, ${F.mono.family} for values.`, copy: [h(`Display: ${F.display.family}`), `Weights ${w(F.display)}. Headlines, one brief or one quote a page.`, h(`Body: ${F.body.family}`), `Weights ${w(F.body)}. Reading text, labels and captions.`, h(`Mono: ${F.mono.family}`), `Weights ${w(F.mono)}. Literal values only.`] };
  },
  hierarchy: (ctx) => { const S = ctx.brand.type.scale; return { deck: `${S.length} steps, from ${Math.max(...S.map((s) => s.size))} px to ${Math.min(...S.map((s) => s.size))} px.`, copy: S.flatMap((s) => [h(ctx.cap(s.token)), `${mono(`${s.size} / ${s.line} px`)}, weight ${s.weight}. ${A(s.use)}`]) }; },
  'type-in-use': (ctx) => { const T = ctx.brand.type.sample; return { deck: T.headline, copy: [A(T.paragraph), h('The caption'), A(T.caption || '')] }; },
  'type-rules': (ctx) => { const r = ctx.brand.type.rules; return { deck: r[0].do, copy: r.flatMap((x) => [h(x.do), `<b>Not</b> ${A(x.dont)}`]) }; },
  'photo-direction': (ctx) => { const D = ctx.brand.imagery.direction; return { deck: D.subject, copy: [['light', 'Light'], ['crop', 'Crop'], ['colour', 'Colour'], ['people', 'People']].filter(([k]) => D[k]).flatMap(([k, t]) => [h(t), A(D[k])]) }; },
  'shot-list': (ctx) => { const S = ctx.brand.imagery.shots; return { deck: `${S.length} shots make the set.`, copy: S.map((s) => A(s.slot)) }; },
  'imagery-rules': (ctx) => { const r = ctx.brand.imagery.rules; return { deck: r[0].do, copy: r.flatMap((x) => [h(x.do), `<b>Not</b> ${A(x.dont)}`]) }; },
  grid: (ctx) => { const L = ctx.brand.layout; return { deck: `${L.columns} columns, ${L.gutter} px gutters, on a ${L.base} px base.`, copy: [h('Margin'), `${mono(`${L.margin} px`)} on every side.`, h('Gutter'), `${mono(`${L.gutter} px`)} between columns.`, h('Base'), `Every size and gap is a step of ${mono(`${L.base} px`)}.`] }; },
  layouts: (ctx) => ({ deck: `Every layout sits on the ${ctx.brand.layout.columns}-column grid.`, copy: ['One headline, one picture and the copy: each takes its columns from the grid and leaves the rest of the page as paper.', h('The line'), A(ctx.brand.lines.primary)] }),
  'business-card': (ctx) => { const C = ctx.brand.applications.card; return { deck: `${C.person}, ${C.role}.`, copy: [h('On the card'), `${A(C.person)}<br>${A(C.role)}<br>${A(C.contact)}`, h('The site'), A(ctx.brand.applications.site.url)] }; },
  social: (ctx) => { const S = ctx.brand.applications.social || []; return { deck: S[0] || ctx.brand.lines.primary, copy: [h('The posts'), ...S.map(A)] }; },
  signage: (ctx) => ({ deck: ctx.brand.applications.signage || ctx.brand.lines.primary, copy: [h('The line'), A(ctx.brand.lines.primary)] }),
  'email-signature': (ctx) => { const E = ctx.brand.applications.email; return { deck: `${E.person}, ${E.role}.`, copy: [h('The signature'), `${A(E.person)}<br>${A(E.role)}<br>${A(ctx.brand.applications.site.url)}`] }; },
  digital: (ctx) => { const B = ctx.brand; return { deck: B.product, copy: [h('The site'), A(B.applications.site.url), h('Who it serves'), A(B.audience)] }; },
  summary: (ctx) => { const B = ctx.brand; return { deck: B.lines.primary, copy: [A(B.description), h('Personality'), A(listAnd(B.personality.map((p) => p.trait))), h('Colour'), A(listAnd(ctx.colours.map((c) => c.name))), h('Type'), A(listAnd([B.fonts.display.family, B.fonts.body.family, B.fonts.mono.family]))] }; },
  'contact-scope': (ctx) => { const B = ctx.brand; return { deck: `Questions about the brand go to ${B.contact.owner}.`, copy: [h('Contact'), `${A(B.contact.owner)}<br>${A(B.contact.email)}`, h('This edition'), A(ctx.versionLine || `Version ${B.version.number}`)] }; },
};

const copyOf = (items) => items.map((x) => (typeof x === 'string' ? `<p>${x}</p>` : `<h2>${A(x.h)}</h2>`)).join('');
// the deck is printed whole; marked-up decks (with an entity) pass as they are
const deckOf = (t) => (/&[a-z]+;/.test(t) ? t : A(t));

// a page the paper has not printed yet: a halftone plate from the brand's photographs, chosen by the page's place in the document
function platePaste(ctx, id) {
  const keys = ctx.brand.imagery.shots.map((s, i) => `shot-${i}`).filter((k) => plateOf(ctx, k));
  if (!keys.length) return '';
  const k = keys[ctx.pageNo(id) % keys.length], m = plateOf(ctx, k);
  return `<figure class="hx-plate">${plateSvg(ctx, k, { alt: A(m.shot.alt || m.caption) })}<figcaption class="hx-cap">${A(m.caption)}${m.shot.credit && !m.shot.generated ?`<span>Photo: ${A(m.shot.credit)}.</span>` : ''}</figcaption></figure>`;
}

// ---- one page ------------------------------------------------------------------------------------------------------------------------
function page(ctx, id) {
  const nav = siteUnits(ctx), u = nav.unitOf(id), sec = nav.sections.find((s) => s.n === u.section.n);
  const st = (STORY[id] || ((c) => ({ deck: c.brand.lines.primary, copy: [] })))(ctx);
  const n = pageNo(ctx, id), total = ctx.pages.length;
  const others = sec.units.map((x) => ({ href: x.file, ref: x.ref, title: x.title, current: x.id === id }));
  const printed = PDF[id];
  const paste = typeof printed === 'function'
    ? `<figure class="hx-rep" aria-label="The printed page"><div class="hx-rep__bar"><p>The printed page</p><p>Page ${n} of ${total}</p></div><div class="hx-sheet" data-gs-fit>${printed(ctx)}</div></figure>`
    : platePaste(ctx, id);
  const long = st.copy.length > 9;
  return `<article class="hx-art">
${folio(ctx, { no: `${u.section.n}`, title: u.section.title, page: `${u.ref}, page ${n}` })}
<div class="hx-g hx-hd"><div class="hx-c13 hx-fit">${head(ctx, 'h1', u.title, { fs: 88 })}<p class="hx-deck">${deckOf(st.deck)}</p></div>
<aside class="hx-c4 hx-r" aria-label="In this section"><h2 class="hx-lab">In this section</h2>${also(others)}</aside></div>
${st.copy.length ? `<div class="hx-story${long ? '' : ' hx-story--2'}">${copyOf(st.copy)}</div>` : ''}
${paste}
</article>`;
}

// ---- the front page --------------------------------------------------------------------------------------------------------------------
function front(ctx, S) {
  const B = ctx.brand, m = plateOf(ctx, 'front');
  const plate = m ? `<figure class="hx-plate">${plateSvg(ctx, 'front', { alt: A(m.shot.alt || m.caption) })}<figcaption class="hx-cap">${A(m.caption)}${m.shot.credit && !m.shot.generated ?`<span>Photo: ${A(m.shot.credit)}.</span>` : ''}</figcaption></figure>` : '';
  const index = S.sections.map((s) => `<li><a href="${s.units[0].file}"><span class="hx-n">${s.n}</span><span>${A(s.title)}</span></a></li>`).join('');
  const toc = S.sections.map((s) => `<li class="hx-toc__s"><h3 class="hx-toc__h"><span class="hx-n">${s.n}</span><span>${A(s.title)}</span></h3><ol>${s.units.map((x) => `<li><a href="${x.file}"><span class="hx-n">${A(x.ref)}</span><span>${A(x.title)}</span></a></li>`).join('')}</ol></li>`).join('');
  // the front page is this page: the printed cover (the same nameplate, line and plate) is not pasted under it
  return `<div class="hx-g hx-lead">
<div class="hx-c13 hx-fit">${head(ctx, 'h1', B.lines.primary, { cls: 'hx-h1 hx-h1--xl', fs: Math.min(132, sizeFor(B.lines.primary, 132) * 1.5) })}<p class="hx-deck">${A(B.description)}</p>${plate}</div>
<aside class="hx-c4 hx-r hx-side" aria-label="Inside"><h2 class="hx-lab">Inside</h2><ol class="hx-ix">${index}</ol>
<h2 class="hx-lab hx-lab--gap">What it does</h2><p>${A(B.product)}</p><h2 class="hx-lab hx-lab--gap">Who it serves</h2><p>${A(B.audience)}</p></aside>
</div>
<section class="hx-toc" id="contents" aria-labelledby="hx-toc-h">${folio(ctx, { no: '', title: 'Contents', page: `${ctx.pages.length} pages` }).replace('<p class="hx-folio__t">', '<h2 class="hx-folio__t" id="hx-toc-h">').replace(/Contents<\/p>/, 'Contents</h2>')}
<ol class="hx-toc__cols">${toc}</ol></section>`;
}

// ---- the shell ---------------------------------------------------------------------------------------------------------------------------
// The printed page is a full A3 sheet; where its content ends well above the foot, the web paste is trimmed to the content (the last drawn
// thing plus 56 px of paper), so a page never trails bare paper. The print file is not touched. Sheets whose content runs to the foot stay whole.
const CROP_JS = `(function(){function go(){var s=document.querySelectorAll('.hx-sheet>.pg');for(var i=0;i<s.length;i++){var pg=s[i];pg.style.height='';var r=pg.getBoundingClientRect(),k=r.width/1123;if(!k)continue;var b=0,all=pg.querySelectorAll('*');for(var j=0;j<all.length;j++){var e=all[j],own=false;for(var c=e.firstChild;c;c=c.nextSibling)if(c.nodeType===3&&c.nodeValue.trim()){own=true;break}if(e.children.length&&!own)continue;var q=e.getBoundingClientRect();if(!q.height||!q.width||q.height/k>1300)continue;var y=(q.bottom-r.top)/k;if(y>b)b=y}if(b>0&&b+56<1587-64)pg.style.height=Math.ceil(b+56)+'px'}}go();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go);window.addEventListener('load',go)})();`;
function shell(ctx, S) {
  const u = S.unit, cur = S.sections.find((s) => u.section && s.n === u.section.n);
  const secs = S.sections.map((s) => ({ n: s.n, title: s.title, href: s.units[0].file, current: cur && s.n === cur.n }));
  const lk = (x) => x && { href: x.file, title: x.front ? 'the front page' : `${x.ref} ${x.title}` };
  return `<a class="hx-skip" href="#hx-main">Skip to the story</a>
<div class="hx" data-gs-root data-page="${u.id}">
${masthead(ctx, { part: PART, secs, toggle: 'data-gs-toggle', front: S.isFront, current: cur ? `${cur.n} ${cur.title}` : 'Front page' })}
<main class="hx-main hx-wrap" id="hx-main" tabindex="-1">${S.body}
${jumps(lk(S.prev), lk(S.next))}
${foot(ctx, PART)}</main>
</div>
<script>${CROP_JS}</script>`;
}

export const guideSite = {
  page, front, shell,
  darkSample: ['index', 'palette', 'logo'],
  adapt: { strip: [], minStack: 3 },
};
export { fitK };
