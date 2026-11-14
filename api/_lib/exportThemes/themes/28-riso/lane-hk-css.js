// Lane hk css for theme 28 (Riso): the kit site's paper, plate, pass band and the pieces on them. Written for the site only (loaded after the
// engine's tokens, components and forced states). Every class starts hk-. The product's components are never restyled: only the tokens a
// .ui region reads are scoped here, so a surface can be pinned to light or dark on a page whose paper stays paper.


import { tile } from './tiles.js';
import { colourMap } from '../../engine/tokens.js';
import { faceFor } from './sheet.js';
import { inks } from './lane-hk-lib.js';


export function hkCss(ctx) {
  const { P, plate, ptxt, passPlate, passPaper } = inks(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const body = faceFor(ctx, 'body', 400), bold = faceFor(ctx, 'body', 600);
  return `
html{background:${P.paper}}
body{margin:0;background:${P.paper}}
.sx{--hk-paper:${P.paper};--hk-key:${P.key};--hk-plate:${plate};--hk-ptxt:${ptxt};--hk-hit:${P.hit};--hk-pp:${passPlate};--hk-pq:${passPaper};
  --hk-hair:${P.key};--hk-pw:20px;--hk-g:20px;
  --display:'${ctx.brand.fonts.display.family}',serif;--body:'${ctx.brand.fonts.body.family}',sans-serif;--bmono:'${(ctx.brand.fonts.mono || ctx.brand.fonts.body).family}',monospace;
  --hk-sans:var(--ff-body),system-ui,sans-serif;--hk-mono:'Sono Mono',var(--ff-mono,var(--ff-body)),sans-serif;
  position:relative;min-height:100vh;background:var(--hk-paper);color:var(--hk-key);font:${body.weight} 15px/1.5 var(--hk-sans);-webkit-font-smoothing:antialiased}
.sx *,.sx *::before,.sx *::after{box-sizing:border-box}
:where(.sx) :where(h1,h2,h3,h4,p,ul,ol,dl,dd,dt,figure,pre){margin:0;padding:0}
.sx .ui[data-theme="light"]{${decl(colourMap(ctx, 'light'))}}
.sx .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
.hk-wrap::before{content:'';position:absolute;inset:0;z-index:6;opacity:.7;background:url(${tile('paper-fibre.png')});background-size:512px 512px;mix-blend-mode:multiply;pointer-events:none}
.sx a{color:inherit}
.sx a:focus-visible,.sx button:focus-visible{outline:2px solid var(--hk-key);outline-offset:2px}
.sx .hk-plate a:focus-visible,.sx .hk-plate button:focus-visible{outline-color:var(--hk-ptxt)}
.sx .sx-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}

/* the paper and the pass band: one ink band down the right edge, lighter on the paper than on the plate */
.hk-wrap{position:relative;isolation:isolate;z-index:1;min-height:100vh}
.hk-wrap::after{content:'';position:absolute;z-index:0;top:0;bottom:0;right:0;width:var(--hk-pw);background:var(--hk-pq);pointer-events:none}
.hk-in{position:relative;z-index:1;max-width:1100px;margin:0;padding:0 calc(var(--hk-pw) + var(--hk-g)) 0 var(--hk-g)}

/* the top: colour bar, the kit's name, the product's mode, the contents */
.hk-top{position:relative;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:16px calc(var(--hk-pw) + var(--hk-g)) 16px var(--hk-g);border-bottom:.5px solid var(--hk-hair)}
.hk-id{display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:${bold.weight};font-size:14px}
.hk-id span.hk-ed{font-weight:${body.weight};font-size:13px}
.hk-sq{display:inline-block;width:10px;height:10px;margin-right:2px}
.hk-colbar{display:inline-flex;align-items:center;gap:2px}
.hk-ov{position:relative;display:inline-block;isolation:isolate;width:10px;height:10px;margin-right:2px}
.hk-ov i{position:absolute;inset:0}
.hk-modes{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:13px}
.hk-modes button,.hk-menu-b{font:inherit;font-size:13px;color:var(--hk-key);background:transparent;border:.5px solid var(--hk-hair);padding:8px 12px;min-height:36px;cursor:pointer;border-radius:0}
@media (hover:hover){.hk-modes button:hover,.hk-menu-b:hover{background:var(--hk-key);color:var(--hk-paper)}}
.hk-menu{display:none;position:relative;z-index:2;padding:24px calc(var(--hk-pw) + var(--hk-g)) 32px var(--hk-g);border-bottom:.5px solid var(--hk-hair);background:var(--hk-paper)}
.hk-menu.is-open{display:block}
.hk-mg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px 32px;max-width:1100px}
.hk-ms h2{font:600 12px/16px var(--hk-sans);letter-spacing:.01em;padding-bottom:8px;border-bottom:.5px solid var(--hk-hair);margin-bottom:4px}
.hk-ms ul{list-style:none}
.hk-ms a{display:flex;justify-content:space-between;gap:12px;padding:6px 0;text-decoration:none;font-size:14px}
.hk-ms a[aria-current="page"]{font-weight:${bold.weight};text-decoration:underline;text-underline-offset:3px}
@media (hover:hover){.hk-ms a:hover{text-decoration:underline;text-underline-offset:3px}}
.hk-ms .hk-v{font-size:12px}
.hk-sub{position:relative;z-index:2;padding:0 calc(var(--hk-pw) + var(--hk-g)) 0 var(--hk-g);border-bottom:.5px solid var(--hk-hair)}
.hk-sub ul{list-style:none;display:flex;flex-wrap:wrap;gap:0 20px;max-width:1100px}
.hk-sub a{display:block;padding:12px 0;font-size:13px;text-decoration:none;border-bottom:3px solid transparent}
.hk-sub a[aria-current="page"]{font-weight:${bold.weight};border-bottom-color:var(--hk-key)}
@media (hover:hover){.hk-sub a:hover{text-decoration:underline;text-underline-offset:3px}}

/* the plate: the page's name and note, with the hit numeral knocked out of it and printed over the hole */
.hk-plate{position:relative;isolation:isolate;z-index:1;background:var(--hk-plate);color:var(--hk-ptxt);padding:40px 0 36px}
.hk-plate::after{content:'';position:absolute;z-index:0;top:0;bottom:0;right:0;width:var(--hk-pw);background:var(--hk-pp);pointer-events:none}
.hk-pi{display:flex;flex-direction:column;gap:24px}
.hk-pt{display:flex;flex-direction:column;gap:12px;max-width:34ch;min-width:0}
.hk-h1{font:600 14px/1.3 var(--hk-sans);letter-spacing:.01em}
.hk-pn{font-size:15px;line-height:1.5;max-width:36ch}
.hk-pn .hk-b{font-weight:${bold.weight}}
.hk-hit{flex:none;line-height:0;min-width:0;max-width:100%;width:var(--hk-w);user-select:none}
.hk-hit svg{display:block;width:100%;height:auto;overflow:visible}
.hk-hv{mix-blend-mode:multiply}

/* the body of a page, on the paper */
.hk-bd{padding-top:40px;padding-bottom:56px;display:flex;flex-direction:column;gap:48px}
.hk-sec{display:flex;flex-direction:column;gap:16px;min-width:0}
.hk-lab{font:600 12px/16px var(--hk-sans);letter-spacing:.01em}
.hk-note{font-size:13px;line-height:1.45;max-width:62ch}
.hk-b{font-weight:${bold.weight};font-size:14px;line-height:1.4}
.hk-v,span.hk-v{font-family:var(--hk-mono);font-weight:400;font-variant-numeric:tabular-nums;font-size:.9em;overflow-wrap:anywhere}
.hk-sec>.hk-note:first-child{margin-top:0}
.hk-hr .hk-pi{align-items:flex-start}
.hk-hair{border:0;border-top:.5px solid var(--hk-hair);margin:0}

/* the product's surface, pasted onto the paper */
.hk-pan{position:relative;isolation:isolate;outline:.5px solid var(--hk-hair);outline-offset:0;padding:24px;min-width:0}
.hk-led{display:flex;flex-direction:column}
.hk-row{display:grid;grid-template-columns:minmax(0,1fr);gap:0}
.hk-row .hk-n{padding:14px 0;border-top:.5px solid var(--hk-hair);display:flex;flex-direction:column;gap:4px}
.hk-row .hk-s{padding:16px 20px;border-top:.5px solid var(--hk-hair);border-left:.5px solid var(--hk-hair);border-right:.5px solid var(--hk-hair);display:flex;flex-wrap:wrap;align-items:center;gap:12px;min-width:0}
.hk-row .hk-s>.ui-field{width:100%}
.hk-led>.hk-row:last-child .hk-s,.hk-led>.hk-row:last-child .hk-n{border-bottom:.5px solid var(--hk-hair)}
.hk-led>.hk-row+.hk-row .hk-s{border-top:var(--w-hairline,1px) solid var(--divider)}
@media (min-width:841px){
  .hk-row{grid-template-columns:minmax(200px,280px) minmax(0,1fr);column-gap:24px}
  .hk-row.hk-mir{grid-template-columns:minmax(0,1fr) minmax(200px,280px)}
  .hk-row.hk-mir .hk-s{order:-1}
  .hk-row.hk-wide{grid-template-columns:minmax(200px,240px) minmax(0,1fr)}
}

/* a ruled list of facts */
.hk-rl{display:flex;flex-direction:column}
.hk-tr{display:grid;grid-template-columns:minmax(0,1fr);gap:2px 16px;padding:10px 0;border-top:.5px solid var(--hk-hair);font-size:13px;line-height:1.45}
.hk-tr.hk-th{padding:8px 0;display:none}
.hk-td{min-width:0}
.hk-hd{font:600 12px/16px var(--hk-sans)}
.hk-gap{display:block;height:12px}
.hk-chip{display:inline-block;width:12px;height:12px;vertical-align:-1px;margin-right:6px;box-shadow:inset 0 0 0 .5px var(--hk-hair)}
.hk-rl>.hk-rl-end{border-top:.5px solid var(--hk-hair)}
.hk-r{text-align:left}
@media (min-width:841px){
  .hk-tr{grid-template-columns:var(--hk-c);align-items:baseline}
  .hk-tr.hk-th{display:grid}
  .hk-r{text-align:right}
}
.hk-rl::after{content:'';display:block;border-top:.5px solid var(--hk-hair)}

/* two columns that fall to one */
.hk-two{display:grid;grid-template-columns:minmax(0,1fr);gap:32px}
@media (min-width:841px){.hk-two{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px 48px}}
.hk-col{display:flex;flex-direction:column;gap:16px;min-width:0;align-items:stretch}
.hk-flow{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.hk-flowc{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.hk-zoom{display:inline-block;transform-origin:0 0}

/* code */
.hk-code{position:relative;min-width:0}
.hk-pre{font:400 13px/1.55 var(--hk-mono);font-variant-numeric:tabular-nums;padding:16px 20px;border:.5px solid var(--hk-hair);white-space:pre-wrap;overflow-wrap:anywhere;background:transparent;max-width:100%}
.hk-copy{display:block;margin:0 0 8px auto;position:relative;z-index:2;font:600 12px/16px var(--hk-sans);color:var(--hk-key);background:var(--hk-paper);border:.5px solid var(--hk-hair);padding:6px 12px;min-height:32px;cursor:pointer;border-radius:0}
@media (hover:hover){.hk-copy:hover{background:var(--hk-key);color:var(--hk-paper)}}
.hk-pre code{font:inherit}

/* swatch of a token's value */
.hk-sw{display:flex;gap:6px;align-items:center}

/* the foot: previous and next, then the colour bar, the part and the folio */
.hk-foot{position:relative;z-index:1;max-width:1100px;padding:0 calc(var(--hk-pw) + var(--hk-g)) 32px var(--hk-g);display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
.hk-pn-link{display:flex;flex-direction:column;gap:2px;padding:14px 0;border-top:.5px solid var(--hk-hair);text-decoration:none;min-width:0}
.hk-pn-link.hk-next{text-align:right;grid-column:2}
.hk-pn-link.hk-prev{grid-column:1}
.hk-pn-d{font:600 12px/16px var(--hk-sans)}
.hk-pn-t{font-size:15px;overflow-wrap:anywhere}
@media (hover:hover){.hk-pn-link:hover .hk-pn-t{text-decoration:underline;text-underline-offset:3px}}
.hk-fl{grid-column:1 / -1;display:flex;align-items:center;gap:12px;padding-top:12px;border-top:.5px solid var(--hk-hair);font-size:12px}
.hk-fs{font-size:12px}
.hk-fn{margin-left:auto;font-size:12px}

/* wide screens: the plate takes the numeral and the note side by side, and the pass band opens up */
@media (min-width:841px){
  .sx{--hk-pw:96px;--hk-g:48px}
  .hk-pi{flex-direction:row;align-items:flex-end;justify-content:space-between;gap:48px}
  .hk-plate{padding:56px 0 48px}
  .hk-pt{flex:none;width:min(36ch,40%);align-self:flex-start}
  .hk-h1{font-size:15px}
  .hk-pi .hk-hit{align-self:flex-end}
  .hk-hr .hk-pi{flex-direction:row}
  .hk-bd{padding-top:56px}
}
@media (min-width:1200px){.sx{--hk-pw:163px}}
@media (min-width:841px){.hk-tallp{padding:96px 0 72px}}
@media (prefers-reduced-motion:reduce){.sx *{scroll-behavior:auto!important}}

/* the product screens */
.hk-scr{display:flex;flex-direction:column;min-width:0}
.hk-scr .hk-wm{font-size:20px;line-height:24px;white-space:nowrap}
.hk-main{padding:24px 24px 0;display:flex;flex-direction:column;gap:20px;min-width:0}
.hk-h{font-size:var(--fs-title);line-height:var(--lh-title)}
.hk-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.hk-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.hk-live>*{max-width:100%}
.hk-eta{font-size:var(--fs-headline);line-height:var(--lh-headline);overflow-wrap:anywhere}
.hk-soft{color:var(--text-soft);max-width:44ch}
.hk-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.hk-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.hk-rider{width:100%;display:flex;align-items:center;gap:12px}
.hk-who{flex:1;min-width:0}
.hk-who .ph-n{white-space:normal!important}
.hk-ub{font-weight:600;line-height:var(--lh-label)}
.hk-uq{color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.hk-dl{display:flex;flex-direction:column;gap:12px}
.hk-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.hk-dl dd{font-weight:600}
.hk-pad{padding:24px;display:flex;flex-direction:column;gap:24px}
.hk-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.hk-phone{display:flex;flex-direction:column;overflow:hidden;width:min(390px,100%);min-height:780px;padding:0}
.hk-sb{flex:none;display:flex;align-items:center;padding:0 20px;height:44px;font-weight:600;font-variant-numeric:tabular-nums}
.hk-pbar{flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:56px;border-bottom:var(--w-hairline) solid var(--divider)}
.hk-pbody{flex:1;min-height:0;padding:20px;display:flex;flex-direction:column;gap:20px}
.hk-pin{margin-top:auto;display:flex;flex-direction:column;gap:20px}
.hk-phone .ui-tabbar{flex:none}
.hk-sk{display:flex;flex-direction:column;gap:10px}
.hk-zero{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}
.hk-stack>*+*{margin-top:12px}
.hk-scrim{padding:0}
.sx .v{font-family:var(--hk-mono);font-weight:400;font-variant-numeric:tabular-nums;font-size:.9em}
@media (max-width:560px){
.hk-tblz .ui-table,.hk-tblz .ui-table tbody,.hk-tblz .ui-table tr,.hk-tblz .ui-table td{display:block;width:100%}
.hk-tblz .ui-table thead{display:none}
.hk-tblz .ui-table tr{padding:8px 0;border-bottom:var(--w-hairline) solid var(--divider)}
.hk-tblz .ui-table td{height:auto;min-height:32px;display:flex;justify-content:space-between;align-items:center;gap:12px;border:0;padding:6px 16px;text-align:right}
.hk-tblz .ui-table td::before{content:attr(data-l);color:var(--text-soft);font-size:var(--fs-label);text-align:left;flex:none}
}
.hk-back{margin-left:auto;font-size:13px}
.hk-back + .hk-modes{margin-left:0}
.hk-in,.hk-foot{max-width:none}
.hk-sub ul,.hk-mg{max-width:none}
`;
}
