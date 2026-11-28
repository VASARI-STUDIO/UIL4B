// Theme 33, Flyleaf: the UI style guide pages (the `guide` row; A4 portrait by default, and flow layout so a 16:9 frame holds them too). Each page is (ctx) => html.
// Every colour is a role of the brand's own light or dark set, and every text on a colour goes through readableOn(). The screen and component drawings are flat
// panels built from the tokens: no photograph, no mockup. Labels are plain names of the parts ("Primary"), never invented copy.
import { contrastFacts, primaryColour, GRADE_NOTE, WEIGHT_NAMES } from '../../engine/styleguide.js';
import { iconSet } from '../../engine/components.js';
import { page, palette, uiOrder, NAMES, field } from './helpers.js';

const frame = (ctx, id, body, title = NAMES[id]) => page(ctx, id, { title, section: 'UI style guide', body, order: uiOrder });
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const word = (id) => String(id).charAt(0).toUpperCase() + String(id).slice(1).replace(/[-_]/g, ' ');
const ROLE_KEYS = ['surface', 'raised', 'sunken', 'text', 'textSoft', 'quiet', 'border', 'divider', 'action', 'actionHover', 'actionPressed', 'actionLabel', 'focus', 'disabledBg', 'disabledText'];
const roleList = (set) => ROLE_KEYS.filter((k) => typeof set[k] === 'string' && /^#[0-9a-f]{6}$/i.test(set[k])).map((k) => ({ key: k, hex: set[k].toUpperCase() }));
const chip = (P, hex, label, hint = '') => `<div class="fl-chip" style="background:${hex};color:${P.on(hex)}"><span class="fl-mono">${label}</span><span class="fl-mono">${hex}</span>${hint}</div>`;

export const guide = {
  cover(ctx) {
    const B = ctx.brand, P = palette(ctx), pc = primaryColour(ctx);
    const body = `<div class="fl-cover"><div class="fl-big disp">${ctx.esc(B.name)}</div><div class="fl-meta">${ctx.esc(ctx.versionLine)}</div>
<div class="fl-meta">${ctx.esc(ctx.date)}</div></div><div class="fl-strip" style="--h:72px" role="img" aria-label="Primary colour and ground"><span style="flex:3;background:${pc.hex}"></span><span style="flex:1;background:${P.ground}"></span><span style="flex:1;background:${P.ink}"></span></div>`;
    return frame(ctx, 'cover', body, 'UI style guide');
  },

  interface(ctx) {
    const B = ctx.brand, P = palette(ctx), L = P.L;
    const body = `<div class="fl-screen" style="background:${L.surface};border-color:${P.hair};color:${P.ink}">
<div class="fl-bar" style="background:${L.raised || L.surface};border-color:${P.hair}"><span class="disp fl-h3">${ctx.esc(B.name)}</span><span class="fl-btn" style="background:${L.action};color:${P.on(L.action, [L.actionLabel])}">Primary</span></div>
<div class="fl-two"><div class="fl-card" style="background:${L.raised || L.surface};border-color:${P.hair}"><div class="disp fl-h3">Raised</div><div class="fl-copy" style="color:${P.soft}">${ctx.esc(B.description)}</div></div>
<div class="fl-card" style="background:${L.sunken || L.surface};border-color:${P.hair}"><div class="disp fl-h3">Sunken</div><div class="fl-copy" style="color:${P.quietOn(L.sunken || L.surface)}">${ctx.esc(get(B, 'lines.primary'))}</div></div></div></div>`;
    return frame(ctx, 'interface', body);
  },

  components(ctx) {
    const P = palette(ctx), L = P.L;
    const btn = (label, bg, fg, extra = '') => `<span class="fl-btn" style="background:${bg};color:${P.on(bg, [fg])};${extra}">${label}</span>`;
    const buttons = [btn('Primary', L.action, L.actionLabel), btn('Hover', L.actionHover, L.actionLabel), btn('Pressed', L.actionPressed, L.actionLabel),
      btn('Secondary', L.surface, L.text, `border:1.5px solid ${P.ink}`), btn('Disabled', L.disabledBg || P.sunken, L.disabledText || P.quiet)].join('');
    const input = `<div class="fl-input" style="border-color:${L.border || P.hair};background:${L.surface};color:${P.quiet}">Input</div><div class="fl-input" style="border-color:${L.focus};box-shadow:0 0 0 2px ${L.surface},0 0 0 4px ${L.focus};background:${L.surface};color:${P.quiet}">Focus</div>`;
    const chips = ctx.status.map((s) => `<span class="fl-pill" style="background:${s.light.bg};color:${P.on(s.light.bg, [s.light.fg])}">${word(s.id)}</span>`).join('');
    return frame(ctx, 'components', `<div class="fl-stack">${field(ctx, 'Buttons', `<div class="fl-wrap">${buttons}</div>`)}${field(ctx, 'Fields', `<div class="fl-wrap">${input}</div>`)}${field(ctx, 'Status', `<div class="fl-wrap">${chips}</div>`)}</div>`);
  },

  feedback(ctx) {
    const P = palette(ctx);
    const rows = ctx.status.map((s) => {
      const bg = s.light.bg, ink = P.on(bg, [s.light.fg]);
      return `<div class="fl-note" style="background:${bg};color:${ink};border-color:${s.light.edge || bg}"><span class="disp fl-h3">${word(s.id)}</span><span class="fl-mono">${bg.toUpperCase()}</span></div>`;
    }).join('');
    return frame(ctx, 'feedback', `<div class="fl-stack">${rows}</div>`);
  },

  colour(ctx) {
    const P = palette(ctx), L = ctx.roles.light, D = ctx.roles.dark || {};
    const col = (set) => roleList(set).map((r) => chip(P, r.hex, r.key)).join('');
    return frame(ctx, 'colour', `<div class="fl-two"><div class="fl-stack">${field(ctx, 'Light', '')}${col(L)}</div><div class="fl-stack">${field(ctx, 'Dark', '')}${col(D)}</div></div>`);
  },

  tints(ctx) {
    const P = palette(ctx), pc = primaryColour(ctx), C = ctx.C;
    const ramp = (hex) => { const r = C.ramp(hex); return Object.keys(r).map((k) => chip(P, r[k].toUpperCase(), k)).join(''); };
    return frame(ctx, 'tints', `<div class="fl-two"><div class="fl-stack">${field(ctx, 'Primary', '')}${ramp(pc.hex)}</div><div class="fl-stack">${field(ctx, 'Text', '')}${ramp(P.ink)}</div></div>`);
  },

  contrast(ctx) {
    const P = palette(ctx), C = contrastFacts(ctx);
    const rows = C.pairs.slice(0, 12).map((p) => `<div class="fl-pair"><span class="fl-aa-s" style="background:${p.bgHex};color:${P.on(p.bgHex, [p.fgHex])}">Aa</span><span class="fl-pl">${ctx.esc(p.label)}</span><span class="fl-mono">${p.ratioText}:1 ${p.grade}</span></div>`).join('');
    const note = GRADE_NOTE ? `<div class="fl-small" style="color:${P.quiet}">${typeof GRADE_NOTE === 'string' ? ctx.esc(GRADE_NOTE) : ''}</div>` : '';
    return frame(ctx, 'contrast', `<div class="fl-pairs">${rows}</div>${note}`);
  },

  type(ctx) {
    const rows = ctx.uiType.map((t) => {
      const px = Math.min(t.size, 40), cls = t.face === 'display' ? 'disp' : 'bf';
      return `<div class="fl-row"><div class="${cls} fl-step" style="font-size:${px}px;line-height:${Math.round(px * (t.line / t.size))}px;font-weight:${t.weight}">${word(t.token)}</div>
<div class="fl-mono fl-rowv">${t.size}/${t.line} px, ${WEIGHT_NAMES[t.weight] || t.weight}</div><div class="fl-small fl-rowu">${ctx.esc(t.use)}</div></div>`;
    }).join('');
    return frame(ctx, 'type', `<div class="fl-rows">${rows}</div>`);
  },

  icons(ctx) {
    const P = palette(ctx);
    const cells = iconSet(ctx).slice(0, 24).map((n) => {
      let svg;
      try { svg = ctx.ui.icon(n, 28); } catch { return ''; }
      return `<div class="fl-ic" style="border-color:${P.hair};color:${P.ink}">${svg}<span class="fl-small fl-mono">${ctx.esc(n)}</span></div>`;
    }).join('');
    return frame(ctx, 'icons', `<div class="fl-grid fl-g4">${cells}</div>`);
  },

  handoff(ctx) {
    const P = palette(ctx), L = ctx.roles.light;
    const tok = (k, v) => `<div class="fl-pair"><span class="fl-mono fl-pl">${k}</span><span class="fl-mono">${v}</span></div>`;
    const colours = roleList(L).slice(0, 10).map((r) => tok(`--${r.key}`, r.hex)).join('');
    const space = ctx.space.map((s) => tok(`--sp-${s.token}`, `${s.px} px`)).join('');
    const radii = ctx.radii.map((r) => tok(`--r-${String(r.token).replace(/^radius-/, '')}`, `${r.px} px`)).join('');
    return frame(ctx, 'handoff', `<div class="fl-two"><div class="fl-stack">${field(ctx, 'Colour', '')}${colours}</div><div class="fl-stack">${field(ctx, 'Space', '')}${space}${field(ctx, 'Radius', '')}${radii}</div></div>`);
  },
};

