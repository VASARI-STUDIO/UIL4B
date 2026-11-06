// Guidelines pages for theme 01, run B: typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Every page is a slide with one idea: a face set huge, a wall of six small slides, a photograph edge to edge, a row of slides on White
// and a row on Asphalt, a recap on a dark foot.
import { A, std } from './helpers.js';
import { cssStr } from '../../engine/escape.js';

// a slide whose picture or band runs to the slide's edges (class b-x), and a slide with the usual margins
const bleed = (ctx, id, main, cls = '') => std(ctx, id, main, `b-x ${cls}`);
const wide = (ctx, id, main, cls = '') => std(ctx, id, `<div class="b-wide">${main}</div>`, cls);
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
// small slots cannot hold the long label
const lg = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: Math.round(w), label: w < 150 ? 'Logo' : undefined, ...o });
const px = (k) => (n) => +(n * k).toFixed(2);
const shotTitle = (s) => (s.caption || s.slot.split(':')[0]);
const sentence = (s) => s.split(/(?<=\.)\s+/)[0];

const own = {
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale;
    const wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 800: 'Extra bold' };
    const tokensOf = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const sample = ctx.brand.lines.primary;
    const action = ctx.roles.light.action;
    const lead = `Two faces do the work. ${A(d.family)} sets the line you read first. ${A(b.family)} carries everything after it.`;
    // the display face's name is the slide, set huge in itself; the body face and the mono sit in the footer
    const main = `<div class="b-tf">
<div class="b-tf__top"><p class="lead">${lead}</p><p class="cap"><b>Display</b>Weight ${d.weights.join(', ')}, width ${d.stretch || 100}. Used for ${A(tokensOf('display'))}.</p></div>
<div><h2 class="disp b-tf__name">${A(d.family)}</h2><p class="b-glyphs disp">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p></div>
<div class="b-tf__foot">
<div><h3 class="b-fname">${A(b.family)}</h3><p class="cap"><b>Body</b>Used for ${A(tokensOf('body'))}.</p></div>
<ul class="b-weights">${b.weights.map((w) => `<li style="font-weight:${w}"><span class="b-wn">${wname[w] || w} ${w}</span><span>${A(sample)}</span></li>`).join('')}</ul>
<div><span class="b-mono b-monosample">${A(action)}</span><p class="cap"><b>${A(m.family)}</b>Only for a hex, a token or a code string.</p></div>
</div>
<p class="cap b-licence">${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts.</p>
</div>`;
    return std(ctx, 'typefaces', main, 'b-dk');
  },

  hierarchy(ctx) {
    const S = ctx.brand.type, c = ctx.brand.ui.screen.content;
    const time = (c.eta.match(/\d{1,2}:\d{2}/) || [c.eta])[0];
    const samples = { display: time, headline: ctx.brand.lines.others[1], title: ctx.brand.lines.primary, body: sentence(S.sample.paragraph), label: c.form.book, caption: S.sample.caption };
    // the scale as a wall of six small slides, one style on each at its true size, its spec in the slide's footer
    const cells = S.scale.map((t) => {
      const face = t.face === 'display' ? 'disp' : '';
      const style = `font-size:${t.size}px;line-height:${t.line};${t.face === 'display' ? '' : `font-family:var(--body);font-weight:${t.weight};`}`;
      return `<li class="b-hs"><p class="b-hs__s ${face}" style="${style}">${A(samples[t.token] || t.use)}</p><p class="cap"><b>${A(ctx.cap(t.token))}</b>${t.size} px, line ${t.line}, weight ${t.weight}<br>${A(t.use)}</p></li>`;
    }).join('');
    const body = tok(ctx, 'body'), cap = tok(ctx, 'caption');
    return std(ctx, 'hierarchy', `<div class="b-hr"><p class="lead">${S.scale.length} steps, each with one job. Display and headline take one line. Reading text is ${body.size} px and captions are ${cap.size} px. Nothing sits between.</p><ol class="b-hsg">${cells}</ol></div>`);
  },

  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const fam = (t) => ctx.brand.fonts[t.face].family;
    const specs = [['Headline', h], ['Paragraph', bd], ['Caption', cp]].map(([n, t]) => `<p class="cap"><b>${n}</b>${t.size} px, line ${t.line}, ${A(fam(t))} ${t.weight}</p>`).join('');
    const lead = `A headline, a paragraph and a caption, set the way ${A(ctx.brand.name)} sets them.`;
    // the page itself: type on the left, the photo bleeding off the right and bottom edges
    const piece = `<div class="b-uz"><p class="lead">${lead}</p><div class="b-uz__t"><h2 class="disp b-h" style="font-size:${h.size}px;line-height:${h.line}">${A(S.sample.headline)}</h2><p class="b-p" style="font-size:${bd.size}px;line-height:${bd.line}">${A(S.sample.paragraph)}</p></div><div class="b-uz__specs">${specs}</div></div>
<figure class="b-uz__fig">${ctx.photo('evening', { pos: '56% 50%', style: 'width:100%;height:0;flex:1' })}<figcaption class="cap" style="font-size:${cp.size}px">${A(S.sample.caption)}</figcaption></figure>`;
    return std(ctx, 'type-in-use', piece);
  },

  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, line = ctx.brand.lines.others[1], action = ctx.roles.light.action;
    const demos = [
      [`<span class="disp b-d" style="font-size:22px">${A(line)}</span>`, `<span class="disp b-d" style="font-size:22px;text-transform:uppercase">${A(line)}</span>`],
      [`<span class="disp b-d" style="font-size:22px">${A(line)}</span>`, `<span class="disp b-d" style="font-size:22px;letter-spacing:0.14em">${A(line)}</span>`],
      [`<span class="b-d" style="font-size:15px">${A(c.eta)}.</span>`, `<span class="b-d" style="font-size:9px">${A(c.eta)}.</span>`],
      [`<span class="b-d" style="font-size:13px;color:var(--quiet-panel)">${A(c.riderNote)}</span>`, ''],
      [`<span class="b-mono b-d">${A(action)}</span>`, `<span class="b-mono b-d">${A(c.form.book)}</span>`],
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    // five rules as five columns; in each the "do" is a slide on White and the "don't" a slide on Asphalt
    const cols = R.map((r, i) => `<li class="b-trc"><div class="b-tile"><h3 class="h3">${ic('check')}Do</h3><div class="b-demo">${demos[i]?.[0] || ''}</div><p class="b-rt">${A(r.do)}</p></div><div class="b-tile b-tile--no"><h3 class="h3">${ic('x')}Don't</h3><div class="b-demo">${demos[i]?.[1] || ''}</div><p class="b-rt">${A(r.dont)}</p></div></li>`).join('');
    return std(ctx, 'type-rules', `<div class="b-tr"><p class="lead">${R.length} rules for setting type. Each says what to do, and what never happens.</p><ul class="b-trs">${cols}</ul></div>`);
  },

  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction;
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    const list = items.map(([k, v]) => `<li class="b-dir"><b>${k}</b><p>${A(v)}</p></li>`).join('');
    // the photograph runs edge to edge; the five lines sit under it as its caption
    return bleed(ctx, 'photo-direction', `<div class="b-pd"><figure class="b-pd__img">${ctx.photo('riders', { pos: '50% 35%', style: 'width:100%;height:100%' })}</figure><div class="b-pd__band"><p class="lead">Riders at work in the city, in daylight, with the street around them. Five lines cover every photograph.</p><ul class="b-dirs">${list}</ul></div></div>`);
  },

  'shot-list'(ctx) {
    const one = (s, i, cls) => `<figure class="b-shot ${cls}"><div class="b-shot__img">${ctx.photo(s.id, { pos: cls ? '50% 30%' : '50% 50%', style: 'width:100%;height:100%' })}</div><figcaption class="cap"><b><span class="num">${i + 1}</span>&nbsp;&nbsp;${A(shotTitle(s))}</b>${s.photo ? `Photo from ${A(s.credit)}` : 'Art-directed. To be shot to this brief'}</figcaption></figure>`;
    const shots = ctx.brand.imagery.shots;
    // one slide-sized frame, then the rest of the roll as a strip of thumbnails under it
    return wide(ctx, 'shot-list', `<div class="b-sh">${one(shots[0], 0, 'b-shot--hero')}<div class="b-sh__strip">${shots.slice(1).map((s, i) => one(s, i + 1, '')).join('')}</div></div>`);
  },

  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, sh = ctx.brand.guideB.studioSlot, line = ctx.brand.lines.others[1];
    const [r, g, b] = ctx.C.hexToRgb(ctx.roles.light.action);
    const full = 'width:100%;height:100%';
    // Each tile treats a photo. A slot has no picture to crop, so a cropped tile stays a plain slot; a tile with type or a logo on it
    // gets a dark ground and no slot note, so the type reads and nothing prints under it.
    const tile = (id, { pos, crop = '', over = false }) => {
      const real = !!ctx.shot(id).photo;
      return ctx.photo(id, { pos, cls: !real && over ? 'b-slot--dark' : '', style: real && crop ? `${full};${crop}` : full, slotNote: real || !over });
    };
    const doT = [
      tile('riders', { pos: '50% 60%' }),
      tile('riders', { pos: '72% 50%', crop: 'transform:scale(2.1);transform-origin:72% 52%' }),
      `${tile('evening', { pos: '30% 50%', over: true })}<span class="disp b-onphoto" style="left:14px;top:14px;font-size:22px;line-height:1">${A(line)}</span>`,
      `<div class="b-flat">${ctx.logo.html('reversed', { width: 150, color: 'var(--dark-ink)' })}</div>`,
    ];
    const dontT = [
      `<div class="photo-slot b-studio"><span>${A(sh)}</span></div>`,
      `${tile('riders', { pos: '50% 60%' })}<span class="b-wash" style="background:rgba(${r},${g},${b},0.55)"></span>`,
      `${tile('riders', { pos: '72% 50%', crop: 'transform:scale(3);transform-origin:73% 24%', over: true })}<span class="disp b-onphoto b-onphoto--mid" style="font-size:24px;line-height:1">${A(line)}</span>`,
      `${tile('riders', { pos: '50% 60%', over: true })}<span class="b-onphoto" style="left:50%;top:62%;transform:translate(-50%,-50%)">${ctx.logo.html('colour', { width: 140, label: 'Logo' })}</span>`,
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    const row = (tiles, key, icon, cls) => `<div class="b-irow ${cls}">${R.slice(0, 4).map((_, i) => `<div class="b-ir"><div class="b-ir__tile">${tiles[i]}</div><p class="cap b-ir__cap">${ic(icon)}<span><b>${key}</b>${A(R[i][key === 'Do' ? 'do' : 'dont'])}</span></p></div>`).join('')}</div>`;
    // two consecutive slides: every "do" on White, then every "don't" on Asphalt
    return bleed(ctx, 'imagery-rules', `<div class="b-irs">${row(doT, 'Do', 'check', 'b-irow--do')}${row(dontT, "Don't", 'x', 'b-irow--no')}</div>`);
  },

  grid(ctx) {
    const G = ctx.gridMeasures, k = 0.6, p = px(k);
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const bars = Array.from({ length: G.columns }, (_, i) => `<i class="b-gcol" style="left:${p(colX(i))}px;width:${p(G.col)}px"></i>`).join('');
    const head = ctx.brand.lines.others[1], cp = tok(ctx, 'caption'), hl = tok(ctx, 'headline');
    const drawing = `<div class="b-gpage" style="width:${p(G.page.w)}px;height:${p(G.page.h)}px">${bars}
<span class="b-gm" style="left:0;width:${p(G.margin)}px">${G.margin}</span><span class="b-gm" style="right:0;width:${p(G.margin)}px">${G.margin}</span>
<h2 class="disp b-gh" style="left:${p(colX(0))}px;top:${p(G.margin + 24)}px;width:${p(span(6))}px;font-size:${p(hl.size)}px;line-height:${hl.line}">${A(head)}</h2>
<p class="cap b-gc" style="left:${p(colX(0))}px;top:${p(G.page.h - G.margin - 28)}px;width:${p(span(5))}px">${A(ctx.brand.type.sample.caption)}</p>
<div class="b-gph" style="left:${p(colX(7))}px;top:${p(G.margin)}px;width:${p(span(5))}px;height:${p(G.page.h - 2 * G.margin)}px">${ctx.photo('evening', { pos: '56% 50%', style: 'width:100%;height:100%' })}</div></div>`;
    const m = [['Page', `${G.page.w} × ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns} of ${ctx.fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    // the page drawn on a panel, then the five measurements as the slide's footer, each set large
    const meas = `<ul class="b-meas">${m.map(([a, v]) => `<li><p class="cap"><b>${a}</b></p><p class="disp b-mv num">${A(v)}</p></li>`).join('')}</ul>`;
    const lead = `Twelve columns on a ${G.page.w} by ${G.page.h} page. Margins and gutters are multiples of the ${G.base} px base. The photo takes five columns and the type takes the rest.`;
    return bleed(ctx, 'grid', `<div class="b-gr"><div class="b-gr__band on-panel">${drawing}<p class="lead b-gr__lead">${lead}</p></div>${meas}</div>`);
  },

  layouts(ctx) {
    const G = ctx.gridMeasures, H = G.page.h, cc = G.columns;
    const colX = (i) => G.margin + i * (G.col + G.gutter), span = (n) => n * G.col + (n - 1) * G.gutter;
    const hl = tok(ctx, 'headline');
    const full = 'width:100%;height:100%';
    const photoW = colX(8) - G.gutter / 2;
    // the three thumbnails at a given scale: the first is drawn large, the other two small
    const build = (k) => {
      const p = px(k);
      const a = (x, y, w, h, st, inner = '') => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;height:${p(h)}px;${st}">${inner}</div>`;
      const bars = (x, y, w, n) => Array.from({ length: n }, (_, i) => a(x, y + i * 28, i === n - 1 ? w * 0.6 : w, 10, 'background:var(--hair)')).join('');
      const hd = (x, y, w, txt, size = hl.size) => `<div class="disp b-ab b-th" style="left:${p(x)}px;top:${p(y)}px;width:${p(w)}px;font-size:${p(size)}px;line-height:${hl.line}">${txt}</div>`;
      const T = (inner) => `<div class="b-thumb" style="width:${p(G.page.w)}px;height:${p(H)}px">${inner}</div>`;
      return {
        poster: T(`${a(0, 0, photoW, H, '', ctx.photo('riders', { pos: '50% 50%', style: full }))}${a(photoW, 0, G.page.w - photoW, H, 'background:var(--accent)')}${hd(colX(8), G.margin, span(4), A(ctx.brand.lines.others[1]))}<div class="b-ab" style="left:${p(colX(8))}px;top:${p(H - G.margin - 56)}px">${ctx.logo.html('colour', { colourway: 'on-signal', width: p(220), label: '', color: 'var(--accent-ink)' })}</div>`),
        editorial: T(`${hd(colX(0), G.margin, span(5), A(ctx.brand.type.sample.headline))}${bars(colX(0), 260, span(4), 5)}${a(colX(6), G.margin, span(6), H - 2 * G.margin - 36, '', ctx.photo('evening', { pos: '56% 50%', style: full }))}${a(colX(6), H - G.margin - 14, span(3), 10, 'background:var(--hair)')}`),
        stmt: T(`${hd(colX(0), G.margin, span(9), `${A(ctx.brand.lines.primary).replace('. ', '.<br>')}`, 72)}${[0, 1, 2].map((i) => `${a(colX(i * 4), 440, span(4), 2, 'background:var(--ink)')}${bars(colX(i * 4), 470, span(4) - G.gutter, 3)}`).join('')}`),
      };
    };
    const big = build(780 / G.page.w), small = build(332 / G.page.w);
    const fig = (t, n, c, cls = '') => `<figure class="b-lay ${cls}">${t}<figcaption class="cap"><b>${n}</b>${A(c)}</figcaption></figure>`;
    return wide(ctx, 'layouts', `<div class="b-lays">${fig(big.poster, 'Poster', `Photo across 8 of ${cc} columns. The line and the logo take the other 4, on Signal.`)}<div class="b-lays__side">${fig(small.editorial, 'Editorial', 'Headline on 5 columns, text on 4, photo on 6. Leave a column of white between them.')}${fig(small.stmt, 'Statement', 'The line runs across 9 columns. Three notes sit under it, 4 columns each.')}</div></div>`);
  },

  social(ctx) {
    const S = ctx.brand.applications.social, FH = 470;
    const full = 'width:100%;height:100%';
    // the three formats at one height, side by side like frames on a film strip
    const frame = (w, h, bg, build) => {
      const k = FH / h, p = px(k);
      const at = (x, y, ww, st, inner) => `<div class="b-ab" style="left:${p(x)}px;top:${p(y)}px;${ww ? `width:${p(ww)}px;` : ''}${st}">${inner}</div>`;
      const hl = (x, y, ww, size, color, txt) => at(x, y, ww, `color:${color};font-size:${p(size)}px;line-height:0.95`, `<span class="disp b-th">${A(txt)}</span>`);
      return { w: p(w), html: `<div class="b-post" style="width:${p(w)}px;height:${FH}px;background:${bg}">${build(at, hl, k)}</div>` };
    };
    const square = frame(1080, 1080, 'var(--accent)', (at, hl, k) => `${hl(96, 96, 880, 150, 'var(--accent-ink)', S[0])}${at(96, 900, 0, '', lg(ctx, 'horizontal', 380 * k, { colourway: 'on-signal', width: px(k)(380), color: 'var(--accent-ink)' }))}`);
    const portrait = frame(1080, 1350, 'var(--dark)', (at, hl, k) => `${at(0, 0, 1080, `height:${px(k)(860)}px`, ctx.photo('evening', { pos: '56% 50%', style: full }))}${hl(72, 920, 936, 96, 'var(--dark-ink)', S[1])}${at(72, 1236, 0, '', lg(ctx, 'horizontal', 330 * k, { colourway: 'reversed', width: px(k)(330), color: 'var(--dark-ink)' }))}`);
    const story = frame(1080, 1920, 'var(--accent)', (at, hl, k) => `${at(0, 0, 1080, `height:${px(k)(1120)}px`, ctx.photo('riders', { pos: '50% 50%', style: full }))}${hl(72, 1190, 936, 128, 'var(--accent-ink)', S[2])}${at(72, 1590, 0, '', lg(ctx, 'horizontal', 300 * k, { colourway: 'on-signal', width: px(k)(300), color: 'var(--accent-ink)' }))}`);
    const fig = (f, n, c) => `<figure class="b-sfig" style="width:${f.w}px">${f.html}<figcaption class="cap"><b>${n}</b>${A(c)}</figcaption></figure>`;
    return wide(ctx, 'social', `<div class="b-socials">${fig(square, 'Square', '1080 × 1080 px. The line and the horizontal logo on Signal.')}${fig(portrait, 'Portrait', '1080 × 1350 px. A photo, then the line on Asphalt.')}${fig(story, 'Story', '1080 × 1920 px. Keep type 250 px clear of the top and bottom.')}</div>`);
  },

  signage(ctx) {
    const B = ctx.brand, s = ctx.shot('busstop'), [spec0, head0] = B.applications.signage.split(': ');
    const spec = spec0.replace(/ x /g, ' × '), head = head0 || B.lines.others[1];
    const p = ctx.pages.find((x) => x.id === 'signage');
    const url = s.photo ? ctx.photoUrl(s.photo) : '';
    const poster = `<div class="b-poster"><div class="b-poster__ink"></div>${url ? `<div class="b-glass" style="background-image:url('${cssStr(url)}')"></div>` : ''}<div class="b-poster__in"><span class="disp b-poster__h">${A(head)}</span><div class="b-poster__b"><span class="b-poster__l">${A(B.lines.primary).replace('. ', '.<br>')}</span><div class="b-poster__logo">${ctx.logo.html('colour', { colourway: 'on-signal', width: 190, label: 'Your logo goes here', color: 'var(--accent-ink)' })}</div></div></div></div>`;
    return `<section class="pg pg--sign" data-page="signage">${ctx.photo('busstop', { cls: 'b-scene' })}<span class="b-frame"></span>${poster}<div class="b-sfoot"><span><b class="num">${p.ref}</b>${A(p.title)}<i>${A(spec)}</i></span><span>${A(B.name)} brand guidelines<b class="num" style="margin:0 0 0 12px">${ctx.pageNo('signage')}</b></span></div></section>`;
  },

  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card;
    const bd = tok(ctx, 'body'), lb = tok(ctx, 'label');
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sig = `<div class="b-sig"><div class="b-sig__logo">${ctx.logo.html('horizontal', { width: 190, label: 'Your logo goes here' })}</div><div><p class="b-sig__n">${A(e.person)}</p><p class="b-sig__r">${A(e.role)}</p><p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p><p class="b-sig__l">${A(B.lines.primary)}</p></div></div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p><span>From</span>${A(e.person)}, ${A(c.contact)}</p><p><span>To</span>${A(g.to)}</p><p><span>Subject</span><b>${A(g.subject)}</b></p><p class="b-mail__t num">${A(g.time)}</p></div><div class="b-mail__b">${lines}${sig}</div></div>`;
    const specs = [['Logo', `${ctx.logo.labels.horizontal} version, 190 px wide. ${B.logo.when.horizontal}`], ['Type', `${A(B.fonts.body.family)}. Name at ${bd.size} px, weight 600. Role and contact at ${lb.size} px.`], ['Text', 'Live text, not a picture, so it still reads with images off. Use Arial where IBM Plex Sans is not installed.']];
    // the message fills the slide on a panel; the lead and the three specs run along its foot
    return bleed(ctx, 'email-signature', `<div class="b-em"><div class="b-em__band on-panel">${mail}</div><div class="b-em__foot"><p class="lead">The signature as it renders in a mail client: the logo, a name, a role and a way to reach us.</p>${specs.map(([a, t]) => `<p class="cap"><b>${a}</b>${A(t)}</p>`).join('')}</div></div>`);
  },

  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui;
    const pct = Math.round(S.progress * 100);
    const fromTo = `<div class="b-trk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`;
    const track = `<div class="b-trk"><div class="b-trk__top">${ui.statusChip('on-the-way', { label: S.status })}<span class="b-trk__t">${A(S.title)}</span></div><h2 class="ui-display b-trk__eta">${A(S.eta)}</h2><div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div>${fromTo}<p class="b-trk__p">${A(S.pickup)}</p>
<div class="b-trk__rider"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div><p class="b-trk__rn">${A(S.rider)}</p><p class="b-trk__rs">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', iconLeft: 'phone' })}</div>
<div class="b-trk__facts"><div><p class="b-trk__fl">${A(S.deliverToLabel)}</p><p class="b-trk__fv">${A(S.deliverTo)}</p></div><div><p class="b-trk__fl">${A(S.paidLabel)}</p><p class="b-trk__fv num">${A(S.paid)}</p></div>${ui.btn(S.share, { variant: 'quiet', iconRight: 'arrow-right' })}</div></div>`;
    const list = `<aside class="b-dl"><h3 class="b-dl__h">Deliveries</h3>${ui.deliveryRows(3)}</aside>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="b-bar__logo">${ctx.logo.html('horizontal', { width: 130, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links([['Track', 'map-pin'], ['Book', 'plus'], ['History', 'clock']], 0)}</div>${ui.btn(S.form.book, { size: 'sm' })}</nav>`;
    const win = `<div class="ui b-win"><div class="b-win__url"><span>${A(B.applications.site.url)}/track</span></div>${bar}<div class="b-win__body">${track}${list}</div></div>`;
    return wide(ctx, 'digital', win);
  },

  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, [d, b] = [f.display, f.body];
    const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${c.share}"><i style="background:${c.hex}${c.hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></i><p class="cap"><b>${A(c.name)}</b><span class="num">${Math.round(c.share * 100)}%</span> <span class="b-mono">${A(c.hex)}</span></p></li>`).join('');
    const rules = G.rules.map((r) => `<li><h3 class="disp b-rh">${A(r.title)}</h3><p class="b-rp">${A(r.text)}</p></li>`).join('');
    const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? 'b-ln' : 'b-ln b-ln--first'}">${A(l)}</li>`).join('');
    // a recap slide: the colour proportions run across the top edge, the three rules take the middle, the identity sits on a dark foot
    return bleed(ctx, 'summary', `<div class="b-sum"><ul class="b-strip">${strip}</ul><ol class="b-rules3">${rules}</ol><div class="b-sum__foot b-dk"><div class="b-sum__logo">${ctx.logo.html('reversed', { width: 260, label: 'Your logo goes here', color: 'var(--dark-ink)' })}</div><ul class="b-lines">${lines}</ul><div class="b-faces2"><p><span class="b-aa2 disp">Aa</span><span class="cap"><b>${A(d.family)}</b>Display, ${d.weights.join(', ')}</span></p><p><span class="b-aa2 b-aa2--body">Aa</span><span class="cap"><b>${A(b.family)}</b>Body, ${b.weights.join(', ')}</span></p></div></div></div>`);
  },

  'contact-scope'(ctx) {
    const B = ctx.brand, p = ctx.pages.find((x) => x.id === 'contact-scope');
    const secs = ctx.sections.map((s) => `<li><span class="num b-sn">${s.n}</span>${A(s.title)}</li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<li><b>${a}.</b> ${c}</li>`).join('');
    // a closing slide: "Who to ask" set huge on Signal, the contents and what is left out on White beside it
    return `<section class="pg pg--std b-x b-cs" data-page="contact-scope"><div class="b-cs__a"><div class="hd"><span>${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span></div><div><h2 class="disp b-cs__h">Who to ask</h2><p class="b-cs__p">${A(B.contact.owner)} owns this document. Write to <span class="b-mono">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p></div><div><h3 class="h3">Version history</h3><table class="b-vt"><tbody><tr><td class="num">${A(B.version.number)}</td><td>${A(ctx.date)}</td><td>First release.</td></tr></tbody></table><span class="fo">${ctx.pageNo('contact-scope')}</span></div></div>
<div class="b-cs__b"><p class="hd b-cs__brand">${A(B.name)} brand guidelines</p><div><h3 class="h3">In this document</h3><ol class="b-in">${secs}</ol></div><div><h3 class="h3">Not in this document</h3><ul class="b-not">${not}</ul></div></div></section>`;
  },
};

export const guidelinesB = own;
