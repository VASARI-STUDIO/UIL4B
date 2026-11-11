// Guidelines pages for theme 02, Ticket: photo-direction, shot-list, imagery-rules, grid, layouts. Styles are in css-p-image.js (classes ti-).
// Open pages: the ticket's parts are edge devices here, never whole tickets. The perforation is the rule (vertical between a body and a
// stub column, horizontal between rows), serials are running numbers, facts are set label over value. The imagery section is the queue
// at night (the Night ground, three pages); the layout section is back on Stock. No hex is written here; colours come from the roles.
import { A } from './helpers.js';
import { page, perf, serial, byRole, inkOn } from './gate.js';

const full = 'width:100%;height:100%';
// small logo slots cannot hold the long label
const lg = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: Math.round(w), label: w < 150 ? 'Logo' : undefined, ...o });
const px = (k) => (n) => +(n * k).toFixed(2);
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
// the perforation as a rule on an open page: holes in the quiet ink of the ground it sits on
const holes = (ctx, night) => (night ? ctx.roles.dark : ctx.roles.light).quiet;
const hRule = (ctx, night, cls = '') => `<div class="ti-hr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9, dir: 'h' })}</div>`;
const vRule = (ctx, night) => perf(holes(ctx, night), { d: 3, p: 9 });
// fact fields, label over value (the gate's convention, set at this page's sizes)
const facts = (rows, cls = '') => `<dl class="ti-ff ${cls}">${rows.map(([k, v, vc = '']) => `<div><dt>${A(k)}</dt><dd class="${vc}">${v}</dd></div>`).join('')}</dl>`;
// the credit prints only under a real photo; briefed shots are covered once, by the page note under the title
const credit = (s) => (s.photo ? `<p class="ti-cap">Photo from ${A(s.credit)}</p>` : '');
// the second and third lines, so the grid and layout drawings do not repeat the tagline (it lives on the cover, voice and messaging)
const other = (ctx, i) => { const L = ctx.brand.lines; return L.others?.[i] ?? L.others?.[0] ?? L.primary; };

export const pImage = {
  // the lead photo is the ticket body, torn off down its right edge; the stub beside it carries the direction: the subject large,
  // a perforated rule, then light, crop, colour and people as fact fields
  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const ph = `<figure class="ti-pd__ph ti-ph">${ctx.photo('queue', { style: full })}${perf(holes(ctx, true), { d: 3, p: 9, cls: 'tk-perf--edge-r' })}</figure>`;
    const subj = `<div class="ti-pd__subj"><span class="ti-lab">Subject</span><p>${A(D.subject)}</p></div>`;
    const rest = facts([['Light', A(D.light)], ['Crop', A(D.crop)], ['Colour', A(D.colour)], ['People', A(D.people)]], 'ti-ff--pd');
    return page(ctx, 'photo-direction', `<div class="ti-pd">${ph}<div class="ti-pd__stub">${subj}<div>${hRule(ctx, true)}${rest}</div></div></div>`, 'ti-night' + (ctx.edition === 'slot' ? ' ti--slot' : ''));
  },

  // the lead shot is the body, large on the left; the rest are a pad of stubs beside it, one per row, torn off the next at a
  // horizontal perforation. One vertical perforation, between the body and the pad.
  'shot-list'(ctx) {
    const S = ctx.brand.imagery.shots, [lead, ...rest] = S;
    const note = S.some((s) => !s.photo) ? '<p class="tk-lead ti-lead">Art-directed. Each shot is made to its brief.</p>' : '';
    const body = `<div class="ti-sl__lead"><span class="ti-sn">${serial(1)}</span><div class="ti-ph ti-sl__ph">${ctx.photo(lead.id, { style: full, slotNote: false })}</div>
<p class="ti-sl__brief">${A(lead.slot)}</p>${credit(lead)}</div>`;
    const row = (s, i) => `<li class="ti-slr">${i ? hRule(ctx, true, 'ti-hr--row') : ''}<span class="ti-sn">${serial(i + 2)}</span>
<div class="ti-ph ti-slr__ph">${ctx.photo(s.id, { style: full, slotNote: false })}</div><div class="ti-slr__txt"><p>${A(s.slot)}</p>${credit(s)}</div></li>`;
    return page(ctx, 'shot-list', `${note}<div class="ti-sl">${body}<ol class="ti-sl__pad">${vRule(ctx, true)}${rest.map(row).join('')}</ol></div>`, 'ti-night' + (ctx.edition === 'slot' ? ' ti--slot' : ''));
  },

  // photo-led: each rule is its do slot with the rule under it, and its don't as a smaller slot beside it with the reason under it.
  // Four rules two by two on the 12 columns, unequal: rule 1 takes 7 (4 do, 3 don't), rule 2 takes 5, the foot row 6 and 6.
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, sh = ctx.brand.guideB.studioSlot, line = ctx.brand.lines.others[0];
    // the tint fault is Door red at the slot's full size, solid, with the shot's brief set on it: the wash is the fault, so it is drawn whole
    const wr = ctx.brand.imagery.shots.find((x) => x.id === 'wristband'), red = ctx.roles.dark.action;
    const tint = `<div class="ti-redfield" style="background:${red};color:${inkOn(ctx, red)}"><span>${A(wr ? wr.slot : '')}</span></div>`;
    const doT = [
      ctx.photo('stage', { style: full }),
      ctx.photo('wristband', { style: full }),
      `${ctx.photo('queue', { style: full, slotNote: false })}<span class="disp ti-onph">${A(line)}</span>`,
      `<div class="ti-flat tk-edge">${lg(ctx, 'colour', 150, { colourway: ctx.brand.logo.colourways['on-stage'] ? 'on-stage' : 'mono-light', color: 'var(--ink)' })}</div>`,
    ];
    const dontT = [
      `<div class="photo-slot ti-studio"><span>${A(sh)}</span></div>`,
      tint,
      `${ctx.photo('phone', { style: full, slotNote: false })}<span class="disp ti-onph ti-onph--mid">${A(line)}</span>`,
      `${ctx.photo('queue', { style: full, slotNote: false })}<span class="ti-bright">${lg(ctx, 'colour', 72, { color: 'var(--night)' })}</span>`,
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    const row = (x, i) => `<li class="ti-ir ti-ir--${i + 1}">
<div class="ti-ir__do"><div class="ti-ph ti-ir__tile ph-tight">${doT[i]}</div><div class="ti-ir__txt"><span class="ti-lab">${ic('check')}Do</span><p>${A(x.do)}</p></div></div>
<div class="ti-ir__dont"><div class="ti-ph ti-ir__tile ph-tight">${dontT[i]}</div><div class="ti-ir__txt"><span class="ti-lab">${ic('x')}Don't</span><p>${A(x.dont)}</p></div></div></li>`;
    return page(ctx, 'imagery-rules', `<ol class="ti-irs">${R.slice(0, 4).map(row).join('')}</ol>`, 'ti-night' + (ctx.edition === 'slot' ? ' ti--slot' : ''));
  },

  // the page drawn to scale is the large thing, 9 of the 12 columns wide; the measures stand beside it on the stub, past one perforation
  grid(ctx) {
    const G = ctx.gridMeasures, span = (n) => n * G.col + (n - 1) * G.gutter, k = span(9) / G.page.w, p = px(k);
    const colX = (i) => G.margin + i * (G.col + G.gutter);
    const hl = tok(ctx, 'headline'), lh = ctx.edition === 'slot' ? Math.max(hl.line, 1.4) : hl.line; // slot placeholders are dashed boxes: open leading keeps them apart
    const cols = Array.from({ length: G.columns }, (_, i) => `<i class="ti-gcol" style="left:${p(colX(i))}px;width:${p(G.col)}px"></i>`).join('');
    const bar = (y, w) => `<i class="ti-gbar" style="left:${p(colX(0))}px;top:${p(y)}px;width:${p(w)}px"></i>`;
    const drawing = `<div class="ti-gpage ph-tight" style="width:${p(G.page.w)}px;height:${p(G.page.h)}px">${cols}
<span class="ti-gm" style="left:0;width:${p(G.margin)}px">${G.margin}</span><span class="ti-gm" style="right:0;width:${p(G.margin)}px">${G.margin}</span>
<h2 class="disp ti-gh" style="left:${p(colX(0))}px;top:${p(G.margin + 24)}px;width:${p(span(5))}px;font-size:${p(Math.round(hl.size * 0.85))}px;line-height:${lh}">${A(other(ctx, 1))}</h2>
${bar(G.page.h - G.margin - 100, span(5))}${bar(G.page.h - G.margin - 72, span(5))}${bar(G.page.h - G.margin - 44, span(3))}
<div class="ti-ph ti-gph" style="left:${p(colX(7))}px;top:${p(G.margin)}px;width:${p(span(5))}px;height:${p(G.page.h - 2 * G.margin)}px">${ctx.photo('queue', { style: full, slotNote: false })}</div></div>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns}, each ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const lead = `<p class="tk-lead ti-lead">${G.columns} columns on a ${G.page.w} by ${G.page.h} page. Margins and gutters are multiples of the ${G.base} px base.</p>`;
    const side = `<div class="ti-gside">${vRule(ctx, false)}${facts(m.map(([a, v]) => [a, A(v), 'num']), 'ti-ff--grid')}<p class="ti-gnote">Type on 5 columns, the photo on 5, and ${G.columns - 10} left open between them.</p></div>`;
    return page(ctx, 'grid', `${lead}<div class="ti-gr">${drawing}${side}</div>`);
  },

  // the headliner layout drawn large on the body; the two supports smaller on the stub side of the perforation, one above the other
  layouts(ctx) {
    const G = ctx.gridMeasures, H = G.page.h, red = byRole(ctx, 'action'), stock = byRole(ctx, 'ground');
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const hl = tok(ctx, 'headline'), lh = ctx.edition === 'slot' ? Math.max(hl.line, 1.4) : hl.line; // slot placeholders are dashed boxes: open leading keeps them apart
    const thumb = (k, cls, fn) => { const p = px(k); const a = (x, y, w, h, st, i = '') => `<div class="ti-ab" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}">${i}</div>`; return `<div class="ti-thumb ph-tight ${cls}" style="width:${p(G.page.w)}px;height:${p(H)}px">${fn(p, a)}</div>`; };
    const bars = (a, x, y, w, n) => Array.from({ length: n }, (_, i) => a(x, y + i * 28, i === n - 1 ? w * 0.6 : w, 10, 'background:var(--tb)')).join('');
    const hd = (p, x, y, w, txt, size = hl.size) => `<div class="disp ti-ab ti-th" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;font-size:${p(size)}px;line-height:${lh}">${txt}</div>`;
    const photoW = colX(8) - G.gutter / 2;
    // the poster panel's content sits one gutter in from the photo and from the panel's right edge: 16 px in the drawing
    const poster = (k) => { const ins = 16 / k, x = photoW + ins, w = G.page.w - photoW - 2 * ins;
      return thumb(k, 'ti-thn', (p, a) => `${a(0, 0, photoW, H, '', ctx.photo('queue', { style: full, slotNote: false }))}${a(photoW, 0, G.page.w - photoW, H, 'background:var(--lamp)')}${hd(p, x, G.margin, w, `<span style="color:var(--lamp-ink)">${A(other(ctx, 0))}</span>`, Math.round(hl.size * 0.68))}<div class="ti-ab" style="left:${p(x)}px;top:${p(H - G.margin - 56)}px">${lg(ctx, 'reversed', p(220), { colourway: 'reversed', color: 'var(--lamp-ink)' })}</div>`); };
    const editorial = (k) => thumb(k, 'ti-ths', (p, a) => `${hd(p, colX(0), G.margin, span(5), A(other(ctx, 1)), 54)}${bars(a, colX(0), H - G.margin - 4 * 28 - 10, span(4), 5)}${a(colX(6), G.margin, span(6), H - 2 * G.margin, '', ctx.photo('stage', { style: full, slotNote: false }))}`);
    // the statement lights its second sentence. Showcase parses the line through ctx.real; the slot edition keeps the placeholder whole
    const sents = ctx.edition === 'slot' ? [ctx.brand.lines.primary] : ctx.real(ctx.brand.lines.primary).split(/(?<=\.)\s+/);
    const lit = `<span class="ti-sent">${A(sents[0])}</span>${sents.length > 1 ? `<span class="ti-sent" style="color:var(--lamp)">${A(sents.slice(1).join(' '))}</span>` : ''}`;
    const stmt = (k) => thumb(k, 'ti-thn', (p, a) => `${hd(p, colX(0), G.margin, span(10), lit, 88)}${[0, 1, 2].map((i) => `${a(colX(i * 4), 440, span(4), 2, 'background:var(--tb)')}${bars(a, colX(i * 4), 470, span(4) - G.gutter, 3)}`).join('')}`);
    const cc = G.columns;
    const cap = (n, c, cls = '') => `<div class="ti-lcap ${cls}"><span class="ti-sn">${A(n)}</span><p>${A(c)}</p></div>`;
    const body = `<div class="ti-ly__body">${poster(0.56)}${cap('Poster', `Photo across 8 of ${cc} columns. The line and the logo take the other ${cc - 8}, on ${red.name}.`, 'ti-lcap--big')}</div>`;
    const litCopy = sents.length > 1 ? 'The line runs across 10 columns and lights its second sentence.' : 'The line runs across 10 columns. When it has two sentences, the second is lit.';
    const stub = `<div class="ti-ly__stub">${vRule(ctx, false)}<div class="ti-ly__one">${editorial(0.25)}${cap('Editorial', `Headline on 5 columns, photo on 6. Leave a column of ${stock.name} between them.`)}</div>
${hRule(ctx, false)}<div class="ti-ly__one">${stmt(0.25)}${cap('Statement', `${litCopy} Three notes sit under it, 4 columns each.`)}</div></div>`;
    return page(ctx, 'layouts', `<div class="ti-ly">${body}${stub}</div>`);
  },
};
