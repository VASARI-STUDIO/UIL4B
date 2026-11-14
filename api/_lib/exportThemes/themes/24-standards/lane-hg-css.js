// Theme 24, Standards, lane hg: the guide site's CSS. Public Sans 400/600 for the chrome at 12, 15, 20 and 32 px; no radius but the tab's two left
// corners; no shadows. The ruler and the dimension lines read only --ink, --qt and --hr, so a band re-points those three.
// Three drawn sizes: 960 px from 1100, 720 px from 841, fluid under 841 (heroes capped at 312).
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { roles } from './helpers.js';

export function hgCss(ctx) {
  const B = ctx.brand, R = roles(ctx), D = ctx.roles.dark, F = B.fonts;
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  const pnq = R.quietOn(R.ground);
  return `
.hg{--gr:${R.ground};--ink:${R.ink};--qt:${R.quietOn(R.ground)};--hr:${R.hair};--sk:${B.ui.light.sunken};
  --field:${R.field};--fink:${R.fieldInk};--fqt:${R.fieldQuiet};--dk:${R.dark};--dink:${R.darkInk};--dqt:${R.darkQuiet};
  --pn:${R.dark};--pnk:${R.darkInk};--pnq:${R.darkQuiet};--hd:56px;
  --chrome:'Public Sans',sans-serif;--display:'${F.display.family}','Public Sans',sans-serif;--body:'${F.body.family}','Public Sans',sans-serif;--mono:'${F.mono.family}','Public Sans',sans-serif;
  background:var(--gr);color:var(--ink);font-family:var(--chrome);font-size:15px;line-height:24px;font-weight:400;min-height:100vh;-webkit-font-smoothing:antialiased}
[data-theme=dark] .hg{--gr:${D.surface};--ink:${D.text};--qt:${D.quiet};--hr:${D.divider};--sk:${D.sunken};--pn:${R.ground};--pnk:${R.ink};--pnq:${pnq};color-scheme:dark}
:where(.hg) :where(h1,h2,h3,h4,p,ul,ol,figure,dl,dd){margin:0;padding:0;font-size:inherit;font-weight:inherit}
:where(.hg) :where(ul,ol){list-style:none}
:where(.hg) a{color:inherit}
.hg :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.hg main:focus{outline:none}
.hg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}

/* tiers: one label per drawn size */
.hg-tw,.hg-tn{display:none}
.hg-hz{width:var(--hzm)}.hg-fz{font-size:var(--fzm)}
.hg-ml{display:contents}.hg-md{display:none}
[data-theme=dark] .hg-ml{display:none}[data-theme=dark] .hg-md{display:contents}

/* the bar and the contents panel */
.hg-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;min-height:56px;padding:0 24px;background:var(--gr);border-bottom:1px solid var(--ink)}
.hg-brand{display:flex;align-items:center;line-height:0;flex:none;text-decoration:none}
.hg-brand svg{display:block}
.hg-nav{display:flex;gap:16px}
.hg-nav a{display:flex;align-items:center;min-height:32px;font-size:12px;line-height:16px;font-weight:600;text-decoration:none;border-bottom:2px solid transparent}
.hg-nav a[aria-current=page]{border-bottom-color:var(--ink)}
.hg-menu,.hg-mode button{font:600 12px/16px var(--chrome);color:var(--ink);background:var(--gr);border:1px solid var(--ink);border-radius:0;padding:8px 12px;min-height:32px;cursor:pointer;transition:background-color 150ms ease,color 150ms ease}
.hg-menu{margin-left:auto}
.hg-mode{display:flex;flex:none}
.hg-mode button{border-left-width:0}.hg-mode button:first-child{border-left-width:1px}
html[data-theme=dark] .hg-mode [data-mode=dark],html:not([data-theme=dark]) .hg-mode [data-mode=light]{background:var(--ink);color:var(--gr)}
.hg-menu[aria-expanded=true]{background:var(--ink);color:var(--gr)}
.hg-toc{display:none;position:absolute;left:0;right:0;top:100%;background:var(--gr);border-bottom:1px solid var(--ink);max-height:calc(100vh - 56px);overflow:auto;overscroll-behavior:contain}
.hg-toc[data-open=true]{display:block}
.hg-toc__in{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px 32px;padding:24px;max-width:1200px;margin:0 auto}
.hg-toc__t{display:flex;gap:12px;font-size:12px;line-height:16px;font-weight:600;padding-bottom:8px;margin-bottom:4px;border-bottom:1px solid var(--ink)}
.hg-toc a{display:flex;align-items:center;min-height:32px;font-size:15px;line-height:24px;text-decoration:none;border-bottom:1px solid var(--hr)}
.hg-toc a[aria-current=page]{font-weight:600}
.hg-end{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;max-width:calc(var(--sw) + 48px);margin:64px auto 0;padding:16px 16px 48px;border-top:1px solid var(--ink);font-size:12px;line-height:16px;color:var(--qt)}

/* the sheet and its tab */
.hg-main{--sw:100%}
.hg-pg{display:grid;grid-template-columns:minmax(0,1fr) 16px;column-gap:8px;max-width:calc(var(--sw) + 32px);margin:0 auto;padding:40px 0 0 16px}
.hg-pg--cover{padding-top:0}
.hg-sheet{grid-column:1;min-width:0}
.hg-band{margin:0 0 48px -16px;padding:40px 16px 24px;background:var(--field);color:var(--fink)}
.hg-on-field{--ink:var(--fink);--qt:var(--fqt);--hr:var(--fqt)}
.hg-on-pn{--ink:var(--pnk);--qt:var(--pnq);--hr:var(--pnq)}
.hg-tab{grid-column:2;grid-row:1;align-self:start;position:sticky;top:calc(var(--hd) + 24px);width:16px;height:44px;background:var(--pn);color:var(--pnk);border-radius:2px 0 0 2px;font-size:12px;line-height:16px;font-weight:600;text-align:center;padding-top:6px}

/* running head, titles, text */
.hg-rh{display:grid;grid-template-columns:1fr 3fr;gap:16px;padding-bottom:8px;margin-bottom:32px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.hg-rh span:last-child{color:var(--qt);font-weight:400}
.hg-rh__n{color:var(--ink);font-weight:600;margin-right:8px;font-variant-numeric:tabular-nums}
.hg-h1{font-size:32px;line-height:36px;font-weight:600;letter-spacing:-0.01em}
.hg-h2{display:flex;gap:16px;align-items:baseline;font-size:20px;line-height:24px;font-weight:600;margin:56px 0 16px}
.hg-h2--big{font-size:32px;line-height:36px;margin-top:0}
.hg-h4{font-size:12px;line-height:16px;font-weight:600;margin-bottom:8px}
.hg-lead{max-width:56ch;margin-top:8px;color:var(--qt);text-wrap:pretty}
.hg-lead+.hg-reg,.hg-lead+.hg-mail,.hg-lead+.hg-pair2{margin-top:32px}
.hg-ver{font-size:12px;line-height:16px;margin-top:8px}
.hg-coverline{max-width:56ch;margin-top:24px}
.hg-no{font-size:12px;line-height:16px;font-weight:400;color:var(--qt);font-variant-numeric:tabular-nums;min-width:40px;flex:none}
.hg-body{max-width:65ch;text-wrap:pretty}
.hg-note{margin-top:16px;color:var(--qt)}
.hg-q{color:var(--qt)}
.hg-mono{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:400;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.hg-say{font-size:28px;line-height:32px;max-width:26em;text-wrap:pretty;margin:40px 0 40px}
.hg-ex,.hg-line{font-size:24px;line-height:28px}
.hg-line{display:block}

/* hero figures and the dimension lines */
.hg-fig{display:grid;grid-template-columns:max-content;margin-top:32px;max-width:100%}
.hg-fig--v{grid-template-columns:24px max-content}
.hg-obj{line-height:0;min-width:0}
.hg-cap{width:0;min-width:100%;margin-top:16px;max-width:65ch;font-size:12px;line-height:16px;color:var(--qt)}
.hg-dh{display:flex;align-items:flex-start;height:16px;margin-bottom:8px;font-size:12px;line-height:16px;color:var(--ink)}
.hg-dh i{flex:1;height:1px;margin-top:7.5px;background:var(--ink)}
.hg-dh .hg-dl{padding:0 6px;white-space:nowrap}
.hg-dh b{position:relative;width:1px;height:24px;flex:none;background:var(--qt)}
.hg-dh b::after{content:"";position:absolute;left:-4px;top:7.5px;width:9px;height:1px;background:var(--ink);transform:rotate(-45deg)}
.hg-dv{display:flex;flex-direction:column;align-items:flex-start;width:24px;font-size:12px;line-height:16px;color:var(--ink)}
.hg-dv i{flex:1;width:1px;margin-left:7.5px;background:var(--ink)}
.hg-dv .hg-dl{writing-mode:vertical-rl;transform:rotate(180deg);padding:6px 0;white-space:nowrap}
.hg-dv b{position:relative;height:1px;width:24px;flex:none;background:var(--qt)}
.hg-dv b::after{content:"";position:absolute;left:3.5px;top:0;width:9px;height:1px;background:var(--ink);transform:rotate(-45deg)}
.hg-crop{position:absolute;inset:0;pointer-events:none}
.hg-crop i{position:absolute;width:12px;height:12px;border:0 solid var(--ink)}
.hg-crop i:nth-child(1){left:-18px;top:-18px;border-right-width:1px;border-bottom-width:1px}
.hg-crop i:nth-child(2){right:-18px;top:-18px;border-left-width:1px;border-bottom-width:1px}
.hg-crop i:nth-child(3){left:-18px;bottom:-18px;border-right-width:1px;border-top-width:1px}
.hg-crop i:nth-child(4){right:-18px;bottom:-18px;border-left-width:1px;border-top-width:1px}
.hg-cropbox{position:relative;display:inline-block;margin:18px}
.hg-lg{display:block;aspect-ratio:var(--ar)}
.hg-lg>*{display:block;width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.hg-fig--cover{margin-top:40px}

/* the ruler */
.hg-foot{margin-top:56px}
.hg-rl{position:relative;height:40px}
.hg-rl__k{display:block}
.hg-rl .hg-t{position:absolute;left:0;right:0;top:0;bottom:0}
.hg-rl__n{position:absolute;top:20px;font-size:12px;line-height:16px;color:var(--qt);white-space:nowrap}
.hg-rl__n--live{color:var(--ink);font-weight:600}
.hg-rl__u{right:0;left:auto}
.hg-rl__m{position:absolute;top:0;width:1px;height:16px;background:var(--ink)}
.hg-rl__r{position:absolute;top:14px;height:2px;background:var(--ink);transform-origin:0 50%}
@media (prefers-reduced-motion:no-preference){.hg-rl__r.hg-draw{animation:hg-run 700ms cubic-bezier(.23,1,.32,1) 200ms both}}
@keyframes hg-run{from{transform:scaleX(0)}}

/* registers */
.hg-reg{border-top:1px solid var(--ink)}
.hg-row{display:grid;grid-template-columns:56px minmax(0,1fr);gap:4px 16px;padding:12px 0;border-bottom:1px solid var(--hr)}
.hg-row>.hg-no{grid-row:1 / span 3;padding-top:4px}
.hg-nm{font-weight:600;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;min-width:0}
.hg-bd{min-width:0;text-wrap:pretty}
.hg-as{min-width:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.hg-not{color:var(--qt);text-decoration-thickness:1px;display:block}
.hg-why{display:block;color:var(--qt);font-size:12px;line-height:16px;margin-top:4px}
.hg-reg--swap .hg-nm{font-weight:400}
.hg-do{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--qt)}
.hg-reg--rule .hg-nm{display:block;font-weight:400}
.hg-vn{font-weight:600}
.hg-vals{display:flex;flex-wrap:wrap;gap:4px 16px}
.hg-reg--toc .hg-nm{font-size:20px;line-height:24px}
.hg-pl{display:flex;flex-wrap:wrap;gap:0 24px}
.hg-pl a{display:inline-flex;align-items:center;min-height:32px;text-decoration:none;border-bottom:1px solid var(--hr)}
@media (hover:hover){.hg-pl a:hover,.hg-toc a:hover,.hg-nav a:hover{text-decoration:underline;text-underline-offset:3px}.hg-menu:hover,.hg-mode button:hover{background:var(--hr)}.hg-pn a:hover .hg-pn__t{text-decoration:underline}}

/* prev and next */
.hg-pn{display:flex;justify-content:space-between;gap:16px;margin-top:40px;border-top:1px solid var(--ink)}
.hg-pn a{display:flex;flex-direction:column;min-height:56px;padding:12px 0;text-decoration:none}
.hg-pn__n{text-align:right;margin-left:auto}
.hg-pn__d{font-size:12px;line-height:16px;color:var(--qt)}
.hg-pn__t{font-size:15px;line-height:24px;font-weight:600}

/* panels */
.hg-panel{background:var(--pn);color:var(--pnk);padding:16px;margin-top:32px}
.hg-panel__l{font-size:12px;line-height:16px;font-weight:600;margin-bottom:24px}
.hg-panel__t{line-height:1.05;letter-spacing:-0.01em}
.hg-trait{display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 16px;padding:16px 0;border-bottom:1px solid var(--pnq)}
.hg-trait:first-child{padding-top:0}.hg-trait:last-child{border-bottom:0;padding-bottom:0}
.hg-trait .hg-no{color:var(--pnq);padding-top:8px}
.hg-trait__t{font-size:44px;line-height:1.05;letter-spacing:-0.01em;overflow-wrap:anywhere}
.hg-trait__m{grid-column:2;max-width:56ch}

/* logo */
.hg-strip{margin:0;padding:32px 24px;background:var(--field);color:var(--fink);line-height:0}
.hg-clear{outline:1px dashed var(--qt);outline-offset:-1px;padding:var(--csm)}
.hg-sw,.hg-gr{display:flex;align-items:center;justify-content:center;border:1px solid var(--hr);flex:none}
.hg-sw{width:176px;height:88px}
.hg-gr{width:100%;max-width:320px;height:112px}
.hg-reg--logo .hg-nm{flex-direction:column;align-items:flex-start}
.hg-steps{display:flex;flex-wrap:wrap;gap:8px 48px;align-items:flex-end}
.hg-steps .hg-fig{margin-top:32px}
.hg-plate{position:relative;aspect-ratio:3/2;overflow:hidden;background:var(--sk);max-width:var(--hzm)}
.hg-plate>img,.hg-plate>.photo-slot{width:100%;height:100%;object-fit:cover;display:block}
.hg-plate__l{position:absolute;left:5%;bottom:6%;padding:5%;width:30%;line-height:0}
.hg-bad{display:flex;align-items:center;justify-content:center;width:176px;height:88px;border:1px solid var(--hr);overflow:hidden;flex:none}
.hg-bad__s{display:block;width:100px;line-height:0}
.hg-bad__x{display:none}
.hg-never{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--qt)}

/* colour */
.hg-chips{display:flex;height:160px;max-width:100%}
.hg-chips__c{flex:1;box-shadow:inset 0 0 0 1px var(--hr)}
.hg-share{display:flex}
.hg-share__f{min-width:0}
.hg-share__c{display:block;height:160px;box-shadow:inset 0 0 0 1px var(--hr)}
[data-theme=dark] .hg-share__c,[data-theme=dark] .hg-chips__c,[data-theme=dark] .hg-chip{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 60%,transparent)}
.hg-chip{display:inline-block;width:48px;height:48px;box-shadow:inset 0 0 0 1px var(--hr);flex:none}
.hg-chip--s{width:24px;height:24px}
.hg-aa{display:inline-flex;align-items:center;justify-content:center;width:64px;height:48px;font-size:24px;line-height:28px;box-shadow:inset 0 0 0 1px var(--hr)}
.hg-aa-hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 32px;margin-top:32px;padding:32px 24px;box-shadow:inset 0 0 0 1px var(--hr)}
.hg-aa-hero__g{font-size:120px;line-height:1}
.hg-aa-hero__u{font-weight:600;max-width:30ch}
.hg-modes{display:grid;gap:32px}
.hg-roles ul{border-top:1px solid var(--ink)}
.hg-roles li{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--hr)}
.hg-roles li>span:nth-child(2){flex:1}

/* typography */
.hg-ag{line-height:1;white-space:nowrap;letter-spacing:-0.01em;padding-bottom:8px}
.hg-role{display:block;width:100%;font-size:12px;line-height:16px;font-weight:400;color:var(--qt)}
.hg-face{font-size:28px;line-height:32px}
.hg-wts{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:20px;line-height:24px}
.hg-reg--scale{--capz:40px}
.hg-samp{display:block;overflow-wrap:anywhere}
.hg-spec{--hs:48px;margin-top:32px;padding:32px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--hr)}
.hg-spec__h{max-width:20ch;letter-spacing:-0.01em;text-wrap:balance}
.hg-spec__p{max-width:56ch;margin-top:24px;text-wrap:pretty}
.hg-spec__c{max-width:56ch;margin-top:16px;color:var(--qt);font-family:var(--body);font-size:12px;line-height:16px}

/* imagery */
.hg-photo{aspect-ratio:3/2;overflow:hidden;background:var(--sk)}
.hg-photo>img,.hg-photo>.photo-slot,.hg-fr__i>img,.hg-fr__i>.photo-slot,.hg-thumb>img,.hg-thumb>.photo-slot{width:100%;height:100%;display:block;object-fit:cover}
.hg .photo-slot{background:var(--sk);border:1px dashed var(--qt);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:8px;font-size:12px;line-height:16px;box-sizing:border-box}
.hg .to-shoot{background:var(--sk);border:1px solid var(--qt);color:var(--ink);display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:8px;padding:16px;box-sizing:border-box;overflow:hidden;font-size:14px;line-height:20px;text-wrap:pretty}
.hg .to-shoot b{font-family:var(--mono);font-size:12px;line-height:16px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase}
.hg .hg-thumb .to-shoot{padding:8px;justify-content:center}
.hg .hg-thumb .to-shoot b{font-size:11px;letter-spacing:0.04em}
.hg-thumb{display:block;width:120px;height:80px;overflow:hidden;flex:none;background:var(--sk)}
.hg-pair2{display:grid;gap:24px;margin-top:32px}
.hg-fr__i{aspect-ratio:4/5;overflow:hidden;background:var(--sk);max-width:420px}

/* layout */
.hg-grid{display:flex;gap:0 var(--gg);padding:0 var(--gm);border:1px solid var(--ink);container-type:inline-size;box-sizing:border-box}
.hg-grid i{flex:1;background:var(--hr)}
.hg-lay{position:relative;container-type:inline-size;box-sizing:border-box;overflow:hidden;background:var(--field);color:var(--fink)}
.hg-lay__g{position:absolute;inset:0;display:flex;gap:0 var(--gg);padding:0 var(--gm)}
.hg-lay__g i{flex:1;box-shadow:inset 1px 0 0 var(--fqt),inset -1px 0 0 var(--fqt)}
.hg-lay__l{position:absolute;left:var(--gm);top:calc(var(--gm) * 1.2);width:calc(66% - var(--gm));font-size:7.2cqw;line-height:1.02;letter-spacing:-0.01em}
.hg-lay__lg{position:absolute;left:var(--gm);bottom:var(--gm);width:26cqw;line-height:0}
.hg-bar-s{display:block;height:16px;background:var(--ink)}
.hg-reg--space .hg-bd{min-width:0}

/* applications */
.hg-pair{display:grid;gap:32px;align-items:start;margin-top:32px}
.hg-mk{position:relative;aspect-ratio:4/5;overflow:hidden;max-width:400px;background:var(--sk)}
.hg-mk img{position:absolute;left:var(--pl);top:var(--pt);width:var(--pw);height:auto;max-width:none;display:block}
.hg-sign p,.hg .sd-sign p{font-family:var(--display)}
.hg-phwrap{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.hg-phone{width:195px;height:422px;overflow:hidden;border:1px solid var(--ink);flex:none}
.hg-phone>.ph{transform:scale(.5);transform-origin:0 0}
.hg-phwrap .hg-reg{flex:1 1 200px}
.hg .ph{position:relative;width:390px;height:844px;overflow:hidden;box-sizing:border-box;background:var(--surface);color:var(--text)}
.hg .ph-top{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;box-sizing:border-box;border-bottom:1px solid var(--divider)}
.hg .ph-time{font-size:14px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--quiet)}
.hg .ph-ans{height:176px;padding:16px;box-sizing:border-box;border-bottom:1px solid var(--divider);display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.hg .ph-line{display:flex;align-items:center;gap:12px;height:24px}
.hg .ph-ft{font-size:14px;line-height:20px;color:var(--quiet)}
.hg .ph-eta{margin:0;font-size:44px;line-height:44px}
.hg .ph-note{margin:0;font-size:14px;line-height:20px;color:var(--quiet);max-width:300px}
.hg .ph .ui-list{margin:0;padding:0}
.hg .ph .ui-row{box-sizing:border-box;height:72px;min-height:72px;padding:0 16px}
.hg .ph-btn{position:absolute;left:16px;right:16px;bottom:16px}
.hg-cards{display:flex;flex-wrap:wrap;gap:0 40px}
.hg .sd-card{box-sizing:border-box;line-height:0}
.hg .sd-card--back{display:flex;flex-direction:column;font-family:var(--body);line-height:1.3}
.hg .sd-card--back p{margin:0}
.hg .sd-card__n{font-weight:600}
.hg-posts{display:flex;flex-wrap:wrap;gap:24px;margin-top:32px}
.hg-post{width:296px;height:296px;padding:24px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
.hg-post--gr{box-shadow:inset 0 0 0 1px var(--hr)}
.hg-post__t{line-height:1.05;letter-spacing:-0.01em}
.hg-post__lg{line-height:0;display:block;width:64px}
.hg-mail{margin-top:32px;border-top:1px solid var(--ink);max-width:640px}
.hg-mail__h{padding:12px 0;border-bottom:1px solid var(--hr);display:grid;gap:4px}
.hg-mail__h div{display:grid;grid-template-columns:72px minmax(0,1fr);gap:8px}
.hg-mail__h dt{font-size:12px;line-height:24px;font-weight:600;color:var(--qt)}
.hg-mail__b{padding:16px 0;display:grid;gap:12px;font-family:var(--body)}
.hg-sig{border-top:1px solid var(--hr);padding-top:16px;margin-top:8px;display:grid;gap:4px;max-width:400px}
.hg-sig__lg{display:block;width:120px;margin-top:12px;line-height:0}

@media (max-width:840px){
  .hg-tn{display:revert}.hg-tm{display:none}
  .hg-hz{width:var(--hzn)}.hg-fz{font-size:var(--fzn)}
  .hg-clear{padding:var(--csn)}
  .hg-bar{padding:0 16px;gap:12px}
  .hg-nav{display:none}
  .hg-brand svg{max-width:96px;height:auto}
  .hg-toc__in{padding:16px;grid-template-columns:1fr}
  .hg-end{margin-left:0;margin-right:0}
  .hg-rh{grid-template-columns:1fr}
  .hg-rh span:first-child{display:none}
  .hg-h1,.hg-h2--big{font-size:28px;line-height:32px}
  .hg-say{font-size:22px;line-height:28px}
  .hg-ex,.hg-line{font-size:20px;line-height:24px}
  .hg-trait__t{font-size:32px}
  .hg-aa-hero__g{font-size:88px}
  .hg-row{grid-template-columns:40px minmax(0,1fr)}
  .hg-row>*:not(.hg-no){grid-column:2}
  .hg-share__c,.hg-chips{height:120px}
  .hg-reg--gr .hg-nm,.hg-reg--bad .hg-nm{display:block}
}
@media (min-width:841px){
  .hg-main{--sw:720px}
  .hg-pg{grid-template-columns:minmax(0,1fr) 24px;column-gap:24px;max-width:calc(var(--sw) + 48px);padding:56px 0 0}
  .hg-pg--cover{padding-top:0}
  .hg-band{margin:0 0 56px -32px;padding:48px 32px 24px;margin-right:-24px}
  .hg-tab{width:24px;height:66px;padding-top:10px}
  .hg-panel{padding:32px}
  .hg-row{grid-template-columns:56px minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)}
  .hg-row>.hg-no{grid-row:auto}
  .hg-reg--rule .hg-row{grid-template-columns:56px minmax(0,1fr) minmax(0,1fr)}
  .hg-reg--scale{--capz:64px}
  .hg-spec{--hs:64px}
  .hg-modes,.hg-pair2{grid-template-columns:1fr 1fr}
  .hg-pair{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .hg-reg--toc .hg-row{grid-template-columns:56px minmax(0,1fr) minmax(0,3fr)}
}
@media (min-width:1100px){
  .hg-tw{display:revert}.hg-tm{display:none}
  .hg-hz{width:var(--hzw)}.hg-fz{font-size:var(--fzw)}
  .hg-clear{padding:var(--csw)}
  .hg-main{--sw:960px}
  .hg-panel{padding:48px}
  .hg-phone{width:260px;height:563px}
  .hg-phone>.ph{transform:scale(.6667)}
  .hg-spec{--hs:72px}
}
.ph-b>.ph-l{font-weight:600}
`;
}
