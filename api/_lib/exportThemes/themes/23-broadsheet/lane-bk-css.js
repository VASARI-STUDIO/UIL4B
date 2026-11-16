// Theme 23, Broadsheet, brand book lane: the web edition's stylesheet. Newsprint and press ink are the theme's materials; the night edition
// (the dark switch) prints paper-coloured type on a press-black ground, with every plate kept as a pasted-in print on newsprint.
// Wide rules sit outside @media; two columns in (max-width:840px), one column in (max-width:600px).
import { N, spotOf, displayWeight, bodyWeight } from './helpers.js';

export const nightGround = (ctx) => ctx.C.fromOklch(0.205, 0.008, 250);
// the action colour stepped up in lightness until it holds 4.5 : 1 on the night ground
const nightSpot = (ctx) => { const C = ctx.C, g = nightGround(ctx), o = C.toOklch(ctx.roles.dark.action); let hex = ctx.roles.dark.action; for (let l = o.L; C.ratio(hex, g) < 4.5 && l < 0.98; l += 0.02) hex = C.fromOklch(l, o.C, o.H); return hex; };

export function bookCss(ctx) {
  const C = ctx.C, F = ctx.brand.fonts, dW = displayWeight(ctx), st = F.display.stretch || 100;
  const night = { g: nightGround(ctx), ink: N.paper, quiet: C.fromOklch(0.74, 0.01, 250), hair: C.fromOklch(0.4, 0.008, 250) };
  return `:root,.bk--board{--np-g:${N.paper};--np-ink:${N.ink};--np-q:${N.quiet};--np-hair:${N.hair};--np-spot:${spotOf(ctx)};--np-press:${N.ink};--np-sheet:${N.paper};
--np-display:'${F.display.family}',serif;--np-body:'${F.body.family}',sans-serif;--np-mono:'Fragment Mono',monospace;--np-gx:32px;--np-gap:32px}
[data-theme="dark"]{--np-g:${night.g};--np-ink:${night.ink};--np-q:${night.quiet};--np-hair:${night.hair};--np-spot:${nightSpot(ctx)}}
html{background:var(--np-g)}
.bk{background:var(--np-g);color:var(--np-ink);font:400 17px/1.55 'Sofia Sans',sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;font-synthesis:none;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}.bk :where(ul,ol){list-style:none}
.bk a{color:inherit}.bk b{font-weight:700}
.bk :focus-visible{outline:2px solid var(--np-ink);outline-offset:3px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--np-ink);color:var(--np-g);padding:12px 16px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:inline}[data-theme="dark"] .bk-for-light{display:none}
.np-roles.bk-for-dark{display:none}[data-theme="dark"] .np-roles.bk-for-dark{display:block}

/* the masthead bar: brand, the section index as a paper's section strip, the edition switch; the thin-thick rule under it */
.bk-top{position:sticky;top:0;z-index:10;display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:24px;padding:12px max(var(--np-gx),calc((100vw - 1240px) / 2)) 18px;background:var(--np-g)}
.bk-top::after{content:'';position:absolute;left:max(var(--np-gx),calc((100vw - 1240px) / 2));right:max(var(--np-gx),calc((100vw - 1240px) / 2));bottom:6px;height:2px;border-top:1px solid var(--np-ink);border-bottom:3px solid var(--np-ink);box-sizing:content-box}
.bk-brand{display:block;width:132px;text-decoration:none}.bk-brand svg,.bk-brand .logo-slot{display:block;width:132px!important;height:auto!important}
.bk-name{font:700 20px/1.2 var(--np-body)}
.bk-menu{display:none}
.bk-nav ol{display:flex;justify-content:center;flex-wrap:wrap;column-gap:20px}
.bk-nav a{display:flex;align-items:baseline;gap:6px;padding:8px 0;font:600 15px/20px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;text-decoration:none;border-bottom:2px solid transparent;transition:border-color 120ms ease-out}
.bk-nav .bk-n{font-weight:700;color:var(--np-q)}
.bk-nav a[aria-current]{border-bottom-color:var(--np-ink)}
@media (hover:hover){.bk-nav a:hover{border-bottom-color:var(--np-hair)}}
.bk-mode{display:inline-flex;border:1px solid var(--np-ink)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--np-ink);font:600 15px/1 'Sofia Sans Condensed',sans-serif;height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--np-ink);color:var(--np-g)}
.bk-mode button:focus-visible{outline-offset:-5px;outline-color:currentColor}
main{display:block;max-width:1240px;margin:0 auto;padding:0 var(--np-gx) 64px;box-sizing:content-box}
.bk-foot{display:flex;justify-content:space-between;gap:16px;margin-top:96px;padding-top:12px;border-top:3px solid var(--np-ink);font:600 15px/20px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;color:var(--np-q)}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;background:var(--np-ink);color:var(--np-g);font:600 15px/1.3 'Sofia Sans',sans-serif;pointer-events:none}
.bk-live:empty{display:none}

/* the section front */
.np-sec{padding-top:120px;scroll-margin-top:96px}
.np-bar{display:flex;align-items:baseline;gap:16px;padding-bottom:8px}
.np-bar__no{font:700 24px/28px 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums}
.np-bar__t{font:700 24px/28px 'Sofia Sans Condensed',sans-serif;letter-spacing:.01em;flex:1}
.np-bar__ed{font:600 15px/20px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;color:var(--np-q)}
.np-rule{display:block;height:2px;border-top:1px solid var(--np-ink);border-bottom:3px solid var(--np-ink)}
.np-rule--thin{height:0;border-bottom:0}
.np-rule--under{border-top-width:3px;border-bottom-width:1px}
.np-jump{margin-top:48px;font:italic 500 16px/22px 'Sofia Sans',sans-serif}
.np-jump a{text-decoration:none;border-bottom:1px solid var(--np-hair)}
.np-jump b{font-style:normal;font-weight:700}
@media (hover:hover){.np-jump a:hover{border-bottom-color:var(--np-ink)}}

/* four columns with hairline rules in the gutters, drawn only beside text */
.np-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:var(--np-gap)}
.np-c{position:relative;min-width:0}
.np-r::before{content:'';position:absolute;left:calc(var(--np-gap) / -2);top:0;bottom:0;width:1px;background:var(--np-hair)}
.np-c1{grid-column:1}.np-c2{grid-column:2}.np-c3{grid-column:3}.np-c4{grid-column:4}
.np-c12{grid-column:1/3}.np-c13{grid-column:1/4}.np-c14{grid-column:1/5}.np-c24{grid-column:2/5}.np-c34{grid-column:3/5}
.np-lead{margin-top:48px;row-gap:48px}
.np-fit{container-type:inline-size}

/* type: brand faces for the story, Sofia for the paper's chrome */
.np-hl{font-family:var(--np-display);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance;font-size:min(var(--fs),calc(100cqi * var(--k)));font-variant-numeric:lining-nums}
.np-hl--xl{line-height:.95}
/* a headline that is a whole sentence: the column caps it too, so it never fills a phone screen */
.np-hl--long{line-height:1.06;font-size:min(var(--fs),calc(100cqi * var(--k)),9cqi)}
.np-deck{margin-top:32px;max-width:44rem;font:${bodyWeight(ctx, 500)} 22px/1.42 var(--np-body)}
.np-deck--b{margin-top:16px}
.np-body{font:400 17px/1.55 var(--np-body);hyphens:auto;max-width:70ch}
.np-body+.np-body,.np-run+.np-run{margin-top:16px}
.np-cols{columns:2 14rem;column-gap:var(--np-gap);column-rule:1px solid var(--np-hair)}
.np-quiet{color:var(--np-q)}
.np-lab{font:700 17px/22px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em}
.np-lab--rule{padding-bottom:8px;margin-bottom:16px;border-bottom:1px solid var(--np-ink)}
.np-lab--gap{margin-top:40px}
.np-sub{margin-top:80px;padding-bottom:8px;border-bottom:1px solid var(--np-ink);font:700 24px/28px 'Sofia Sans Condensed',sans-serif}
.np-cap{font:400 15px/22px 'Sofia Sans',sans-serif;color:var(--np-q);margin-top:8px}
.np-cap--ink{color:var(--np-ink)}.np-capb{font-weight:600}.np-credit{color:var(--np-q);flex:none}
.np-plate figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;column-gap:16px}
.np-mono{font:400 14px/20px var(--np-mono);font-variant-numeric:tabular-nums}
.np-price{font:${bodyWeight(ctx, 700)} 17px/24px var(--np-body);color:var(--np-spot)}
.np-tt,.np-ex,.np-write{font-family:var(--np-display);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;text-wrap:balance}
.np-tt{font-size:32px;line-height:1.1;margin-bottom:12px}
.np-ex{font-size:22px;line-height:1.2;margin-top:4px}
.np-write{font-size:30px;line-height:1.15;margin-top:8px}.np-write--s{font-size:24px;margin-top:0}
.np-not{font:400 17px/1.4 var(--np-body);color:var(--np-q)}.np-not s{text-decoration-thickness:1px}
.np-not--b{font-size:19px}

/* the front page */
.np-front{padding-top:40px}
.np-ears,.np-strip{display:flex;justify-content:space-between;gap:16px;font:600 15px/20px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em}
.np-ears{padding-bottom:12px}.np-strip{padding-top:10px;color:var(--np-q)}
.np-name{width:min(100%,var(--nw));margin:28px auto}
.np-name .bk-for-light{display:block}.np-name .bk-for-dark{display:none}[data-theme="dark"] .np-name .bk-for-light{display:none}[data-theme="dark"] .np-name .bk-for-dark{display:block}
.np-name svg,.np-name .logo-slot{display:block;width:100%!important;height:auto!important}
.np-name>span,.np-name .logo-slot{aspect-ratio:inherit}
.np-side .np-lab{padding-bottom:8px;border-bottom:1px solid var(--np-ink)}
.np-ix li a{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--np-hair);text-decoration:none;font:600 17px/22px 'Sofia Sans Condensed',sans-serif}
.np-ix__n{width:20px;font-weight:700;color:var(--np-q)}
@media (hover:hover){.np-ix li a:hover .np-ix__t{text-decoration:underline;text-underline-offset:3px}}
.np-mk li{padding:12px 0;border-bottom:1px solid var(--np-hair)}.np-mk li:last-child{border-bottom-color:var(--np-ink)}
.np-mk__to{font:${bodyWeight(ctx, 500)} 17px/22px var(--np-body)}.np-mk__when{font:400 15px/22px 'Sofia Sans',sans-serif;color:var(--np-q)}
.np-briefs{margin-top:64px;padding-top:24px;border-top:1px solid var(--np-ink)}

/* plates: the press ink on newsprint, at any width */
.np-plate{margin-top:48px}
.bk-dots{display:block;width:100%;height:auto;border-top:1px solid var(--np-press)}
.bk-dots__paper{fill:var(--np-sheet)}.bk-dots__ink{stroke:var(--np-press)}
.bk-dots .bk-ink{fill:#fff;r:4px}
/* the one moment: the front page's plate inks in from pinpricks, once, on load */
@keyframes np-ink{from{r:0.9px}to{r:4px}}
@media (prefers-reduced-motion:no-preference){.np-front .bk-dots .bk-ink{animation:np-ink 800ms cubic-bezier(0.23,1,0.32,1) 200ms both}}

/* voice */
.np-princ li{padding:12px 0;border-bottom:1px solid var(--np-hair)}
.np-corr{margin-top:8px}
.np-corr__r{padding:24px 0;border-bottom:1px solid var(--np-hair)}.np-corr__r:last-child{border-bottom-color:var(--np-ink)}
.np-boiler{margin-top:80px;row-gap:48px}
.np-lines li{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;border-bottom:1px solid var(--np-hair)}
.bk-btn{appearance:none;cursor:pointer;background:transparent;color:var(--np-ink);border:1px solid var(--np-ink);font:600 15px/1 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;height:36px;padding:0 14px;transition:background-color 120ms ease-out,color 120ms ease-out}
.np-copy{margin-top:16px}.np-lines .np-copy{margin-top:0;flex:none}
.bk-btn.is-copied{background:var(--np-ink);color:var(--np-g)}
@media (hover:hover){.bk-btn:hover{background:var(--np-ink);color:var(--np-g)}}
.bk-btn:active{transform:scale(.97)}
.np-val{height:auto;padding:2px 0;border:0;border-bottom:1px solid var(--np-hair);font:400 14px/20px var(--np-mono);text-align:left}
@media (hover:hover){.np-val:hover{background:transparent;color:var(--np-ink);border-bottom-color:var(--np-ink)}}
.np-val.is-copied{background:transparent;color:var(--np-ink);border-bottom-color:var(--np-ink)}

/* logo */
.np-proof{display:grid;place-items:center;padding:48px 24px}.np-proof.is-pale{box-shadow:inset 0 0 0 1px var(--np-hair)}
.np-proof--lead{min-height:360px;padding:72px 32px}
.np-lg{width:min(var(--lw),100%)}.np-lg svg,.np-lg .logo-slot{display:block;width:100%!important;height:auto!important;aspect-ratio:inherit}
.np-figline{display:flex;justify-content:space-between;align-items:baseline;gap:24px;flex-wrap:wrap}
.np-dls{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:8px}
.np-dl{font:600 15px/22px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;text-decoration:none;border-bottom:1px solid var(--np-hair)}
@media (hover:hover){.np-dl:hover{border-bottom-color:var(--np-ink)}}
.np-clear{display:inline-block;--cw:min(320px,60vw);padding:calc(var(--pk) * var(--cw));outline:1px dashed var(--np-q);outline-offset:-1px}
.np-clear__in{width:var(--cw)}.np-clear__in .np-lg{width:100%}
.np-min{display:flex;align-items:center;gap:24px;margin-top:32px}.np-min__lg{flex:none}
.np-vers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:var(--np-gap);row-gap:48px;margin-top:24px}
.np-ver .np-lab{margin-top:12px}
.np-never{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));column-gap:var(--np-gap)}
.np-never li{padding:10px 0;border-bottom:1px solid var(--np-hair);font:400 17px/1.5 var(--np-body)}

/* colour */
.np-band{display:flex;margin-top:48px;height:280px}
.np-f{appearance:none;border:0;cursor:pointer;flex:var(--g) 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:16px;text-align:left;font:400 15px/20px 'Sofia Sans',sans-serif}
.np-f.is-pale{box-shadow:inset 0 0 0 1px var(--np-hair)}
.np-f__t b{font-weight:700}.np-f__h{font:400 14px/20px var(--np-mono)}
.np-f.is-narrow .np-f__t b,.np-f.is-narrow .np-f__h{display:none}
.np-f:focus-visible{outline-offset:-5px;outline-color:currentColor}
.np-vals{margin-top:8px}
.np-vrow{padding:16px 0;border-bottom:1px solid var(--np-hair)}
.np-vn{display:flex;align-items:center;gap:10px;font:600 17px/22px 'Sofia Sans',sans-serif}
.np-key{display:inline-block;width:16px;height:16px;flex:none}.np-key.is-pale{box-shadow:inset 0 0 0 1px var(--np-hair)}
.np-ramp{display:flex;height:24px}.np-ramp i{flex:1}.np-ramp i.is-base{box-shadow:inset 0 -3px 0 var(--np-ink)}
.np-pairs li{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:16px;padding:10px 0;border-bottom:1px solid var(--np-hair)}
.np-aa{display:grid;place-items:center;height:40px;font:${dW} 24px/1 var(--np-display);font-stretch:${st}%;box-shadow:inset 0 0 0 1px var(--np-hair)}
.np-pu{font:400 15px/20px 'Sofia Sans',sans-serif}
.np-ratio{font:700 22px/1 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums}
.np-roles{margin-top:16px}
.np-roles li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--np-hair);break-inside:avoid;font:400 15px/20px 'Sofia Sans',sans-serif}
.np-roles li span{flex:1}

/* type */
.np-alpha{display:flex;flex-direction:column;font-size:min(28px,calc(100cqi * var(--k)));line-height:1.2;overflow-wrap:anywhere}
.np-bodyface{font:${bodyWeight(ctx, 500)} 48px/1.1 var(--np-body)}
.np-monoface{font:400 40px/1.1 '${(F.mono || F.body).family}',monospace}
.np-srow{padding:24px 0;border-bottom:1px solid var(--np-hair);align-items:center}
.np-spec{font-size:min(var(--fs),calc(100cqi * var(--k)));overflow-wrap:anywhere;text-wrap:balance}
.np-tester{margin-top:80px}
.np-field{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.np-field label{display:flex;justify-content:space-between;font:600 15px/20px 'Sofia Sans',sans-serif}
.np-field input[type=text]{font:400 17px/24px var(--np-body);height:44px;padding:0 12px;border:1px solid var(--np-ink);background:transparent;color:var(--np-ink);border-radius:0}
.np-field input[type=range]{accent-color:var(--np-ink);height:44px}
.np-tout{font-size:var(--tester-size,64px);line-height:1.05;overflow-wrap:anywhere;text-wrap:balance}
.np-tout--b{margin-top:24px;font-family:var(--np-body);font-size:calc(var(--tester-size,64px) * .5)}
.np-inuse .np-c14{margin-bottom:-24px}
.np-hl--use{line-height:1.05}

/* imagery */
.np-run b{font-weight:${bodyWeight(ctx, 700)}}
.np-shots{margin-top:24px;row-gap:32px}
.np-shots .np-lab{margin-bottom:8px}

/* layout */
.np-page{display:block;margin-top:0;background:var(--np-sheet);box-shadow:inset 0 0 0 1px var(--np-hair);box-sizing:border-box}
.np-page__g{display:grid;height:100%}.np-page__g i{background:var(--np-hair)}
[data-theme="dark"] .np-page__g i{background:${N.hair}}
.np-meas div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--np-hair)}
.np-meas dt{font:600 15px/20px 'Sofia Sans',sans-serif}
.np-space li{display:grid;grid-template-columns:40px 1fr;align-items:center;gap:16px;padding:6px 0}
.np-space i{display:block;height:12px;background:var(--np-ink)}
.np-radii li{display:flex;align-items:center;gap:16px;padding:10px 0;border-bottom:1px solid var(--np-hair)}
.np-radii i{width:48px;height:32px;flex:none;border:1px solid var(--np-ink)}

/* applications: figures on the columns, captions under each */
.np-apps{margin-top:48px;row-gap:56px;align-items:start}
.np-a-phone{grid-column:1/3;grid-row:1;display:grid;grid-template-columns:360px minmax(0,1fr);column-gap:24px;align-items:end}.np-a-phone .np-cap{margin-top:0}.np-a-post{grid-column:3/5;grid-row:1}
.np-a-mail{grid-column:1/3;grid-row:2}.np-a-sign{grid-column:3;grid-row:2}
.np-photo img,.np-photo .pl{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;outline:1px solid rgb(0 0 0 / .1);outline-offset:-1px}
.np-a-card .np-cap{margin-top:12px}
.np-phone{border:1px solid var(--np-ink);padding:10px;background:var(--np-ink)}
.np-screen{padding:16px 14px 18px;background:var(--surface);color:var(--text);min-height:560px;display:flex;flex-direction:column;gap:12px}
.np-scr__top{display:flex;justify-content:space-between;align-items:center}
.np-scr__t{font-size:28px;line-height:1.1}
.np-scr__btn{margin-top:auto}
.np-alg{display:block;width:min(var(--lw),100%)}.np-alg svg,.np-alg .logo-slot{display:block;width:100%!important;height:auto!important;aspect-ratio:inherit}
.np-post{aspect-ratio:4/5;padding:32px;display:flex;flex-direction:column;justify-content:space-between;container-type:inline-size}
.np-post__l{font-family:var(--np-display);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance;font-size:min(64px,calc(100cqi * var(--k)),11cqi)}
.np-cards{display:flex;flex-direction:column;gap:16px}
.np-card{aspect-ratio:90/55;padding:16px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:inset 0 0 0 1px var(--np-hair)}
.np-card__l{font:${bodyWeight(ctx, 500)} 15px/20px var(--np-body)}
.np-card__n{font:${bodyWeight(ctx, 700)} 17px/22px var(--np-body)}.np-card__r,.np-card__c{font:400 15px/20px var(--np-body)}
.np-signart{aspect-ratio:3/4;padding:24px;display:flex;flex-direction:column;justify-content:space-between;container-type:inline-size}
.np-sign__l{font-family:var(--np-display);font-weight:${dW};font-stretch:${st}%;letter-spacing:-0.01em;line-height:1.05;text-wrap:balance;font-size:min(40px,calc(100cqi * var(--k)))}
.np-mail{padding:24px;box-shadow:inset 0 0 0 1px var(--np-hair);font:400 15px/22px var(--np-body)}
.np-mail__n{font:${bodyWeight(ctx, 700)} 17px/22px var(--np-body)}.np-mail__lg{margin-top:20px}

/* downloads: the classifieds */
.np-zip{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.bk .np-btn{display:inline-flex;align-items:center;height:48px;padding:0 20px;margin-top:8px;background:var(--np-ink);color:var(--np-g);font:700 17px/1 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em;text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk .np-btn:hover{background:var(--np-q)}}
.np-btn:active{transform:scale(.97)}
.np-classi{margin-top:64px;columns:4 220px;column-gap:var(--np-gap);column-rule:1px solid var(--np-hair)}
.np-ad{break-inside:avoid;padding-bottom:32px}
.np-ad__t{font:700 20px/24px 'Sofia Sans Condensed',sans-serif;padding-bottom:6px;border-bottom:3px solid var(--np-ink)}
.np-files{margin-top:8px}
.np-file{border-bottom:1px solid var(--np-hair);break-inside:avoid}
.np-file a{display:flex;flex-direction:column;padding:8px 0;text-decoration:none}
.np-file--logo{padding:8px 0}
.np-file__n{font:600 15px/20px 'Sofia Sans',sans-serif;overflow-wrap:anywhere}
.np-file__m{font:400 15px/20px 'Sofia Sans',sans-serif;color:var(--np-q)}
@media (hover:hover){.np-file a:hover .np-file__n{text-decoration:underline;text-underline-offset:3px}}

@media (max-width:1179px){.bk-top{grid-template-columns:1fr auto;row-gap:4px}.bk-nav{grid-column:1/-1;grid-row:2}.bk-nav ol{justify-content:flex-start}}
@media (max-width:840px){
:root{--np-gx:20px;--np-gap:24px}
.bk-top{grid-template-columns:1fr auto auto;column-gap:8px;padding:8px var(--np-gx) 14px}
.bk-top::after{left:var(--np-gx);right:var(--np-gx);bottom:4px}
.bk-brand,.bk-brand svg,.bk-brand .logo-slot{width:112px!important}
.bk-menu{display:inline-flex;appearance:none;align-items:center;height:44px;padding:0 14px;border:1px solid var(--np-ink);background:transparent;color:var(--np-ink);font:600 15px/1 'Sofia Sans Condensed',sans-serif;cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--np-ink);color:var(--np-g)}
.bk-mode button{height:44px;padding:0 10px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px var(--np-gx) 16px;background:var(--np-g);border-bottom:3px solid var(--np-ink);max-height:calc(100vh - 72px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{display:block}.bk-nav a{min-height:44px;align-items:center;border-bottom:1px solid var(--np-hair);font-size:17px}
.np-g{grid-template-columns:repeat(2,minmax(0,1fr))}
.np-c13,.np-c14,.np-c24,.np-c4.np-side{grid-column:1/-1}
.np-c3{grid-column:1}.np-c4{grid-column:2}.np-c34{grid-column:1/-1}
.np-c13+.np-c4.np-r::before,.np-c12+.np-c34.np-r::before,.np-c34.np-r::before,.np-c24.np-r::before,.np-c3.np-r::before,.np-side::before{display:none}
.np-briefs .np-c3{grid-column:1/-1}.np-briefs .np-c4{grid-column:1/-1}.np-briefs .np-c4::before{display:none}
.np-vrow .np-c1{grid-column:1/-1}.np-vrow .np-c2{grid-column:1}.np-vrow .np-c3{grid-column:2}.np-vrow .np-c3::before{display:block}.np-vrow .np-c4{grid-column:1/-1}.np-vrow .np-c4::before{display:none}.np-vrow{row-gap:12px}
.np-srow .np-c1,.np-srow .np-c24{grid-column:1/-1}.np-srow{row-gap:12px}
.np-tester .np-c1,.np-tester .np-c24{grid-column:1/-1}
.np-band{flex-direction:column;height:auto}
.np-f{flex:none;min-height:calc(var(--g) * 4px + 56px);flex-direction:row;align-items:flex-start}
.np-f.is-narrow .np-f__t b,.np-f.is-narrow .np-f__h{display:inline}
.np-vers{grid-template-columns:repeat(2,minmax(0,1fr))}
.np-apps .np-c{grid-column:auto;grid-row:auto}.np-apps .np-r::before{display:none}
.np-a-phone{grid-column:1/-1}
.np-apps-lead .np-a-card{grid-column:1/-1}.np-apps-lead .np-a-card::before{display:none}.np-apps-lead .np-cards{flex-direction:row}.np-apps-lead .np-card{flex:1 1 0}
.np-shots li:nth-child(odd)::before{display:none}
.np-sec{padding-top:88px}
.np-lead{margin-top:32px}
.np-proof--lead{min-height:240px}
}
@media (max-width:600px){
.np-g{grid-template-columns:minmax(0,1fr)}
.np-g>.np-c,.np-vrow .np-c2,.np-vrow .np-c3{grid-column:1/-1}
.np-r::before{display:none!important}
.np-bar__ed{display:none}
.np-ears{flex-direction:column;gap:0}
.np-deck{font-size:20px}
.np-vers{grid-template-columns:minmax(0,1fr)}
.np-cols{columns:1}
.np-classi{columns:1}
.np-apps .np-c{grid-column:1/-1}
.np-a-phone{grid-template-columns:minmax(0,1fr)}.np-a-phone .np-cap{margin-top:8px}
.np-apps-lead .np-cards{flex-direction:column}
.bk-foot{flex-direction:column}
.np-pairs li{grid-template-columns:48px 1fr auto}
.np-briefs{row-gap:28px}.np-briefs>.np-c+.np-c{padding-top:28px;border-top:1px solid var(--np-hair)}
.np-hl--xl{font-size:min(var(--fs),calc(100cqi * var(--k) * .68))}
}
@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active,.np-btn:active{transform:none}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media print{.bk-top,.bk-skip,.bk-live,.bk-btn,.np-dls,.np-tester,.np-btn{display:none!important}}
`;
}
