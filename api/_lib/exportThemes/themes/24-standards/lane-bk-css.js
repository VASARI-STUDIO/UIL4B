// Theme 24, Standards, lane bk: the brand book's CSS. Public Sans 400/600 for the chrome at 12, 15, 20 and 32 px; no radius but the tab's
// two left corners; no shadows. The ruler and the dimension lines read only --ink, --qt and --hr, so a band re-points those three.
// Three sheet sizes: 1152 px at 1280 and over, 768 px from 841 to 1279, fluid under 841 (heroes capped at 312).
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { roles } from './helpers.js';

export function bookCss(ctx) {
  const B = ctx.brand, R = roles(ctx), D = ctx.roles.dark, F = B.fonts;
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  const pnq = R.quietOn(R.ground);
  return `
.bk{--gr:${R.ground};--ink:${R.ink};--qt:${R.quietOn(R.ground)};--hr:${R.hair};--sk:${B.ui.light.sunken};
  --field:${R.field};--fink:${R.fieldInk};--fqt:${R.fieldQuiet};--dk:${R.dark};--dink:${R.darkInk};--dqt:${R.darkQuiet};
  --pn:${R.dark};--pnk:${R.darkInk};--pnq:${R.darkQuiet};--hd:56px;
  --chrome:'Public Sans',sans-serif;--display:'${F.display.family}','Public Sans',sans-serif;--body:'${F.body.family}','Public Sans',sans-serif;--mono:'${F.mono.family}','Public Sans';
  background:var(--gr);color:var(--ink);font-family:var(--chrome);font-size:15px;line-height:24px;font-weight:400;min-height:100vh;-webkit-font-smoothing:antialiased}
[data-theme=dark] .bk{--gr:${D.surface};--ink:${D.text};--qt:${D.quiet};--hr:${D.divider};--sk:${D.sunken};--pn:${R.ground};--pnk:${R.ink};--pnq:${pnq};color-scheme:dark}
:where(.bk) :where(h1,h2,h3,h4,p,ul,ol,figure){margin:0;padding:0;font-size:inherit;font-weight:inherit}
:where(.bk) :where(ul,ol){list-style:none}
:where(.bk) a{color:inherit}
.bk :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.bk main:focus{outline:none}
.bk .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}

/* tiers: one label per sheet size */
.sd-tw,.sd-tn{display:none}
.sd-hz{width:var(--hzm)}.sd-fz{font-size:var(--fzm)}
.sd-ml{display:contents}.sd-md{display:none}
[data-theme=dark] .sd-ml{display:none}[data-theme=dark] .sd-md{display:contents}
.bk-for-dark{display:none}[data-theme=dark] .bk-for-light{display:none}[data-theme=dark] .bk-for-dark{display:inline}

/* shell */
.bk-skip{position:absolute;left:16px;top:8px;z-index:30;background:var(--ink);color:var(--gr);padding:8px 16px;font-weight:600;text-decoration:none;transform:translateY(-200%)}
.bk-skip:focus{transform:none}
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;min-height:56px;padding:0 24px;background:var(--gr);border-bottom:1px solid var(--ink)}
.bk-brand{display:flex;align-items:center;line-height:0;flex:none;text-decoration:none}
.bk-brand svg{display:block}
.bk-name{font-size:15px;line-height:24px;font-weight:600}
.bk-nav ol{display:flex;gap:4px 16px;flex-wrap:wrap}
.bk-nav a{display:flex;align-items:center;gap:6px;min-height:32px;font-size:12px;line-height:16px;font-weight:600;text-decoration:none;border-bottom:2px solid transparent}
.bk-nav a[aria-current=true]{border-bottom-color:var(--ink)}
.bk-n{color:var(--qt);font-weight:400}
.bk-menu{display:none}
.bk-mode{display:flex;margin-left:auto;flex:none;border:1px solid var(--ink)}
.bk-mode button,.bk-menu{font:600 12px/16px var(--chrome);color:var(--ink);background:var(--gr);border:0;padding:8px 12px;min-height:32px;cursor:pointer}
.bk-mode button[aria-pressed=true]{background:var(--ink);color:var(--gr)}
.bk-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;max-width:var(--sw);margin:64px auto 0;padding:16px 0 48px;border-top:1px solid var(--ink);font-size:12px;line-height:16px;color:var(--qt)}
.bk-live{position:fixed;left:50%;bottom:24px;z-index:40;background:var(--ink);color:var(--gr);padding:8px 16px;font-size:12px;line-height:16px;font-weight:600;visibility:hidden;transform:translate(-50%,8px);transition:transform 180ms cubic-bezier(.23,1,.32,1),visibility 0s 180ms}
.bk-live.is-on{visibility:visible;transform:translate(-50%,0);transition:transform 180ms cubic-bezier(.23,1,.32,1)}

/* the sheet and its tab */
.bk main{--sw:100%}
.sd-sec{display:grid;grid-template-columns:minmax(0,1fr) 16px;column-gap:8px;max-width:calc(var(--sw) + 32px);margin:0 auto;padding:56px 0 0 16px;scroll-margin-top:var(--hd)}
.sd-sheet{grid-column:1;grid-row:2;min-width:0}
.sd-band{grid-column:1 / -1;grid-row:1;background:var(--field);color:var(--fink);margin:0 0 48px -16px;padding:40px 16px 24px}
.sd-sec--cover{padding-top:0}
.sd-on-field{--ink:var(--fink);--qt:var(--fqt);--hr:var(--fqt)}
.sd-on-pn{--ink:var(--pnk);--qt:var(--pnq);--hr:var(--pnq)}
.sd-tab{grid-column:2;grid-row:2;align-self:start;position:sticky;top:calc(var(--hd) + 24px + (var(--n) - 1) * 48px);margin-top:calc((var(--n) - 1) * 48px);width:16px;height:44px;background:var(--pn);color:var(--pnk);border-radius:2px 0 0 2px;font-size:12px;line-height:16px;font-weight:600;text-align:center;padding-top:6px}

/* running head, titles, text */
.sd-rh{display:grid;grid-template-columns:1fr 3fr;gap:16px;padding-bottom:8px;margin-bottom:32px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.sd-rh span:last-child{color:var(--qt);font-weight:400}
.sd-h1{font-size:32px;line-height:36px;font-weight:600;letter-spacing:-0.01em}
.sd-ver{font-size:12px;line-height:16px;color:var(--qt);margin-top:8px}
.sd-h2{font-size:32px;line-height:36px;font-weight:600;letter-spacing:-0.01em}
.sd-lead{max-width:380px;margin-top:8px;color:var(--qt);text-wrap:pretty}
.sd-h3{display:flex;gap:16px;align-items:baseline;font-size:20px;line-height:24px;font-weight:600;margin:56px 0 16px}
.sd-h4{font-size:12px;line-height:16px;font-weight:600;margin-bottom:8px}
.sd-no{font-size:12px;line-height:16px;font-weight:400;color:var(--qt);font-variant-numeric:tabular-nums;min-width:40px}
.sd-body{max-width:65ch;text-wrap:pretty}
.sd-note{margin-top:16px;color:var(--qt)}
.sd-q{color:var(--qt)}
.sd-mono,.sd-val,.sd-dl-a{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:400;font-variant-numeric:tabular-nums}
.sd-coverline{max-width:56ch;margin-top:24px;font-size:15px;line-height:24px}

/* hero figures and the dimension lines */
.sd-fig{display:grid;grid-template-columns:max-content;margin-top:32px;max-width:100%}
.sd-fig--v{grid-template-columns:24px max-content}
.sd-obj{line-height:0;min-width:0}
.sd-cap{width:0;min-width:100%;margin-top:16px;max-width:65ch;font-size:12px;line-height:16px;color:var(--qt)}
.sd-dh{display:flex;align-items:flex-start;height:16px;margin-bottom:8px;font-size:12px;line-height:16px;color:var(--ink)}
.sd-dh i{flex:1;height:1px;margin-top:7.5px;background:var(--ink)}
.sd-dh .sd-dl{padding:0 6px;white-space:nowrap}
.sd-dh b{position:relative;width:1px;height:24px;flex:none;background:var(--qt)}
.sd-dh b::after{content:"";position:absolute;left:-4px;top:7.5px;width:9px;height:1px;background:var(--ink);transform:rotate(-45deg)}
.sd-dv{display:flex;flex-direction:column;align-items:flex-start;width:24px;font-size:12px;line-height:16px;color:var(--ink)}
.sd-dv i{flex:1;width:1px;margin-left:7.5px;background:var(--ink)}
.sd-dv .sd-dl{writing-mode:vertical-rl;transform:rotate(180deg);padding:6px 0;white-space:nowrap}
.sd-dv b{position:relative;height:1px;width:24px;flex:none;background:var(--qt)}
.sd-dv b::after{content:"";position:absolute;left:3.5px;top:0;width:9px;height:1px;background:var(--ink);transform:rotate(-45deg)}
.sd-crop{position:absolute;inset:0;pointer-events:none}
.sd-crop i{position:absolute;width:12px;height:12px;border:0 solid var(--ink)}
.sd-crop i:nth-child(1){left:-18px;top:-18px;border-right-width:1px;border-bottom-width:1px}
.sd-crop i:nth-child(2){right:-18px;top:-18px;border-left-width:1px;border-bottom-width:1px}
.sd-crop i:nth-child(3){left:-18px;bottom:-18px;border-right-width:1px;border-top-width:1px}
.sd-crop i:nth-child(4){right:-18px;bottom:-18px;border-left-width:1px;border-top-width:1px}
.sd-cropbox{position:relative;display:inline-block;margin:18px}

/* the ruler */
.sd-foot{margin-top:56px}
.sd-rl{position:relative;height:40px}
.sd-rl__k{display:block}
.sd-rl .sd-t{position:absolute;left:0;right:0;top:0;bottom:0}
.sd-rl__n{position:absolute;top:20px;font-size:12px;line-height:16px;color:var(--qt);white-space:nowrap}
.sd-rl__n--live{color:var(--ink);font-weight:600}
.sd-rl__u{right:0;left:auto}
.sd-rl__m{position:absolute;top:0;width:1px;height:16px;background:var(--ink)}
.sd-rl__r{position:absolute;top:14px;height:2px;background:var(--ink);transform-origin:0 50%}
@media (prefers-reduced-motion:no-preference){.sd-rl__r.sd-draw{animation:sd-run 700ms cubic-bezier(.23,1,.32,1) 200ms both}}
@keyframes sd-run{from{transform:scaleX(0)}}

/* registers */
.sd-reg{border-top:1px solid var(--ink)}
.sd-row{display:grid;grid-template-columns:56px minmax(0,1fr);gap:4px 16px;padding:12px 0;border-bottom:1px solid var(--hr)}
.sd-row>.sd-no{grid-row:1 / span 3;padding-top:4px}
.sd-nm{font-weight:600;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;min-width:0}
.sd-bd{min-width:0;text-wrap:pretty}
.sd-as{min-width:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sd-not{color:var(--qt);text-decoration-thickness:1px;display:block}
.sd-why{display:block;color:var(--qt);font-size:12px;line-height:16px;margin-top:4px}
.sd-trait,.sd-ex,.sd-line{font-size:24px;line-height:28px}
.sd-line{display:block}
.sd-what{margin-top:48px}
.sd-say{font-size:28px;line-height:32px;max-width:26em;text-wrap:pretty;margin-bottom:32px}
.sd-do{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--qt)}
.sd-reg--rule .sd-nm{display:block;font-weight:400}
.sd-vn{font-weight:600}
.sd-pc{font-size:12px;line-height:16px;color:var(--qt)}
.sd-vals,.sd-files{display:flex;flex-wrap:wrap;gap:8px}

/* controls */
.sd-btn,.sd-val{font-family:var(--chrome);background:var(--gr);color:var(--ink);border:1px solid var(--ink);padding:3px 12px;min-height:24px;font-size:12px;line-height:16px;font-weight:600;cursor:pointer;border-radius:0}
.sd-val{font-family:var(--mono);font-weight:400;border-color:var(--hr);padding:3px 8px}
.sd-btn.is-copied,.sd-val.is-copied{background:var(--ink);color:var(--gr)}
.sd-dl-a{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--hr);text-decoration:none;color:var(--ink)}
@media (hover:hover){.sd-btn:hover,.sd-dl-a:hover,.sd-val:hover{border-color:var(--ink);background:var(--hr)}.bk-nav a:hover{border-bottom-color:var(--qt)}.sd-idx a:hover .sd-idx__t{text-decoration:underline}}
.sd-btn:active,.sd-val:active{transform:scale(.97)}
.sd-btn,.sd-val,.sd-dl-a{transition:background-color 150ms ease,border-color 150ms ease,transform 120ms ease-out}

/* 1 overview */
.sd-idx{border-top:1px solid var(--ink);margin-top:32px;max-width:560px}
.sd-idx a{display:flex;justify-content:space-between;align-items:center;min-height:40px;border-bottom:1px solid var(--hr);text-decoration:none;font-weight:600}
.sd-idx__n{display:inline-block;width:24px;height:24px;background:var(--pn);color:var(--pnk);text-align:center;font-size:12px;line-height:24px;border-radius:2px 0 0 2px}
.sd-lg{display:block;aspect-ratio:var(--ar)}
.sd-lg>*{display:block;width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.sd-fig--cover{margin-top:40px}

/* 2 voice */
.sd-panel{background:var(--pn);color:var(--pnk);padding:16px;margin-top:32px}
.sd-panel__l{font-size:12px;line-height:16px;font-weight:600;margin-bottom:24px}
.sd-panel__t{line-height:1.05;letter-spacing:-0.01em}

/* 3 logo */
.sd-clear{outline:1px dashed var(--qt);outline-offset:-1px;padding:var(--csm)}
.sd-sw{display:flex;align-items:center;justify-content:center;width:176px;height:88px;border:1px solid var(--hr);flex:none}
.sd-reg--logo .sd-nm{flex-direction:column;align-items:flex-start}
.sd-small{display:flex;flex-wrap:wrap;gap:16px 32px;align-items:flex-end}
.sd-small .sd-fig{margin-top:0}
.sd-never{border-top:1px solid var(--ink)}
.sd-never li{padding:12px 0;border-bottom:1px solid var(--hr)}

/* 4 colour */
.sd-share{display:flex;gap:0}
.sd-share__f{min-width:0}
.sd-share__c{display:block;height:160px;box-shadow:inset 0 0 0 1px var(--hr)}
.sd-share__d .sd-dh{margin-bottom:8px}
.sd-chip{display:inline-block;width:48px;height:48px;box-shadow:inset 0 0 0 1px var(--hr);flex:none}
.sd-chip--s{width:24px;height:24px}
[data-theme=dark] .sd-share__c,[data-theme=dark] .sd-chip{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 60%,transparent)}
.sd-aa{display:inline-flex;align-items:center;justify-content:center;width:64px;height:48px;font-size:24px;line-height:28px;box-shadow:inset 0 0 0 1px var(--hr)}
.sd-modes{display:grid;gap:32px}
.sd-roles ul{border-top:1px solid var(--ink)}
.sd-roles li{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--hr)}
.sd-roles li>span:nth-child(2){flex:1}

/* 5 typography */
.sd-ag{display:block}
.sd-role{display:block;width:100%;font-size:12px;line-height:16px;font-weight:400;color:var(--qt)}
.sd-face{font-size:28px;line-height:32px}
.sd-wts{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:20px;line-height:24px}
.sd-tester{border-top:1px solid var(--ink);padding-top:16px}
.sd-tester__c{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:flex-end}
.sd-fld{display:flex;flex-direction:column;gap:4px;font-size:12px;line-height:16px;font-weight:600;flex:1 1 220px}
.sd-fld--r{flex:0 1 200px}
.sd-fld input[type=text]{font:400 15px/24px var(--chrome);color:var(--ink);background:var(--gr);border:1px solid var(--ink);border-radius:0;padding:4px 8px;min-height:32px}
.sd-fld input[type=range]{accent-color:var(--ink);min-height:32px}
.sd-tester__o{font-size:var(--tester-size,56px);line-height:1.05;margin-top:24px;overflow-wrap:anywhere;padding-bottom:16px;border-bottom:1px solid var(--hr)}
.sd-reg--scale{--capz:40px}
.sd-samp{display:block;overflow-wrap:anywhere}

/* 6 imagery */
.sd-photo{aspect-ratio:3/2;overflow:hidden}
.sd-photo>*{width:100%;height:100%}
.bk .photo-slot{background:var(--sk);border:1px dashed var(--qt);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:8px;font-size:12px;line-height:16px}
.bk .to-shoot{background:var(--sk);border:1px solid var(--qt);color:var(--ink);display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:8px;padding:16px;box-sizing:border-box;overflow:hidden;font-size:14px;line-height:20px;text-wrap:pretty}
.bk .to-shoot b{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase}
.bk .sd-thumb .to-shoot{padding:8px;justify-content:center}
.bk .sd-thumb .to-shoot b{font-size:11px;letter-spacing:0.04em}
.sd-thumb{display:block;width:120px;height:80px;overflow:hidden;flex:none}
.sd-thumb>*{width:120px;height:80px}

/* 7 layout */
.sd-grid{--gg:var(--ggm);--gm:var(--gmm);display:flex;gap:0 var(--gg);padding:0 var(--gm);border:1px solid var(--ink)}
.sd-grid i{flex:1;background:var(--hr)}
.sd-bar{display:block;height:16px;background:var(--ink)}

/* 8 applications */
.sd-pair{display:grid;gap:32px;align-items:start}
.sd-mk{position:relative;aspect-ratio:4/5;overflow:hidden;max-width:400px;background:var(--sk)}
.sd-mk img{position:absolute;left:var(--pl);top:var(--pt);width:var(--pw);height:auto;max-width:none;display:block}
.sd-sign p{font-family:var(--display)}
.sd-phwrap{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.sd-phone{width:195px;height:422px;overflow:hidden;border:1px solid var(--ink);flex:none}
.sd-phone>.ph{transform:scale(.5);transform-origin:0 0}
.sd-phwrap .sd-reg{flex:1 1 200px}
.bk .ph{position:relative;width:390px;height:844px;overflow:hidden;box-sizing:border-box;background:var(--surface);color:var(--text)}
.bk .ph-top{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;box-sizing:border-box;border-bottom:1px solid var(--divider)}
.bk .ph-time{font-size:14px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--quiet)}
.bk .ph-ans{height:176px;padding:16px;box-sizing:border-box;border-bottom:1px solid var(--divider);display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.bk .ph-line{display:flex;align-items:center;gap:12px;height:24px}
.bk .ph-ft{font-size:14px;line-height:20px;color:var(--quiet)}
.bk .ph-eta{margin:0;font-size:44px;line-height:44px}
.bk .ph-note{margin:0;font-size:14px;line-height:20px;color:var(--quiet);max-width:300px}
.bk .ph .ui-list{margin:0;padding:0}
.bk .ph .ui-row{box-sizing:border-box;height:72px;min-height:72px;padding:0 16px}
.bk .ph-btn{position:absolute;left:16px;right:16px;bottom:16px}
.sd-cards{display:flex;flex-wrap:wrap;gap:16px 48px}
.sd-card{box-sizing:border-box;line-height:0}
.sd-card--back{display:flex;flex-direction:column;font-family:var(--body);line-height:1.3}
.sd-card--back p{margin:0}
.sd-card__n{font-weight:600}
.sd-posts{display:flex;flex-wrap:wrap;gap:24px}
.sd-post{width:var(--szm);height:var(--szm);padding:var(--pdm);display:flex;flex-direction:column;justify-content:space-between;--fz:var(--fzm)}
.sd-post--gr{box-shadow:inset 0 0 0 1px var(--hr)}
.sd-post__t{line-height:1.05;letter-spacing:-0.01em}
.sd-post__lg{line-height:0}
.sd-sig{border-top:1px solid var(--ink);padding-top:16px;display:grid;gap:4px;max-width:400px}
.sd-sig__lg{display:block;width:120px;margin-top:12px;line-height:0}

/* 9 downloads */
.sd-kitname{line-height:1;white-space:nowrap;letter-spacing:-0.01em}
.sd-kit{display:inline-flex;flex-direction:column;gap:4px;margin-top:40px;padding:16px 24px;background:var(--ink);color:var(--gr);text-decoration:none;border-radius:0;transition:background-color 150ms ease}
.sd-kit__t{font-size:20px;line-height:24px;font-weight:600}
.sd-kit__m{font-size:12px;line-height:16px}
@media (hover:hover){.sd-kit:hover{background:var(--qt)}}
.sd-icons{display:flex;flex-wrap:wrap;gap:12px}
.sd-ic{display:inline-flex;color:var(--ink);line-height:0}

@media (max-width:840px){
  .sd-tn{display:revert}.sd-tm{display:none}
  .sd-hz{width:var(--hzn)}.sd-fz{font-size:var(--fzn)}
  .sd-clear{padding:var(--csn)}
  .sd-grid{--gg:var(--ggn);--gm:var(--gmn)}
  .sd-post{width:var(--szn);height:var(--szn);padding:var(--pdn)}
  .bk-top{padding:0 16px;gap:12px}
  .bk-menu{display:inline-flex;border:1px solid var(--ink)}
  .bk-nav{display:none;position:absolute;left:0;right:0;top:100%;background:var(--gr);border-bottom:1px solid var(--ink);padding:8px 16px 16px}
  .bk-top[data-open="true"] .bk-nav{display:block}
  .bk-nav ol{flex-direction:column;gap:0}
  .bk-nav a{min-height:44px;font-size:15px;line-height:24px;border-bottom:1px solid var(--hr)}
  .bk-mode{margin-left:auto}
  .bk-menu{margin-left:auto}
  .bk-mode{margin-left:0}
  .bk-foot{margin:64px 16px 0}
  .sd-rh{grid-template-columns:1fr}
  .sd-rh span:first-child{display:none}
  .sd-h1,.sd-h2{font-size:28px;line-height:32px}
  .sd-say{font-size:22px;line-height:28px}
  .sd-trait,.sd-ex,.sd-line{font-size:20px;line-height:24px}
  .sd-row{grid-template-columns:40px minmax(0,1fr)}
  .sd-row>*:not(.sd-no){grid-column:2}
  .sd-share__c{height:120px}
}
@media (min-width:841px){
  .bk main{--sw:768px}
  .sd-sec{grid-template-columns:minmax(0,1fr) 24px;column-gap:24px;max-width:calc(var(--sw) + 48px);padding:80px 0 0}
  .sd-sec--cover{padding-top:0}
  .sd-band{margin:0 0 56px;padding:48px 32px 24px;margin-left:-32px;margin-right:-24px}
  .sd-tab{width:24px;height:66px;top:calc(var(--hd) + 24px + (var(--n) - 1) * 72px);margin-top:calc((var(--n) - 1) * 72px);padding-top:10px}
  .bk-top{flex-wrap:wrap;--hd:96px}
  .bk{--hd:96px}
  .bk-nav{order:3;flex-basis:100%;border-top:1px solid var(--hr)}
  .sd-panel{padding:32px}
  .sd-row{grid-template-columns:56px minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)}
  .sd-row>.sd-no{grid-row:auto}
  .sd-reg--rule .sd-row{grid-template-columns:56px minmax(0,1fr) minmax(0,1fr)}
  .sd-reg--scale{--capz:64px}
  .sd-modes{grid-template-columns:1fr 1fr}
  .sd-pair{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
}
@media (min-width:1280px){
  .sd-tw{display:revert}.sd-tm{display:none}
  .sd-hz{width:var(--hzw)}.sd-fz{font-size:var(--fzw)}
  .sd-clear{padding:var(--csw)}
  .sd-grid{--gg:var(--ggw);--gm:var(--gmw)}
  .sd-post{width:var(--szw);height:var(--szw);padding:var(--pdw)}
  .bk main{--sw:1152px}
  .bk-top{flex-wrap:nowrap;--hd:56px}
  .bk{--hd:56px}
  .bk-nav{order:0;flex-basis:auto;border-top:0}
  .sd-panel{padding:48px}
  .sd-phone{width:260px;height:563px}
  .sd-phone>.ph{transform:scale(.6667)}
}
.ph-b>.ph-l{font-weight:600}
`;
}
