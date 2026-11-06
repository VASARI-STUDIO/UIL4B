// What is left of the old run B styles (the guidelines-b.js page rules were removed 2026-11-05: no built page matched them): the mono
// custom property, the kit's light tokens under .pg .ui and the engine's component CSS. Appended to css() in index.js.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${mono.family}',monospace}

/* digital */
${uiScope}
${componentsCss(ctx)}

`;
}
