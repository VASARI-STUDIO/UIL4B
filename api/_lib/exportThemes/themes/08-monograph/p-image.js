// Guidelines pages: photo-direction, shot-list, imagery-rules, grid, layouts. Styles are in css-p-image.js (classes start ri-).
// The riso press again: every figure is a printed sheet of the paper with a registration cross at its corners, and carries its job
// line (the drums it uses, in drum order, and the paper), worked out from the hexes it really prints. Photographs keep their own
// colour (the brand's direction), so no drum prints over a photograph; a drum may print the plate it sits on.
// Photo direction is the brief printed in one drum; the shot list is the six shots imposed on one press sheet; the rules are the
// good pull beside the waste; the grid is the page drawn as a two-drum sheet with its measures called out; layouts are three pages
// pulled on the press, the cover largest.
import { A } from './helpers.js';
import { page, corners, drums, drumNo, paper, byRole, Word, isSurface } from './guidelines-r.js';

const px = (n) => +n.toFixed(2);
const full = 'width:100%;height:100%';
const hx = (h) => String(h).toLowerCase();
// a shot by id, or the brand's shot in that place when it has no such id
const sid = (ctx, id, i) => (ctx.shot(id) ? id : ctx.brand.imagery.shots[i % ctx.brand.imagery.shots.length].id);
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const nameOfHex = (ctx, hex) => { const c = ctx.colours.find((x) => hx(x.hex) === hx(hex)) || ctx.tones.find((x) => hx(x.hex) === hx(hex)); return c ? c.name : ''; };
// a shot's name: the brand's own id in showcase; slot has no placeholder for it, so the shot is named by its number only
const shotName = (ctx, id) => (ctx.edition === 'slot' ? '' : ctx.cap(id));
const shotRef = (ctx, id) => { const n = ctx.brand.imagery.shots.findIndex((s) => s.id === id) + 1, nm = shotName(ctx, id); return `Shot <span class="num">${n}</span>${nm ? `, ${A(nm)}` : ''}`; };

// the job line, one form for the whole book (review D1): one line under the figure, flush with the sheet's left edge, never inside it,
// at most two lines. Each drum the sheet prints, in drum order: an 8 px swatch, `Drum n Name`, then what it prints. Whatever is in
// the paper's colour is the paper showing through and closes the line; a tone that is no drum is named as it is. `photo` adds the
// photograph sentence: pass it on photo-direction only, where it is printed once for the book.
// Other lanes copy this function as it stands (with drums, drumNo, paper, isSurface from guidelines-r.js and A from helpers.js) and
// its four css lines (.ri-job, .ri-jd, .ri-sw, .ri-jn), renamed to their own prefix.
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  const hex_ = (h) => String(h).toLowerCase();
  for (const [hex, what] of uses) {
    const c = D.find((d) => hex_(d.hex) === hex_(hex));
    const t = ctx.colours.find((x) => hex_(x.hex) === hex_(hex)) || ctx.tones.find((x) => hex_(x.hex) === hex_(hex));
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hex_(hex) === hex_(p.hex)) { if (!through.includes(what)) through.push(what); } else other.push([t ? t.name : '', what]);
  }
  const parts = D.filter((c) => by.has(c)).map((c) => `<span class="ri-jd"><i class="ri-sw" style="background:${c.hex}"></i>Drum ${drumNo(ctx, c)} ${A(c.name)}: ${by.get(c).join(', ')}.</span>`);
  const rest = other.map(([nm, what]) => `<span class="ri-jd">${A(nm)}: ${what}.</span>`);
  const show = through.length ? [`<span class="ri-jd">Paper ${A(p.name)}: ${through.join(', ')}.</span>`] : [];
  const ph = photo ? [`<span class="ri-jn">The photograph keeps its own colour: no drum prints over it.</span>`] : [];
  return `<p class="ri-job">${[...parts, ...rest, ...show, ...ph].join(' ')}</p>`;
}
const top = (title, lead) => `<div class="r-top"><h1 class="r-h1">${title}</h1>${lead ? `<p class="r-lead">${lead}</p>` : ''}</div>`;

// an absolutely placed box in authored units, and authored w x h shown at scale k (so a page's type keeps its print size)
const ab = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="ri-ab ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const scaled = (k, w, h, inner, st = '') => `<div class="ri-sc" style="width:${px(w * k)}px;height:${px(h * k)}px"><div class="ri-sc__in" style="width:${w}px;height:${h}px;transform:scale(${k});${st}">${inner}</div></div>`;

export const pImage = {
  // the brief as one printed sheet: the photograph in a margin of paper, then the five lines in the Ink drum, the subject largest.
  // The one page that prints the photograph sentence.
  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction, ink = ctx.roles.light.text;
    const keys = ['subject', 'light', 'crop', 'colour', 'people'].filter((k) => D[k]), [lead, ...rest] = keys;
    const lines = rest.map((k) => `<div><dt>${A(ctx.cap(k))}</dt><dd>${A(D[k])}</dd></div>`).join('');
    const sheet = `<div class="r-sheet ri-pd">${corners(ink, 15)}<div class="ri-pd__ph">${ctx.photo(sid(ctx, 'room', 0), { style: full })}</div>`
      + `<div class="ri-pd__br"><p class="ri-k">${A(ctx.cap(lead))}</p><p class="ri-pd__lead">${A(D[lead])}</p><dl class="ri-pd__ls">${lines}</dl></div></div>`;
    return page(ctx, 'photo-direction', `${top('Photography', `${Word(keys.length)} lines cover every photograph.`)}<div class="r-body ri-b ri-b--pd"><figure class="ri-fig">${sheet}<figcaption>${job(ctx, [[ink, 'the brief']], true)}</figcaption></figure></div>`, 'ri-pg');
  },

  // the print plan: the shots imposed on one press sheet by shape, as a press sheet is imposed: the wide shots stacked in the wider
  // column, the close ones in the narrower, row for row, so both columns end on one line. The numerals keep shot order. Each piece
  // carries its number, its name and the drums that print it. In showcase, a shot whose words the accent drum lands on sits on that
  // drum's plate; slot plates no shot, since the brand has not said which.
  'shot-list'(ctx) {
    const S = ctx.brand.imagery.shots, ink = ctx.roles.light.text, acc = byRole(ctx, 'accent'), slot = ctx.edition === 'slot';
    const wide = (s) => /\bwide\b/i.test(ctx.real(s.slot));
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const plate = (s) => !slot && !!(acc && acc.lands && new RegExp(`\\b${esc(s.id)}s?\\b`, 'i').test(ctx.real(acc.lands)));
    const inkC = drumOf(ctx, ink), plated = [];
    const W = S.map((s, i) => i).filter((i) => wide(S[i])), T = S.map((s, i) => i).filter((i) => !wide(S[i]));
    const two = W.length && T.length;
    // [column, row] for each shot: wide in column 1, close in column 2, each in shot order; without both shapes, shot order in two columns
    const at = S.map((s, i) => (two ? (W.includes(i) ? [1, W.indexOf(i) + 1] : [2, T.indexOf(i) + 1]) : [(i % 2) + 1, Math.floor(i / 2) + 1]));
    const mark = (c) => `<span class="ri-dm"><i class="ri-sw" style="background:${c.hex}"></i><span class="num">${drumNo(ctx, c)}</span> ${A(c.name)}</span>`;
    const pieces = S.map((s, i) => {
      const pl = plate(s); if (pl) plated.push(i + 1);
      const ds = [inkC, pl ? acc : null].filter(Boolean).sort((a, b) => drumNo(ctx, a) - drumNo(ctx, b)), nm = shotName(ctx, s.id);
      return `<li class="ri-sp${pl ? ' ri-sp--pl' : ''}" style="grid-column:${at[i][0]};grid-row:${at[i][1]}"><div class="ri-sp__f"${pl ? ` style="background:${acc.hex}"` : ''}>${ctx.photo(s.id, { style: full })}</div>`
        + `<p class="ri-sp__c"><span class="ri-sp__n num">${i + 1}</span>${nm ? `<span class="ri-sp__t">${A(nm)}</span>` : ''}<span class="ri-sp__d" aria-label="Drums ${ds.map((c) => drumNo(ctx, c)).join(' and ')}">${ds.map(mark).join('<span class="ri-sp__cm">, </span>')}</span></p>`
        + `${s.photo ? `<p class="ri-sp__cr">Photo from ${A(s.credit)}</p>` : ''}</li>`;
    }).join('');
    const uses = [[ink, slot ? 'the numbers' : 'the numbers and names']];
    if (plated.length) uses.push([acc.hex, `the plate under shot ${plated.join(' and ')}`]);
    const sheet = `<div class="r-sheet ri-im">${corners(ink, 15)}<ol class="ri-im__l${two ? ' ri-im__l--by' : ''}">${pieces}</ol></div>`;
    return page(ctx, 'shot-list', `${top('Shot list', `${Word(S.length)} shots. Each slot says the shot, the crop and the light. Art-directed, to be made to this brief.`)}<div class="r-body ri-b ri-b--sl"><figure class="ri-fig">${sheet}<figcaption>${job(ctx, uses)}</figcaption></figure></div>`, 'ri-pg');
  },

  // the good pull and the waste, row for row: one grid holds both sheets, each row a rule's right way and its wrong way, so a row takes
  // the taller of the two. Both cells are built alike: the drawing above, the words below, the drawings one size. Showcase draws each
  // rule with the drums only (the work an Ink solid on the paper, the wash the Blush drum). Slot draws no scene: each right way is
  // its shot's slot, each wrong way a struck slot.
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, L = ctx.roles.light, ink = L.text, acc = byRole(ctx, 'accent'), bl = acc ? acc.hex : L.text, slot = ctx.edition === 'slot';
    const box = (inner, st = '') => `<div class="ri-dr"${st ? ` style="${st}"` : ''}>${inner}</div>`;
    const i_ = (st, inner = '') => `<i style="${st}">${inner}</i>`;
    const work = (st, bg = ink) => i_(`${st};background:${bg}`);
    const wall = `${work('left:36%;top:20%;width:26%;height:46%')}${i_(`left:66%;top:58%;width:8%;height:5%;background:${ink}`)}`;
    // the high windows: the daylight the work is lit by; each an Ink frame with its sash bar, 1 : 2.5
    const windows = [8, 22, 70, 84].map((l) => i_(`left:${l}%;top:7%;width:8%;aspect-ratio:1/2.5;box-sizing:border-box;border:1.5px solid ${ink};color:${ink}`, '<b class="ri-sash"></b>')).join('');
    const heads = Array.from({ length: 5 }, (_, i) => `${i_(`left:${6 + i * 18.5}%;top:24%;width:13%;aspect-ratio:1;border-radius:50%;outline:1px solid ${ink};outline-offset:-1px`)}${i_(`left:${3.5 + i * 18.5}%;top:50%;width:18%;height:56%;border-radius:50% 50% 0 0;outline:1px solid ${ink};outline-offset:-1px`)}`).join('');
    const logo = (w) => `<span class="ri-lgw">${ctx.logo.html('colour', { width: w, color: ink, label: 'Logo' })}</span>`;
    const busy = [['0', '0', '38%', '52%', bl], ['38%', '0', '62%', '30%', ink], ['62%', '30%', '38%', '70%', bl], ['0', '52%', '24%', '48%', ink], ['24%', '64%', '38%', '36%', bl]].map(([l, t, w, h, c]) => i_(`left:${l};top:${t};width:${w};height:${h};background:${c}`)).join('');
    // a shot's slot with its reference on it, so an unshot photo still says which shot it is
    const shotBox = (id) => box(`${ctx.photo(id, { style: full, slotNote: false })}${ctx.shot(id).photo && !slot ? '' : `<span class="ri-ref">${shotRef(ctx, id)}</span>`}`);
    const struck = () => box('<svg class="ri-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" vector-effect="non-scaling-stroke"/></svg>', 'background:var(--ground)');
    const LW = 92;
    // [right way, wrong way] for: wall around the work, true colour, visitors looking, a flat ground behind the logo
    const demo = [
      [() => box(wall), () => box(`${work('left:10%;top:-24%;width:120%;height:150%')}`)],
      [() => box(`${windows}${work('left:36%;top:44%;width:26%;height:46%')}`), () => box(`${i_(`inset:0;background:${bl}`)}${i_(`left:36%;top:20%;width:26%;height:46%;outline:1px solid ${ink};outline-offset:-1px`)}`)],
      [() => shotBox(sid(ctx, 'looking', 2)), () => box(heads)],
      [() => box(logo(LW)), () => box(`${busy}${logo(LW)}`)],
    ];
    // showcase: the drawing follows what the rule says; a rule that names none of these falls back to its place
    const which = (r, i) => { const t = `${ctx.real(r.do)} ${ctx.real(r.dont)}`; return /logo/i.test(t) ? 3 : /visitor|group|people|camera/i.test(t) ? 2 : /colour|light|glare|wash/i.test(t) ? 1 : /crop|wall|room/i.test(t) ? 0 : i % 4; };
    const S = ctx.brand.imagery.shots;
    const draw = (r, i, k) => (slot ? (k === 0 ? shotBox(S[i % S.length].id) : struck()) : demo[which(r, i)][k]());
    const cell = (col, row, i, inner, text) => `<div class="ri-ir__c ri-ir__c--${col === 1 ? 'do' : 'nt'}${row === R.length + 1 ? ' is-last' : ''}" style="grid-column:${col};grid-row:${row}">${inner}<p class="ri-ir__t"><span class="ri-ir__n num">${i + 1}</span>${A(text)}</p></div>`;
    const rows = R.map((r, i) => `${cell(1, i + 2, i, draw(r, i, 0), r.do)}${cell(2, i + 2, i, draw(r, i, 1), r.dont)}`).join('');
    const sheet = (col, cls) => `<div class="r-sheet ri-ir__sh ${cls}" style="grid-column:${col};grid-row:1 / ${R.length + 2}">${corners(ink, 13)}</div>`;
    const head = (col, h) => `<h2 class="ri-ir__h" style="grid-column:${col};grid-row:1">${h}</h2>`;
    return page(ctx, 'imagery-rules', `${top('Imagery rules', 'Each rule shows the right way beside the wrong one.')}<div class="r-body ri-b ri-b--ir"><div class="ri-ir">${sheet(1, 'ri-ir__sh--do')}${sheet(2, 'ri-ir__sh--nt')}${head(1, 'Do')}${head(2, 'Not')}${rows}</div></div>`, 'ri-pg');
  },

  // the page drawn as a two-drum sheet: the margins in figures, the columns as Ink outlines with the first four in the Blush drum;
  // each measure called out beside the sheet on a leader to what it measures; the four-column span as a dimension line beneath
  grid(ctx) {
    const G = ctx.gridMeasures, ink = ctx.roles.light.text, acc = byRole(ctx, 'accent'), bl = acc ? acc.hex : ink;
    const k = 0.62, W = px(G.page.w * k), H = px(G.page.h * k), m = px(G.margin * k), gt = G.gutter * k, c = G.col * k;
    const col = +G.col.toFixed(1), four = +(4 * G.col + 3 * G.gutter).toFixed(1), x4 = px(m + 4 * c + 3 * gt);
    const cols = Array.from({ length: G.columns }, (_, i) => `<i class="ri-gc${i < 4 ? ' is-on' : ''}" style="left:${px(m + i * (c + gt))}px;top:${m}px;width:${px(c)}px;height:${px(H - 2 * m)}px;${i < 4 ? `background:${bl}` : `outline:1px solid ${ink};outline-offset:-1px`}"></i>`).join('');
    const marg = `<span class="ri-gm num" style="left:0;right:0;top:0;height:${m}px">${G.margin}</span><span class="ri-gm num" style="left:0;top:${m}px;bottom:${m}px;width:${m}px">${G.margin}</span>`;
    // callouts: [y, from x inside the sheet (null: no leader), term, detail]
    const lastC = px(m + (G.columns - 1) * (c + gt) + c / 2), gx = px(m + (G.columns - 2) * (c + gt) + c + gt / 2);
    const calls = [
      [px(H * 0.84), null, 'Page', `<span class="num">${G.page.w} × ${G.page.h} px</span>`],
      [px(H * 0.12), px(W - m / 2), 'Margin', `<span class="num">${G.margin} px</span> on every side`],
      [px(H * 0.3), lastC, 'Columns', `<span class="num">${G.columns}</span> columns of <span class="num">${col} px</span>`],
      [px(H * 0.46), gx, 'Gutter', `<span class="num">${G.gutter} px</span> between columns`],
      [px(H * 0.66), null, 'Base', `<span class="num">${G.base} px</span>. Every space is a multiple of it.`],
    ];
    const CX = W + 28;
    const lead = calls.filter((x) => x[1] !== null).map(([y, x]) => `<i class="ri-ld" style="left:${x}px;top:${y}px;width:${px(CX - 8 - x)}px"></i><i class="ri-dot" style="left:${px(x - 2.5)}px;top:${px(y - 2.5)}px"></i>`).join('');
    const notes = calls.map(([y, , t, d]) => `<div class="ri-co" style="left:${CX}px;top:${px(Math.max(0, y - 9))}px"><dt>${t}</dt><dd>${d}</dd></div>`).join('');
    const dim = `<div class="ri-dim" style="margin-left:${m}px;width:${px(x4 - m)}px"><i></i></div><p class="ri-dim__t" style="margin-left:${m}px"><span class="num">${Word(4)}</span> columns, in ${A(acc ? acc.name : '')}, span <span class="num">${four} px</span>.</p>`;
    const fig = `<figure class="ri-fig ri-gr" style="height:${H}px"><div class="r-sheet ri-gs" style="width:${W}px;height:${H}px">${corners(ink, 11)}${marg}${cols}</div>${lead}<dl>${notes}</dl></figure>`;
    return page(ctx, 'grid', `${top('The grid', `The page at <span class="num">${Math.round(k * 100)}</span> per cent.`)}<div class="r-body ri-b ri-b--gr">${fig}<div style="width:${W}px">${dim}${job(ctx, [[ink, 'the column edges and the margins'], [bl, 'four columns filled']])}</div></div>`, 'ri-pg');
  },

  // three pages pulled on the press, each trimmed out of a sheet that carries its crosses: the cover large at the left, the text page
  // and the call to action beside it, each with its caption and its job line. Named by what they do, so they hold for any brand.
  layouts(ctx) {
    const B = ctx.brand, G = ctx.gridMeasures, L = ctx.roles.light, S = B.ui.screen.content, cws = B.logo.colourways, bl = cws['on-blush'] || cws.colour, rev = cws.reversed;
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter, H = G.page.h, act = byRole(ctx, 'action');
    const pg = (k, inner, st) => scaled(k, G.page.w, H, inner, st);
    const lg = (id, w, o) => ctx.logo.html(id, { width: w, label: 'Logo', ...o });
    const cover = (k) => pg(k, `${ab(colX(0), G.margin, span(12), 640, '', ctx.photo(sid(ctx, 'room', 0), { style: full, slotNote: false }))}${ab(colX(0), 744, span(10), 0, `font-size:64px;line-height:1.1;color:${rev.name}`, A(S.deliveries[0].to), 'disp')}`
      + `${ab(colX(0), 836, span(8), 0, `font-size:22px;line-height:1.3;color:${rev.name}`, A(S.rider), 'disp')}${ab(colX(0), H - G.margin - 40, 0, 0, '', lg('reversed', 150, { colourway: 'reversed', color: rev.name }))}`, `background:${rev.ground}`);
    const wall = (k) => pg(k, `${ab(colX(0), G.margin, span(4), 0, `font-size:36px;line-height:1.12;color:${L.text}`, A(S.rider), 'disp')}${ab(colX(0), 260, span(3), 0, `font-size:14px;line-height:1.5;color:${L.text}`, `${A(S.deliveries[0].to)}<br>${A(S.riderNote)}`, 'ri-bd')}`
      + `${ab(colX(4), G.margin, span(8), 760, '', ctx.photo(sid(ctx, 'work', 1), { style: full, slotNote: false }))}${ab(colX(4), 850, span(8), 0, `font-size:12px;line-height:1.5;color:${L.text}`, A(B.type.sample.caption), 'ri-bd')}`, `background:${L.surface}`);
    const visit = (k) => pg(k, `${ab(colX(0), 470, span(9), 0, `font-size:64px;line-height:1.1;color:${bl.name}`, A(B.applications.social[1]), 'disp')}${ab(colX(0), 650, span(7), 0, `font-size:16px;line-height:1.6;color:${bl.name}`, A(B.lines.primary), 'ri-bd')}`
      + `${ab(colX(0), 730, 180, 52, `background:${L.action};color:${L.actionLabel};font-size:16px;font-weight:500;line-height:52px;text-align:center`, A(S.form.book), 'ri-bd')}${ab(colX(0), H - G.margin - 40, 0, 0, '', lg('colour', 150, { colourway: cws['on-blush'] ? 'on-blush' : 'colour', color: bl.name }))}`, `background:${bl.ground}`);
    const ink = L.text;
    const sheet = (cls, inner, title, desc, uses) => `<figure class="ri-lp ${cls}"><div class="r-sheet ri-lp__sh">${corners(ink, 11)}${inner}</div><figcaption><p class="ri-lp__t">${title}</p><p class="ri-lp__d">${desc}</p>${job(ctx, uses)}</figcaption></figure>`;
    const blName = A(nameOfHex(ctx, bl.ground));
    const a = sheet('ri-lp--a', cover(0.345), 'Cover', `A slot across all <span class="num">${G.columns}</span> columns, the title below it.`, [[rev.ground, 'flood'], [rev.plate, 'plate'], [rev.name, 'title, line, logo']]);
    const b = sheet('ri-lp--b', wall(0.2), 'Text page', 'Four columns for the words, eight for the photograph.', [[L.text, 'type']]);
    const c = sheet('ri-lp--c', visit(0.2), 'Call to action', `One line and one button, on ${blName}.`, [[bl.ground, 'flood'], [bl.name, 'type'], [bl.plate, 'logo'], [L.action, 'button'], [L.actionLabel, 'button label']]);
    return page(ctx, 'layouts', `${top('Layouts', `Built on <span class="num">${G.columns}</span> columns and <span class="num">${G.margin} px</span> margins. One big thing a page, then paper around it. One ${A(act.name)} button, once a page.`)}<div class="r-body ri-b ri-b--ly">${a}<div class="ri-ly__r">${b}${c}</div></div>`, 'ri-pg');
  },
};
