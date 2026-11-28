// Theme 33, Flyleaf: the brand guidelines pages (the `slides` row, 16:9; a page is flow layout, so it also holds at A4). Each page is (ctx) => html.
// The pages the engine's photographic scenes would fill (application, digital) draw a clean flat panel instead; a photograph or a mockup is not part of this
// theme. Copy comes from the brand and reaches the page through esc(), so the slot edition shows its placeholder boxes.
import { colourFacts, typeLadder, contrastFacts, logoFacts, fontName, roleLabel, WEIGHT_NAMES } from '../../engine/styleguide.js';
import { page, palette, brandOrder, NAMES, pct, field } from './helpers.js';

const frame = (ctx, id, body, title = NAMES[id]) => page(ctx, id, { title, section: 'Brand guidelines', body, order: brandOrder });
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const text = (ctx, v) => (v ? `<div class="fl-copy">${ctx.esc(v)}</div>` : '');
// a flat colour panel (where a photograph would sit): the ink on it is measured
const flat = (P, bg, inner, cls = '') => `<div class="fl-flat ${cls}" style="background:${bg};color:${P.on(bg)}">${inner}</div>`;

export const guidelines = {
  cover(ctx) {
    const B = ctx.brand, colours = colourFacts(ctx);
    const strip = colours.map((c) => `<span style="flex:${Math.max(c.share, 0.04)};background:${c.hex}"></span>`).join('');
    const body = `<div class="fl-cover"><div class="fl-big disp">${ctx.esc(B.name)}</div>${text(ctx, get(B, 'lines.primary'))}
<div class="fl-meta">${ctx.esc(B.city)}</div></div><div class="fl-strip" role="img" aria-label="Palette by share">${strip}</div>`;
    return frame(ctx, 'cover', body, 'Brand guidelines');
  },

  application(ctx) {
    const B = ctx.brand, P = palette(ctx), A = B.applications || {}, card = A.card || {}, c = colourFacts(ctx);
    const lead = c[0] || { hex: P.ground }, second = c[1] || lead;
    const social = (A.social || []).slice(0, 3).map((s, i) => flat(P, (c[i + 1] || lead).hex, `<div class="fl-copy">${ctx.esc(s)}</div>`, 'fl-tile')).join('');
    const body = `<div class="fl-two"><div class="fl-col">${flat(P, lead.hex, `<div class="disp fl-h3">${ctx.esc(card.person)}</div><div>${ctx.esc(card.role)}</div><div class="fl-grow"></div><div class="fl-mono">${ctx.esc(card.contact)}</div>`, 'fl-card')}
${flat(P, second.hex, `<div class="disp fl-h3">${ctx.esc(get(A, 'signage.line'))}</div>`, 'fl-sign')}</div>
<div class="fl-tiles">${social}</div></div>`;
    return frame(ctx, 'application', body);
  },

  digital(ctx) {
    const B = ctx.brand, P = palette(ctx), A = B.applications || {}, em = A.email || {}, L = P.L;
    const bar = `<div class="fl-bar" style="background:${P.sunken};color:${P.quietOn(P.sunken)}"><span class="fl-dot" style="background:${P.hair}"></span><span class="fl-mono">${ctx.esc(get(A, 'site.url'))}</span></div>`;
    const site = `<div class="fl-browser" style="border-color:${P.hair}">${bar}<div class="fl-pagev" style="background:${L.surface};color:${P.ink}"><div class="disp fl-h2">${ctx.esc(B.name)}</div>${text(ctx, get(B, 'lines.primary'))}
<span class="fl-btn" style="background:${L.action};color:${P.on(L.action, [L.actionLabel])}">${ctx.esc((A.social || [])[0] || B.city)}</span></div></div>`;
    const mail = `<div class="fl-mail" style="border-color:${P.hair};background:${P.raised}"><div class="fl-k">${ctx.esc(get(B, 'guideB.email.subject'))}</div>${text(ctx, get(B, 'guideB.email.greeting'))}
<div class="fl-rule" style="background:${P.hair}"></div><div class="disp fl-h3">${ctx.esc(em.person)}</div><div>${ctx.esc(em.role)}</div></div>`;
    return frame(ctx, 'digital', `<div class="fl-two">${site}${mail}</div>`);
  },

  logo(ctx) {
    const P = palette(ctx), F = logoFacts(ctx);
    const cells = F.grounds.slice(0, 4).map((g) => `<div class="fl-lg"><div class="fl-lgbox" style="background:${g.groundHex};color:${P.on(g.groundHex)}">${ctx.logo.html('colour', { width: 220, colourway: g.key, color: P.on(g.groundHex) })}</div>
<div class="fl-k">${ctx.esc(g.label)}</div></div>`).join('');
    const body = `<div class="fl-grid fl-g2">${cells}</div><div class="fl-facts">${field(ctx, 'Clear space', ctx.esc(F.unitText))}${field(ctx, 'Smallest on screen', `${F.min.screenPx} px wide`)}${field(ctx, 'Smallest in print', `${F.min.printMm} mm wide`)}</div>`;
    return frame(ctx, 'logo', body);
  },

  colour(ctx) {
    const P = palette(ctx);
    const sw = colourFacts(ctx).map((c) => {
      const ink = P.on(c.hex);
      return `<div class="fl-sw" style="background:${c.hex};color:${ink}"><div class="fl-swn disp">${ctx.esc(c.name)}</div><div class="fl-grow"></div>
<div class="fl-mono">${c.hex}</div><div class="fl-mono">RGB ${c.rgb.join(' ')}</div>${c.cmyk ? `<div class="fl-mono">CMYK ${c.cmyk.join(' ')}</div>` : ''}<div class="fl-small">${roleLabel(ctx, c)}, ${pct(c.share)}</div></div>`;
    }).join('');
    return frame(ctx, 'colour', `<div class="fl-swatches">${sw}</div>`);
  },

  specimen(ctx) {
    const B = ctx.brand, S = get(B, 'type.sample') || {};
    const weights = (role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).map((w) => WEIGHT_NAMES[w] || w).join(', ');
    const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
    const one = (role, f, cls) => `<div class="fl-spec"><div class="fl-aa ${cls}">Aa</div><div><div class="fl-k">${role}</div><div class="fl-h3">${ctx.esc(fontName(f))}</div>
<div class="fl-small">${weights(role)}</div><div class="${cls} fl-alpha">${AB}</div></div></div>`;
    const mono = B.fonts.mono ? one('mono', B.fonts.mono, 'fl-monof') : '';
    const body = `<div class="fl-stack">${one('display', B.fonts.display, 'disp')}${one('body', B.fonts.body, 'bf')}${mono}</div>
<div class="fl-sample"><div class="disp fl-h2">${ctx.esc(S.headline)}</div>${text(ctx, S.paragraph)}</div>`;
    return frame(ctx, 'specimen', body);
  },

  type(ctx) {
    const rows = typeLadder(ctx).map((t) => {
      const px = Math.min(t.size, 44), cls = t.face === 'display' ? 'disp' : 'bf';
      return `<div class="fl-row"><div class="${cls} fl-step" style="font-size:${px}px;line-height:${Math.round(px * t.lineRatio)}px;font-weight:${t.weight}">${ctx.esc(t.name)}</div>
<div class="fl-mono fl-rowv">${t.size}/${t.line} px, ${WEIGHT_NAMES[t.weight] || t.weight}, ${t.rem}</div><div class="fl-small fl-rowu">${ctx.esc(t.use)}</div></div>`;
    }).join('');
    return frame(ctx, 'type', `<div class="fl-rows">${rows}</div>`);
  },

  strategy(ctx) {
    const B = ctx.brand;
    const pers = (B.personality || []).slice(0, 4).map((p) => `<div class="fl-card"><div class="disp fl-h3">${ctx.esc(p.trait)}</div>${text(ctx, p.means)}</div>`).join('');
    const body = `<div class="fl-two"><div class="fl-col">${field(ctx, 'What it is', ctx.esc(B.description))}${field(ctx, 'What it does', ctx.esc(B.product))}${field(ctx, 'Who it serves', ctx.esc(B.audience))}</div>
<div class="fl-grid fl-g2">${pers}</div></div>`;
    return frame(ctx, 'strategy', body);
  },

  composition(ctx) {
    const g = ctx.gridMeasures, P = palette(ctx), L = P.L;
    const cols = Array.from({ length: g.columns }, () => `<span style="background:${L.action};opacity:.16"></span>`).join('');
    const mp = (g.margin / g.page.w) * 100, mv = (g.margin / g.page.h) * 100;
    const diagram = `<div class="fl-pgd" style="aspect-ratio:${g.page.w}/${g.page.h};border-color:${P.hair};background:${P.raised};padding:${mv}% ${mp}%"><div class="fl-cols" style="gap:${(g.gutter / (g.page.w - 2 * g.margin)) * 100}%">${cols}</div></div>`;
    const facts = [['Page', `${g.page.w} x ${g.page.h} px`], ['Margin', `${g.margin} px`], ['Columns', String(g.columns)], ['Gutter', `${g.gutter} px`], ['Column', `${Math.round(g.col * 10) / 10} px`], ['Base', `${g.base} px`]];
    return frame(ctx, 'composition', `<div class="fl-two">${diagram}<div class="fl-col">${facts.map(([k, v]) => field(ctx, k, v)).join('')}</div></div>`);
  },

  reference(ctx) {
    const B = ctx.brand, P = palette(ctx), C = contrastFacts(ctx);
    const rows = C.pairs.slice(0, 8).map((p) => `<div class="fl-pair"><span class="fl-aa-s" style="background:${p.bgHex};color:${P.on(p.bgHex, [p.fgHex])}">Aa</span>
<span class="fl-pl">${ctx.esc(p.label)}</span><span class="fl-mono">${p.ratioText}:1 ${p.grade}</span></div>`).join('');
    const contact = B.contact ? `${field(ctx, 'Owner', ctx.esc(B.contact.owner))}${field(ctx, 'Contact', ctx.esc(B.contact.email))}` : '';
    return frame(ctx, 'reference', `<div class="fl-two"><div class="fl-pairs">${rows}</div><div class="fl-col">${field(ctx, 'Version', ctx.esc(ctx.versionLine))}${contact}</div></div>`);
  },
};
