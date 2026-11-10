// Guidelines pages: photo-direction, shot-list, imagery-rules, grid, layouts. Styles are in css-p-image.js (classes start ki-).
// Open sheets from the gate (call number, title, rod hole at the foot). The catalogue's furniture does the work: a guide-card tab
// over the photograph carrying its shelf mark, the shelf list as shelves with a label holder on the edge under each slot, the
// card's indentions, guide tabs dividing the rules and "See" references for the don'ts, guide-card tabs as the column heads of
// the grid, plain captions under the layouts, and a "See also" line at the foot. Label holders only on the shelf edge.
// No cards on these pages. Every value comes from ctx; no brand name or hex is written here.
import { A } from './helpers.js';
import { sheet } from './guidelines-k.js';

const px = (n) => +n.toFixed(2);
const full = 'width:100%;height:100%';
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
// the card's first and second indention, from the page margin (review X1: 96 px and 136 px from the page edge)
const IND1 = 40, IND2 = 80;
const CUTS = ['l', 'c', 'r']; // guide tabs cut left, centre, right, as a real guide set is cut
// keeps the last words of a lede together so it never ends on one word
const nw = (s) => `<span class="ki-nw">${s}</span>`;
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
// a page drawn at its own size, shown at scale k, so its type keeps its print size
const scaled = (k, w, h, inner, cls = '', st = '') => `<div class="ki-sc ${cls}" style="width:${px(w * k)}px;height:${px(h * k)}px"><div class="ki-sc__in ph-tight" style="width:${w}px;height:${h}px;transform:scale(${k});${st}">${inner}</div></div>`;
const ab = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="ki-ab ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
// a drawer label holder (the gate's own classes): two screws and the label between them
const holder = (inner) => `<span class="k-holder ki-holder"><i class="k-screw"></i><span class="k-label">${inner}</span><i class="k-screw"></i></span>`;
// the cross-reference at the foot of a catalogue card: "See also", then each page by its title and folio
const seeAlso = (ctx, ids) => {
  const ps = ids.map((id) => ctx.pages.find((p) => p.id === id)).filter(Boolean);
  return ps.length ? `<p class="ki-see"><i>See also</i> ${ps.map((p) => `${A(p.title)}, page <span class="num">${ctx.pageNo(p.id)}</span>`).join('. ')}.</p>` : '';
};
const grid = (ctx) => {
  const G = ctx.gridMeasures;
  return { G, colX: (i) => G.margin + i * (G.col + G.gutter), span: (n) => n * G.col + (n - 1) * G.gutter };
};

export const pImage = {
  // the picture file: the first shot at full width, filed behind a guide card whose tab names it, then the five lines that
  // direct every photograph, each a catalogue entry with its heading run in
  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    const dirs = items.map(([k, v]) => `<p class="ki-dir"><b>${k}.</b> ${A(v)}</p>`).join('');
    // the tab carries the shot's shelf mark, the same number as its label holder on the shot list
    const inner = `<p class="k-lead">Five lines cover every photograph. Above them, shot 1 on the shelf list, ${nw('at full width.')}</p>
<figure class="ki-pd"><span class="ki-ptab num" aria-label="Shot 1">1</span><div class="ki-pd__ph">${ctx.photo(ctx.brand.imagery.shots[0].id, { style: full })}</div></figure>
<div class="ki-dirs" style="margin-left:${IND1}px;--hang:${IND2 - IND1}px">${dirs}</div>
${seeAlso(ctx, ['shot-list', 'imagery-rules'])}`;
    return sheet(ctx, 'photo-direction', inner, 'ki-pg-pd');
  },

  // the shelf list, in shelf order: the shots stand on shelves, three to a shelf, each its own width and height like the books
  // on a real shelf, with a label holder on the shelf edge under each one carrying its shelf number
  'shot-list'(ctx) {
    const S = ctx.brand.imagery.shots;
    const W = [[0.42, 0.27, 0.31], [0.36, 0.33, 0.31]], H = [[324, 272, 296], [284, 312, 264]];
    const shelves = [];
    for (let i = 0; i < S.length; i += 3) shelves.push(S.slice(i, i + 3));
    const one = (s, i, r, j) => `<li class="ki-bk" style="flex:${W[r % 2][j]} 1 0">
<div class="ki-bk__ph" style="height:${H[r % 2][j]}px">${ctx.photo(s.id, { style: full })}</div>
<div class="ki-bk__lb">${holder(`<b class="num">${i + 1}</b>`)}${cred ? `<p class="ki-cred">${s.photo ? `Photo from ${A(s.credit)}` : ''}</p>` : ''}</div></li>`;
    // the "art-directed" note is said once, in the lede; a credit line under a slot only when a shot has its photograph
    const cred = S.some((s) => s.photo), brief = S.filter((s) => !s.photo).length;
    const rows = shelves.map((sh, r) => `<li class="ki-shelf"><ol class="ki-bks">${sh.map((s, j) => one(s, r * 3 + j, r, j)).join('')}</ol></li>`).join('');
    const note = brief === S.length ? 'Each is art-directed, to be shot to the brief in its slot' : brief ? 'The shots without a credit are art-directed, to be shot to the brief in their slot' : '';
    const inner = `<p class="k-lead">${S.length} shots to commission, in shelf order. ${note ? `${note}, which says the shot, the crop and ${nw('the light.')}` : `Each slot says the shot, the crop and ${nw('the light.')}`}</p>
<ol class="ki-shelves ${cred ? 'ki-shelves--cred' : ''}">${rows}</ol>
${seeAlso(ctx, ['photo-direction'])}`;
    return sheet(ctx, 'shot-list', inner, 'ki-pg-sl');
  },

  // each rule as a catalogue entry and its "See" reference: the Do is the entry, numbered, its frame the larger; the Don't is the
  // heading not used, its frame the smaller, and it points back to the entry it gives way to. The first rule is set largest
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, sh = ctx.brand.guideB.studioSlot, books = ctx.brand.ui.screen.content.deliveries; // book titles as the lines on the pictures
    const doT = [
      ctx.photo('spread', { style: full }),
      ctx.photo('cover', { style: full }),
      `<div class="ki-split">${ctx.photo('shelf', { style: full, slotNote: false })}<span class="k-disp ki-mt">${A(books[0].to)}</span></div>`,
      `<div class="ki-flat">${ctx.logo.html('reversed', { width: 150, color: 'var(--dark-ink)', label: 'Logo' })}</div>`,
    ];
    const dontT = [
      `<div class="photo-slot" style="${full}"><span>${A(sh)}</span></div>`,
      `${ctx.photo('cover', { style: full, slotNote: false })}<span class="ki-wash"></span>`,
      `${ctx.photo('spread', { style: full, slotNote: false })}<span class="k-disp ki-onslot">${A(books[1].to)}</span>`,
      `${ctx.photo('desk', { style: full, slotNote: false })}<i class="ki-blk" style="left:8%;top:14%;width:34%;height:56%;background:var(--accent)"></i><i class="ki-blk" style="left:52%;top:10%;width:40%;height:34%;background:var(--ink)"></i><i class="ki-blk" style="left:30%;top:58%;width:48%;height:30%;background:var(--rule)"></i><span class="ki-onbusy">${ctx.logo.html('colour', { width: 84, label: 'Logo' })}</span>`,
    ];
    // one entry per rule, filed behind a guide tab carrying its number. The Do frame spans columns 1 to 4 at a height its picture
    // needs (rule 1 tallest, rule 3 shortest); the rule sits beside it in columns 5 and 6, and the Don't, a frame under a quarter
    // of the Do's area, under the rule with its line as a See reference back to the entry
    const { G, span } = grid(ctx), wDo = span(4), wDont = span(2);
    const hDo = [204, 164, 116, 140], hDont = (h) => Math.floor(Math.min(h * wDo / (4 * wDont), h * 0.46));
    const rule = (r, i) => `<li class="ki-ir ki-ir--${CUTS[i % 3]}" style="grid-template-columns:${px(wDo)}px ${px(wDont)}px;column-gap:${G.gutter}px">
<span class="ki-itab num">${i + 1}</span>
<div class="ki-fr ki-fr--do ph-tight" style="height:${hDo[i]}px">${doT[i]}</div>
<div class="ki-rt"><p class="ki-do"><b>Do.</b> ${A(r.do)}</p>
<div class="ki-fr ki-fr--dont ph-tight" style="height:${hDont(hDo[i])}px">${dontT[i]}</div>
<p class="ki-dont"><b>Don't.</b> ${A(r.dont)} <i class="ki-sref">See <span class="num">${i + 1}</span>.</i></p></div></li>`;
    const inner = `<p class="k-lead">Four rules for the picture, each shown both ways. The frames are photo slots, so they show the idea and not the photograph.</p>
<ol class="ki-irs">${R.slice(0, 4).map(rule).join('')}</ol>
${seeAlso(ctx, ['photo-direction'])}`;
    return sheet(ctx, 'imagery-rules', inner, 'ki-pg-ir');
  },

  // the page drawn at scale, centred, with a guide-card tab standing over each column as its heading, and the measures below as
  // the card's collation line, each a label over its value
  grid(ctx) {
    const { G, colX, span } = grid(ctx), W = 500, k = W / G.page.w, p = (n) => px(n * k);
    const hl = tok(ctx, 'headline');
    const cols = Array.from({ length: G.columns }, (_, i) => ab(colX(i), G.margin, G.col, G.page.h - 2 * G.margin, '', '', 'ki-gcol')).join('');
    // 3 px at the page's own size, so the margin rule still reads at scale
    const mrule = [ab(G.margin - 1.5, 0, 3, G.page.h, '', '', 'ki-gml'), ab(G.page.w - G.margin - 1.5, 0, 3, G.page.h, '', '', 'ki-gml'), ab(0, G.margin - 1.5, G.page.w, 3, '', '', 'ki-gml'), ab(0, G.page.h - G.margin - 1.5, G.page.w, 3, '', '', 'ki-gml')].join('');
    const bars = Array.from({ length: 6 }, (_, i) => ab(colX(0), 300 + i * 28, i === 5 ? span(2) : span(3), 10, '', '', 'ki-bar')).join('');
    const page = `${cols}${mrule}${ab(colX(0), G.margin + 24, span(5), 0, `font-size:${hl.size}px;line-height:${hl.line}`, A(ctx.brand.ui.screen.content.deliveries[1].to), 'k-disp ki-gh')}${bars}${ab(colX(3), 300, span(3), 420, 'background:var(--rule);outline:2px solid var(--rod);outline-offset:-2px', ctx.photo('cover', { slotNote: false, style: full }))}${ab(colX(0), G.page.h - G.margin - 30, span(4), 8, '', '', 'ki-bar')}`;
    const tabs = Array.from({ length: G.columns }, (_, i) => `<span class="ki-gtab num" style="left:${p(colX(i))}px;width:${p(G.col)}px">${i + 1}</span>`).join('');
    const mtags = `<span class="ki-mt2 num" style="left:0;width:${p(G.margin)}px">${G.margin}</span><span class="ki-mt2 num" style="right:0;width:${p(G.margin)}px">${G.margin}</span>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns}, each ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const coll = `<dl class="ki-coll">${m.map(([a, v]) => `<div><dt>${a}</dt><dd class="num">${A(v)}</dd></div>`).join('')}</dl>`;
    const onBase = G.margin % G.base === 0 && G.gutter % G.base === 0, action = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    const inner = `<p class="k-lead">${WORDS[G.columns]} columns on a ${G.page.w} by ${G.page.h} page. ${onBase ? `The margin and the gutter are multiples of the ${G.base} px base. ` : ''}${A(action.name)} rules mark the margin. Type starts on the first column and the photo takes the last three.</p>
<div class="ki-gdraw" style="width:${W}px"><div class="ki-gtabs" style="width:${W}px">${tabs}</div><div class="ki-gpg" style="height:${p(G.page.h)}px">${scaled(k, G.page.w, G.page.h, page, 'ki-gpage')}${mtags}</div></div>
${coll}`;
    return sheet(ctx, 'grid', inner, 'ki-pg-gr');
  },

  // the three layouts, each with a plain caption under it: the cover large on the left with its note in the text column beside
  // it, then the book page on the margin and the essay page on that text column, both 193 px wide
  layouts(ctx) {
    const { G, colX, span } = grid(ctx), H = G.page.h, Wd = G.page.w, slot = ctx.edition === 'slot';
    const hl = tok(ctx, 'headline'), c = ctx.brand.ui.screen.content, S = ctx.brand.type.sample;
    const bars = (x, y, w, n) => Array.from({ length: n }, (_, i) => ab(x, y + i * 28, i === n - 1 ? w * 0.6 : w, 10, '', '', 'ki-bar')).join('');
    // in the slot edition a thumbnail's words are drawn as the same grey bars as its body copy: placeholders scale down to scribble
    const head = (x, y, w, txt, n, color = '') => slot
      ? Array.from({ length: n }, (_, i) => ab(x, y + i * hl.size * hl.line, n > 1 && i === n - 1 ? w * 0.55 : w * 0.9, hl.size * 0.6, '', '', 'ki-bar')).join('')
      : ab(x, y, w, 0, `font-size:${hl.size}px;line-height:${hl.line};${color ? `color:${color}` : ''}`, A(txt), 'k-disp ki-th');
    const T = (inner, bg = '') => `<div class="ki-thumb" style="${bg}">${inner}</div>`;
    const cover = T(`${ab(colX(0), G.margin, span(6), 600, 'background:var(--rule)', ctx.photo('cover', { slotNote: false, style: full }))}${head(colX(0), G.margin + 640, span(6), c.deliveries[2].to, 2, 'var(--ground)')}${ab(colX(0), H - G.margin - 60, 0, 0, '', ctx.logo.html('reversed', { width: 220, color: 'var(--dark-ink)', label: 'Logo' }))}`, 'background:var(--dark)');
    const book = T(`${head(colX(0), G.margin, span(4), c.deliveries[0].to, 1)}${bars(colX(0), 170, span(4), 6)}${ab(colX(4), G.margin, span(2), 580, 'background:var(--rule)', ctx.photo('cover', { slotNote: false, style: full }))}${ab(colX(0), 560, span(2), 52, 'background:var(--accent);color:var(--accent-ink);font:500 16px/52px var(--body);text-align:center', slot ? '' : A(c.form.book))}${ab(colX(0), H - G.margin - 30, span(4), 8, '', '', 'ki-bar')}`);
    const essay = T(`${head(colX(0), G.margin, span(6), c.deliveries[1].to, 2)}${ab(colX(0), 300, span(6), 3, 'background:var(--accent)')}${bars(colX(0), 332, span(3) - 4, 14)}${bars(colX(3), 332, span(3) - 4, 14)}${ab(colX(0), H - G.margin - 30, span(4), 8, '', '', 'ki-bar')}`);
    // the text column starts at the cover's right edge plus the gap; the essay page's left edge sits on it
    const kBig = 0.36, kLow = 193 / Wd, gap = 24, text = px(Wd * kBig + gap);
    const cap = (s) => `<p class="ki-lcap">${s}</p>`;
    const big = `<figure class="ki-lay ki-lay--big" style="gap:${gap}px"><div>${scaled(kBig, Wd, H, cover, 'ki-thumbs')}${cap(`Cover, <span class="num">${Wd} × ${H}</span> px.`)}</div>
<figcaption><p class="ki-lay__c">The photo runs across all ${G.columns} columns. The line sits under it, and the logo at the foot. The margin is ${G.margin} px on every side.</p>${seeAlso(ctx, ['grid'])}</figcaption></figure>`;
    const low = (t, name, txt) => `<figure class="ki-lay">${scaled(kLow, Wd, H, t, 'ki-thumbs')}<figcaption>${cap(name)}<p class="ki-lay__c">${txt}</p></figcaption></figure>`;
    const inner = `<p class="k-lead">Three layouts built on the same grid. Each keeps the margin and puts ${nw('one thing first.')}</p>
<div class="ki-lays">${big}
<div class="ki-lays__low" style="grid-template-columns:${text}px minmax(0,1fr)">${low(book, 'Book page.', `Title and text across 4 columns, the cover across 2. The ${A(c.form.book)} button sits ${nw('on the first 2.')}`)}${low(essay, 'Essay page.', `The line runs across ${G.columns} columns. Text follows in two blocks of 3.`)}</div></div>`;
    return sheet(ctx, 'layouts', inner, 'ki-pg-ly');
  },
};
