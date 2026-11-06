// Design tokens as CSS, DTCG JSON, typed TS and a Tailwind v4 @theme block. All values come from brand.json.
import { isPinned } from './brand.js';
import * as C from './color.js';

const ROLE_NAMES = {
  surface: 'surface', raised: 'raised', sunken: 'sunken', text: 'text', textSoft: 'text-soft', quiet: 'quiet', quietOnSunken: 'quiet-sunken',
  border: 'edge', divider: 'divider', action: 'action', actionHover: 'action-hover', actionPressed: 'action-pressed', actionLabel: 'action-label',
  focus: 'focus', disabledBg: 'disabled-bg', disabledText: 'disabled-text', scrim: 'scrim',
};
const TONES = ['success', 'warning', 'danger', 'info'];

export function colourMap(ctx, mode) {
  const r = ctx.roles[mode], o = {};
  for (const k in ROLE_NAMES) o[ROLE_NAMES[k]] = r[k];
  for (const t of TONES) { o[t] = r[t].fg; o[t + '-bg'] = r[t].bg; }
  // an action edge, when either mode gives one (the other mode falls back to the fill, so the border vanishes)
  if (ctx.roles.light.actionEdge || ctx.roles.dark.actionEdge) o['action-edge'] = r.actionEdge || r.action;
  // statuses with their own colours: --status-<id>, -bg, -edge
  for (const s of ctx.status) if (s.custom) { const m = s[mode]; o[`status-${s.id}`] = m.fg; o[`status-${s.id}-bg`] = m.bg; o[`status-${s.id}-edge`] = m.edge || 'transparent'; }
  // state is plain words in one colour, never a tinted pill: each status gets a colour that reads as text on the surface and on a raised card
  const reads = (c) => !!c && C.ratio(c, r.surface) >= 4.5 && C.ratio(c, r.raised) >= 4.5;
  o['action-text'] = reads(r.action) ? r.action : r.text;
  for (const s of ctx.status) if (s.custom) { const m = s[mode]; o[`status-${s.id}-text`] = [m.fg, m.edge, m.bg].find(reads) || r.text; }
  return o;
}
// the colour a status's words print in, and its token, for pages that show the ratio: statusText(ctx, 'light', ctx.status[0]) -> { hex, token }
export function statusText(ctx, mode, s) {
  const o = colourMap(ctx, mode);
  if (s.custom) return { hex: o[`status-${s.id}-text`], token: `--status-${s.id}-text` };
  if (s.tone === 'action') return { hex: o['action-text'], token: '--action-text' };
  if (s.tone === 'neutral') return { hex: o['text-soft'], token: '--text-soft' };
  return { hex: o[s.tone], token: `--${s.tone}` };
}
const stack = (ctx, role) => { const f = ctx.brand.fonts[role]; return `"${f.family}", ${role === 'mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`; };

export function tokenGroups(ctx) {
  const B = ctx.brand;
  return {
    space: Object.fromEntries(ctx.space.map((s) => [s.token.replace('space-', 'sp-'), s.px + 'px'])),
    radius: { 'r-control': ctx.radius.control + 'px', 'r-button': ctx.radius.button + 'px', 'r-input': ctx.radius.input + 'px', 'r-chip': ctx.radius.chip + 'px', 'r-card': ctx.radius.card + 'px', 'r-round': '9999px' },
    width: { 'w-hairline': '1px', 'w-control': B.ui.border + 'px', 'w-focus': '2px' },
    font: { 'ff-display': stack(ctx, 'display'), 'ff-body': stack(ctx, 'body'), 'ff-mono': stack(ctx, 'mono') },
    text: Object.fromEntries(ctx.uiType.flatMap((t) => [[`fs-${t.token}`, t.size + 'px'], [`lh-${t.token}`, t.line + 'px'], [`fw-${t.token}`, String(t.weight)]])),
    shadow: { 'shadow-float': B.ui.shadows === 'none' ? 'none' : B.ui.shadows },
  };
}

export function tokensCss(ctx) {
  const decl = (o) => Object.entries(o).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  const g = tokenGroups(ctx);
  const light = colourMap(ctx, 'light'), dark = colourMap(ctx, 'dark');
  const pal = Object.fromEntries(ctx.colours.map((c) => [`palette-${c.id}`, c.hex]));
  return `/* ${ctx.brand.name} design tokens. Light on :root, dark on [data-theme="dark"] and prefers-color-scheme. */
:root {
${decl(light)}
${decl(pal)}
${decl(g.space)}
${decl(g.radius)}
${decl(g.width)}
${decl(g.font)}
${decl(g.text)}
${decl(g.shadow)}
  color-scheme: light;
}
[data-theme="dark"] {
${decl(dark)}
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${decl(dark).replace(/^ {2}/gm, '    ')}
    color-scheme: dark;
  }
}
`;
}

export function tokensJson(ctx) {
  const light = colourMap(ctx, 'light'), dark = colourMap(ctx, 'dark');
  const g = tokenGroups(ctx);
  const color = {};
  // a status role the brand leaves to the house default says so, so nobody reads it as a brand colour
  const house = new Set(ctx.houseRoles.flatMap((t) => [t, t + '-bg']));
  for (const k in light) color[k] = { $type: 'color', $value: light[k], ...(house.has(k) ? { $description: 'House default, not a brand colour.' } : {}), $extensions: { mode: { light: light[k], dark: dark[k] } } };
  const dim = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { $type: 'dimension', $value: v }]));
  const palette = Object.fromEntries(ctx.colours.map((c) => [c.id, { $type: 'color', $value: c.hex, $description: c.lands }]));
  return {
    $description: `${ctx.brand.name} design tokens (DTCG). Colour tokens carry a dark value in $extensions.mode.`,
    palette, color, space: dim(g.space), radius: dim(g.radius), width: dim(g.width),
    font: Object.fromEntries(Object.entries(g.font).map(([k, v]) => [k, { $type: 'fontFamily', $value: v }])),
    text: Object.fromEntries(Object.entries(g.text).map(([k, v]) => [k, { $type: k.startsWith('fw-') ? 'fontWeight' : 'dimension', $value: k.startsWith('fw-') ? Number(v) : v }])),
  };
}

export function tokensTs(ctx) {
  const g = tokenGroups(ctx);
  const o = { light: colourMap(ctx, 'light'), dark: colourMap(ctx, 'dark'), palette: Object.fromEntries(ctx.colours.map((c) => [c.id, c.hex])), space: g.space, radius: g.radius, width: g.width, font: g.font, text: g.text };
  return `// ${ctx.brand.name} design tokens. Same values as tokens.css and tokens.json.
export const tokens = ${JSON.stringify(o, null, 2)} as const;

export type ColourToken = keyof typeof tokens.light;
export type Mode = 'light' | 'dark';

/** The CSS custom property for a colour token, for use in inline styles: cssVar('action') */
export const cssVar = (name: ColourToken | keyof typeof tokens.space | keyof typeof tokens.radius) => \`var(--\${name})\`;
`;
}

export function tailwindCss(ctx) {
  const light = colourMap(ctx, 'light'), g = tokenGroups(ctx);
  const lines = [
    ...Object.keys(light).map((k) => `  --color-${k}: var(--${k});`),
    ...Object.keys(ctx.byId).filter((k) => ctx.colours.find((c) => c.id === k)).map((k) => `  --color-${k}: var(--palette-${k});`),
    ...Object.keys(g.space).map((k) => `  --spacing-${k.replace('sp-', '')}: var(--${k});`),
    ...Object.keys(g.radius).map((k) => `  --radius-${k.replace('r-', '')}: var(--${k});`),
    ...Object.keys(g.font).map((k) => `  --font-${k.replace('ff-', '')}: var(--${k});`),
    ...ctx.uiType.map((t) => `  --text-${t.token}: var(--fs-${t.token});\n  --text-${t.token}--line-height: var(--lh-${t.token});`),
  ];
  return `/* ${ctx.brand.name} for Tailwind CSS v4. Import tokens.css first; this maps its custom properties to utilities.
   Use with: @import "tailwindcss"; @import "./tokens.css"; @import "./tailwind.css"; */
@theme inline {
${lines.join('\n')}
}
`;
}

// One css2 family query per family, weights merged (a variable-axis face keeps its own query).
export function googleFamilies(ctx, extra = []) {
  const fam = new Map();
  for (const f of ctx.faces) {
    // a face that pins any axis (opsz, wdth, ital ...) keeps its own query; italic faces of a plain family join its ital,wght tuples
    if (isPinned(f.q) && f.style !== 'italic') { fam.set(f.family + '|' + f.q, f.q); continue; }
    const k = f.family; const base = f.q.replace(/:(ital,)?wght@.*/, '');
    const cur = fam.get(k) || { base, t: new Set(), ital: false }; cur.t.add((f.style === 'italic' ? 1 : 0) + ',' + f.weight); if (f.style === 'italic') cur.ital = true; fam.set(k, cur);
  }
  const out = [...fam.values()].map((v) => {
    if (typeof v === 'string') return v;
    const t = [...v.t].map((s) => s.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return v.ital ? `${v.base}:ital,wght@${t.map((x) => x.join(',')).join(';')}` : `${v.base}:wght@${t.map((x) => x[1]).join(';')}`;
  });
  return [...out, ...extra];
}
// Google Fonts import for the brand faces (the local @font-face files are in fontFaceCss)
export function fontsCss(ctx) {
  return `/* Google Fonts. The faces are open licence (OFL). Remove this import if you self-host the files. */
@import url("https://fonts.googleapis.com/css2?${googleFamilies(ctx).map((q) => 'family=' + q).join('&')}&display=swap");
`;
}
export function fontFaceCss(ctx, urlFn, extraFaces = []) {
  return [...ctx.faces, ...extraFaces].map((f) => `@font-face{font-family:"${f.family}";font-style:${f.style || 'normal'};font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch}%;` : ''}font-display:swap;src:url(${urlFn(f)}) format("woff2");}`).join('\n');
}
