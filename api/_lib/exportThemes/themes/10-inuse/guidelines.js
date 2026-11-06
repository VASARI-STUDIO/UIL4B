// Guidelines pages for theme 10: cover, contents, logo-versions, contrast, business-card here; the rest in guidelines-a.js and guidelines-b.js.
// Distinct pass (run G): the product on phones with numbered notes beside what they point at. Styles are in index.js (classes start g-).
import { A, ratioText, nameOf, fit, std, mk, phoneToday, wordsHex } from './helpers.js';
import { guidelinesA } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const px = (n) => +n.toFixed(1);
// a phone authored at 360 x 740 (or w x h) and shown at scale k; the ring sits on the wrapper so it stays one pixel
const sp = (k, inner, { w = 360, h = 740, st = "", cls = "", extra = "", ist = "" } = {}) => `<div class="g-sp ${cls}" style="width:${px(w * k)}px;height:${px(h * k)}px;--r:${px(28 * k)}px;${st}"><div class="ph g-spi" aria-hidden="true" style="width:${w}px;height:${h}px;transform:scale(${k});${ist}">${inner}</div>${extra}</div>`;
// a note on a scaled phone: the ratio, a numbered disc, and a rule back to the part it names (in = distance from the phone edge to the part, in page px)
const tag = (n, label, y, side, inset) => `<span class="g-tag g-tag--${side}" style="top:${px(y - 12)}px;--in:${Math.round(inset)}px">${side === 'l' ? `<em class="num">${label}</em>${mk(n)}<i></i>` : `<i></i>${mk(n)}<em class="num">${label}</em>`}</span>`;
// a bare disc laid on a scaled phone at a page position
const pin = (n, x, y) => `<span class="mk g-pin" style="left:${px(x - 12)}px;top:${px(y - 12)}px">${n}</span>`;
const e = (st, inner, cls = '') => `<div class="g-e ${cls}" style="${st}">${inner}</div>`;

const own = {
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot';
    const name = slot ? `<div class="slot-corner">${ctx.logo.html('colour', { width: 300, color: ctx.roles.light.text, label: 'Your logo goes here' })}</div>` : `<div class="name">${ctx.logo.html('colour', { width: 330 })}</div>`;
    // the Today screen whole, on the Float stripe; one numbered note on its status bar
    return `<section class="pg pg--cover" data-page="cover"><div class="stripe"></div>
<div class="top"><span>${A(B.name)} brand guidelines</span><span class="num">Version ${A(B.version.number)}</span></div>${name}
<p class="sub">${A(B.lines.primary)}</p>
${phoneToday(ctx, 'left:378px;top:320px')}
<p class="g-cvn cap"><b>Today, ${A(B.ui.screen.content.time)} pm</b>${A(B.audience)}</p>${mk(1, 'position:absolute;left:330px;top:330px')}<i class="g-cvl"></i>
<p class="ver">${A(B.city)}<br>${A(ctx.date)}</p></section>`;
  },

  // two list screens: the nine sections as rows, each section number a disc, the page number where a price would be
  contents(ctx) {
    const S = ctx.brand.ui.screen.content;
    const row = (s) => `<li><span class="mk">${s.n}</span><div><span class="t">${A(s.title)}</span><span class="s">${s.pages.map((p) => A(p.title)).join(', ')}</span></div><span class="p">${s.pages[0].no}</span></li>`;
    const half = Math.ceil(ctx.sections.length / 2);
    const scr = (list, left, top) => `<div class="ph g-cp" style="left:${left}px;top:${top}px"><div class="sb">${A(S.time)}</div><ol>${list.map(row).join('')}</ol></div>`;
    const inner = `<div class="stripe"></div><div class="g-cw">${scr(ctx.sections.slice(0, half), 0, 0)}${scr(ctx.sections.slice(half), 346, 52)}</div>`;
    return std(ctx, 'contents', 'Contents', inner, 'pg--contents');
  },

  // the seven versions where they are used: three phones, four phone tops, each with its number and its note
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways, S = B.ui.screen.content, surface = ctx.roles.light.surface.toLowerCase();
    const logo = (id, w, st, o = {}) => `<div class="g-ab" style="${st}">${L.html(id, { width: w, color: cw[o.colourway || L.colourwayOf(id)].name, label: o.label || 'Logo', ...(o.colourway ? { colourway: o.colourway } : {}) })}</div>`;
    const ht = (id, w) => (w * L.geos[id].h) / L.geos[id].w;
    const note = (id, n, w) => `<p class="g-vn" style="width:${w}px">${mk(n)}<span><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</span></p>`;
    const k = 0.58, W1 = Math.round(360 * k);
    // 1 colour on a Chalk splash screen
    const w1 = fit(ctx, 'colour', 240, 110), h1 = ht('colour', w1);
    const p1 = sp(k, `<div class="sb">${A(S.time)}</div>${logo('colour', w1, `left:${(360 - w1) / 2}px;top:${370 - h1 / 2}px`, { label: 'Your logo goes here' })}`, { extra: pin(1, ((360 - w1) / 2) * k - 20, 370 * k) });
    // 3 mono light over a photo, darkened flat
    const w3 = fit(ctx, 'mono-light', 240, 110), h3 = ht('mono-light', w3);
    const p3 = sp(k, `${ctx.photo('pool-door', { slotNote: false, cls: 'g-fill' })}<i class="g-scrim"></i><div class="sb" style="color:${cw['mono-light'].name};position:relative">${A(S.time)}</div>${logo('mono-light', w3, `left:${(360 - w3) / 2}px;top:${370 - h3 / 2}px`)}`, { extra: pin(3, ((360 - w3) / 2) * k - 20, 370 * k) });
    // 7 the symbol as an app icon on a home screen with the Float wallpaper
    const sym = cw[L.colourwayOf('symbol')], icon = (i) => (i === 5
      ? `<span class="g-ic g-ic--app" style="background:${sym.ground}">${L.html('symbol', { width: fit(ctx, 'symbol', 36, 40), color: sym.name, label: 'Logo' })}</span>`
      : '<span class="g-ic"></span>');
    const grid = Array.from({ length: 20 }, (_, i) => `<div class="g-hi">${icon(i)}${i === 5 ? `<span class="g-hl">${A(B.logo.showcase.wordmark)}</span>` : ''}</div>`).join('');
    const colX = 24 + (64 + (312 - 256) / 3), iconTop = 84 + 1 * 104;
    const p7 = sp(k, `<div class="sb">${A(S.time)}</div><div class="g-home">${grid}</div>`, { st: 'background:var(--float)', extra: pin(7, (colX + 64) * k, iconTop * k) });
    // 2, 4, 5, 6: phone tops
    const k2 = 160 / 360, H2 = 330, tops = [];
    const top = (inner, st = '', extra = '') => sp(k2, inner, { h: H2, st: `border-radius:${px(28 * k2)}px ${px(28 * k2)}px 0 0;${st.replace(/box-shadow[^;]*;?/, '')}`, ist: st.split(';')[0], cls: 'g-top', extra });
    const w2 = fit(ctx, 'mono-dark', 220, 100), h2 = ht('mono-dark', w2);
    tops.push([2, 'mono-dark', top(`<div class="sb">${A(S.time)}</div>${logo('mono-dark', w2, `left:${(360 - w2) / 2}px;top:${190 - h2 / 2}px`)}`, `background:${cw['mono-dark'].ground};box-shadow:0 0 0 1px var(--hair)`, pin(2, ((360 - w2) / 2) * k2 - 14, 190 * k2))]);
    const w4 = fit(ctx, 'reversed', 220, 100), h4 = ht('reversed', w4);
    tops.push([4, 'reversed', top(`<div class="sb" style="color:${cw.reversed.name}">${A(S.time)}</div>${logo('reversed', w4, `left:${(360 - w4) / 2}px;top:${190 - h4 / 2}px`)}`, `background:${cw.reversed.ground}`, pin(4, ((360 - w4) / 2) * k2 - 14, 190 * k2))]);
    const w5 = fit(ctx, 'horizontal', 190, 50), h5 = ht('horizontal', w5);
    tops.push([5, 'horizontal', top(`<div class="sb">${A(S.time)}</div><div class="g-hdr">${logo('horizontal', w5, `position:relative;left:0;top:0`)}</div><div class="g-hscr"><span class="chip" style="color:${wordsHex(ctx, ctx.status[0])}">${A(ctx.status[0].label)}</span><div class="disp s30">${A(S.eta)}</div></div>`, '', pin(5, 20 * k2 + w5 * k2 + 12, (44 + 32) * k2))]);
    const w6 = fit(ctx, 'stacked', 96, 96), h6 = ht('stacked', w6), box = 150;
    tops.push([6, 'stacked', top(`<div class="sb">${A(S.time)}</div><div class="g-prof" style="width:${box}px;height:${box}px;background:${cw['on-float'].ground}">${logo('stacked', w6, `position:relative`, { colourway: 'on-float' })}</div><p class="g-pn">${A(S.rider.split(',')[0])}</p>`, '', pin(6, ((360 - box) / 2) * k2 - 14, (60 + box / 2) * k2))]);
    const r1 = `<div class="g-vrow g-vrow--3">${[[1, 'colour', p1], [3, 'mono-light', p3], [7, 'symbol', p7]].map(([n, id, p]) => `<div class="g-vc">${p}${note(id, n, W1)}</div>`).join('')}</div>`;
    const r2 = `<div class="g-vrow g-vrow--4">${tops.map(([n, id, p]) => `<div class="g-vc">${p}${note(id, n, 160)}</div>`).join('')}</div>`;
    return std(ctx, 'logo-versions', 'Logo versions', `<p class="b-lead" style="margin-top:8px">There are seven versions. Pick by the ground and the space, and use the colour one when both allow.</p>${r1}${r2}`);
  },

  // the real screens with each pair's ratio noted where it appears, a numbered key under them, and the pairs that never carry text
  contrast(ctx) {
    const S = ctx.brand.ui.screen.content, X = S.example, surface = ctx.roles.light.surface.toLowerCase();
    const k = 0.56, kk = (n) => Math.round(n * k);
    const P = (fg, bg) => ctx.pairs.find((p) => p.fg === fg && p.bg === bg);
    const orderA = [['deep-end', 'chalk'], ['soft', 'chalk'], ['deep-end', 'float'], ['deep-end', 'white'], ['quiet', 'white'], ['quiet', 'chalk'], ['white', 'lane']];
    const orderB = [['lane', 'white'], ['lane', 'chalk'], ['white', 'hover'], ['chalk', 'deep-end'], ['float', 'deep-end']];
    const order = [...orderA, ...orderB].map(([f, b]) => P(f, b)).filter(Boolean);  // a brand with fewer pairs leaves the tags past its last pair off
    const rest = ctx.pairs.filter((p) => !order.includes(p)); order.push(...rest);
    const r = (i) => ratioText(order[i].ratioText);
    const lanes = [84, 150, 216, 282].map((x) => `<i class="lane" style="left:${x}px"></i>`).join('');
    const rowOf = (d) => `<b>${A(d.to)}</b><span>${A(d.when)}</span>`;
    // phone A: Today. Part = [top, height] in phone pixels; the tag sits at the middle of it.
    const a = { t: [56, 32], p: [112, 48], chip: [250, 28], nm: [340, 72], nt: [412, 72], cap: [502, 18], btn: [640, 48] };
    const mid = ([t, h]) => t + h / 2;
    const A1 = `<div class="sb">${A(S.time)}</div>
${e('left:20px;top:56px;width:320px;font-size:30px;line-height:32px', A(S.eta), 'disp')}
${e('left:20px;top:112px;width:320px;font:400 15px/24px var(--body);color:var(--soft)', A(S.pickup))}
<div class="pool g-e" style="left:20px;top:184px;width:320px;height:140px">${lanes}<span class="fl" style="left:146px;top:52px">${A(S.to)}</span></div>
<div class="g-e g-card" style="left:20px;top:340px;width:320px;height:144px"><div class="g-c1"><span class="av">${A(S.initials)}</span><b>${A(S.rider.split(',')[0])}</b></div><div class="g-c2">${A(S.riderNote)}</div></div>
${e('left:20px;top:502px;font:400 12px/18px var(--body);color:var(--quiet)', A(S.deliverTo))}
${e('left:20px;top:640px;width:320px;height:48px', A(S.form.book), 'g-btn')}`;
    const lt = (n, y, inset) => (n > order.length ? '' : tag(n, r(n - 1), y * k, 'l', inset));
    const tagsA = lt(1, mid(a.t), kk(20)) + lt(2, mid(a.p), kk(20)) + lt(3, 184 + 52 + 14, kk(166)) + lt(4, mid(a.nm), kk(88)) + lt(5, mid(a.nt), kk(36)) + lt(6, mid(a.cap), kk(20)) + lt(7, mid(a.btn), kk(20));
    // phone B: lessons
    const [d0, d1] = S.deliveries;
    const B1 = `<div class="sb">${A(S.time)}</div>
<div class="g-e g-card" style="left:20px;top:60px;width:320px;height:148px"><div class="g-c3">${rowOf(d0)}</div><div class="g-c4"><span class="g-lk">${A(X.secondary)}</span></div></div>
<div class="g-e g-card" style="left:20px;top:224px;width:320px;height:88px"><div class="g-c3">${rowOf(d1)}</div></div>
<div class="g-e g-lks" style="left:20px;top:336px;width:320px;height:32px">${X.links.map(([t]) => `<span class="g-lk">${A(t)}</span>`).join('')}</div>
${e('left:20px;top:404px;width:320px;height:48px', A(S.form.book), 'g-btn g-btn--h')}
<div class="g-e g-toast" style="left:12px;top:600px;width:336px;height:100px"><span>${A(S.toast)}</span><span class="g-ta">Undo</span></div>`;
    const rt = (n, y, inset) => (n > order.length ? '' : tag(n, r(n - 1), y * k, 'r', inset));
    const tagsB = rt(8, 60 + 88 + 30, kk(16)) + rt(9, 352, kk(20)) + rt(10, 428, kk(20)) + rt(11, 628, kk(12)) + rt(12, 672, kk(12));
    const pw = Math.round(360 * k), left = 104;
    const fig = `<div class="g-cf" style="height:${Math.round(740 * k)}px">${sp(k, A1, { st: `left:${left}px;top:0;position:absolute`, extra: tagsA })}${sp(k, B1, { st: `left:${682 - left - pw}px;top:0;position:absolute`, extra: tagsB })}</div>`;
    const key = `<ol class="g-ckey">${order.map((p, i) => `<li>${mk(i + 1)}<div><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b><span>${A(p.use)}. ${p.large ? 'From 24 px up' : 'Any size'}</span></div><span class="r num">${ratioText(p.ratioText)}</span></li>`).join('')}</ol>`;
    const nu = ctx.unusedPairs.map((p) => `<span class="cap"><i style="background:${p.bgHex}"><b style="background:${p.fgHex}"></b></i>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}, ${ratioText(p.ratioText)}</span>`).join('');
    return std(ctx, 'contrast', 'Contrast', `<p class="b-lead" style="margin-top:8px;max-width:680px">Every text pair ${A(ctx.brand.name)} sets, with its ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1.</p>${fig}${key}<h2 class="h3">Not used for text</h2><p class="cap">${ctx.unusedPairs.length} pairs fall under 4.5 : 1, so none of them carries text.</p><div class="nu">${nu}</div>`);
  },

  // the front on a full-width Float stripe, the back on Chalk; each marker sits level with its part, the note beside it
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, cw = B.logo.colourways;
    const front = `<div class="card card--front"><div class="lg">${L.html('reversed', { width: fit(ctx, 'reversed', 220, 90), color: cw.reversed.name, label: 'Your logo goes here' })}</div><span class="ln">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="card card--back"><div class="mkr">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 44), label: 'Logo' })}</div><div class="who"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    const lv = (n, y) => `<span class="mk g-lv" style="top:${px(y - 12)}px">${n}</span>`;
    const notes = (items) => `<ol class="g-bn">${items.map(([t, d], i) => `<li>${mk(i + 1)}<div><b>${A(t)}</b>${A(d)}</div></li>`).join('')}</ol>`;
    const body = `<p class="cap" style="margin-top:8px">Printed 90 × 55 mm, shown at 4.5 px to the millimetre.</p>
<div class="g-bc g-bc--f"><div class="g-cd">${front}${lv(1, 123.75)}${lv(2, 214)}</div>${notes([['The reversed logo', B.logo.when.reversed], ['The line', B.lines.primary]])}</div>
<div class="g-bc"><div class="g-cd">${back}${lv(1, 48)}${lv(2, 143)}${lv(3, 188)}</div>${notes([['The symbol', B.logo.when.symbol], ['Name and role', c.person + ', ' + c.role], ['Contact', c.contact + ' and ' + B.applications.site.url]])}</div>`;
    return std(ctx, 'business-card', 'Business card', body);
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
