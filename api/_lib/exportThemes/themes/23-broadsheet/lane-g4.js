// Theme 23, Broadsheet, lane g4: imagery and the grid (photo-direction, shot-list, imagery-rules, grid). layouts is the gate page and stays as it is.
// Each page is one story on the paper, laid out as the part of a newspaper that does the same job: the picture desk's brief with the editor's
// crop marks on the print, the picture schedule, a picture run beside the one that was spiked, and a line gauge laid across the sheet.
// Photographs are shown the way the brand directs them: a brand that prints in black and white gets the paper's halftone, a brand that shoots
// in colour gets its clean photograph. Nothing here names a brand, a colour id or a photo id; every number is read from the data or the grid.
import { A, N, G, E, hr, px, jump, folio, fitLines, headLines, linesIn, bodyWeight, copyGuard } from './helpers.js';

const page = (ctx, id, inner) => copyGuard(ctx, id, `<section class="pg" data-page="${id}">${inner}</section>`);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const num = (n) => (n < NUM.length ? NUM[n] : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (n) => String(+(+n).toFixed(2));
const PAGE = { w: 1123, h: 1587 };

// ---- photographs: what the pages read about them ------------------------------------------------------------------------------------
// How a region of the photograph (r, in its own pixels) is cover-fitted to a box w x h with the focal point f: the scale and the photograph's
// pixel that lands at the box's top left corner.
const fitOf = (r, w, h, f) => { const sc = Math.max(w / r[2], h / r[3]); return { sc, ox: r[0] + (r[2] - w / sc) * f[0], oy: r[1] + (r[3] - h / sc) * f[1] }; };

// The server holds no photograph files (a shot is a brief), so none is measured, screened or placed: the lead, the thumbnails and the Do and
// Don't pair stay empty and the pages run their no-photograph layouts. The rule the imagery page shows is still read from the brand.
const thumb = { w: 232, h: 144 };
const dataOf = (ctx) => {
  const I = ctx.brand.imagery, R = I.rules || [];
  // imagery-rules: a rule against tinting, else a rule against the studio, else the first rule
  const tintI = R.findIndex((r) => /\btint|wash\b|filter|add(ing)? colou?r/i.test(r.dont));
  const studioI = R.findIndex((r) => /studio|backdrop|plain (white |grey )?wall/i.test(r.dont));
  return { lead: null, thumb, thumbs: {}, coverI: -1, introI: -1, persI: -1, heroI: tintI > -1 ? tintI : studioI > -1 ? studioI : 0, kind: tintI > -1 ? 'tint' : studioI > -1 ? 'studio' : 'one', pair: null, has: I.shots.map(() => false) };
};

// the clean photograph, cropped to region r (its own pixels, the whole frame when null) and cover-fitted to w x h
const clean = (ctx, s, size, w, h, r = null) => {
  const f = fitOf(r || [0, 0, size.w, size.h], w, h, s.focus || [0.5, 0.5]);
  return `<div class="g4-clip" style="width:${w}px;height:${h}px">${ctx.photo(s.id, { style: `position:absolute;left:${px(-f.ox * f.sc)};top:${px(-f.oy * f.sc)};width:${px(size.w * f.sc)};height:${px(size.h * f.sc)};max-width:none` })}</div>`;
};
// the page dummy's mark for a picture still to come: a ruled box crossed corner to corner. The brief beside it says what goes in.
const dummy = (w, h) => `<div class="g4-x" style="width:${w}px;height:${h}px"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="${N.hair}" stroke-width=".75" fill="none"/></svg></div>`;
const hd = (ctx, text, w, { max = 64, min = 44, maxLines = 2 } = {}) => {
  const f = fitLines(ctx, text, { w, max, min, maxLines, step: 2 }), lh = Math.round(f.size * 68 / 64);
  return { html: headLines(f.lines, f.size, lh, 'b-head'), h: f.lines.length * lh };
};

export const guidelines = {
  // ---- 022, photo-direction: the picture desk's brief. The subject is the headline, running on into the deck; the lead photograph is printed in
  // full with the editor's crop marks on it (the crop the cover runs), and the other four lines of direction sit beside it as the brief ----
  'photo-direction': (ctx) => {
    const B = ctx.brand, Dr = B.imagery.direction, d = dataOf(ctx), s = d.lead ? B.imagery.shots[d.lead.i] : null;
    // the brand's subject sentence is the headline, printed whole
    const h = hd(ctx, String(Dr.subject), 1000, { max: 56, min: 36, maxLines: 4 }), y = G.top + h.h + 48;
    let pic, capt;
    if (d.lead) {
      const L = d.lead, img = clean(ctx, s, L.size, L.w, L.h);
      // crop marks: short ink ticks above and to the left of the print, in line with the crop's edges, and the crop drawn on the print itself
      const m = L.mark, ticks = m ? [m.x, m.x + m.w].map((x) => `<i class="g4-tk g4-tk--v" style="left:${px(x - 0.5)}"></i>`).join('') + [m.y, m.y + m.h].map((yy) => `<i class="g4-tk g4-tk--h" style="top:${px(yy - 0.5)}"></i>`).join('')
        + `<i class="g4-crop" style="left:${px(m.x)};top:${px(m.y)};width:${px(m.w)};height:${px(m.h)}"></i>` : '';
      pic = `<div class="g4-print${m ? ' g4-print--m' : ''}" style="width:${L.w}px;height:${L.h}px">${img}${ticks}</div>`;
      capt = `<p class="c-cap c-ink g4-cap">${A(s.caption || s.alt || '')}</p>${m ? jump(ctx, 'cover', 'The marked crop runs on the cover') : ''}`;
    } else {
      // no photograph yet: the dummy's picture box, with the first shot's brief as its caption
      const s0 = B.imagery.shots[0];
      pic = dummy(1000, 667); capt = `<p class="c-cap c-ink g4-cap">${A(s0.slot || s0.caption || '')}</p>`;
    }
    const left = `<div class="a" style="left:${px(G.left)};top:${px(y)};width:1000px">${pic}${capt}</div>`;
    // the other lines of direction run as four short columns under the print
    const dirs = [['Light', Dr.light], ['Crop', Dr.crop], ['Colour', Dr.colour], ['People', Dr.people]].filter(([, v]) => v);
    const yb = y + (d.lead ? d.lead.h : 667) + 96;
    const brief = dirs.map(([t, v], i) => `<div class="a colm" style="left:${px(G.x[i])};top:${px(yb)};width:232px">${i ? '<i class="vr"></i>' : ''}<p class="c-label c-ink">${t}</p><i class="hr-flow g4-hr"></i><p class="b-body">${A(v)}</p>${i === dirs.length - 1 ? jump(ctx, 'shot-list', 'The shots to take') : ''}</div>`).join('');
    const right = brief;
    return page(ctx, 'photo-direction', folio(ctx, 'photo-direction') + E(G.left, G.top, 'story', h.html, { w: 1000 }) + left + right);
  },

  // ---- 023, shot-list: the picture schedule. One ruled row a shot: the picture (or the dummy's box for one still to take), the brief, and
  // where it stands: on file, with its credit and the pages it runs on, or to be shot ----
  'shot-list': (ctx) => {
    const B = ctx.brand, d = dataOf(ctx), shots = B.imagery.shots, n = shots.length, have = d.has.filter(Boolean).length, T = d.thumb;
    const line = have === n ? `${cap(num(n))} shots, all on file.` : have === 0 ? `${cap(num(n))} shots to take.` : `${cap(num(n))} shots. ${cap(num(have))} on file, ${num(n - have)} to take.`;
    const h = hd(ctx, line, 1000), y = G.top + h.h + 48;
    const runs = (i) => [[d.coverI, 'cover', 'On the cover'], [d.introI, 'intro', 'In the introduction'], [d.persI, 'personality', 'Beside the personality']]
      .filter(([k]) => k === i).map(([, id, w]) => jump(ctx, id, w)).join('');
    const rows = shots.map((s, i) => {
      const t = d.thumbs[i], pic = t ? clean(ctx, s, t.size, T.w, T.h) : dummy(T.w, T.h);
      // the brief: the caption as its lead-in where there is one, then the slot (the brief as written) or, for a photograph with none, its description
      // (a caption the slot already opens with is not printed twice)
      const body = s.slot || s.alt || '', said = s.caption && body.toLowerCase().includes(String(s.caption).replace(/[.!?]+$/, '').toLowerCase());
      const brief = `${s.caption && !said ?`<p class="c-label c-ink">${A(s.caption)}</p>` : ''}<p class="b-body">${A(body)}</p>`;
      const st = d.has[i] ? `<p class="c-label c-ink">On file</p>${s.credit && !s.generated ? `<p class="c-cap c-quiet">${A(s.credit)}</p>` : ''}<div class="g4-uses">${runs(i)}</div>` : '<p class="c-label c-ink">To be shot</p>';
      return `<div class="g4-row">${`<div class="g4-c1">${pic}</div>`}<div class="g4-c2">${brief}</div><div class="g4-c4">${st}</div></div>`;
    }).join('');
    const tab = `<div class="g4-th c-folio c-quiet"><span>Picture</span><span class="g4-c2">The brief</span><span class="g4-c4">Where it stands</span></div>${rows}${jump(ctx, 'imagery-rules', 'What every picture keeps to')}`;
    return page(ctx, 'shot-list', folio(ctx, 'shot-list') + E(G.left, G.top, 'story', h.html, { w: 1000 }) + `<div class="a g4-sched" style="left:${px(G.left)};top:${px(y)};width:1000px">${tab}</div>`);
  },

  // ---- 024, imagery-rules: the picture that runs beside the one that was spiked. The rule a picture can show is the headline and the pair;
  // the rest of the rules follow as a ruled do and don't ----
  'imagery-rules': (ctx) => {
    const B = ctx.brand, d = dataOf(ctx), R = B.imagery.rules, hero = R[d.heroI], s = d.lead ? B.imagery.shots[d.lead.i] : null, P = d.pair;
    const h = hd(ctx, hero.do, 1000), y = G.top + h.h + 48;
    const fig = (pic, label, text, cls = '') => `<figure class="g4-fig ${cls}">${pic}<p class="c-label c-ink g4-cap">${label}</p><p class="c-cap c-quiet">${A(text)}</p></figure>`;
    let pairs;
    if (P) {
      const doPic = clean(ctx, s, d.lead.size, P.w, P.h, P.crop);
      const doCap = s.caption || s.alt || '';
      const no = d.kind === 'studio' ? fig(dummy(P.w, P.h), 'Don’t', `${hero.dont} ${B.guideB?.studioSlot || ''}`.trim()) : '';
      pairs = `<div class="g4-pair">${fig(doPic, 'Do', doCap)}${no || `<div class="g4-fig"><p class="c-label c-ink">Don’t</p><p class="c-cap c-quiet">${A(hero.dont)}</p></div>`}</div>`;
    } else {
      // no photograph on file: the do is the dummy's box with the first brief; the don't is the studio shot the brand names, or the rule's words alone
      const s0 = B.imagery.shots[0];
      pairs = `<div class="g4-pair">${fig(dummy(488, 325), 'Do', s0.slot || '')}${fig(dummy(488, 325), 'Don’t', hero.dont)}</div>`;
    }
    const others = R.filter((_, i) => i !== d.heroI);
    const tab = others.length ? `<div class="g4-rt"><div class="g4-rh c-folio c-quiet"><span>Do</span><span>Don’t</span></div>${others.map((r) => `<div class="g4-rr"><p class="b-deck">${A(r.do)}</p><p class="b-deck c-quiet">${A(r.dont)}</p></div>`).join('')}</div>` : '';
    const story = `<div class="a" style="left:${px(G.left)};top:${px(y)};width:1000px">${pairs}${tab}${jump(ctx, 'photo-direction', 'The five lines of direction')}</div>`;
    return page(ctx, 'imagery-rules', folio(ctx, 'imagery-rules') + E(G.left, G.top, 'story', h.html, { w: 1000 }) + story);
  },

  // ---- 025, grid: the paper measures itself. A line gauge runs across the sheet at full width with the four columns marked on it, the
  // column edges drop from it as guides, and the spans a story uses are drawn between them as dimension lines. The heights down the page
  // sit beside the headline; the brand's slide grid closes the page as a second row of the table ----
  grid: (ctx) => {
    const n = G.x.length, measureW = G.right - G.left, fold = PAGE.h / 2;
    const h = hd(ctx, `${cap(num(n))} columns of ${G.col} on a measure of ${fmt(measureW)}.`, G.span(0, 2), { max: 88, min: 44, maxLines: 3 });
    // down the page, beside the headline (C4)
    const downs = [['Folio line', '40'], ['Head rules', '72, 76'], ['Story top', fmt(G.top)], ['Fold', fmt(fold)], ['Floor', fmt(G.floor)], ['Unit', '8']];
    const down = `<div class="a colm" style="left:${px(G.x[3])};top:${px(G.top)};width:232px"><i class="vr"></i><p class="c-label c-ink">Down the page</p><i class="hr-flow g4-hr"></i>${downs.map(([a, b], i) => `<div class="g4-dn${i === downs.length - 1 ? ' last' : ''}"><span class="c-cap c-ink">${a}</span><span class="c-mono">${b}</span></div>`).join('')}</div>`;
    // the deck says how the columns are used
    const deckText = 'One story a page. A headline takes the columns it needs; body text keeps to one column, with a hairline in the gutter beside it.';
    const yD = G.top + h.h + 32, deckH = linesIn(ctx, 'body', deckText, 24, 488, bodyWeight(ctx, 500)) * 32;
    const deck = E(G.left, yD, 'b-deck', A(deckText), { w: 488 });
    // the gauge: a ruled line across the whole sheet, ticked every 8 px inside the measure, tall ticks at the column edges
    const yG = Math.max(yD + deckH, 112 + 6 * 32 + 60) + 120, edges = G.x.flatMap((x) => [x, x + G.col]);
    let t = '';
    for (let x = G.left; x <= G.right + 0.01; x += 8) t += `M${fmt(x)} 16V${edges.some((e) => Math.abs(e - x) < 0.01) ? 0 : 10}`;
    for (const e of edges) t += `M${fmt(e)} 16V0`;
    const gauge = `<svg class="a" style="left:0;top:${px(yG - 16)}" width="${PAGE.w}" height="17" viewBox="0 0 ${PAGE.w} 17" aria-hidden="true"><path d="${t}" stroke="${N.ink}" stroke-width=".75" fill="none"/><path d="M0 16.5H${PAGE.w}" stroke="${N.ink}" stroke-width="1" fill="none"/></svg>`;
    // the figures over the gauge: each column's width, each gutter's, and the margins
    const lab = (x, w, v) => E(x, yG - 48, 'c-mono g4-gv', v, { w });
    const labs = G.x.map((x) => lab(x, G.col, String(G.col))).join('') + G.x.slice(1).map((x) => lab(x - G.gut, G.gut, String(G.gut))).join('')
      + lab(0, G.left, fmt(G.left)) + lab(G.right, PAGE.w - G.right, fmt(PAGE.w - G.right));
    // the spans a story uses, as dimension lines between the column guides
    const spans = [['Headline', 0, 3], ['Plate', 0, 2], ['Deck', 0, 1], ['Body, captions', 0, 0]];
    const yS = yG + 64, step = 104, yEnd = yS + spans.length * step;
    const guides = edges.map((x) => `<i class="a g4-guide" style="left:${px(x - 0.375)};top:${px(yG + 17)};height:${px(yEnd - yG - 17)}"></i>`).join('');
    const dims = spans.map(([name, a, b], i) => {
      const x0 = G.x[a], w = G.span(a, b), yy = yS + i * step;
      return E(x0 + 8, yy, 'c-label c-ink g4-dl', A(name), { w: Math.min(w - 16, 216) }) + E(x0 + w - 88, yy, 'c-mono g4-dr', fmt(w), { w: 80 })
        + `<i class="a g4-dim" style="left:${px(x0)};top:${px(yy + 32)};width:${px(w)}"></i>`;
    }).join('');
    // the grids in use: the paper, and the brand's own grid for slides
    const gm = ctx.gridMeasures, yT = yEnd + 80;
    const rows = [['The paper, A3', `${PAGE.w} × ${PAGE.h}`, `${n} of ${G.col}`, G.gut, G.left, 8], ['A slide', `${gm.page.w} × ${gm.page.h}`, `${gm.columns} of ${fmt(gm.col)}`, gm.gutter, gm.margin, gm.base]];
    const cell = (x, w, cls, v, right = false) => `<span class="g4-tc ${cls}" style="left:${px(x - G.left)};width:${px(w)};${right ? 'text-align:right' : ''}">${v}</span>`;
    const sub = [G.x[3], G.x[3] + 80, G.x[3] + 160];
    const tHead = `<div class="g4-tr g4-tr--h c-folio c-quiet">${cell(G.x[0], 232, '', 'Grid')}${cell(G.x[1], 232, '', 'Page')}${cell(G.x[2], 232, '', 'Columns')}${cell(sub[0], 72, '', 'Gutter')}${cell(sub[1], 72, '', 'Margin')}${cell(sub[2], 72, '', 'Unit', true)}</div>`;
    const tRows = rows.map((r, i) => `<div class="g4-tr${i === rows.length - 1 ? ' last' : ''}">${cell(G.x[0], 232, 'c-label c-ink', A(r[0]))}${cell(G.x[1], 232, 'c-mono', r[1])}${cell(G.x[2], 232, 'c-mono', r[2])}${cell(sub[0], 72, 'c-mono', fmt(r[3]))}${cell(sub[1], 72, 'c-mono', fmt(r[4]))}${cell(sub[2], 72, 'c-mono', fmt(r[5]), true)}</div>`).join('');
    const table = `<div class="a g4-tab" style="left:${px(G.left)};top:${px(yT)};width:1000px">${tHead}${tRows}${jump(ctx, 'layouts', 'The brand’s pages on this grid')}</div>`;
    return page(ctx, 'grid', folio(ctx, 'grid') + E(G.left, G.top, 'story', h.html, { w: G.span(0, 2) }) + down + deck + gauge + labs + guides + dims + table);
  },
};

export function css() {
  return `
.pg .g4-deck{width:488px}
.pg .g4-cap{margin-top:8px}
.pg .g4-hr{margin:8px 0 16px}
.pg .g4-dir+.g4-dir{margin-top:16px}
.pg .g4-dir .b-body{margin-top:4px}
.pg .g4-clip{position:relative;overflow:hidden}
.pg .g4-clip img{display:block}
.pg .g4-x{box-sizing:border-box;border:1px solid var(--ink);background:var(--paper)}
.pg .g4-x svg{display:block;position:absolute}
.pg .g4-x{position:relative}
/* the editor's crop: ticks in the margin above and to the left of the print, and the crop drawn on it in ink with a paper keyline so it reads over the dots */
.pg .g4-print{position:relative}
.pg .g4-print img{display:block}
.pg .g4-tk{position:absolute;display:block;background:var(--ink)}
.pg .g4-tk--v{top:-16px;width:1px;height:12px}
.pg .g4-tk--h{left:-16px;height:1px;width:12px}
.pg .g4-crop{position:absolute;display:block;box-sizing:border-box;border:2px solid var(--ink);outline:2px solid var(--paper)}
/* the picture schedule */
.pg .g4-th{display:grid;grid-template-columns:232px 488px 232px;column-gap:24px;padding-bottom:8px;border-bottom:1px solid var(--ink)}
.pg .g4-row{display:grid;grid-template-columns:232px 488px 232px;column-gap:24px;padding:20px 0;border-bottom:.75px solid var(--hair)}
.pg .g4-row:last-of-type{border-bottom:1px solid var(--ink)}
.pg .g4-row .b-body{margin-top:4px}
.pg .g4-row .c-label+.b-body{margin-top:4px}
.pg .g4-uses .c-jump{margin-top:8px}
.pg .g4-sched>.c-jump{margin-top:16px}
/* the run and the spiked picture, then the rest of the rules */
.pg .g4-pair{display:grid;grid-template-columns:488px 488px;column-gap:24px}
.pg .g4-fig{margin:0}
.pg .g4-fig .c-cap{margin-top:4px;max-width:488px}
.pg .g4-rt{position:relative;margin-top:64px}
.pg .g4-rt::before{content:'';position:absolute;left:499.625px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g4-rh,.pg .g4-rr{display:grid;grid-template-columns:488px 488px;column-gap:24px}
.pg .g4-rh{padding-bottom:8px;border-bottom:1px solid var(--ink)}
.pg .g4-rr{padding:32px 0;border-bottom:.75px solid var(--hair)}
.pg .g4-rr:last-child{border-bottom:1px solid var(--ink)}
/* the gauge, the guides and the spans */
.pg .g4-gv{text-align:center;white-space:nowrap}
.pg .g4-guide{display:block;width:.75px;background:var(--hair)}
.pg .g4-dim{display:block;height:1px;background:var(--ink)}
.pg .g4-dim::before,.pg .g4-dim::after{content:'';position:absolute;top:-6px;width:1px;height:13px;background:var(--ink)}
.pg .g4-dim::before{left:0}.pg .g4-dim::after{right:0}
.pg .g4-dl{white-space:nowrap}
.pg .g4-dr{text-align:right;white-space:nowrap}
.pg .g4-dn{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.75px solid var(--hair)}
.pg .g4-dn.last{border-bottom:1px solid var(--ink)}
.pg .g4-tab .g4-tr{position:relative;height:64px;border-bottom:.75px solid var(--hair)}
.pg .g4-tab .g4-tr--h{height:32px;border-bottom:1px solid var(--ink)}
.pg .g4-tab .g4-tr.last{border-bottom:1px solid var(--ink)}
.pg .g4-tc{position:absolute;top:21px;white-space:nowrap}
.pg .g4-tr--h .g4-tc{top:2px}
`;
}
