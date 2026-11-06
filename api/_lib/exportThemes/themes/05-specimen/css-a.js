// What is left of the old guidelines-a styles: one custom property on .pg. The page rules went with the old pages,
// which the page files replaced. Every class in the old sheet started a-.
import { cssStr } from '../../engine/escape.js';
export function cssA(ctx) {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--mono:'${cssStr(mono.family)}',monospace}

`;
}
