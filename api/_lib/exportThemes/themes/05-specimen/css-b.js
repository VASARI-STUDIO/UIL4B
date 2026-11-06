// What is left of the old guidelines-b styles (cleaned 2026-11-05): custom properties and the kit scope on .pg. The page rules went with the old pages,
// which the lane files replaced. Every class in the old sheet started b-.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono, night = ctx.brand.logo.colourways['mono-light'];
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${mono.family}',monospace;--night:${night.ground};--night-ink:${night.name}}
.pg :where(b){font-weight:600}

/* digital */
${uiScope}
${componentsCss(ctx)}

`;
}
