// What is left of the old UI kit styles (cleaned 2026-11-05). Appended to css() in index.js. Everything inside a .ui region reads the kit's own
// tokens (light by default, data-theme="dark" for Night pages): the tokens and the engine's components are scoped under .pg .ui, which the new UI kit pages use.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const tokens = `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}`;
  return `
/* kit: tokens and components, scoped under .pg */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}

/*@@css*/
`;
}
