// Theme 23, Broadsheet, lane ht: the web edition's stylesheet, shared by the guidelines site and the UI kit site. The same newsprint, press ink
// and night edition as the brand book (lane-bk-css.js), so the three web parts read as one paper. Classes are hx-; wide rules sit outside
// @media, the narrow ones in (max-width:840px), the engine's break, so the canvas boards pick the right set.
import { N, spotOf, displayWeight, bodyWeight } from './helpers.js';
import { nightGround } from './lane-bk-css.js';

// the action colour stepped up in lightness until it holds 4.5 : 1 on the night ground (as the book does)
const nightSpot = (ctx) => { const C = ctx.C, g = nightGround(ctx), o = C.toOklch(ctx.roles.dark.action); let hex = ctx.roles.dark.action; for (let l = o.L; C.ratio(hex, g) < 4.5 && l < 0.98; l += 0.02) hex = C.fromOklch(l, o.C, o.H); return hex; };

export function htCss(ctx) {
  const C = ctx.C, F = ctx.brand.fonts, dW = displayWeight(ctx), st = F.display.stretch || 100, b5 = bodyWeight(ctx, 500), b7 = bodyWeight(ctx, 700), b6 = bodyWeight(ctx, 600);
  const night = { g: nightGround(ctx), ink: N.paper, quiet: C.fromOklch(0.74, 0.01, 250), hair: C.fromOklch(0.4, 0.008, 250) };
  const cond = `'Sofia Sans Condensed',sans-serif`;
  return `:root{--hx-g:${N.paper};--hx-ink:${N.ink};--hx-q:${N.quiet};--hx-hair:${N.hair};--hx-spot:${spotOf(ctx)};--hx-sheet:${N.paper};--hx-press:${N.ink};
--hx-disp:'${F.display.family}',serif;--hx-body:'${F.body.family}',sans-serif;--hx-gx:48px;--hx-gap:32px}
[data-theme="dark"]{--hx-g:${night.g};--hx-ink:${night.ink};--hx-q:${night.quiet};--hx-hair:${night.hair};--hx-spot:${nightSpot(ctx)}}
html{background:var(--hx-g)}
.hx{background:var(--hx-g);color:var(--hx-ink);font:400 17px/1.55 'Sofia Sans',sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;font-synthesis:none;min-height:100vh}
.hx :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure,pre){margin:0;padding:0}.hx :where(ul,ol){list-style:none}
.hx a{color:inherit}
.hx :focus-visible{outline:2px solid var(--hx-ink);outline-offset:3px}
.hx-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--hx-ink);color:var(--hx-g);padding:12px 16px;font:600 15px/20px 'Sofia Sans',sans-serif;text-decoration:none}
.hx-skip:focus{top:16px}
.hx-d{display:none}[data-theme="dark"] .hx-d{display:block}[data-theme="dark"] .hx-l{display:none}
.hx-wrap{max-width:1248px;margin:0 auto;padding:0 var(--hx-gx)}
.hx-cn{font-family:${cond};font-weight:600;letter-spacing:.02em}

/* the masthead: the ears (edition, part, the light and dark switch), the nameplate, the thin-thick rule, the section strip */
.hx-ears{display:flex;align-items:center;gap:24px;padding:12px 0 10px;border-bottom:1px solid var(--hx-ink);font:600 15px/20px ${cond};letter-spacing:.02em}
.hx-ears p{color:var(--hx-q)}.hx-ears .hx-part{margin-left:auto;color:var(--hx-ink)}
.hx-mode{display:inline-flex;border:1px solid var(--hx-ink)}
.hx-mode button{appearance:none;border:0;background:transparent;color:var(--hx-ink);font:600 15px/1 ${cond};height:32px;padding:0 12px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
html:not([data-theme="dark"]) .hx-mode [data-mode="light"],[data-theme="dark"] .hx-mode [data-mode="dark"]{background:var(--hx-ink);color:var(--hx-g)}
.hx-mode button:focus-visible{outline-offset:-5px;outline-color:currentColor}
@media (hover:hover){html:not([data-theme="dark"]) .hx-mode [data-mode="dark"]:hover,[data-theme="dark"] .hx-mode [data-mode="light"]:hover{background:var(--hx-hair)}}
.hx-np{display:flex;justify-content:center;padding:20px 0 14px}
.hx-np a{display:block;width:var(--nw);max-width:100%;aspect-ratio:var(--na);text-decoration:none}
.hx-np svg,.hx-np .logo-slot{display:block;width:100%!important;height:auto!important}
.hx-np .logo-slot{aspect-ratio:var(--na)}
.hx-rule{display:block;height:2px;border-top:1px solid var(--hx-ink);border-bottom:3px solid var(--hx-ink);box-sizing:content-box}
.hx-rule--up{border-top-width:3px;border-bottom-width:1px}
.hx-strip{border-bottom:1px solid var(--hx-hair)}
.hx-secbtn{display:none}
.hx-secs{display:flex;justify-content:center;flex-wrap:wrap;column-gap:28px}
.hx-secs a{display:flex;align-items:baseline;gap:6px;padding:10px 0 7px;font:600 16px/20px ${cond};letter-spacing:.02em;text-decoration:none;border-bottom:3px solid transparent;transition:border-color 120ms ease-out}
.hx-secs .hx-n{font-weight:700;color:var(--hx-q)}
.hx-secs a[aria-current]{border-bottom-color:var(--hx-spot)}
@media (hover:hover){.hx-secs a:hover{border-bottom-color:var(--hx-hair)}.hx-secs a[aria-current]:hover{border-bottom-color:var(--hx-spot)}}

/* the story: folio bar over the head rule, the headline, the deck, the section's other pages in the fourth column */
.hx-main{display:block;padding-bottom:64px}
.hx-art{padding-top:40px}
.hx-folio{display:flex;align-items:baseline;gap:16px;padding-bottom:8px;font:700 18px/24px ${cond};letter-spacing:.01em}
.hx-folio__no{font-variant-numeric:tabular-nums}.hx-folio__t{flex:1}
.hx-folio__pg{font-weight:600;color:var(--hx-q)}
.hx-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:var(--hx-gap)}
.hx-c13{grid-column:1/4}.hx-c12{grid-column:1/3}.hx-c34{grid-column:3/5}.hx-c4{grid-column:4}.hx-c14{grid-column:1/-1}
.hx-r{position:relative}
.hx-r::before{content:'';position:absolute;left:calc(var(--hx-gap) / -2);top:0;bottom:0;width:1px;background:var(--hx-hair)}
.hx-hd{padding-top:28px}
.hx-fit{container-type:inline-size}
.hx-h1{font-family:var(--hx-disp);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance;font-size:min(var(--fs),calc(100cqi * var(--k)));font-variant-numeric:lining-nums}
.hx-h1--xl{line-height:.96}
.hx-deck{margin-top:24px;max-width:44rem;font:${b5} 22px/1.42 var(--hx-body);text-wrap:pretty}
.hx-lab{font:700 16px/20px ${cond};letter-spacing:.02em;padding-bottom:6px;border-bottom:1px solid var(--hx-ink)}
.hx-lab--gap{margin-top:32px}
.hx-also li{border-bottom:1px solid var(--hx-hair)}
.hx-also a{display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;padding:7px 0;font:600 15px/20px 'Sofia Sans',sans-serif;text-decoration:none}
.hx-also .hx-n{font-weight:400;color:var(--hx-q)}
.hx-also a[aria-current]{color:var(--hx-ink);box-shadow:inset 3px 0 0 var(--hx-spot);padding-left:10px;grid-template-columns:30px minmax(0,1fr)}
@media (hover:hover){.hx-also a:hover span:last-child{text-decoration:underline;text-decoration-color:var(--hx-hair);text-underline-offset:3px}}

/* the copy: three ruled columns, paragraphs indented as a paper sets them */
.hx-story{margin-top:48px;padding-top:16px;border-top:1px solid var(--hx-ink);columns:3;column-gap:var(--hx-gap);column-rule:1px solid var(--hx-hair);font:400 17px/1.55 var(--hx-body);hyphens:auto}
.hx-story--2{columns:2}
.hx-story p{orphans:2;widows:2}
.hx-story p+p{text-indent:1.4em}
.hx-story h2{font:700 17px/22px ${cond};letter-spacing:.02em;break-after:avoid;margin:20px 0 4px}
.hx-story h2:first-child{margin-top:0}
.hx-story h2+p{text-indent:0}
.hx-story b{font-weight:${b7}}
.hx-m{font-family:'Fragment Mono',monospace;font-size:.9em;letter-spacing:0}

/* the printed page, pasted in at its own size; zoomed down on narrower screens */
.hx-rep{width:100%;margin-top:72px}
.hx-rep__bar{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:8px 0;border-top:3px solid var(--hx-ink);font:600 15px/20px ${cond};letter-spacing:.02em}
.hx-rep__bar p:last-child{color:var(--hx-q)}
.hx-sheet{width:1123px;margin:16px auto 0;outline:1px solid var(--hx-hair)}
.hx-sheet>.pg{width:1123px;height:1587px;overflow:hidden}
@media (min-width:1000px) and (max-width:1239px){.hx-sheet{zoom:.76}}
@media (min-width:841px) and (max-width:999px){.hx-sheet{zoom:.62}}

/* halftone plates (the book's screen), pasted in on newsprint in either edition */
.hx-plate{margin-top:40px}
.hx .bk-dots{display:block;width:100%;height:auto;border-top:1px solid var(--hx-press)}
.hx .bk-dots__paper{fill:var(--hx-sheet)}.hx .bk-dots__ink{stroke:var(--hx-press)}
.hx .bk-dots .bk-ink{fill:#fff;r:4px}
.hx-cap{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;column-gap:16px;margin-top:8px;font:400 15px/22px 'Sofia Sans',sans-serif}
.hx-cap span{color:var(--hx-q)}
.hx-say{font-family:var(--hx-disp);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;line-height:1.05;text-wrap:balance;font-size:min(var(--fs),calc(100cqi * var(--k)))}

/* the front: the lead, the index beside it, the contents as the paper's section index */
.hx-front .hx-np{padding:28px 0 20px}
.hx-lead{padding-top:32px}
.hx-ix li{border-bottom:1px solid var(--hx-hair)}
.hx-ix a{display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;padding:8px 0;font:600 16px/20px ${cond};letter-spacing:.02em;text-decoration:none}
.hx-ix .hx-n{color:var(--hx-q)}
@media (hover:hover){.hx-ix a:hover span:last-child{text-decoration:underline;text-decoration-color:var(--hx-hair);text-underline-offset:3px}}
.hx-side p{font:400 16px/1.5 var(--hx-body);margin-top:8px}
.hx-toc{margin-top:88px}
.hx-toc__cols{margin-top:24px;columns:4;column-gap:var(--hx-gap);column-rule:1px solid var(--hx-hair)}
.hx-toc__s{break-inside:avoid;padding-bottom:28px}
.hx-toc__h{display:flex;gap:8px;font:700 20px/24px ${cond};letter-spacing:.01em;padding-bottom:6px;border-bottom:1px solid var(--hx-ink)}
.hx-toc__h .hx-n{color:var(--hx-q)}
.hx-toc ol a{display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid var(--hx-hair);font:400 16px/22px var(--hx-body);text-decoration:none}
.hx-toc ol .hx-n{color:var(--hx-q);font:600 15px/22px ${cond}}
@media (hover:hover){.hx-toc ol a:hover span:last-child{text-decoration:underline;text-decoration-color:var(--hx-hair);text-underline-offset:3px}}

/* the jump lines and the foot */
.hx-jumps{display:flex;justify-content:space-between;gap:24px;margin-top:72px;padding-top:12px;border-top:1px solid var(--hx-ink);font:italic 500 17px/24px 'Sofia Sans',sans-serif}
.hx-jumps a{text-decoration:none;border-bottom:1px solid var(--hx-hair)}
.hx-jumps b{font-style:normal;font-weight:700}
.hx-jumps .hx-next{margin-left:auto;text-align:right}
@media (hover:hover){.hx-jumps a:hover{border-bottom-color:var(--hx-ink)}}
.hx-foot{display:flex;justify-content:space-between;gap:16px;margin-top:48px;padding:12px 0 32px;border-top:3px solid var(--hx-ink);font:600 15px/20px ${cond};letter-spacing:.02em;color:var(--hx-q)}

/* UI kit: the live components as display ads, boxed in a heavy and a hairline rule on the paper */
.hx-ad{border:3px solid var(--hx-ink);padding:5px;background:var(--hx-g)}
.hx-ad__in{border:1px solid var(--hx-ink);background:var(--surface);color:var(--text);padding:40px;container-type:inline-size}
.hx-ad__in.ui{font-family:var(--hx-body)}
.hx-ad--flush .hx-ad__in{padding:0}
.hx-adcap{display:flex;justify-content:space-between;gap:16px;margin-top:8px;font:400 15px/22px 'Sofia Sans',sans-serif}
.hx-adcap span:last-child{color:var(--hx-q)}
.hx-kit{margin-top:48px}
.hx-vals li{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0;border-bottom:1px solid var(--hx-hair);font:400 15px/20px 'Sofia Sans',sans-serif}
.hx-vals li>span:last-child{text-align:right}
.hx-note{margin-top:16px;font:400 16px/1.5 var(--hx-body)}
.hx-stack{display:flex;flex-direction:column;align-items:flex-start;gap:24px}
.hx-row{display:flex;flex-wrap:wrap;align-items:center;gap:16px}
.hx-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;align-items:start}
.hx-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
.hx-fs{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;min-width:0}
.hx-fs legend{padding:0 0 8px;font:700 15px/20px ${cond};letter-spacing:.02em;color:var(--text)}
.hx-big{font-family:var(--hx-disp);font-weight:${dW};font-stretch:${st}%;font-size:clamp(32px,7cqi,64px);line-height:1.02;letter-spacing:-0.01em;text-wrap:balance;color:var(--text)}
.hx-p{font:400 16px/1.5 var(--hx-body);color:var(--text-soft, var(--text));max-width:60ch}
.hx-sws{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0;border-top:1px solid var(--edge)}
.hx-sws li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:4px 12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--divider, var(--edge))}
.hx-sw{grid-row:span 2;width:36px;height:36px;border:1px solid var(--edge)}
.hx-sws p{font:400 14px/18px 'Fragment Mono',monospace;color:var(--text);overflow-wrap:anywhere}
.hx-type li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--divider, var(--edge))}
.hx-type li>span{font:400 14px/18px 'Fragment Mono',monospace;color:var(--text)}
.hx-type li>p{color:var(--text);overflow-wrap:anywhere}
.hx-space li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:center;padding:6px 0}
.hx-space li>span{font:400 14px/18px 'Fragment Mono',monospace;color:var(--text)}
.hx-space i{display:block;height:16px;background:var(--action)}
.hx-radii{display:flex;flex-wrap:wrap;gap:32px}
.hx-radii li{display:flex;flex-direction:column;gap:8px;font:400 14px/18px 'Fragment Mono',monospace;color:var(--text)}
.hx-rbox{display:block;width:96px;height:72px;border:solid var(--edge);background:var(--raised)}
.hx-elev{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
.hx-elev__s{min-height:120px;padding:16px;border:1px solid var(--edge);font:${b6} 15px/20px var(--hx-body);color:var(--text)}
.hx-states{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.hx-states li{display:flex;flex-direction:column;align-items:flex-start;gap:12px;font:${b6} 15px/20px var(--hx-body);color:var(--text)}
.hx-ad__in>.ui-scrim{position:relative;isolation:isolate;padding:56px 24px}
.hx-ad__in>.ui-scrim .ui-dialog{position:relative;max-width:440px}
.hx-tw{overflow-x:auto}
.hx-scr{display:flex;flex-direction:column;gap:16px;min-width:0}
.hx-scr__top,.hx-scr__ft{display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--text)}
.hx-desk{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;padding:40px}
.hx-desk__r{display:flex;flex-direction:column;gap:12px}
.hx-desk__r>p{font:${b7} 16px/20px var(--hx-body);color:var(--text)}
.hx-phone{width:360px;max-width:100%;margin:0 auto;padding:24px 20px;border:1px solid var(--edge);border-radius:${Math.max(0, (ctx.radius?.card ?? 0))}px;background:var(--surface)}
.hx-tl li{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid var(--hx-hair)}
.hx-tl--2 li{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
.hx-tl__h{font:700 15px/20px ${cond};letter-spacing:.02em}
.hx-tv{display:flex;align-items:center;gap:8px;font:400 14px/18px 'Fragment Mono',monospace}
.hx-dot{display:inline-block;width:14px;height:14px;border:1px solid var(--hx-hair);flex:none}
.hx-tok{appearance:none;border:0;background:transparent;color:var(--hx-ink);padding:2px 0;font:400 14px/18px 'Fragment Mono',monospace;cursor:pointer;text-align:left;border-bottom:1px solid var(--hx-hair);transition:border-color 120ms ease-out}
@media (hover:hover){.hx-tok:hover{border-bottom-color:var(--hx-ink)}}
.hx-tok.is-done{border-bottom-color:var(--hx-spot)}
.hx-grps{margin-top:40px;columns:3;column-gap:var(--hx-gap);column-rule:1px solid var(--hx-hair)}
.hx-grps>li{break-inside:avoid;padding-bottom:24px}
.hx-code{margin-top:48px}
.hx-code__h{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0;border-top:3px solid var(--hx-ink);border-bottom:1px solid var(--hx-ink)}
.hx-code__h h2{font:700 18px/24px ${cond};letter-spacing:.01em}
.hx-copy{appearance:none;border:1px solid var(--hx-ink);background:transparent;color:var(--hx-ink);font:600 15px/1 ${cond};letter-spacing:.02em;height:32px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
@media (hover:hover){.hx-copy:hover{background:var(--hx-ink);color:var(--hx-g)}}
.hx-copy:active{transform:scale(.97)}
.hx-copy.is-done{background:var(--hx-ink);color:var(--hx-g)}
.hx-code pre{margin-top:12px;padding:16px 0;font:400 14px/1.6 'Fragment Mono',monospace;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2}
.hx-code pre code{font:inherit}
.hx-code__two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--hx-gap)}
.hx-code__two>div+div{position:relative}
.hx-code__two>div+div::before{content:'';position:absolute;left:calc(var(--hx-gap) / -2);top:0;bottom:0;width:1px;background:var(--hx-hair)}
.sx-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;margin:0;padding:12px 20px;background:var(--hx-ink);color:var(--hx-g);font:600 15px/1.3 'Sofia Sans',sans-serif;pointer-events:none}
.sx-live:empty{display:none}
.sx-switching *,.sx-switching *::before,.sx-switching *::after{transition:none!important}

@media (max-width:840px){
  :root{--hx-gx:20px;--hx-gap:24px}
  .hx-ears{flex-wrap:wrap;row-gap:4px;gap:12px}.hx-ears .hx-ed{flex-basis:100%}.hx-ears .hx-part{margin-left:0;flex:1}
  .hx-np{padding:16px 0 12px}.hx-np a{width:min(var(--nw),var(--nwn))}
  .hx-front .hx-np{padding:20px 0 14px}
  .hx-strip{position:relative}
  .hx-secbtn{display:flex;align-items:center;justify-content:space-between;width:100%;appearance:none;border:0;background:transparent;color:var(--hx-ink);padding:12px 0;font:700 16px/20px ${cond};letter-spacing:.02em;cursor:pointer}
  .hx-secbtn i{font-style:normal;font-weight:600;color:var(--hx-q)}
  .hx-secs{display:none;flex-direction:column;padding-bottom:8px}
  .hx-secs[data-open="true"],.hx-secs.is-open{display:flex}
  .hx-secs a{padding:10px 0;border-bottom:1px solid var(--hx-hair)}
  .hx-secs a[aria-current]{border-bottom-color:var(--hx-hair);box-shadow:inset 3px 0 0 var(--hx-spot);padding-left:12px}
  .hx-art{padding-top:28px}
  .hx-g{grid-template-columns:minmax(0,1fr)}
  .hx-c13,.hx-c12,.hx-c34,.hx-c4,.hx-c14{grid-column:1/-1}
  .hx-r::before{display:none}
  .hx-c4.hx-r{margin-top:32px}
  .hx-deck{font-size:19px}
  .hx-story,.hx-story--2{columns:1;margin-top:32px}
  .hx-rep{margin-top:48px}
  .hx-sheet{margin:12px 0 0}
  .hx-toc{margin-top:56px}.hx-toc__cols{columns:1}
  .hx-jumps{flex-direction:column;gap:12px}.hx-jumps .hx-next{margin-left:0;text-align:left}
  .hx-foot{flex-direction:column;gap:4px}
  .hx-ad__in{padding:20px}
  .hx-two,.hx-three,.hx-elev,.hx-desk,.hx-code__two{grid-template-columns:minmax(0,1fr)}
  .hx-desk{padding:20px}
  .hx-sws li{grid-template-columns:24px minmax(0,1fr) auto;padding:8px 0}.hx-sw{grid-row:auto;width:24px;height:24px}.hx-sws p:last-child{text-align:right}
  .hx-ad__in:has(>.hx-tw){padding:0}.hx-tw{zoom:.9}.hx-tw .hx-wide{display:none}
  .hx-code__two>div+div::before{display:none}
  .hx-states{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hx-grps{columns:1}
  .hx-tl li{grid-template-columns:minmax(0,1fr) minmax(0,1fr);row-gap:4px}.hx-tl li>p:first-child{grid-column:1/-1}
  .hx-tl--2 li>p:first-child{grid-column:auto}
}
@media (prefers-reduced-motion:reduce){.hx *{transition:none!important}}
.ph-b>.ph-l{font-family:var(--hx-body);font-weight:${b5}}
.hx-tw .ph-c.ph-n{white-space:normal!important}`;
}
