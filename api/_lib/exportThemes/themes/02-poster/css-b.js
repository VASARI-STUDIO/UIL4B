// What is left of the old guidelines-b styles (cleaned 2026-11-05): two custom properties on .pg. The page rules went with the old pages,
// which the lane files replaced. Every class in the old sheet started b-.
export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono, D = ctx.roles.dark;
  return `
/* quiet text that has to sit on the panel colour of each ground */
.pg{--bmono:'${mono.family}',monospace;--qp:${D.quiet}}
`;
}
