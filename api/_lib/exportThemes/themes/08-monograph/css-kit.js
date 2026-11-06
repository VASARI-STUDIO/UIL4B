// The kit's own tokens and the engine's components, scoped under .pg .ui (light by default, data-theme="dark" for the dark plates),
// so a .ui region reads the real roles. The UI kit pages (u-*.js) depend on this. The old uikit.js page rules were removed 2026-11-05:
// no built page matched them. Page chrome (running head, facts, plates) is in index.js.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const tokens = `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}`;
  return `
/* kit: tokens and components */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.pg .ui .ui-row__lead{border-radius:0}

/* cards, navigation, lists */
.pg .ui .ui-row.is-hover{background:var(--raised)}

/* status, feedback, dialog, table, empty */
.ui-scrim{padding:24px}
.pg .ui .ui-empty{padding:24px}
.pg .ui .ui-empty__title{font-size:var(--fs-title);line-height:var(--lh-title)}

/* @@END css */
`;
}
