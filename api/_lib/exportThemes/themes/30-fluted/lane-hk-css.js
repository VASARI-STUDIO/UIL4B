// Theme 30, Fluted, kit site: the page's own CSS. The real components keep componentsCss untouched; this styles only the pages around them.
// Squares, a reed pitch of 12, the window (an arch) as the one mark, and chrome type in Familjen Grotesk. Every class starts hk-.
import { colourMap } from '../../engine/tokens.js';

export function css(ctx) {
  const decl = (o) => Object.entries(o).map(([k, val]) => `--${k}:${val};`).join('');
  const d = ctx.brand.fonts.display, W = ctx.weights;
  return `.sx{--hk-pad:64px;--hk-chrome:'Familjen Grotesk',sans-serif;--hk-dm:'DM Mono',monospace;min-height:100vh;background:var(--surface);color:var(--text);font:${W.regular} 16px/25px var(--ff-body);-webkit-font-smoothing:antialiased;font-kerning:normal}
.sx :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.sx :where(ul,ol){list-style:none}
.sx *,.sx *::before,.sx *::after{box-sizing:border-box}
.sx a{color:inherit}
.sx-live{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sx-switching *{transition:none!important}
.sx .hk-m-light{${decl(colourMap(ctx, 'light'))}}
.sx .hk-m-dark{${decl(colourMap(ctx, 'dark'))}}

/* the bar and the pages menu */
.hk-bar{border-bottom:1px solid var(--divider)}
.hk-bar__in,.hk-menu__in{max-width:1080px;margin:0 auto;padding:0 var(--hk-pad)}
.hk-bar__in{min-height:72px;display:flex;align-items:center;flex-wrap:wrap;gap:8px 24px}
.hk-name{font-family:var(--ff-display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-size:24px;line-height:32px;letter-spacing:-0.02em;color:var(--text);text-decoration:none}
.hk-ver{font:400 15px/20px var(--hk-chrome);color:var(--quiet);margin-right:auto}
.hk-bar__r{display:flex;align-items:center;gap:16px}
.hk-mode{display:flex}
.hk-btn{font:500 15px/20px var(--hk-chrome);min-height:44px;padding:0 16px;border:1px solid var(--edge);border-radius:0;background:transparent;color:var(--text);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hk-mode .hk-btn+.hk-btn{margin-left:-1px}
.hk-btn[aria-pressed="true"],.hk-btn[aria-expanded="true"]{background:var(--text);color:var(--surface);border-color:var(--text)}
@media (hover:hover){.hk-btn:hover{background:var(--sunken)}.hk-btn[aria-pressed="true"]:hover,.hk-btn[aria-expanded="true"]:hover{background:var(--text)}}
.hk-btn:focus-visible,.hk-name:focus-visible,.hk-menu a:focus-visible,.hk-pl:focus-visible,.hk-toc a:focus-visible,.hk-tw:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.hk-btn:active{background:var(--sunken)}
.hk-menu{display:none;border-bottom:1px solid var(--divider);background:var(--surface)}
.hk-menu.is-open{display:block}
.hk-menu__in{padding-top:24px;padding-bottom:24px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}
.hk-mt{font:500 15px/20px var(--hk-chrome);color:var(--quiet);margin-bottom:8px}
.hk-menu a{display:block;padding:10px 0;font:400 15px/24px var(--hk-chrome);color:var(--text);text-decoration:none}
.hk-menu a[aria-current="page"]{font-weight:500;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
@media (hover:hover){.hk-menu a:hover,.hk-toc a:hover{text-decoration:underline;text-underline-offset:4px}}

/* the page */
.hk-pg{max-width:1080px;margin:0 auto}
.hk-top{padding:72px var(--hk-pad) 40px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px 64px;align-items:end}
.hk-h1{font-family:var(--ff-display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-size:clamp(40px,6.4vw,64px);line-height:1;letter-spacing:-0.02em;color:var(--text);overflow-wrap:break-word}
.hk-sub{display:block;color:var(--quiet)}
.hk-big .hk-h1{font-size:clamp(56px,11vw,120px)}
.hk-big .hk-sub{font-size:clamp(28px,4.4vw,52px);line-height:1.08;margin-top:8px;overflow-wrap:normal;word-break:normal}
.hk-lead{font:${W.regular} 16px/25px var(--ff-body);color:var(--text-soft);max-width:36em}
.hk-show{padding:0 var(--hk-pad) 56px;display:flex;flex-direction:column;gap:40px}
.hk-fixed{border-top:1px solid var(--divider);border-bottom:1px solid var(--divider);padding-top:40px}
.hk-fixed .hk-show{padding-bottom:56px}
.hk-cols{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:40px 24px}
.hk-g{border-top:1px solid var(--divider);padding-top:16px;display:flex;flex-direction:column;gap:16px;min-width:0}
.hk-gl{font:500 15px/20px var(--hk-chrome);color:var(--text);display:flex;align-items:center;gap:8px}
.hk-gl::before{content:'';flex:none;width:8px;height:16px;border-radius:4px 4px 0 0;background:var(--action)}
.hk-g>.ui,.hk-ui{background:transparent}
.hk-d{font:400 15px/20px var(--hk-chrome);color:var(--text-soft)}
.hk-kn{font:500 15px/20px var(--hk-chrome);color:var(--text)}
.hk-v{font:400 15px/20px var(--hk-dm);color:var(--quiet);font-variant-numeric:tabular-nums}
.hk-c{display:block;text-align:center}
.hk-cl{font:400 15px/20px var(--hk-chrome);color:var(--quiet)}
.hk-na{font:400 15px/20px var(--hk-chrome);color:var(--quiet)}
.hk-cap{display:flex;flex-direction:column;margin-top:16px}
.hk-stack{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.hk-stackg{display:flex;flex-direction:column;gap:40px;min-width:0}
.hk-btns{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.hk-chips{gap:8px}
.hk-act{margin-top:6px}
.hk-narrow{max-width:468px}
.hk-row{display:flex;flex-direction:column;gap:12px}
.hk-rn{font:500 15px/20px var(--hk-chrome);color:var(--text);padding-top:16px;border-top:1px solid var(--divider)}
.hk-mx{display:grid;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));gap:20px 16px}
.hk-cell{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0}
.hk-cell>.ui-field,.hk-cell>.ui-check{width:100%}

/* the cover and the contents */
.hk-cv{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px 64px;align-items:end}
.hk-cv .hk-logo{grid-column:1/-1}
.hk-toc li{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1px solid var(--divider)}
.hk-toc a{flex:1;padding:10px 0;font:400 15px/24px var(--hk-chrome);color:var(--text);text-decoration:none}

/* colour */
.hk-swl{display:flex;flex-direction:column}
.hk-sw{display:grid;grid-template-columns:32px minmax(0,1fr) minmax(0,auto) 72px;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider)}
.hk-sw i{width:32px;height:32px;border:1px solid;display:block}
.hk-sn{font:400 15px/20px var(--hk-chrome);color:var(--text)}
.hk-hex{text-align:right}

/* type, spacing, radii, elevation */
.hk-tsl{display:flex;flex-direction:column}
.hk-ts{display:grid;grid-template-columns:minmax(0,1fr) 120px 150px;gap:8px 16px;align-items:center;padding:20px 0;border-bottom:1px solid var(--divider)}
.hk-tsx{color:var(--text);overflow-wrap:anywhere}
.hk-spl{display:flex;flex-direction:column}
.hk-spr{display:grid;grid-template-columns:88px minmax(0,1fr) 56px;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--divider)}
.hk-spb{display:block;height:8px;background:var(--action);max-width:100%}
.hk-form{display:flex;flex-direction:column;max-width:360px;padding-left:72px}
.hk-gap{position:relative;flex:none}
.hk-gap i{position:absolute;left:-24px;top:0;bottom:0;width:9px;border:1px solid var(--quiet);border-left:0}
.hk-gap span{position:absolute;left:-72px;top:50%;width:40px;margin-top:-10px;text-align:right}
.hk-well{display:flex;flex-direction:column;gap:12px;padding:20px;background:var(--sunken);border-radius:var(--r-card)}
.hk-dlg{max-width:480px}

/* panels and lists */
.hk-panel{padding:24px;display:flex;flex-direction:column;gap:16px;border:1px solid var(--divider)}
.hk-stl li{display:flex;align-items:center;justify-content:space-between;min-height:44px;border-bottom:1px solid var(--divider)}
.hk-stl li:last-child{border-bottom:0}
.hk-load{display:flex;align-items:center;gap:24px}
.hk-skel{display:flex;flex-direction:column;gap:10px;flex:1;min-width:0}
.hk-side{max-width:244px}
.hk-phone{max-width:390px}
.hk-scrim{padding:48px 24px;min-height:360px}
.hk-tw{min-width:0}
.hk-tbl{width:100%;table-layout:fixed}

/* screens */
.hk-scr{display:flex;flex-direction:column;border:1px solid var(--edge);background:var(--surface);color:var(--text);min-width:0}
.hk-scrmain{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr)}
.hk-col{display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-5);min-width:0}
.hk-col+.hk-col{border-left:var(--w-hairline) solid var(--divider)}
.hk-lbl{color:var(--quiet);font:${W.medium} var(--fs-label)/var(--lh-label) var(--ff-body)}
.hk-big2{font-size:var(--fs-headline);line-height:var(--lh-headline);margin:0}
.hk-eta{display:flex;flex-wrap:wrap;align-items:center;gap:var(--sp-2) var(--sp-4)}
.hk-soft{color:var(--text-soft)}
.hk-route{display:flex;justify-content:space-between;margin-top:var(--sp-2);color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.hk-phonescr{max-width:390px}
.hk-top2{display:flex;justify-content:space-between;align-items:center;height:56px;padding:0 var(--sp-4);border-bottom:var(--w-hairline) solid var(--divider)}

/* tokens and code */
.hk-tkc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px}
.hk-tkc li{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr);gap:12px;padding:6px 0;border-bottom:1px solid var(--divider);min-width:0}
.hk-tkc .hk-v{overflow-wrap:anywhere}
.hk-tkh span{font:500 15px/20px var(--hk-chrome);color:var(--text)}
.hk-dot{display:inline-block;width:12px;height:12px;margin-right:8px;border:1px solid var(--quiet);vertical-align:-1px}
.hk-tkl li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 12px;padding:6px 0;border-bottom:1px solid var(--divider)}
.hk-tv{overflow-wrap:anywhere;text-align:right}
.hk-files li{display:grid;grid-template-columns:minmax(0,140px) minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid var(--divider)}
.hk-pre{margin:0;font:400 15px/22px var(--hk-dm);color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:var(--sunken)}
.hk-copy{align-self:flex-start}
.hk-copy.is-done{background:var(--text);color:var(--surface)}

/* the glass figure and its keys */
.hk-md{display:none}
.hk-md--l{display:block}
html[data-theme="dark"] .hk-md--l{display:none}
html[data-theme="dark"] .hk-md--d{display:block}
.hk-band{display:flex;flex-direction:column;gap:16px}
.hk-fig{position:relative;width:100%;aspect-ratio:1080/432;isolation:isolate}
.hk-fig>svg{position:absolute;left:0;width:100%;display:block}
.hk-fl,.hk-ov{top:0;height:100%}
.hk-gl{bottom:0;height:auto}
svg.hk-gl{display:block}
.hk-keys{display:grid;grid-template-columns:var(--tc);align-items:start}
.hk-key{grid-column:var(--gc);display:flex;flex-direction:column;gap:2px;min-width:0;overflow-wrap:anywhere;padding-right:4px}
.hk-ka{font:500 15px/20px var(--hk-chrome);color:var(--text)}
.hk-kb{font:400 15px/20px var(--hk-chrome);color:var(--text-soft)}
.hk-kb .hk-v{color:var(--quiet)}
.hk-note{font:400 15px/20px var(--hk-chrome);color:var(--text-soft);padding:0 var(--hk-pad);max-width:64em}

/* previous and next */
.hk-pn{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:48px var(--hk-pad) 72px}
.hk-pl{display:flex;flex-direction:column;gap:4px;min-height:44px;color:var(--text);text-decoration:none;max-width:40%}
.hk-pl--next{text-align:right;align-items:flex-end}
.hk-pk{font:400 15px/20px var(--hk-chrome);color:var(--quiet)}
.hk-pt{font-family:var(--ff-display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-size:24px;line-height:32px;letter-spacing:-0.02em;border-bottom:2px solid transparent}
@media (hover:hover){.hk-pl:hover .hk-pt{border-bottom-color:var(--action)}}
.hk-pos{padding-top:12px}

@media (max-width:840px){
  .sx{--hk-pad:20px}
  .hk-top{grid-template-columns:minmax(0,1fr);padding-top:40px;padding-bottom:28px}
  .hk-menu__in{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hk-cols{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hk-mx{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hk-keys{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;padding:0 var(--hk-pad)}
  .hk-key{grid-column:auto}
  .hk-cv{grid-template-columns:minmax(0,1fr)}
  .hk-scrmain{grid-template-columns:minmax(0,1fr)}
  .hk-col+.hk-col{border-left:0;border-top:var(--w-hairline) solid var(--divider)}
  .hk-tkc{grid-template-columns:minmax(0,1fr)}
  .hk-ts{grid-template-columns:minmax(0,1fr);padding:16px 0}
  .hk-form{padding-left:72px}
  .hk-pl{max-width:44%}
  .hk-pt{font-size:20px;line-height:28px}
}
@media (max-width:560px){
  .hk-cols,.hk-mx{grid-template-columns:minmax(0,1fr)}
  .hk-menu__in{grid-template-columns:minmax(0,1fr)}
  .hk-sw{grid-template-columns:32px minmax(0,1fr) 72px}
  .hk-sw .hk-v:not(.hk-hex){display:none}
  .hk-bar__r{width:100%;justify-content:space-between}
}
@media (max-width:560px){
  .hk-tbl,.hk-tbl tbody{display:block}
  .hk-tbl colgroup{display:none}
  .hk-tbl thead{display:none}
  .hk-tbl tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 12px;align-items:center}
  .hk-tbl td:nth-child(1){grid-column:1;grid-row:1}
  .hk-tbl td:nth-child(3){grid-column:2;grid-row:1}
  .hk-tbl td:nth-child(2){grid-column:1;grid-row:2}
  .hk-tbl td:nth-child(4){grid-column:2;grid-row:2}
}
@media (prefers-reduced-motion:reduce){.hk-btn{transition:none}}${ctx.placeholders ? '.ui-card__title .ph-n{white-space:normal!important}' : ''}
`;
}
