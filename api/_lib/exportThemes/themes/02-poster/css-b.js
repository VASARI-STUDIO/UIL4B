// What is left of the old guidelines-b styles: two custom properties on .pg. The page rules went with the old pages,
// which the page files replaced. Every class in the old sheet started b-.
import { cssStr } from '../../engine/escape.js';
export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono, D = ctx.roles.dark;
  return `
/* quiet text that has to sit on the panel colour of each ground */
.pg{--bmono:'${cssStr(mono.family)}',monospace;--qp:${D.quiet}}
`;
}
