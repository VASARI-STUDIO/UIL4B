// Run B's guideline pages for theme 03 (Broadsheet): typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Each page is set as a newspaper page type: specimen sheet, front page with margin labels, article, ruled columns, picture page,
// corrections column, notices, classifieds-style briefs. No boxes: rules do the work.
import { A, std } from './helpers.js';

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const px = (k) => (n) => +(n * k).toFixed(2);
const sentence = (s) => s.split(/(?<=\.)\s+/)[0];
const rest = (s) => s.split(/(?<=\.)\s+/).slice(1).join(' ');
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];
// small logo slots cannot hold the long label
const lg = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: Math.round(w), label: w < 150 ? 'Logo' : undefined, ...o });
// a real photo, or the slot with the shot's own words (or a note) written in it
const slotTile = (ctx, id, { pos, style = 'width:100%;height:100%', note } = {}) => {
  const s = ctx.shot(id);
  if (s.photo) return ctx.photo(id, { pos, style });
  return `<div class="photo-slot" role="img" aria-label="${A('Photo slot. ' + s.slot)}" style="${style}">${note ? `<span>${A(note)}</span>` : ''}</div>`;
};

const own = {
  // specimen sheet: the display face is the lead story, set in itself; body and literal faces are the sidebar briefs
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale;
    const wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
    const tokensOf = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const sample = ctx.brand.lines.others[0];
    const hex = ctx.roles.light.action;
    const lead = `<div class="b-tf__lead"><h2 class="b-fh b-fh--lead">Display</h2><h3 class="disp b-tf__name">${A(d.family)}</h3><p class="cap"><b>Weight ${d.weights.join(', ')}</b>Used for ${A(tokensOf('display'))}. Sentence case, always.</p><div class="b-tf__set"><span class="b-aa disp" aria-hidden="true">Aa</span><p class="b-glyphs disp">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 $&amp;?!</p></div></div>`;
    const bodyBrief = `<div class="b-tf__brief"><h2 class="b-fh">Body</h2><div class="b-tf__row"><span class="b-aa2 b-aa2--body" aria-hidden="true">Aa</span><div><h3 class="b-fname b-fname--body">${A(b.family)}</h3><p class="cap"><b>Weights ${b.weights.join(', ')}</b>Used for ${A(tokensOf('body'))}.</p></div></div><ul class="b-weights">${b.weights.map((w) => `<li style="font-weight:${w}"><span class="b-wn">${wname[w] || w} ${w}</span><span>${A(sample)}</span></li>`).join('')}</ul></div>`;
    const monoBrief = `<div class="b-tf__brief"><h2 class="b-fh">Literal values</h2><div class="b-tf__row"><span class="b-mono b-monosample">${A(hex)}</span><div><h3 class="b-fname b-fname--body">${A(m.family)}</h3><p class="cap"><b>Weight ${m.weights.join(', ')}</b>Only for a hex, a token or a code string. Never for a label or a price.</p></div></div></div>`;
    const cols = `<div class="b-tf">${lead}<div class="b-tf__side">${bodyBrief}${monoBrief}</div></div>
<p class="cap b-licence">${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts.</p>`;
    return std(ctx, 'typefaces', `<div class="b-fill">${cols}</div>`);
  },

  // a mock front page in the brand's own lines, every style labelled in the margin with a leader rule and its spec
  hierarchy(ctx) {
    const S = ctx.brand.type, V = ctx.brand.voice.principles;
    const samples = { nameplate: ctx.brand.name, headline: V[1].example, title: V[0].example, lead: ctx.brand.lines.others[0], body: S.sample.paragraph, caption: S.sample.caption };
    const T = Object.fromEntries(S.scale.map((t) => [t.token, t]));
    const style = (t) => `font-size:${t.size}px;line-height:${t.line};${t.face === 'body' ? `font-family:var(--body);font-weight:${t.weight};` : ''}`;
    const cls = (t) => (t.face === 'display' ? 'disp' : t.face === 'body' ? 'b-bd' : 'b-ch');
    const label = (t, area) => `<div class="b-lb" style="grid-area:${area}"><p class="cap"><b>${A(ctx.cap(t.token))}</b>${t.size} px, line ${t.line}, weight ${t.weight}<br>${A(t.use)}</p><i class="b-ld" aria-hidden="true"></i></div>`;
    const el = (t, area, tag, extra = '') => `<${tag} class="${cls(t)} b-fp ${extra}" style="grid-area:${area};${style(t)}">${A(samples[t.token] || t.use)}</${tag}>`;
    const body = T.body, cap = T.caption;
    const intro = `<p class="txt b-hlead" style="grid-area:in">${WORDS[S.scale.length]} steps, each with one job. Reading text is ${body.size} px and captions are ${cap.size} px. Nothing sits between.</p>`;
    const photo = `<div class="b-fp__ph" style="grid-area:ph">${slotTile(ctx, 'quandongs')}</div>`;
    const page = `<div class="b-front">${label(T.nameplate, 'l1')}${el(T.nameplate, 'n', 'p', 'b-fp--np')}${intro}${label(T.headline, 'l2')}${el(T.headline, 'h', 'h2')}${label(T.title, 'l3')}${el(T.title, 't', 'h3')}${label(T.lead, 'l4')}${el(T.lead, 'd', 'p')}${label(T.body, 'l5')}${el(T.body, 'b', 'p', 'b-fp--cols')}${photo}${label(T.caption, 'l6')}${el(T.caption, 'c', 'p')}</div>`;
    return std(ctx, 'hierarchy', `<div class="b-fill">${page}</div>`);
  },

  // an article page: headline across the main column, lead and text, a wide photo; the specs run down the margin as notes
  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption'), ld = tok(ctx, 'lead');
    const fam = (t) => ctx.brand.fonts[t.face]?.family || ctx.theme.chrome.family;
    const specs = [['Headline', h], ['Lead', ld], ['Paragraph', bd], ['Caption', cp]].map(([n, t]) => `<p class="cap"><b>${n}</b>${t.size} px, line ${t.line}, ${A(fam(t))} ${t.weight}</p>`).join('');
    const main = `<div class="b-art__main"><h2 class="disp b-h" style="font-size:${h.size}px;line-height:${h.line}">${A(S.sample.headline)}</h2><div class="b-art__txt"><p class="b-dk" style="font-size:${ld.size}px;line-height:${ld.line}">${A(ctx.brand.lines.others[0])}</p><p class="b-p" style="font-size:${bd.size}px;line-height:${bd.line}">${A(S.sample.paragraph)}</p></div><figure class="b-art__fig">${slotTile(ctx, 'grower', { note: sentence(ctx.shot('grower').slot) })}<figcaption class="cap" style="font-size:${cp.size}px">${A(S.sample.caption)}</figcaption></figure></div>`;
    return std(ctx, 'type-in-use', `<div class="b-art">${main}<aside class="b-art__notes">${specs}</aside></div>`);
  },

  // five ruled columns, one rule each: the do above the column rule, the don't below it; Do and Don't run down the margin
  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, line = ctx.brand.voice.principles[0].example, action = ctx.roles.light.action;
    const price = ctx.brand.voice.principles[1].example;
    const demos = [
      [`<span class="disp b-d" style="font-size:22px">${A(line)}</span>`, `<span class="disp b-d" style="font-size:22px;text-transform:uppercase">${A(line)}</span>`],
      [`<span class="disp b-d" style="font-size:22px">${A(line)}</span>`, `<span class="disp b-d" style="font-size:22px;letter-spacing:0.14em">${A(line)}</span>`],
      [`<span class="b-d" style="font-size:14px">${A(c.alert)}</span>`, `<span class="b-d" style="font-size:9px">${A(c.alert)}</span>`],
      [`<span class="b-d" style="font-size:14px;color:var(--quiet)">${A(c.riderNote)}</span>`, ''],
      [`<span class="b-mono b-d">${A(action)}</span>`, `<span class="b-mono b-d">${A(price)}</span>`],
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    const half = (i, k, no) => `<div class="b-trc"><div class="b-demo">${demos[i]?.[k] || ''}</div><p class="b-rt${no ? ' b-rt--no' : ''}">${ic(no ? 'x' : 'check')}<span>${A(no ? R[i].dont : R[i].do)}</span></p></div>`;
    const cols = (k, no) => R.map((r, i) => half(i, k, no)).join('');
    const head = `<div class="b-trh"><h2 class="headline b-hl">${WORDS[R.length]} rules for type.</h2><p class="lead">Each says what to do, and what never happens.</p></div>`;
    const grid = `<div class="b-tr" style="--n:${R.length}"><h3 class="h3 b-trk">Do</h3><div class="b-trrow">${cols(0, false)}</div><h3 class="h3 b-trk b-trk--no">Don't</h3><div class="b-trrow b-trrow--no">${cols(1, true)}</div></div>`;
    return std(ctx, 'type-rules', `<div class="b-fill">${head}${grid}</div>`);
  },

  // the lead story: the picture on the right, the headline over the five directions run as two ruled text columns
  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    const list = items.map(([k, v]) => `<li class="b-dir"><b>${k}</b><p>${A(v)}</p></li>`).join('');
    const sh = ctx.shot('grower');
    return std(ctx, 'photo-direction', `<div class="b-photo"><div class="b-photo__text"><h2 class="headline b-hl">Hands before faces.</h2><ul class="b-dirs">${list}</ul></div><figure class="b-photo__img">${slotTile(ctx, 'grower', { note: rest(sh.slot) })}<figcaption class="cap">${A(sentence(sh.slot))}</figcaption></figure></div>`);
  },

  // the picture page: photographs pasted in ruled columns of different weights, captions numbered
  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots;
    const fig = (s, i) => `<figure class="b-shot"><div class="b-shot__img">${slotTile(ctx, s.id, { pos: '50% 50%', note: rest(s.slot) })}</div><figcaption class="cap"><b><span class="num">${i + 1}</span>&nbsp;&nbsp;${A(sentence(s.slot))}</b>${s.photo ? `Photo from ${A(s.credit)}` : 'Art-directed. To be shot to this brief'}</figcaption></figure>`;
    const groups = [[0], [1, 2], [3, 4], shots.slice(5).map((_, j) => 5 + j)].filter((g) => g.length);
    const cols = groups.map((g, gi) => `<div class="b-shotc b-shotc--${g.length}${gi === 0 ? ' b-shotc--lead' : ''}">${g.map((i) => fig(shots[i], i)).join('')}</div>`).join('');
    return std(ctx, 'shot-list', `<div class="b-shots">${cols}</div>`);
  },

  // the work column and the corrections column: what to do, then what never goes in, two ruled columns of pictures with captions
  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, G = ctx.brand.guideB, S = ctx.brand.type.sample;
    const line = ctx.brand.voice.principles[2].example.split('. ')[0] + '.';
    const lab = (t, cls = '') => `<span class="b-lab ${cls}">${A(t)}</span>`;
    const doT = [
      `${lab('Black and white')}`,
      `<i class="b-edge"></i>${lab('Produce close, counter in frame')}`,
      `<span class="disp b-onp" style="left:14px;top:14px;width:120px;font-size:20px;line-height:1.05">${A(line)}</span><i class="b-hands" style="right:16px;top:20px;width:64px;height:80px"></i>`,
      `<div class="b-flat">${lg(ctx, 'colour', 140)}</div>`,
    ];
    const dontT = [
      `<i class="b-wash"></i>${lab('Tinted', 'b-lab--acc')}`,
      `<div class="photo-slot b-studio"><span>${A(G.studioSlot)}</span></div>`,
      `<i class="b-hands" style="left:50px;top:16px;width:110px;height:88px"></i><span class="disp b-onp" style="left:14px;right:14px;top:50%;transform:translateY(-50%);font-size:20px;line-height:1.05;text-align:center">${A(line)}</span>`,
      `<i class="b-bz" style="left:8px;top:8px;width:60px;height:50px"></i><i class="b-bz b-bz--d" style="left:90px;top:30px;width:70px;height:60px"></i><i class="b-bz" style="left:150px;top:6px;width:56px;height:44px"></i><i class="b-bz b-bz--d" style="left:30px;top:74px;width:90px;height:36px"></i><span class="b-onp" style="left:50%;top:50%;transform:translate(-50%,-50%)">${lg(ctx, 'colour', 130)}</span>`,
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    const item = (t, ico, label, text) => `<li class="b-ir"><div class="b-ir__tile">${t}</div><p class="b-ir__cap">${ic(ico)}<span><b>${label}</b>${A(text)}</span></p></li>`;
    const sel = R.slice(0, 4);
    const doCol = `<ul class="b-irs">${sel.map((r, i) => item(doT[i], 'check', 'Do', r.do)).join('')}</ul>`;
    const dontCol = `<ul class="b-irs b-irs--no">${sel.map((r, i) => item(dontT[i], 'x', "Don't", r.dont)).join('')}</ul>`;
    return std(ctx, 'imagery-rules', `<div class="b-irc">${doCol}${dontCol}</div>`);
  },

  // the headline over the page: deck beside it, the drawn page as the figure, the measures down a narrow ruled column
  grid(ctx) {
    const G = ctx.gridMeasures, S = ctx.brand.ui.screen.content, k = 845 / G.page.w, p = px(k);
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const bars = Array.from({ length: G.columns }, (_, i) => `<i class="b-gcol" style="left:${p(colX(i))}px;width:${p(G.col)}px"></i>`).join('');
    const hl = tok(ctx, 'headline');
    const bar = (x, y, w, h, st = '') => `<i class="b-gb" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}"></i>`;
    const right = [0, 1, 2].map((i) => bar(colX(8), G.margin + 8 + i * 36, i === 2 ? span(3) : span(4), 14)).join('') + bar(colX(8), 190, span(4), 1.5, 'background:var(--ink)') +
      [0, 1, 2, 3].map((i) => `${bar(colX(8), 206 + i * 54, span(4), 1, 'background:var(--quiet)')}${bar(colX(8), 224 + i * 54, span(2), 12)}${bar(colX(10) + 40, 224 + i * 54, span(2) - 40, 12, 'background:var(--accent)')}`).join('');
    const drawing = `<div class="b-gpage" style="width:${p(G.page.w)}px;height:${p(G.page.h)}px">${bars}
<span class="b-gm" style="left:0;width:${p(G.margin)}px">${G.margin}</span><span class="b-gm" style="right:0;width:${p(G.margin)}px">${G.margin}</span>
<h2 class="disp b-gh" style="left:${p(colX(0))}px;top:${p(G.margin)}px;width:${p(span(8))}px;font-size:${p(hl.size)}px;line-height:${hl.line}">${A(ctx.brand.type.sample.headline)}</h2>
<div class="b-gph" style="left:${p(colX(0))}px;top:${p(G.margin + 132)}px;width:${p(span(8))}px;height:${p(G.page.h - G.margin - 38 - G.margin - 132)}px">${slotTile(ctx, 'quandongs')}</div>
<p class="cap b-gc" style="left:${p(colX(0))}px;top:${p(G.page.h - G.margin - 22)}px;width:${p(span(8))}px">${A(ctx.brand.type.sample.caption)}</p>${right}</div>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns} of ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const meas = `<ul class="b-meas">${m.map(([a, v]) => `<li><span>${a}</span><span class="num">${A(v)}</span></li>`).join('')}</ul>`;
    const top = `<div class="b-gtop"><h2 class="headline b-hl">${G.columns === 12 ? 'Twelve' : G.columns} columns.</h2><p class="txt b-gt">Margins and gutters are multiples of the ${G.base} px base. The photo takes eight columns and the list takes the other four.</p></div>`;
    return std(ctx, 'grid', `<div class="b-grid">${top}<div class="b-gbody">${drawing}${meas}</div></div>`);
  },

  // inside pages: the front page as the lead, its name set as a headline, the article and the list as two briefs below
  layouts(ctx) {
    const G = ctx.gridMeasures, H = G.page.h, W = G.page.w;
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const hl = tok(ctx, 'headline');
    const mk = (k) => {
      const p = px(k);
      const a = (x, y, w, h, st = '', inner = '') => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}">${inner}</div>`;
      const bars = (x, y, w, n, step = 28) => Array.from({ length: n }, (_, i) => a(x, y + i * step, i === n - 1 ? w * 0.6 : w, 10, 'background:var(--hair)')).join('');
      const hd = (x, y, w, txt, size = hl.size) => `<div class="disp b-ab b-th" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;font-size:${p(size)}px;line-height:${hl.line}">${txt}</div>`;
      const T = (inner) => `<div class="b-thumb" style="width:${p(W)}px;height:${p(H)}px">${inner}</div>`;
      return { p, a, bars, hd, T };
    };
    const A1 = mk(0.44), B1 = mk(0.3), C1 = mk(0.3);
    const front = A1.T(`${A1.a(G.margin, 52, W - 2 * G.margin, 4, 'background:var(--ink)')}${A1.a(colX(3), 76, span(6), 108, '', lg(ctx, 'colour', A1.p(span(6))))}${A1.a(G.margin, 200, W - 2 * G.margin, 2, 'background:var(--ink)')}${A1.a(colX(0), 222, span(8), H - 222 - G.margin, '', slotTile(ctx, 'quandongs'))}${A1.bars(colX(8), 226, span(4), 3, 34)}${[0, 1, 2, 3].map((i) => `${A1.a(colX(8), 346 + i * 62, span(4), 1.5, 'background:var(--quiet)')}${A1.a(colX(8), 366 + i * 62, span(2), 14, 'background:var(--hair)')}${A1.a(colX(10) + 40, 366 + i * 62, span(2) - 40, 14, 'background:var(--accent)')}`).join('')}`);
    const article = B1.T(`${B1.hd(colX(0), G.margin, span(7), A(ctx.brand.type.sample.headline))}${B1.bars(colX(0), 300, span(3), 8, 40)}${B1.bars(colX(3) + G.gutter / 2 + 12, 300, span(3), 8, 40)}${B1.a(colX(3) + G.gutter / 2 - 4, 296, 2, 300, 'background:var(--hair)')}${B1.a(colX(7), G.margin, span(5), H - 2 * G.margin, '', slotTile(ctx, 'bag'))}`);
    const list = C1.T(`${C1.a(G.margin, 52, W - 2 * G.margin, 6, 'background:var(--accent)')}${C1.hd(colX(0), 96, span(8), 'In this week', 120)}${[0, 1, 2, 3, 4].map((i) => `${C1.a(colX(0), 270 + i * 80, span(12), 1.5, 'background:var(--ink)')}${C1.a(colX(0), 296 + i * 80, span(5) - (i % 2) * 120, 24, 'background:var(--hair)')}${C1.a(colX(10), 296 + i * 80, span(2), 24, 'background:var(--accent)')}`).join('')}`);
    const cap = (n, c, big) => `<div class="b-lay__cap"><h3 class="${big ? 'headline b-hl' : 'disp b-lay__n'}">${n}</h3><p class="${big ? 'lead' : 'cap'}">${A(c)}</p></div>`;
    const lead = `<figure class="b-lay b-lay--lead">${front}${cap('Front page', `The logo across the top, a photo on eight of ${G.columns} columns and a ruled list on four.`, true)}</figure>`;
    const small = (t, n, c) => `<figure class="b-lay b-lay--sm">${t}${cap(n, c)}</figure>`;
    return std(ctx, 'layouts', `<div class="b-lays">${lead}<div class="b-lays__r">${small(article, 'Article', 'Headline on seven columns, text in two ruled columns, photo on five.')}${small(list, 'List', 'One line a row, the price in Quandong on the right.')}</div></div>`);
  },

  // three pasted-up ads set on one baseline, keyed by figure number to a ruled column of captions
  social(ctx) {
    const k = 0.26, p = px(k), S = ctx.brand.applications.social, price = ctx.brand.voice.principles[1].example;
    const at = (x, y, w, st, inner) => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;${w ? `width:${p(w)}px;` : ''}${st}">${inner}</div>`;
    const hl = (x, y, w, size, color, txt) => at(x, y, w, `color:${color};font-size:${p(size)}px;line-height:0.98`, `<span class="disp b-th">${A(txt)}</span>`);
    const post = (w, h, bg, inner) => `<div class="b-post" style="width:${p(w)}px;height:${p(h)}px;background:${bg}">${inner}</div>`;
    const square = post(1080, 1080, 'var(--ground)', `${at(96, 96, 888, 'height:2px;background:var(--ink)', '')}${hl(96, 150, 888, 140, 'var(--ink)', S[0])}${hl(96, 700, 888, 130, 'var(--accent)', price)}${at(96, 930, 0, '', lg(ctx, 'horizontal', p(380), { width: p(380) }))}`);
    const portrait = post(1080, 1350, 'var(--dark)', `${at(0, 0, 1080, `height:${p(840)}px`, slotTile(ctx, 'grower', { note: sentence(ctx.shot('grower').slot) }))}${hl(72, 900, 936, 92, 'var(--dark-ink)', S[1])}${at(72, 1220, 0, '', lg(ctx, 'horizontal', p(330), { width: p(330), colourway: 'reversed', color: 'var(--dark-ink)' }))}`);
    const story = post(1080, 1920, 'var(--accent)', `${at(0, 0, 1080, `height:${p(1060)}px`, slotTile(ctx, 'chalkboard', { note: sentence(ctx.shot('chalkboard').slot) }))}${hl(72, 1130, 936, 112, 'var(--accent-ink)', S[2])}${at(72, 1580, 0, '', lg(ctx, 'horizontal', p(300), { width: p(300), colourway: 'on-quandong', color: 'var(--accent-ink)' }))}`);
    const fig = (el, n) => `<figure class="b-sfig">${el}<figcaption class="b-sfig__n num" aria-hidden="true">${n}</figcaption></figure>`;
    const entry = (n, name, c) => `<li><span class="b-sk num" aria-hidden="true">${n}</span><div><h3 class="disp b-sh">${name}</h3><p class="cap">${A(c)}</p></div></li>`;
    return std(ctx, 'social', `<div class="b-socials"><div class="b-posts">${fig(square, 1)}${fig(portrait, 2)}${fig(story, 3)}</div><ol class="b-skey">${entry(1, 'Square', '1080 × 1080 px. The line, the price and the horizontal logo on Newsprint.')}${entry(2, 'Portrait', '1080 × 1350 px. A photo, then the line on Bluestone.')}${entry(3, 'Story', '1080 × 1920 px. Keep type 250 px clear of the top and bottom.')}</ol></div>`);
  },

  // the shop-window sign set as the lead picture on the right; the board photo wide on the left, the specs as four briefs beneath
  signage(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, [spec0, head0] = B.applications.signage.split(': ');
    const spec = spec0.replace(/ x /g, ' × '), head = head0 || B.lines.others[0];
    const [sw, sh] = (spec.match(/(\d+) × (\d+) mm/) || [0, 900, 1200]).slice(1).map(Number);
    const k = 0.44, p = px(k);
    const items = S.deliveries.slice(0, 3).map((d) => { const [item] = d.to.split(', '); return `<li><span>${A(item)}</span><span>${A(d.price)}</span></li>`; }).join('');
    const sign = `<div class="b-sign" style="width:${p(sw)}px;height:${p(sh)}px"><h2 class="disp b-sign__h">${A(head)}</h2><ul class="b-sign__l">${items}</ul><div class="b-sign__logo">${lg(ctx, 'reversed', 230, { width: 230, color: 'var(--dark-ink)' })}</div></div>`;
    const dim = `<div class="b-dim" style="width:${p(sw)}px"><span></span><b class="num">${sw} mm</b><span></span></div>`;
    const rows = [['Size', `${sw} × ${sh} mm, portrait. ${spec0.split(',')[0]}.`], ['Ground', `${(ctx.colours.find((c) => c.hex.toLowerCase() === B.logo.colourways.reversed.ground.toLowerCase()) || {}).name}, edge to edge.`], ['Type', `${B.fonts.display.family} for the line, ${B.fonts.body.family} for the list. Sentence case.`], ['Logo', `${ctx.logo.labels.reversed} version. ${B.logo.when.reversed}`]];
    const side = `<ul class="b-spec">${rows.map(([a, t]) => `<li><b>${a}</b><span>${A(t)}</span></li>`).join('')}</ul>`;
    const scene = `<figure class="b-scene"><div class="b-scene__img">${slotTile(ctx, 'chalkboard', { note: rest(ctx.shot('chalkboard').slot) })}</div><figcaption class="cap">The board by the door says the same thing. The window and the board never disagree.</figcaption></figure>`;
    return std(ctx, 'signage', `<div class="b-sg"><div class="b-sg__l">${scene}${side}</div><div class="b-sg__a">${dim}${sign}</div></div>`);
  },

  // the headline across the page, the email as a letter beneath, the notes in a narrow ruled column
  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card;
    const bd = tok(ctx, 'body');
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sig = `<div class="b-sig"><div class="b-sig__logo">${lg(ctx, 'horizontal', 190, { width: 190 })}</div><p class="b-sig__n">${A(e.person)}</p><p class="b-sig__r">${A(e.role)}</p><p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p><p class="b-sig__l">${A(B.lines.primary)}</p></div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p><span>From</span>${A(e.person)}, ${A(c.contact)}</p><p><span>To</span>${A(g.to)}</p><p><span>Subject</span><b>${A(g.subject)}</b></p><p class="b-mail__t num">${A(g.time)}</p></div><div class="b-mail__b">${lines}${sig}</div></div>`;
    const specs = [['Logo', `${ctx.logo.labels.horizontal} version, 190 px wide. ${B.logo.when.horizontal}`], ['Type', `${B.fonts.body.family}. Name at ${bd.size} px, weight 700. Role and contact at ${bd.size - 1} px.`], ['Text', `Live text, not a picture, so it still reads with images off. Use Arial where ${B.fonts.body.family} is not installed.`]];
    const side = `<div class="b-specs">${specs.map(([a, t]) => `<p class="cap"><b>${a}</b>${A(t)}</p>`).join('')}</div>`;
    return std(ctx, 'email-signature', `<div class="b-em"><h2 class="headline b-hl b-em__h">A name, a role, a way to reach us.</h2><div class="b-em__b"><div class="b-em__m">${mail}</div>${side}</div></div>`);
  },

  // the site as a web edition: ruled top and foot instead of a browser box, the booking form as the sidebar
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, F = S.form;
    const list = `<div class="b-site__l"><h3 class="disp b-site__h">${A(B.ui.screen.title)}</h3>${ui.deliveryRows(5)}</div>`;
    const form = `<form class="b-site__f" onsubmit="return false"><h3 class="disp b-site__t">${A(F.title)}</h3>${ui.field({ id: 'sd-name', label: F.pickup, value: F.pickupValue })}${ui.field({ id: 'sd-time', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0] })}<div class="b-site__tot"><span>${A(S.paidLabel)}</span><b class="num">${A(S.paid)}</b></div>${ui.btn(F.book, { block: true })}</form>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="b-bar__logo">${lg(ctx, 'horizontal', 140, { width: 140, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(S.example.links, 0)}</div>${ui.btn(F.book, { size: 'sm' })}</nav>`;
    const win = `<div class="ui b-win"><div class="b-win__url"><span>${A(B.applications.site.url)}</span></div>${bar}<div class="b-win__body">${list}${form}</div></div>`;
    return std(ctx, 'digital', `<div class="b-fill">${win}</div>`);
  },

  // "in brief": the logo as the nameplate between rules; the lines, the colours as a price listing and the faces as three columns; the rules across the foot
  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, [d, b] = [f.display, f.body];
    const surface = ctx.roles.light.surface.toLowerCase();
    const cs = ctx.colours.slice().sort((x, y) => y.share - x.share);
    const bar = cs.map((c) => `<li style="flex:${c.share};background:${c.hex}${c.hex.toLowerCase() === surface ? ';box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></li>`).join('');
    const key = cs.map((c) => `<li><i class="b-sw" style="background:${c.hex}"></i><b>${A(c.name)}</b><span class="num b-shr">${Math.round(c.share * 100)}%</span><span class="b-mono">${A(c.hex)}</span></li>`).join('');
    const rules = G.rules.map((r) => `<li><h3 class="disp b-rh">${A(r.title)}</h3><p class="b-rp">${A(r.text)}</p></li>`).join('');
    const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? 'b-ln' : 'b-ln b-ln--first'}">${A(l)}</li>`).join('');
    const faces = `<div class="b-sum__faces"><p><span class="b-aa2 disp">Aa</span><span class="cap"><b>${A(d.family)}</b>Display, weight ${d.weights.join(', ')}</span></p><p><span class="b-aa2 b-aa2--body">Aa</span><span class="cap"><b>${A(b.family)}</b>Body, weights ${b.weights.join(', ')}</span></p></div>`;
    const np = `<div class="b-sum__np">${lg(ctx, 'colour', 480, { width: 480 })}</div>`;
    const cols = `<div class="b-sum__cols"><ul class="b-lines">${lines}</ul><div class="b-sum__col"><ul class="b-bar">${bar}</ul><ul class="b-key">${key}</ul></div>${faces}</div>`;
    return std(ctx, 'summary', `<div class="b-sum">${np}${cols}<ol class="b-rules3">${rules}</ol></div>`);
  },

  // the index down the left, the lead story (who to ask) in the middle, the "not in this issue" brief ruled off on the right
  'contact-scope'(ctx) {
    const B = ctx.brand;
    const secs = ctx.sections.map((s) => `<li><span class="num b-sn">${s.n}</span><span>${A(s.title)}</span><span class="num b-sp">${s.pages[0].no}</span></li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<li><b>${a}.</b> ${c}</li>`).join('');
    return std(ctx, 'contact-scope', `<div class="b-cs"><div class="b-cs__c b-cs__idx"><h3 class="h3">In this document</h3><ol class="b-in">${secs}</ol></div>
<div class="b-cs__c b-cs__lead"><h2 class="headline b-cs__h">Who to ask</h2><p class="b-cs__p">${A(B.contact.owner)} owns this document. Write to <span class="b-mono">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p>
<h3 class="h3 b-cs__v">Version history</h3><table class="b-vt"><tbody><tr><td class="num">${A(B.version.number)}</td><td>${A(ctx.date)}</td><td>First release.</td></tr></tbody></table></div>
<div class="b-cs__c b-cs__not"><h3 class="h3">Not in this document</h3><ul class="b-not">${not}</ul></div></div>`);
  },
};

export const guidelinesB = own;
