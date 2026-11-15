// Theme 23, Broadsheet, lane u1: the UI kit's foundations (cover, contents, colour, type, spacing, corners and edges, depth).
// The kit is the paper's supplement. Each page is a different part of a newspaper (the supplement front, the index, the stocks listing, a marked proof,
// a rule specimen, an enlarged detail, a picture spread) and the product is set into the columns as a display ad, at its true size.
// Chrome, the ad box and the kit CSS live in lane-u1-kit.js, shared read-only with lanes u2 and u3.
import { A, E, G, N, px, pad3, col, hr, jump, editionLine, fitLogo, measure, measureRole } from './helpers.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { word, Word, mono, ratioText, kitPage, kitHead, kitDeck, adBox, usedBy, kitCss, chromeCss } from './lane-u1-kit.js';

const sc = (ctx) => ctx.brand.ui.screen.content;

export function css(ctx) {
  return `${ctx.kind === 'uikit' ? kitCss(ctx) : ''}
${chromeCss()}
/* lane u1: foundations */
.pg .u1-ins{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;height:36px;align-items:center;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.pg .u1-ins.last{border-bottom:1px solid var(--ink)}
.pg .u1-scr{display:flex;flex-direction:column;gap:24px}
.pg .u1-scr-t{font-family:var(--ff-display);font-size:var(--fs-headline);line-height:var(--lh-headline);font-weight:var(--fw-headline);color:var(--text)}
.pg .u1-scr-t .ph-c,.pg .u1-scr-t .ph-n{white-space:normal!important;overflow-wrap:anywhere}
.pg .u1-btns{display:flex;gap:12px;flex-wrap:wrap}
.pg .u1-cx{border-top:1px solid var(--ink);margin-top:16px}
.pg .u1-cr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:baseline;padding:22px 0;border-bottom:.75px solid var(--hair)}
.pg .u1-cr:last-child{border-bottom:1px solid var(--ink)}
.pg .u1-cr b{font:700 20px/24px 'Sofia Sans',sans-serif;font-variant-numeric:tabular-nums}
.pg .u1-csn{font:700 96px/84px 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums}
.pg .u1-em-b{font:var(--fw-body) var(--fs-body)/var(--lh-body) var(--ff-body);color:var(--text-soft)}

/* colour: the stocks listing */
.pg .u1-th,.pg .u1-tr{display:grid;grid-template-columns:16px 148px 72px minmax(0,1fr) 64px;column-gap:12px;align-items:center;box-sizing:border-box}
.pg .u1-tr{height:36px;border-bottom:.75px solid var(--hair)}
.pg .u1-tr.last{border-bottom:1px solid var(--ink)}
.pg .u1-tw .u1-th,.pg .u1-tw .u1-tr{grid-template-columns:36px 148px 72px minmax(0,1fr) 64px}
.pg .u1-th{height:28px;border-bottom:1px solid var(--ink)}
.pg .u1-keys{display:flex;gap:4px}
.pg .u1-key{display:block;width:16px;height:16px;outline:.75px solid var(--hair);outline-offset:0}
.pg .u1-gh{padding-top:24px;padding-bottom:6px}
.pg .u1-gh + .u1-tr{border-top:1px solid var(--ink)}
.pg .u1-row{display:flex;gap:40px;align-items:flex-start}

/* type: the marked proof */
.pg .u1-ts{white-space:nowrap;color:var(--text)}
.pg .u1-note .c-label{display:block}

/* spacing: the rule specimen */
.pg .u1-bar{position:absolute;display:block;background:var(--ink)}

/* radii and borders: the strip of real parts, four to a row on the grid */
.pg .u1-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:24px;row-gap:32px;align-items:start}
.pg .u1-strip .u1-span2{grid-column:span 2}
.pg .u1-cap{margin-top:8px;font:var(--fw-caption) var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.pg .u1-sp{display:grid;grid-template-columns:232px 104px minmax(0,1fr);column-gap:24px;align-items:center;height:36px;border-bottom:.75px solid var(--hair)}
.pg .u1-sp.last{border-bottom:1px solid var(--ink)}

/* elevation: the picture spread */
.pg .u1-well{display:flex;flex-direction:column;gap:12px}
.pg .u1-well .ui-skeleton{display:block;height:16px}
.pg .u1-ground{display:flex;flex-direction:column;justify-content:center;gap:32px}
.pg .u1-capcol p + p{margin-top:2px}
`;
}

export const uikit = {
  // ---- 001: the supplement front. Ears, then the nameplate row (the logo, and "UI kit" as the section flag), a thick-over-thin rule, the headline and deck,
  // the product as a display ad across three columns, and the Inside list in the fourth ----
  cover: (ctx) => {
    const B = ctx.brand, L = ctx.logo, S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui;
    const ears = E(G.left, 40, 'c-folio c-ink', 'Supplement')
      + E(G.mid - 250, 40, 'c-folio c-quiet', A(editionLine(ctx)), { w: 500, style: 'text-align:center' })
      + E(G.right - 300, 40, 'c-folio c-ink c-right', A(`${ctx.pages.length} pages, ${ctx.sections.length} sections`), { w: 300 })
      + hr(G.left, 72, 1000, 1);
    // the nameplate row, 96 to 288: the logo fitted into 560 x 120 on the left, the section flag on the right, both on one baseline band
    const w = fitLogo(ctx, 'colour', 560, 120), h = w * L.geos.colour.h / L.geos.colour.w;
    const plate = E(G.left, 192 - h / 2, 'nameplate', L.html('colour', { width: w, color: N.ink, label: 'Logo' }), { w, h });
    const flag = E(G.right - 420, 120, 'u1-flag c-ink', 'UI kit', { w: 420 });
    const dbl = hr(G.left, 312, 1000, 3) + hr(G.left, 319, 1000, 1);
    const hd = kitHead(ctx, 'Every part, as the code ships it.', { y: 360, w: 744, max: 64, min: 52 });
    const dk = kitDeck(ctx, B.product, G.left, hd.bottom + 32, 488);
    // below the fold, two display ads to the floor: the week's list in light across three columns, the empty state in dark in the fourth
    const ad = `<div class="u1-scr"><p class="u1-scr-t">${A(B.ui.screen.title)}</p>${ui.deliveryRows(5)}<div class="u1-btns">${ui.btn(F.book)}${X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : ''}</div></div>`;
    const fold = 816, adHtml = adBox(ctx, G.left, fold, 744, ad, { h: G.floor - fold, pad: 48 });
    const em = S.empty || {};
    const dark = adBox(ctx, G.x[3], fold, G.col, `<div class="u1-scr${ctx.placeholders ? ' ph-tight' : ''}"><p class="u1-scr-t">${A(em.title)}</p><p class="u1-em-b">${A(em.body)}</p>${ui.btn(em.cta, { block: true })}</div>`, { h: G.floor - fold, pad: 24, dark: true });
    // Inside: one row per section, with the page it opens on
    const rows = ctx.sections.map((s, i, a) => `<div class="u1-ins${i === a.length - 1 ? ' last' : ''}"><span class="c-note c-ink">${A(s.title)}</span><span class="c-label">${pad3(ctx.pageNo(s.pages[0].id))}</span></div>`).join('');
    const inside = col(G.x[3], 360, G.col, `<p class="c-label c-ink" style="margin-bottom:8px">Inside</p><div style="border-top:1px solid var(--ink)">${rows}</div>${jump(ctx, 'contents', 'Every page')}`, { rule: true });
    return kitPage(ctx, 'cover', ears + plate + flag + dbl + hd.html + dk.html + adHtml + dark + inside, { folio: false });
  },

  // ---- 002: the index. The count as the headline, then the four sections across the four columns, each a ruled list of pages with their numbers ----
  contents: (ctx) => {
    const secs = ctx.sections, total = ctx.pages.length;
    const hd = kitHead(ctx, `${Word(total)} pages in ${word(secs.length)} sections.`, { max: 96, min: 64, cls: 'b-headxl' });
    const y = Math.max(hd.bottom + 96, 400);
    let body = '';
    secs.slice(0, 4).forEach((s, i) => {
      const list = s.pages.map((p) => `<div class="u1-cr"><span class="c-note c-ink">${A(p.title)}</span><b>${pad3(p.no)}</b></div>`).join('');
      body += col(G.x[i], y, G.col, `<p class="u1-csn c-ink">${pad3(s.pages[0].no)}</p><p class="u1-sh c-ink" style="margin-top:16px">${A(s.title)}</p><div class="u1-cx">${list}</div>`, { rule: i > 0 });
    });
    const foot = col(G.left, G.floor - 92, 488, `<i class="tp-rule"></i><p class="c-cap c-quiet">Every component on these pages is drawn by the code package, at its true size, on the surface it ships on.</p>${jump(ctx, 'code', 'The code')}`);
    return kitPage(ctx, 'contents', hd.html + body + foot);
  },

  // ---- 003: the light product as an ad in the first two columns; the roles as a stocks listing in the last two ----
  'colour-light': (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, gs = roleGroups(), n = gs.reduce((a, g) => a + g[1].length, 0);
    const hd = kitHead(ctx, `${Word(n)} colour roles, each measured against its partner.`, { max: 64, min: 48 });
    const y0 = hd.bottom + 56;
    const ad = `<div class="u1-scr"><p class="u1-scr-t">${A(ctx.brand.ui.screen.title)}</p>${ui.deliveryRows(3)}${S.alert ? ui.alert('warning', S.alert) : ''}<div class="u1-btns">${ui.btn(F.book)}${X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : ''}</div></div>`;
    const table = col(G.x[2], y0, 488, listing(ctx, 'light', gs) + actionNote(ctx, 'light'), { rule: true });
    return kitPage(ctx, 'colour-light', hd.html + adBox(ctx, G.left, y0, 488, ad, { pad: 32 }) + table);
  },

  // ---- 004: the night edition. The dark product across the full measure, then the listing in two halves with both keys, light then dark ----
  'colour-dark': (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, gs = roleGroups(), n = gs.reduce((a, g) => a + g[1].length, 0);
    const hd = kitHead(ctx, `The same ${word(n)} roles, on the dark ground.`, { max: 64, min: 48 });
    const y0 = hd.bottom + 56, h = 376;
    const ad = `<div class="u1-row"><div class="u1-scr" style="width:376px;flex:none"><p class="u1-scr-t">${A(ctx.brand.ui.screen.title)}</p><p class="u1-em-b">${A(S.pickup)}</p><div class="u1-btns">${ui.btn(F.book)}${X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : ''}</div></div><div style="flex:1;min-width:0">${ui.deliveryRows(4)}</div></div>`;
    const y1 = y0 + h + 56;
    const left = col(G.left, y1, 488, listing(ctx, 'dark', gs.slice(0, 2), { both: true }), { cls: 'u1-tw' });
    const right = col(G.x[2], y1, 488, listing(ctx, 'dark', gs.slice(2), { both: true }) + actionNote(ctx, 'dark'), { rule: true, cls: 'u1-tw' });
    return kitPage(ctx, 'colour-dark', hd.html + adBox(ctx, G.left, y0, 1000, ad, { h, pad: 40, dark: true }) + left + right);
  },

  // ---- 005: a marked proof. Each step of the scale set at its true size, in the brand's own copy, with a leader out to the margin note ----
  'type-scale': (ctx) => {
    const S = sc(ctx), F = S.form || {}, D = S.dialog || {}, Em = S.empty || {}, B = ctx.brand;
    const sample = { headline: Em.title, title: B.ui.screen.title, 'title-s': D.title, body: S.pickup, control: F.book, label: F.pickup, caption: F.notesHelp };
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size), sizes = steps.map((t) => t.size);
    const hd = kitHead(ctx, `${Word(steps.length)} sizes, from ${Math.min(...sizes)} to ${Math.max(...sizes)} px.`, { max: 64, min: 48 });
    const y0 = hd.bottom + 64, aw = 744, pad = 40;
    // the proof runs to the foot of the page: the space between steps is what is left, shared out, between 28 and 80 px
    const rowsH = steps.reduce((a, t) => a + Math.max(t.token === 'control' ? 44 : t.line, 88), 0);
    const pitchGap = Math.round(Math.max(28, Math.min(80, (G.floor - 56 - y0 - 2 * pad - rowsH) / (steps.length - 1))));
    let y = pad, inner = '', notes = '', leaders = '';
    steps.forEach((t) => {
      const disp = t.face === 'display', fam = disp ? B.fonts.display.family : B.fonts.body.family;
      const wOf = (s) => (disp ? measure(ctx, s, t.size) : measureRole(ctx, 'body', s, t.size, t.weight));
      let text = sample[t.token] || t.use;
      if (wOf(text) > aw - 2 * pad - 64) text = t.use;
      const btn = t.token === 'control', h = btn ? 44 : t.line, sw = btn ? wOf(text) + 42 : wOf(text);
      const style = `font-family:var(--ff-${disp ? 'display' : 'body'});font-size:var(--fs-${t.token});line-height:var(--lh-${t.token});font-weight:var(--fw-${t.token})`;
      inner += btn ? `<div class="a" style="left:${pad}px;top:${y}px">${ctx.ui.btn(text)}</div>` : `<p class="a u1-ts" style="left:${pad}px;top:${y}px;${style}">${A(text)}</p>`;
      const mid = Math.round(y0 + y + h / 2), lx = G.left + pad + sw + 16;
      leaders += hr(lx, mid, G.x[3] - 12 - lx, 1, 'ink');
      notes += E(G.x[3], mid - 11, 'u1-note', `<span class="c-label c-ink">${A(t.token)}</span><span class="u1-m c-ink">${t.size}/${t.line}, ${t.weight}</span><p class="c-cap c-quiet">${A(fam)}. ${A(t.use)}</p>`, { w: G.col });
      y += Math.max(h, 88) + pitchGap;
    });
    const ah = y - pitchGap + pad;
    const foot = E(G.left, y0 + ah + 16, 'c-cap c-quiet', `Each line is set in its step's own tokens, ${mono('--fs-')}, ${mono('--lh-')} and ${mono('--fw-')} with the step's name.`, { w: aw });
    return kitPage(ctx, 'type-scale', hd.html + adBox(ctx, G.left, y0, aw, inner, { h: ah, pad: 0 }) + leaders + notes + foot);
  },

  // ---- 006: a printer's rule specimen. One row per step, the bar drawn at the step's own thickness; the components that read it, where any do ----
  spacing: (ctx) => {
    const sp = ctx.space, base = ctx.brand.ui.spacingBase;
    const hd = kitHead(ctx, `${Word(sp.length)} steps on a ${base} px base.`, { max: 64, min: 48 });
    let y = hd.bottom + 72, body = E(G.left, y, 'c-folio c-quiet', 'Token') + E(G.left + 160, y, 'c-folio c-quiet', 'Step')
      + E(G.x[1], y, 'c-folio c-quiet', 'Drawn at its own thickness') + E(G.x[3], y, 'c-folio c-quiet', 'Read by') + hr(G.left, y + 28, 1000, 1);
    y += 56;
    // the rows share the page down to the floor: the space under each bar is what is left, between 44 and 96 px
    const gap = Math.round(Math.max(44, Math.min(96, (G.floor - 40 - y - sp.reduce((a, s) => a + Math.max(s.px, 22), 0)) / sp.length)));
    sp.forEach((s) => {
      const tok = s.token.replace('space-', 'sp-'), uses = usedBy(ctx, tok);
      body += E(G.left, y, 'u1-m c-ink', A(`--${tok}`)) + E(G.left + 160, y, 'u1-m c-quiet', A(`${s.px} px`))
        + `<i class="u1-bar" style="left:${px(G.x[1])};top:${px(y + 4)};width:${px(G.span(1, 2))};height:${px(s.px)}"></i>`
        + (uses.length ? E(G.x[3], y, 'c-cap c-ink', uses.map(mono).join(' '), { w: G.col }) : '');
      y += Math.max(s.px, 22) + gap;
    });
    body += hr(G.left, y - gap + 24, 1000, 1);
    return kitPage(ctx, 'spacing', hd.html + body);
  },

  // ---- 007: the detail, enlarged. Two corners at ten times their size, drawn from the tokens; then the parts at 1:1; then the spec table ----
  'radii-borders': (ctx) => {
    const S = sc(ctx), F = S.form || {}, X = S.example || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), g = tokenGroups(ctx);
    const rIn = ctx.radius.input, rk = ctx.radius.card, bw = ctx.brand.ui.border, hair = ctx.borders[0].px, k = 10;
    const head = rIn === 0 && rk === 0 ? `Square corners, ${bw} px edges.` : rIn === rk ? `Corners of ${rIn} px, edges of ${bw} px.` : `Corners of ${rIn} and ${rk} px, edges of ${bw} px.`;
    const hd = kitHead(ctx, head, { max: 64, min: 48 });
    const y0 = hd.bottom + 56, ph = 296;
    const corner = (x, r, e, edge, name, vals) => {
      const R = r * k, E2 = e * k, bx = 72, by = 64, big = 1200;
      const rr = (x0, y0_, w, h, rad) => `M${x0 + rad} ${y0_}H${x0 + w}V${y0_ + h}H${x0}V${y0_ + rad}${rad ? `A${rad} ${rad} 0 0 1 ${x0 + rad} ${y0_}` : ''}Z`;
      const svg = `<svg class="a" aria-hidden="true" style="left:${px(x)};top:${px(y0)};overflow:hidden" width="488" height="${ph}" viewBox="0 0 488 ${ph}">`
        + `<path fill="${M.surface}" d="${rr(bx, by, big, big, R)}"/><path fill="${edge}" fill-rule="evenodd" d="${rr(bx, by, big, big, R)} ${rr(bx + E2, by + E2, big, big, Math.max(0, R - E2))}"/>`
        + `<g fill="${N.ink}">${R ? `<rect x="${bx}" y="${by - 24}" width="${R}" height="1"/><rect x="${bx}" y="${by - 30}" width="1" height="13"/><rect x="${bx + R - 1}" y="${by - 30}" width="1" height="13"/>` : ''}`
        + `<rect x="${bx - 24}" y="${by + Math.max(R, 24) + 24}" width="1" height="${E2}"/><rect x="${bx - 30}" y="${by + Math.max(R, 24) + 24}" width="13" height="1"/><rect x="${bx - 30}" y="${by + Math.max(R, 24) + 23 + E2}" width="13" height="1"/></g></svg>`;
      return svg + E(x, y0 + ph + 12, '', `<p class="c-label c-ink">${A(name)}</p><p class="c-cap c-quiet">${vals.map(mono).join(', ')}</p>`, { w: 488 });
    };
    const corners = corner(G.left, rIn, bw, M.edge, `An input's corner, ${word(k)} times its size`, [`--r-input ${rIn}px`, `--w-control ${bw}px`])
      + corner(G.x[2], rk, hair, M.divider, `A card's corner, ${word(k)} times its size`, [`--r-card ${rk}px`, `--w-hairline ${hair}px`]);
    const cap = (vals) => `<p class="u1-cap">${vals.join(', ')}</p>`;
    const strip = `<div class="u1-strip">`
      + `<div>${ui.btn(F.book)}${cap([`--r-button ${ctx.radius.button}px`])}</div>`
      + `<div>${X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : ''}${cap([`--w-control ${bw}px`])}</div>`
      + `<div>${ui.switch((X.switches || [])[0] || F.notes, { checked: true })}${cap(['--r-round'])}</div>`
      + `<div><span class="ui-avatar">${A(S.initials)}</span>${cap(['--r-round'])}</div>`
      + `<div>${ui.field({ id: 'u1-rb1', label: F.pickup, value: F.pickupValue })}${cap([`--r-input ${rIn}px`])}</div>`
      + `<div>${ui.field({ id: 'u1-rb2', label: F.dropoff, value: F.dropoffValue, state: 'focus' })}${cap([`--w-focus ${ctx.borders[2].px}px`])}</div>`
      + `<div class="u1-span2">${ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote })}${cap([`--r-card ${rk}px`])}</div></div>`;
    const y1 = y0 + ph + 12 + 44 + 48;
    // the spec table hangs from the floor: every radius and width token, its value, and the components that read it
    const rows = [...Object.entries(g.radius), ...Object.entries(g.width)];
    const ty = G.floor - rows.length * 36 - 28;
    const table = E(G.left, ty, '', `<div class="u1-sp" style="height:28px;border-bottom:1px solid var(--ink)"><span class="c-folio c-quiet">Token</span><span class="c-folio c-quiet">Value</span><span class="c-folio c-quiet">Read by</span></div>`
      + rows.map(([t, v], i) => `<div class="u1-sp${i === rows.length - 1 ? ' last' : ''}"><span class="u1-m c-ink">--${A(t)}</span><span class="u1-m c-ink">${A(v)}</span><span class="c-cap c-quiet nw" style="overflow:hidden">${usedBy(ctx, t).slice(0, 5).map(mono).join(' ')}</span></div>`).join(''), { w: 1000 });
    return kitPage(ctx, 'radii-borders', hd.html + corners + adBox(ctx, G.left, y1, 1000, strip, { pad: 32 }) + table);
  },

  // ---- 008: the picture spread. Grounds stepping down on the left, a dialog on its scrim on the right, and four captions under the picture ----
  elevation: (ctx) => {
    const S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, B = ctx.brand, M = colourMap(ctx, 'light'), shadow = tokenGroups(ctx).shadow['shadow-float'];
    const hd = kitHead(ctx, shadow === 'none' ? 'Depth comes from grounds and edges.' : 'Depth comes from grounds, edges and one shadow.', { max: 64, min: 48 });
    const dk = B.ui.elevationNote ? kitDeck(ctx, B.ui.elevationNote, G.left, hd.bottom + 32, 744) : { html: '', h: 0 };
    // the picture runs down to leave the captions their four lines above the floor
    const y0 = hd.bottom + 32 + dk.h + 56, h = Math.min(800, G.floor - 136 - y0);
    const dlg = ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'u1-dlg');
    const ground = `<div class="u1-ground" style="position:absolute;left:40px;top:0;bottom:0;width:440px">`
      + `<div class="u1-well">${ui.skeleton('60%')}${ui.skeleton('85%')}${ui.skeleton('40%')}</div>`
      + ui.card({ meta: S.status, title: S.rider, text: S.riderNote })
      + ui.card({ meta: S.paidLabel, title: S.paid, text: S.pickup, raised: true }) + '</div>';
    const scrim = `<div class="ui-scrim" style="position:absolute;right:0;top:0;bottom:0;width:480px">${dlg}</div>`;
    const ad = adBox(ctx, G.left, y0, 1000, ground + scrim, { h, pad: 0 });
    // the captions: what each layer is made of, in the tokens it reads
    const capCol = (x, name, rows) => col(x, y0 + h + 24, G.col, `<p class="c-label c-ink">${A(name)}</p>${rows.map((r) => `<p class="c-cap c-ink">${r}</p>`).join('')}`, { rule: x !== G.left });
    const L = (hex) => ctx.C.toOklch(hex).L.toFixed(2);
    const caps = capCol(G.left, 'Ground steps', ['surface', 'raised', 'sunken'].map((t) => `${mono('--' + t)} ${mono(M[t])}`).concat(`<span class="c-quiet">Lightness ${['surface', 'raised', 'sunken'].map((t) => L(M[t])).join(', ')}</span>`))
      + capCol(G.x[1], 'Hairline', [`${mono('--w-hairline')} ${mono(`${ctx.borders[0].px}px`)}`, `${mono('--divider')} ${mono(M.divider)}`, `<span class="c-quiet">${A(ctx.borders[0].use)}</span>`])
      + capCol(G.x[2], 'Edge', [`${mono('--w-control')} ${mono(`${B.ui.border}px`)}`, `${mono('--edge')} ${mono(M.edge)}`, `<span class="c-quiet">${A(ctx.borders[1].use)}</span>`])
      + capCol(G.x[3], 'Shadow', [`${mono('--shadow-float')}`, shadow === 'none' ? mono('none') : `<span class="u1-m" style="white-space:normal">${A(shadow)}</span>`, `<span class="c-quiet">Read by</span> ${usedBy(ctx, 'shadow-float').map(mono).join(' ')}`]);
    return kitPage(ctx, 'elevation', hd.html + dk.html + ad + caps);
  },
};

// ---- colour: the role groups, the listing and the note on the action fill ----
// [title, [[token, the token it is measured against]]]; a ground is measured with the text on it, a line and a text against the ground under it
function roleGroups() {
  return [
    ['Grounds, with the text on each', [['surface', 'text'], ['raised', 'text'], ['sunken', 'text'], ['disabled-bg', 'disabled-text'], ['scrim', null]]],
    ['Text, on its ground', [['text', 'surface'], ['text-soft', 'surface'], ['quiet', 'surface'], ['quiet-sunken', 'sunken'], ['disabled-text', 'disabled-bg']]],
    ['Action, with its label', [['action', 'action-label'], ['action-hover', 'action-label'], ['action-pressed', 'action-label'], ['action-label', 'action']]],
    ['Lines, on the surface', [['edge', 'surface'], ['divider', 'surface'], ['focus', 'surface']]],
    ['Status, on its tint', ['success', 'warning', 'danger', 'info'].map((t) => [t, `${t}-bg`])],
  ];
}
function listing(ctx, mode, gs, { both = false } = {}) {
  const M = colourMap(ctx, mode), Lt = colourMap(ctx, 'light');
  const key = (tok) => (both ? `<span class="u1-keys"><i class="u1-key" style="background:${Lt[tok]}"></i><i class="u1-key" style="background:${M[tok]}"></i></span>` : `<i class="u1-key" style="background:${M[tok]}"></i>`);
  const head = `<div class="u1-th c-folio c-quiet"><span></span><span>Token</span><span>Hex</span><span>Against</span><span class="c-right">Ratio</span></div>`;
  return head + gs.map(([t, rows]) => `<p class="c-label c-ink u1-gh">${A(t)}</p>` + rows.map(([tok, on], i) => `<div class="u1-tr${i === rows.length - 1 ? ' last' : ''}">${key(tok)}<span class="u1-m c-ink">--${tok}</span><span class="u1-m c-ink">${A(M[tok].toUpperCase())}</span><span class="c-cap c-quiet">${on ? A(on.replace(/-/g, ' ')) : ''}</span><span class="u1-m c-ink c-right">${on ? ratioText(ctx, M[tok], M[on]) : ''}</span></div>`).join('')).join('');
}
function actionNote(ctx, mode) {
  const M = colourMap(ctx, mode), R = ctx.roles[mode], r = ctx.ratio(M.action, M.surface);
  let t = `The action fill measures ${ctx.fmt(r)}:1 against the surface. A control needs 3:1 to be seen.`;
  if (r < 3) t += R.actionEdge ? ' Below that, the button carries an edge that passes.' : ` Below that, the fill is exempt: its label, at ${ratioText(ctx, M['action-label'], M.action)}, names the button.`;
  return `<p class="c-cap c-quiet" style="margin-top:16px">${A(t)}</p>`;
}
