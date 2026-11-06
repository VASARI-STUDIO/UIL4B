// What is left of the old run B styles (the guidelines-b.js page rules were removed: no built page matched them): the mono
// custom property, the kit's light tokens under .pg .ui and the engine's component CSS. Appended to css() in index.js.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssStr } from '../../engine/escape.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${cssStr(mono.family)}',monospace}

/* digital */
${uiScope}
${componentsCss(ctx)}

`;
}
