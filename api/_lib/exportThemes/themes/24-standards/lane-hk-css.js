// Theme 24, Standards, lane hk: the kit site's CSS. Public Sans 400 and 600 for the chrome at 12, 15, 20 and 32 px (the two weights the
// theme loads); no radius but the thumb tab's two left corners; no shadows. The brand's own components keep their own css: this file
// styles the sheet around them. The ruler, the dimension lines and the registers read only --ink, --qt, --hr, so a band re-points them.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { roles } from './helpers.js';

export function kitCss(ctx) {
  const B = ctx.brand, R = roles(ctx), D = ctx.roles.dark, F = B.fonts, g = tokenGroups(ctx), stretch = F.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  const shared = [g.space, g.radius, g.width, g.font, g.text, g.shadow].map(decl).join(';');
  return `
.hk{--gr:${R.ground};--ink:${R.ink};--qt:${R.quietOn(R.ground)};--hr:${R.hair};--field:${R.field};--fink:${R.fieldInk};--fqt:${R.fieldQuiet};
  --dk:${R.dark};--dink:${R.darkInk};--dqt:${R.darkQuiet};--ps:${D.surface};--pk:${D.text};--pq:${D.quiet};--hd:56px;
  --chrome:'Public Sans',sans-serif;--display:'${F.display.family}','Public Sans',sans-serif;--body:'${F.body.family}','Public Sans',sans-serif;--mono:'${F.mono.family}','Public Sans',sans-serif;
  background:var(--gr);color:var(--ink);font-family:var(--chrome);font-size:15px;line-height:24px;font-weight:400;min-height:100vh;-webkit-font-smoothing:antialiased}
[data-theme=dark] .hk{--gr:${D.surface};--ink:${D.text};--qt:${D.quiet};--hr:${D.divider};--dk:${R.ground};--dink:${R.ink};--dqt:${R.quietOn(R.ground)};--field:${R.field};color-scheme:dark}
:where(.hk) :where(h1,h2,h3,h4,p,ul,ol,figure,dl,dd){margin:0;padding:0;font-size:inherit;font-weight:inherit}
:where(.hk) :where(ul,ol){list-style:none}
:where(.hk) a{color:inherit}
.hk :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.hk .ui :focus-visible{outline:none}
.hk main:focus{outline:none}
.hk .ui{${decl(colourMap(ctx, 'light'))};${shared}}
.hk .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
.hk .hk-v{font-family:var(--mono);font-size:12px;font-weight:400;line-height:16px;font-variant-numeric:tabular-nums}

/* the bar, the pages panel and the mode switch */
.hk-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;min-height:var(--hd);padding:0 24px;background:var(--gr);border-bottom:1px solid var(--ink)}
.hk-brand{display:flex;align-items:center;line-height:0;flex:none;text-decoration:none;min-height:44px}
.hk-brand svg{display:block}
.hk-lgd{display:none}
[data-theme=dark] .hk-lgl{display:none}
[data-theme=dark] .hk-lgd{display:inline}
.hk-nm{font-size:15px;line-height:24px;font-weight:600}
.hk-menu,.hk-mode button{font:600 12px/16px var(--chrome);color:var(--ink);background:var(--gr);border:1px solid var(--ink);padding:8px 12px;min-height:32px;cursor:pointer;border-radius:0}
.hk-menu{margin-left:auto}
.hk-mode{display:flex;flex:none}
.hk-mode button+button{border-left:0}
html:not([data-theme=dark]) .hk-mode [data-mode=light],[data-theme=dark] .hk-mode [data-mode=dark]{background:var(--ink);color:var(--gr)}
.hk-nav{display:none;position:absolute;left:0;right:0;top:var(--hd);z-index:19;isolation:isolate;background:var(--gr);border-bottom:1px solid var(--ink);padding:24px;max-height:calc(100vh - var(--hd));overflow:auto;overscroll-behavior:contain}
.hk-nav.is-open{display:block}
.hk-nav ol{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px 32px;max-width:1152px;margin:0 auto}
.hk-nav h2{font-size:12px;line-height:16px;font-weight:600;border-top:1px solid var(--ink);padding-top:8px;margin-bottom:4px}
.hk-nav li li a{display:flex;justify-content:space-between;gap:12px;min-height:32px;align-items:center;font-size:15px;text-decoration:none}
.hk-nav li li a[aria-current=page]{font-weight:600;text-decoration:underline;text-underline-offset:4px}
.hk-nav li li span{font-size:12px;color:var(--qt);font-variant-numeric:tabular-nums}
.hk-nav li li a:hover{text-decoration:underline;text-underline-offset:4px}

/* the sheet: running head, ruler, then the page; a thumb tab cut into the right edge */
.hk-main{position:relative}
.hk-wrap{max-width:1152px;margin:0 auto;padding:0 32px 0 24px}
.hk-rh{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto;gap:16px;padding:16px 0 8px;font-size:12px;line-height:16px;font-weight:600;border-bottom:1px solid var(--ink)}
.hk-rh span:last-child{text-align:right;font-variant-numeric:tabular-nums}
.hk-rul{color:var(--ink);margin-top:4px}
.hk-rul svg{display:block}
.hk-rul p{display:flex;justify-content:space-between;font-size:12px;line-height:16px;color:var(--qt);font-variant-numeric:tabular-nums}
.hk-tab{position:absolute;right:0;top:calc(24px + (var(--n) - 1) * 48px);width:16px;height:44px;background:var(--dk);color:var(--dink);border-radius:2px 0 0 2px;font-size:12px;line-height:16px;font-weight:600;text-align:center;padding-top:6px;z-index:5}
.hk-pn{display:flex;justify-content:space-between;gap:16px;margin-top:64px;padding-top:16px;border-top:1px solid var(--ink)}
.hk-pn a{display:flex;flex-direction:column;min-height:44px;justify-content:center;text-decoration:none;max-width:48%}
.hk-pn a:last-child{text-align:right;margin-left:auto}
.hk-pn small{font-size:12px;line-height:16px;color:var(--qt)}
.hk-pn b{font-size:20px;line-height:24px;font-weight:600}
.hk-pn a:hover b{text-decoration:underline;text-underline-offset:4px}
.hk-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;max-width:1152px;margin:48px auto 0;padding:16px 24px 48px;border-top:1px solid var(--hr);font-size:12px;line-height:16px;color:var(--qt)}

/* the title and the matter */
.hk-ttl{max-width:380px;padding:40px 0 32px}
.hk-t{font-size:32px;line-height:40px;font-weight:600;letter-spacing:-0.005em}
.hk-lead{margin-top:12px;max-width:56ch;text-wrap:pretty}
.hk-sec{margin-top:48px;border-top:1px solid var(--ink);padding-top:12px}
.hk-sec:first-of-type{margin-top:0}
.hk-h{font-size:12px;line-height:16px;font-weight:600;margin-bottom:20px}
.hk-cap{font-size:12px;line-height:16px;color:var(--qt);margin-top:12px;max-width:60ch}
.hk-split{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:0 48px;align-items:start}
.hk-split>.hk-ttl{padding-top:40px}
.hk-split--r{grid-template-columns:minmax(0,1fr) minmax(0,340px)}
.hk-split--r>.hk-ttl{grid-column:2;grid-row:1}
.hk-split--r>.hk-stage{grid-column:1;grid-row:1}
.hk-stage{min-width:0;padding-top:40px}
.hk-lcol{min-width:0}
.hk-pl{padding-left:calc(var(--s) * var(--k,1) * 1px)}
.hk-reg--5 li{grid-template-columns:repeat(5,minmax(0,1fr))}
.hk-flow{display:flex;flex-wrap:wrap;gap:24px 32px;align-items:flex-end}
.hk-flow>div{min-width:0}
.hk-lab{display:block;font-size:12px;line-height:16px;font-weight:600;margin-bottom:8px}
.hk-lab+.hk-v{display:block;margin:-4px 0 8px;color:var(--qt)}
.hk-ui{padding:24px;border:1px solid var(--hr);isolation:isolate}
.hk-ui--bare{padding:0;border:0}
.hk-ui--tight{padding:16px}

/* registers: hairline rows of name, value, note */
.hk-reg{border-bottom:1px solid var(--hr)}
.hk-reg li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 16px;align-items:baseline;padding:6px 0;border-top:1px solid var(--hr)}
.hk-reg li:first-child{border-top-color:var(--ink)}
.hk-reg--3 li{grid-template-columns:minmax(0,160px) minmax(0,160px) minmax(0,1fr)}
.hk-reg--sw li{grid-template-columns:20px minmax(0,1fr) auto}
.hk-rn{font-weight:600;display:flex;align-items:center;gap:8px}
.hk-rv{text-align:right;font-variant-numeric:tabular-nums}
.hk-reg--3 .hk-rv{text-align:left}
.hk-rq{color:var(--qt);grid-column:1 / -1;font-size:15px}
.hk-reg--3 .hk-rq{grid-column:auto}
.hk-sw{display:inline-block;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--ink);flex:none}

/* dimension lines: unzoomed px in --w / --h, scaled by the figure's --k (--km at narrow widths) */
.hk-fig{margin:0;max-width:100%}
.hk-fig__g{display:grid;grid-template-columns:auto auto;justify-content:start;max-width:100%}
.hk-fig__h{padding-bottom:8px;min-width:0}
.hk-fig__v{padding-right:8px}
.hk-zoom{width:calc(var(--w) * 1px);zoom:var(--k,1)}
.hk-zoom .ui-btn--block{width:100%}
.hk-dh{display:flex;flex-direction:column;align-items:center;flex:none;width:calc(var(--w) * var(--k,1) * 1px);min-width:0}
.hk-dh b,.hk-dv b{font-size:12px;line-height:16px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.hk-dh i,.hk-dv i{display:block;position:relative;flex:none}
.hk-dh i{width:100%;height:9px;border:solid var(--ink);border-width:0 1px}
.hk-dh i::before{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:var(--ink)}
.hk-dh i::after,.hk-dh u::after,.hk-dv i::after,.hk-dv u::after{content:"";position:absolute;width:8px;height:1px;background:var(--ink);transform:rotate(-45deg)}
.hk-dh i::after{left:-4.5px;top:4px}.hk-dh u{text-decoration:none}.hk-dh u::after{right:-4.5px;top:4px}
.hk-ch{display:flex}
.hk-dv{display:flex;align-items:center;gap:6px;height:calc(var(--h) * var(--k,1) * 1px)}
.hk-dv i{width:9px;height:100%;border:solid var(--ink);border-width:1px 0}
.hk-dv i::before{content:"";position:absolute;top:0;bottom:0;left:4px;width:1px;background:var(--ink)}
.hk-dv i::after{left:0.5px;top:-0.5px}.hk-dv u{text-decoration:none}.hk-dv u::after{left:0.5px;bottom:-0.5px}
.hk-cv{display:flex;flex-direction:column}
.hk-dv b{order:-1;min-width:28px;text-align:right}
.hk-fig__v{display:flex;align-items:flex-start}
.hk-fig__g>.ui{grid-column:2}
.hk-fig__g>span{grid-column:1;grid-row:1}
.hk-fig__h{grid-column:2;grid-row:1}
.hk-fig__v{grid-column:1;grid-row:2}
.hk-fig__g>.ui{grid-row:2}
.hk-fig__g>.hk-zoom{border:0;padding:0}

/* the pages */
.hk-cover{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:48px;align-items:start;background:var(--ps);color:var(--pk);margin:24px -24px 0;padding:48px 32px 40px 24px;border-bottom:1px solid var(--ink)}
.hk-cover .hk-cap,.hk-cover .hk-q{color:var(--pq)}
.hk-cover .hk-dh b,.hk-cover .hk-dv b{color:var(--pk)}
.hk-cover{--ink:var(--pk)}
.hk-cover .hk-t{margin-top:32px}
.hk-cover__logo{line-height:0}
.hk-cover .hk-ui{border:0;padding:0;background:transparent}
.hk-parts{display:flex;flex-direction:column}
.hk-parts a{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:44px;padding:4px 0;border-top:1px solid var(--pk);text-decoration:none}
.hk-parts a:hover b{text-decoration:underline;text-underline-offset:4px}
.hk-parts b{font-size:20px;line-height:24px;font-weight:400}
.hk-parts span{font-size:12px;font-variant-numeric:tabular-nums}
.hk-parts span:first-child{font-size:20px;font-weight:600}
.hk-scale{margin-top:32px;max-width:48ch}
.hk-bar24{display:flex;gap:2px;margin:12px 0 8px}
.hk-bar24 i{flex:1;height:32px;min-width:0;background:var(--dk);box-shadow:none}
.hk-bar24 i.is-sp{background:transparent;box-shadow:inset 0 0 0 1px var(--ink)}
.hk-bar24 i.is-here{background:var(--field)}
.hk-runs{display:flex;gap:2px}
.hk-runs>div{min-width:0}
.hk-runs .hk-dh{width:100%}
.hk-toc>li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:0 12px;padding:12px 0;border-top:1px solid var(--hr)}
.hk-toc>li:first-child{border-top-color:var(--ink)}
.hk-toc h2{font-size:20px;line-height:24px}
.hk-toc ul{grid-column:2;display:flex;flex-wrap:wrap;gap:0 20px;margin-top:4px}
.hk-toc a{display:inline-flex;align-items:center;min-height:32px;gap:8px;text-decoration:none;color:var(--qt)}
.hk-toc a b{font-weight:400;color:var(--ink);font-size:15px}
.hk-toc a:hover b{text-decoration:underline;text-underline-offset:4px}
.hk-toc a[aria-current=page] b{font-weight:600}
.hk-hero{font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em;font-size:clamp(40px,7vw,88px);line-height:1;margin:0}
.hk-cell{min-width:0}
.hk-cell .hk-v{display:block;color:var(--qt)}
.hk-inks{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:24px}
.hk-line{display:block;height:100%;margin:0}
.hk-onui .hk-v{color:var(--quiet)}
.hk-ts li{display:grid;grid-template-columns:48px minmax(0,1fr) 160px;gap:0 16px;padding:12px 0;border-top:1px solid var(--hr);align-items:start}
.hk-ts li:first-child{border-top-color:var(--ink)}
.hk-ts .hk-smp{margin:0;color:var(--ink);overflow-wrap:anywhere}
.hk-ts .hk-meta{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:16px;font-weight:600}
.hk-ts .hk-meta span{font-weight:400}
.hk-ts .hk-meta b{font-weight:600}
.hk-ts .hk-dv{height:calc(var(--h) * 1px)}
.hk-steps{display:flex;flex-wrap:wrap;gap:32px 24px;align-items:flex-end}
.hk-step{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:56px}
.hk-step .hk-bx{background:var(--field);margin-top:8px;width:calc(var(--p) * var(--k) * 1px);height:calc(var(--p) * var(--k) * 1px)}
.hk-step .hk-tr{background:var(--ink);width:calc(var(--p) * 1px);height:calc(var(--p) * 1px);margin-top:12px}
.hk-detail{display:block;width:100%;max-width:480px;height:auto}
.hk-slabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:48px 24px}
.hk-slab-col{display:flex;flex-direction:column;min-width:0}
.hk-plan{min-height:112px;display:flex;flex-direction:column;justify-content:flex-end;position:relative}
.hk-slab{border-left:1px dashed var(--qt);margin:0;position:relative}
.hk-slab i{display:block;box-sizing:border-box}
.hk-dg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
.hk-rule{display:grid;grid-template-columns:120px minmax(0,1fr) minmax(0,2fr);gap:12px 24px;padding:16px 0;border-top:1px solid var(--hr);align-items:start}
.hk-rule:first-child{border-top-color:var(--ink)}
.hk-rule h3{font-size:15px;line-height:24px;font-weight:600}
.hk-rule>p{color:var(--qt)}
.hk-rule .hk-flow{align-items:center}
.hk-mx{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:flex-start}
.hk-mx>div{min-width:0}
.hk-grp{display:grid;grid-template-columns:120px minmax(0,1fr);gap:8px 24px;padding:16px 0;border-top:1px solid var(--hr)}
.hk-grp:first-child{border-top-color:var(--ink)}
.hk-grp h3{font-size:15px;line-height:24px;font-weight:600}
.hk-grp h3+span{display:block;font-weight:400;color:var(--qt)}
.hk-wide{overflow-x:auto;max-width:100%}
.hk-wide:focus-visible{outline:2px solid var(--ink)}
.hk-inl{display:inline-block;white-space:nowrap}
.hk-stk{display:flex;flex-direction:column;gap:8px}
.hk-stk .hk-cap{margin:0}
.hk-sk{display:flex;flex-direction:column;gap:12px}
.hk-sk .ui-skeleton{height:14px}
.hk-route{display:flex;justify-content:space-between;margin-top:8px;font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.ui .ui-link.is-hover{background:var(--sunken);color:var(--text)}
.ui .ui-tabs [role="tab"].is-hover{background:var(--sunken)}
.ui .ui-segmented button[aria-pressed="false"].is-hover{background:var(--sunken)}
.ui a.ui-row.is-hover{background:var(--raised)}

/* screens */
.hk-scr{display:flex;flex-direction:column}
.hk-main2{display:grid;grid-template-columns:minmax(0,1fr) 240px;column-gap:32px;padding:24px}
.hk-main2>div{min-width:0;display:flex;flex-direction:column}
.hk-h2{margin:8px 0 16px;font-size:var(--fs-title);line-height:var(--lh-title);font-stretch:${stretch}%}
.hk-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.hk-side{gap:16px}
.hk-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.hk-live>*{max-width:100%}
.hk-live--ph{height:320px;padding:20px}
.hk-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline);font-stretch:${stretch}%}
.hk-soft{margin:0;color:var(--text-soft);max-width:44ch}
.hk-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.hk-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.hk-rider{width:100%;display:flex;align-items:center;gap:12px}
.hk-who{flex:1;min-width:0}
.hk-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.hk-q2{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.hk-dl{margin:0;display:flex;flex-direction:column;gap:12px}
.hk-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.hk-dl dd{margin:0;font-weight:600}
.hk-ph{outline:1px solid var(--hr);outline-offset:-1px;position:relative;width:390px;height:844px;overflow:hidden}
.hk-ph .ui-topbar{padding:0 20px}
.hk-prows{padding:0 20px}
.hk-pfoot{position:absolute;left:20px;right:20px;bottom:80px}
.hk-ph .ui-tabbar{position:absolute;left:0;right:0;bottom:0}
.hk-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.hk-pre{margin:0;font-family:var(--mono);font-weight:400;white-space:pre;font-variant-numeric:tabular-nums;font-size:13px;line-height:20px;overflow-x:auto;max-width:100%}
.hk-code{background:var(--dk);color:var(--dink);padding:24px}
.hk-code .hk-lab{color:var(--dink)}
.hk-code .hk-cap{color:var(--dqt)}
.hk-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px}
.hk-files li{padding:8px 0;border-top:1px solid var(--hr)}
.hk-files li:first-child{border-top-color:var(--ink)}
.hk-files p{font-size:12px;line-height:16px;color:var(--qt)}
.hk-tk{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:0 48px;align-items:start}
.hk-tk li{grid-template-columns:28px minmax(0,1fr) 80px 80px;gap:0 12px;padding:3px 0}
.hk-tk .hk-rv,.hk-tk .hk-rq{text-align:left;grid-column:auto}
.hk-mt{margin-top:48px}
.hk-tk .hk-th .hk-lab{margin:0}
.hk-ttl--wide{max-width:640px}
.hk-sec.hk-mt{margin-top:48px}
.hk-pt{padding-top:calc(var(--s) * var(--k,1) * 1px)}
.hk-tbf{display:flex;gap:8px;align-items:flex-start;--k:1}
.hk-tbf>.ui{flex:1;min-width:0}
.hk-tbf>.hk-cv{flex:none}
.hk-sp{display:flex;align-items:center;gap:12px;padding:4px 0;border-top:1px solid var(--hr)}
.hk-sp i{display:block;height:8px;background:var(--ink);flex:none}
.hk-sp span{min-width:56px}
.hk-sp .hk-v:first-child{min-width:64px}

@media (max-width:840px){
  .hk-bar{padding:0 16px;gap:12px}
  .hk-wrap{padding:0 24px 0 16px}
  .hk-rh{grid-template-columns:minmax(0,1fr) auto}
  .hk-rh span:nth-child(2),.hk-rh span:nth-child(3){display:none}
  .hk-split,.hk-split--r{grid-template-columns:minmax(0,1fr)}
  .hk-split--r>.hk-ttl,.hk-split--r>.hk-stage{grid-column:1;grid-row:auto}
  .hk-ttl{padding:32px 0 24px}
  .hk-t{font-size:28px;line-height:32px}
  .hk-stage,.hk-split>.hk-ttl{padding-top:0}
  .hk-zoom{zoom:var(--km,1)}
  .hk-dh{width:calc(var(--w) * var(--km,1) * 1px)}
  .hk-dv{height:calc(var(--h) * var(--km,1) * 1px)}
  .hk-step .hk-bx{width:calc(var(--p) * var(--km) * 1px);height:calc(var(--p) * var(--km) * 1px)}
  .hk-cover{grid-template-columns:minmax(0,1fr);gap:32px;margin:16px -24px 0 -16px;padding:32px 24px 32px 16px}
  .hk-ts li{grid-template-columns:48px minmax(0,1fr)}
  .hk-ts .hk-meta{grid-column:2}
  .hk-rule,.hk-grp{grid-template-columns:minmax(0,1fr)}
  .hk-reg--3 li,.hk-reg--5 li{grid-template-columns:minmax(0,1fr) auto}
  .hk-pl{padding-left:calc(var(--s) * var(--km,1) * 1px)}
  .hk-reg--3 .hk-rv{text-align:right}
  .hk-reg--3 .hk-rq{grid-column:1 / -1}
  .hk-dg,.hk-pair{grid-template-columns:minmax(0,1fr)}
  .hk-main2{grid-template-columns:minmax(0,1fr);padding:16px}
  .hk-ui{padding:16px}
  .hk-tk{grid-template-columns:minmax(0,1fr)}
  .hk-toc ul{flex-direction:column}
  .hk-scr .ui-topbar__links{display:none}
  .hk-ch{padding-top:16px}
  .hk-ch>.hk-dh:nth-child(even) b{transform:translateY(-16px)}
  .hk-runs .hk-w{display:none}
  .hk-pre{white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:visible}
  .hk-pt{padding-top:calc(var(--s) * var(--km,1) * 1px)}
  .hk-tbf>.hk-cv{display:none}
  .hk-tbl .ui-table,.hk-tbl .ui-table tbody,.hk-tbl .ui-table tr,.hk-tbl .ui-table td{display:block;width:100%;box-sizing:border-box}
  .hk-tbl .ui-table thead,.hk-tbl .ui-table thead tr{display:flex;flex-wrap:wrap;gap:0 16px;width:100%}
  .hk-tbl .ui-table th{display:block;width:auto;height:auto;border:0;white-space:nowrap}
  .hk-tbl .ui-table tbody tr{padding:8px 0}
  .hk-tbl .ui-table td{display:flex;justify-content:space-between;align-items:center;gap:16px;height:auto;min-height:32px;border:0;text-align:right}
  .hk-tbl .ui-table td::before{content:attr(data-label);text-align:left;color:var(--quiet);font-size:var(--fs-label)}
}
@media (max-width:480px){.hk-nm{display:none}}
@media (prefers-reduced-motion:no-preference){.hk-nav{animation:hk-in 180ms cubic-bezier(.23,1,.32,1)}}
@keyframes hk-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.ph-b>.ph-l{font-weight:600}
`;
}
