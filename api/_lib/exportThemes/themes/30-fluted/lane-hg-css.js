// Theme 30, Fluted, lane hg: the guide site stylesheet. One ground per mode (the roles' surface), the theme's chrome face for heads and keys, DM Mono for literal
// values, hairlines for structure and radius 0 on every theme element (the brand's radii only on its own controls). The bands are SVG drawn by lane-bk-glass.js
// (classes renamed hg-); here they are sized, swapped by width, and their reed profile swapped by mode. No hex is written here: every colour is a role from ctx.
const vars = (r) => `--g:${r.surface};--ink:${r.text};--soft:${r.textSoft};--quiet:${r.quiet};--hair:${r.divider};--edge:${r.border};--panel:${r.raised};--strong:${r.action};--strong-hover:${r.actionHover};--strong-ink:${r.actionLabel};--focus:${r.focus};`
  + ['success', 'warning', 'danger', 'info'].map((t) => `--t-${t}:${r[t].fg};`).join('');

export function guideCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights;
  const rc = B.ui.radius.control;
  return `[data-gs-root]{${vars(L)}--hg-chrome:'Familjen Grotesk',sans-serif;--hg-dm:'DM Mono',monospace;--hg-display:'${d.family}',sans-serif;--hg-body:'${b.family}',sans-serif;--hg-mono:'${m ? m.family : 'DM Mono'}',monospace;--wrap:min(1312px,calc(100% - 128px))}
html[data-theme="dark"] [data-gs-root]{${vars(D)}}
html[data-theme="dark"]{color-scheme:dark}
[data-gs-root]{background:var(--g);color:var(--ink);font:${W.regular} 16px/25px var(--hg-body);-webkit-font-smoothing:antialiased;font-kerning:normal;min-height:100vh}
[data-gs-root] :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
[data-gs-root] :where(ul,ol){list-style:none}
[data-gs-root] :where(a){color:inherit}
[data-gs-root] .hg-disp{font-family:var(--hg-display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em}
[data-gs-root] .hg-v{font:400 15px/20px var(--hg-dm);color:var(--quiet);font-variant-numeric:tabular-nums}
[data-gs-root] :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.hg-for-dark{display:none}html[data-theme="dark"] .hg-for-dark{display:inline}html[data-theme="dark"] .hg-for-light{display:none}

/* ---- the running head of the site: logo, the two sites, contents and the mode switch ---- */
.hg-bar{position:sticky;top:0;z-index:20;background:var(--g);border-bottom:1px solid var(--hair)}
.hg-bar__in{display:flex;align-items:center;gap:32px;padding:0 64px;height:64px}
.hg-brand{display:block;flex:none;text-decoration:none;width:132px}
.hg-brand .hg-logo,.hg-brand .hg-slot{width:132px}
.hg-sites{display:flex;gap:24px;flex:1;min-width:0}
.hg-sites a{display:block;padding:20px 0 19px;font:500 15px/20px var(--hg-chrome);color:var(--soft);text-decoration:none;border-bottom:2px solid transparent;transition:border-color 150ms ease-out,color 150ms ease-out}
.hg-sites a[aria-current]{color:var(--ink);border-bottom-color:var(--strong)}
@media (hover:hover){.hg-sites a:hover{color:var(--ink);border-bottom-color:var(--edge)}}
.hg-btn{appearance:none;cursor:pointer;font:500 15px/20px var(--hg-chrome);color:var(--ink);background:transparent;border:1px solid var(--edge);border-radius:0;padding:7px 14px;height:36px;transition:background-color 150ms ease-out,border-color 150ms ease-out}
@media (hover:hover){.hg-btn:hover{border-color:var(--ink)}}
.hg-btn[aria-expanded="true"]{background:var(--ink);color:var(--g);border-color:var(--ink)}
.hg-mode{display:inline-flex;flex:none;border:1px solid var(--edge)}
.hg-mode button{appearance:none;border:0;background:transparent;color:var(--ink);font:500 15px/1 var(--hg-chrome);height:34px;padding:0 14px;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
html[data-theme="dark"] .hg-mode [data-mode="dark"],html:not([data-theme="dark"]) .hg-mode [data-mode="light"]{background:var(--ink);color:var(--g)}
.hg-mode button:focus-visible{outline-offset:-4px}
.hg-toc{display:none;border-top:1px solid var(--hair);max-height:calc(100vh - 64px);overflow:auto;overscroll-behavior:contain;background:var(--g)}
.hg-toc[data-open="true"]{display:block}
.hg-toc__in{width:var(--wrap);margin:0 auto;padding:32px 0 40px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px 24px}
.hg-toc__s{font:500 15px/20px var(--hg-chrome);color:var(--ink);padding-bottom:8px;border-bottom:1px solid var(--hair);margin-bottom:4px}
.hg-toc__a{display:flex;gap:12px;align-items:baseline;padding:6px 0;font:400 15px/20px var(--hg-chrome);color:var(--soft);text-decoration:none}
.hg-toc__a[aria-current]{color:var(--ink);font-weight:500}
@media (hover:hover){.hg-toc__a:hover{color:var(--ink);text-decoration:underline}}
.hg-toc__n{font:400 15px/20px var(--hg-dm);color:var(--quiet)}
.hg-main{display:block;overflow-x:clip}
.hg-main:focus{outline:none}
.hg-foot{width:var(--wrap);margin:0 auto;padding:32px 0 48px;border-top:1px solid var(--hair)}
.hg-pn{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 32px;margin-bottom:32px}
.hg-pn a{display:flex;flex-direction:column;gap:4px;padding:16px 0;border-top:1px solid var(--hair);text-decoration:none;font:500 18px/24px var(--hg-chrome);color:var(--ink)}
.hg-pn a:last-child:not(:first-child){text-align:right}
.hg-pn__l{font:400 15px/20px var(--hg-chrome);color:var(--quiet)}
@media (hover:hover){.hg-pn a:hover{border-top-color:var(--ink)}}
.hg-fine{font:400 15px/20px var(--hg-chrome);color:var(--quiet)}

/* ---- a page: the quiet top, the band, the key, the appendix ---- */
.hg-in{width:var(--wrap);margin:0 auto}
.hg-sec{position:relative;padding:72px 0 96px}
.hg-top{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;align-items:end;min-height:360px}
.hg-top__t{grid-column:1 / span 5;display:flex;flex-direction:column;gap:24px;align-self:start}
.hg-top__b{grid-column:6 / span 3;container-type:inline-size;justify-self:stretch;min-width:0}
.hg-run{display:flex;gap:16px;align-items:baseline;font:500 15px/20px var(--hg-chrome);color:var(--ink);margin-bottom:24px}
.hg-no{font:400 15px/20px var(--hg-dm);color:var(--quiet)}
.hg-run__n{margin-left:auto;font-weight:400;color:var(--quiet)}
.hg-hd{font-size:64px;line-height:64px;max-width:777px;overflow-wrap:break-word}
.hg-hd__1{display:block;color:var(--ink)}
.hg-hd__2{display:block;color:var(--quiet)}
.hg-lead{font:${W.regular} 16px/25px var(--hg-body);color:var(--soft);max-width:468px}
.hg-band{margin:72px 0 0;width:100%;line-height:0}
.hg-svg{display:block;width:100%;height:auto}
.hg-fx--d{display:none}html[data-theme="dark"] .hg-fx--d{display:inline}html[data-theme="dark"] .hg-fx--l{display:none}
@keyframes hg-settle{from{transform:scale(-1.6,1)}}
.hg-settle use{animation:hg-settle 700ms cubic-bezier(0.23,1,0.32,1) both}
@media (prefers-reduced-motion:reduce){.hg-settle use{animation:none}}
.hg-keyrow{display:flex;flex-direction:column;gap:12px;padding:24px 0 0}
.hg-key{display:flex;flex-wrap:wrap;gap:12px 40px}
.hg-key li{display:flex;align-items:center;gap:8px;font:400 15px/20px var(--hg-chrome);color:var(--soft)}
.hg-arch{flex:none;display:block;color:var(--quiet)}
.hg-keynote{max-width:620px}
.hg-body{display:flex;flex-direction:column;gap:24px;padding-top:96px}
.hg-h2{font:500 15px/20px var(--hg-chrome);color:var(--ink);padding-top:24px;border-top:1px solid var(--hair);margin-top:24px}
.hg-p{font:${W.regular} 16px/25px var(--hg-body);color:var(--soft);max-width:620px}
.hg-q{font:400 15px/20px var(--hg-chrome);color:var(--quiet)}
.hg-do{font:500 15px/20px var(--hg-chrome);color:var(--ink);margin-right:8px}
.hg-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 64px}
.hg-two > div{display:flex;flex-direction:column;gap:16px;min-width:0}
.hg-rows{display:flex;flex-direction:column}
.hg-rows > div{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:16px 0;border-top:1px solid var(--hair)}
.hg-rows dt{grid-column:1 / span 2;font:500 15px/20px var(--hg-chrome);color:var(--ink);padding-top:3px}
.hg-rows dd{grid-column:3 / span 5;color:var(--soft);max-width:620px;min-width:0;overflow-wrap:anywhere}
.hg-rows > div:last-child{border-bottom:1px solid var(--hair)}
.hg-vals{flex-direction:row;flex-wrap:wrap;gap:4px 32px}
.hg-vals > div{display:flex;gap:8px;align-items:baseline;border:0;padding:0}
.hg-vals dt{padding:0;font-weight:400;color:var(--quiet)}
.hg-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 64px}
.hg-rules li{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--hair);color:var(--soft)}
.hg-logo{display:block;width:var(--lw);max-width:100%}
.hg-logo svg{display:block;width:100%;height:auto}
.hg-slot{overflow:hidden;box-sizing:border-box;display:flex;align-items:center;justify-content:center;max-width:100%;border:1.5px dashed var(--quiet);color:var(--quiet);font:400 15px/20px var(--hg-chrome);text-align:center;padding:4px}
.hg-lines li{font-size:28px;line-height:36px;color:var(--ink);padding:8px 0}

/* the big things */
.hg-bigl{display:flex;justify-content:flex-end}
.hg-bigl .hg-logo,.hg-bigl .hg-slot{width:min(var(--lw,360px),100%)}
.hg-bigwords li{font-size:40px;line-height:44px;color:var(--ink);padding:4px 0;text-align:right}
.hg-bigq{font-size:32px;line-height:36px;color:var(--ink);text-align:right;overflow-wrap:break-word}
.hg-bignum{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.hg-bignum__n{font-size:${'min(160px,32cqw)'};line-height:1;color:var(--ink)}
.hg-arches{display:flex;align-items:flex-end;gap:8px;height:260px}
.hg-arches li{display:flex;align-items:flex-end;height:100%;min-width:24px}
.hg-arches i{display:block;width:100%;border-radius:999px 999px 0 0;border:1px solid var(--hair)}
.hg-aa{display:flex;align-items:center;justify-content:center;height:260px;font-size:120px;line-height:1;border:1px solid var(--hair)}
.hg-face-big{font-size:120px;line-height:1;color:var(--ink);text-align:right;white-space:nowrap}
.hg-min{display:flex;justify-content:flex-end;padding:24px 0}
.hg-clear{display:flex;justify-content:flex-end}
.hg-clear__b{display:inline-block;outline:1px dashed var(--edge);max-width:100%}
.hg-photo-big{aspect-ratio:4/5;width:100%;overflow:hidden}
.hg-shot-big{width:100%;aspect-ratio:3/4;overflow:hidden}
.hg-shot-big img,.hg-shot-big svg.pl{display:block;width:100%;height:100%;object-fit:cover;object-position:30% 60%}
.hg-shot-big--wide,.hg-shot-big.hg-shot-big--wide{aspect-ratio:3/2}
.hg-shot-big--wide img,.hg-shot-big--wide svg.pl{object-position:50% 50%}
[data-gs-root] .hg-photo{display:block;width:100%;height:100%;object-fit:cover}
[data-gs-root] .photo-slot{display:flex;align-items:flex-end;padding:16px;background:var(--panel);border:1px dashed var(--edge);color:var(--soft);font:400 15px/20px var(--hg-chrome)}
.hg-photo-big .photo-slot{height:100%}
[data-gs-root] .hg-brief{flex-direction:column;align-items:flex-start;justify-content:space-between;gap:8px;text-align:left;background:var(--g)}
[data-gs-root] .hg-brief b{font:500 15px/20px var(--hg-chrome);color:var(--ink)}
.hg-brief span{max-width:34em}
.hg-pg{display:block;width:min(100%,360px);height:auto;margin-left:auto}
.hg-pg__p{fill:var(--g);stroke:var(--edge);stroke-width:4}
.hg-pg__c{fill:var(--strong)}
.hg-pg__m{fill:none;stroke:var(--quiet);stroke-width:3;stroke-dasharray:12 12}
.hg-bigsp{display:flex;justify-content:flex-end}
.hg-space{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}
.hg-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.hg-space i{display:block;background:var(--strong)}
.hg-email{font-size:40px;line-height:1.1;color:var(--ink);text-align:right;overflow-wrap:anywhere}
.hg-email a{text-decoration:underline;text-decoration-color:var(--edge);text-underline-offset:6px}
.hg-sig{display:flex;flex-direction:column;gap:4px;padding:24px 0;border-top:1px solid var(--hair);color:var(--soft)}
.hg-sig__n{font:500 16px/24px var(--hg-body);color:var(--ink)}
.hg-sig__lg{margin-bottom:12px}

/* page bodies */
.hg-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.hg-traits li{display:flex;flex-direction:column;gap:8px}
.hg-trait{font-size:32px;line-height:36px;color:var(--ink)}
.hg-say li,.hg-wtn li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:16px 0;border-top:1px solid var(--hair);align-items:baseline}
.hg-say .hg-v{grid-column:1}
.hg-say__t{grid-column:2 / span 2;font:500 15px/20px var(--hg-chrome);color:var(--ink)}
.hg-say__x{grid-column:4 / span 5;font-size:32px;line-height:36px;color:var(--ink)}
.hg-say__x:not(.hg-disp){font:${W.regular} 16px/25px var(--hg-body);color:var(--soft)}
.hg-wtn__w{grid-column:1 / span 3;color:var(--ink)}
.hg-wtn__n{grid-column:4 / span 2;color:var(--quiet)}
.hg-wtn li .hg-q{grid-column:6 / span 3}
.hg-vers{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:32px 16px}
.hg-vers--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.hg-vers li{display:flex;flex-direction:column;gap:12px}
.hg-ver__g{display:flex;align-items:center;justify-content:center;height:160px;padding:24px;border:1px solid var(--hair);overflow:hidden}
.hg-ver__k{display:flex;flex-direction:column;gap:4px}
.hg-ver__n{font:500 15px/20px var(--hg-chrome);color:var(--ink)}
.hg-mis--s .hg-logo{transform:scale(1.5,0.6)}
.hg-mis--r .hg-logo{transform:rotate(-14deg)}
.hg-never{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.hg-never li{padding-top:12px;border-top:1px solid var(--hair);color:var(--soft)}
.hg-cols{display:flex;flex-direction:column}
.hg-col{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:24px 0;border-top:1px solid var(--hair)}
.hg-col__sw{grid-column:1 / span 2;height:120px;border:1px solid var(--hair)}
.hg-col__t{grid-column:3 / span 6;display:flex;flex-direction:column;gap:12px;min-width:0}
.hg-col__n{font:500 15px/20px var(--hg-chrome);color:var(--ink);display:flex;gap:16px;align-items:baseline}
.hg-shares li{display:flex;gap:24px;align-items:baseline;padding:12px 0;border-top:1px solid var(--hair)}
.hg-shares__n{color:var(--ink)}
.hg-pairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hg-pair{display:flex;flex-direction:column;gap:8px;padding:24px;min-height:140px;justify-content:space-between}
.hg-pair--edge{border:1px solid var(--hair)}
.hg-pair__r{font:500 24px/28px var(--hg-chrome)}
.hg-pair__u{font:500 24px/28px var(--hg-chrome)}
.hg-pair:not(.hg-pair--lg) .hg-pair__u{font:500 16px/24px var(--hg-chrome)}
.hg-roles li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--hair)}
.hg-roles__sw{width:24px;height:24px;border:1px solid var(--hair)}
.hg-roles__n{color:var(--soft)}
.hg-faces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.hg-faces li{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--hair)}
.hg-face__n{font-size:32px;line-height:40px;color:var(--ink)}
.hg-face__c{font-size:20px;line-height:28px;color:var(--soft);overflow-wrap:anywhere}
.hg-scale li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:24px 0;border-top:1px solid var(--hair);align-items:baseline}
.hg-scale__k{grid-column:1 / span 3;display:flex;flex-direction:column;gap:4px}
.hg-scale__t{font:500 15px/20px var(--hg-chrome);color:var(--ink)}
.hg-scale__s{grid-column:4 / span 5;color:var(--ink);overflow-wrap:anywhere;max-width:760px;min-width:0}
.hg-inuse{display:flex;flex-direction:column;gap:16px}
.hg-inuse__h{font-size:48px;line-height:52px;color:var(--ink);max-width:777px}
.hg-ui li{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,5fr);gap:16px;align-items:baseline;padding:12px 0;border-top:1px solid var(--hair)}
.hg-ui__t{font:500 15px/20px var(--hg-chrome);color:var(--ink)}
.hg-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 16px}
.hg-shots li,.hg-shots figure{display:flex;flex-direction:column;gap:8px}
.hg-shots .hg-photo{aspect-ratio:4/3;height:auto}
.hg-credit{display:block;margin-top:4px}
.hg-radii{display:flex;flex-wrap:wrap;gap:24px}
.hg-radii li{display:flex;flex-direction:column;gap:8px}
.hg-radii i{display:block;width:72px;height:72px;border:1.5px solid var(--ink)}
.hg-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.hg-card{aspect-ratio:90/55;display:flex;flex-direction:column;justify-content:center;padding:16px 20px;border:1px solid var(--hair);container-type:inline-size}
.hg-card__lg .hg-logo,.hg-card__lg .hg-slot{width:min(200px,70cqw)}
.hg-card--b{justify-content:space-between;font:400 15px/20px var(--hg-body)}
.hg-card__nm{font:500 15px/20px var(--hg-body)}
.hg-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.hg-posts--one{grid-template-columns:minmax(0,1fr)}
.hg-post{aspect-ratio:1;display:flex;flex-direction:column;justify-content:space-between;padding:16px;border:1px solid var(--hair);container-type:inline-size}
.hg-post p{font-size:min(24px,9cqw);line-height:1.15}
.hg-posts--one .hg-post p{font-size:min(40px,10cqw)}
.hg-post__lg .hg-logo{width:40px}
.hg-poster{aspect-ratio:3/2;display:flex;align-items:flex-start;padding:32px;border:1px solid var(--hair)}
.hg-poster p{font-size:min(72px,9vw);line-height:1.05;max-width:14ch}
.hg-mail{display:flex;flex-direction:column;gap:16px;max-width:620px}
.hg-mail__h > div{display:flex;gap:16px;padding:4px 0;border-bottom:1px solid var(--hair)}
.hg-mail__h dt{font:500 15px/20px var(--hg-chrome);color:var(--ink);width:72px;flex:none}
.hg-mail__h dd{color:var(--soft)}
.hg-rowsl li{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr) minmax(0,3fr) minmax(0,3fr);gap:16px;align-items:baseline;padding:12px 0;border-top:1px solid var(--hair)}
.hg-rowsl__n{color:var(--ink)}
.hg-rowsl__s{font:500 15px/20px var(--hg-chrome);color:var(--ink)}

@media (min-width:841px){
.hg-svg--n{display:none}
}
@media (max-width:840px){
[data-gs-root]{--wrap:calc(100% - 32px)}
.hg-bar__in{padding:0 16px;gap:12px;height:56px}
.hg-brand,.hg-brand .hg-logo,.hg-brand .hg-slot{width:104px}
.hg-sites{display:none}
.hg-btn{margin-left:auto;height:40px}
.hg-mode button{height:38px;padding:0 12px}
.hg-toc{max-height:calc(100vh - 56px)}
.hg-toc__in{grid-template-columns:minmax(0,1fr);gap:24px}
.hg-svg--w{display:none}
.hg-sec{padding:32px 0 64px}
.hg-top{grid-template-columns:minmax(0,1fr);min-height:0;row-gap:40px}
.hg-top__t,.hg-top__b{grid-column:1}
.hg-run{margin-bottom:8px}
.hg-run__n{display:none}
.hg-hd{font-size:40px;line-height:44px}
.hg-band{margin-top:48px}
.hg-key{gap:8px 24px}
.hg-body{padding-top:64px}
.hg-rows > div,.hg-say li,.hg-wtn li,.hg-col,.hg-scale li,.hg-ui li,.hg-rowsl li{grid-template-columns:minmax(0,1fr);row-gap:8px}
.hg-rows dt,.hg-rows dd,.hg-say .hg-v,.hg-say__t,.hg-say__x,.hg-wtn__w,.hg-wtn__n,.hg-wtn li .hg-q,.hg-col__sw,.hg-col__t,.hg-scale__k,.hg-scale__s{grid-column:1}
.hg-col__sw{height:64px}
.hg-say__x{font-size:26px;line-height:32px}
.hg-two,.hg-rules,.hg-traits,.hg-never,.hg-faces,.hg-shots,.hg-pairs,.hg-vers--3,.hg-pn{grid-template-columns:minmax(0,1fr)}
.hg-bigl,.hg-min,.hg-clear,.hg-bigsp{justify-content:flex-start}
.hg-bigwords li,.hg-bigq,.hg-face-big,.hg-email{text-align:left}
.hg-bignum{align-items:flex-start}
.hg-pg{margin-left:0}
.hg-face-big{white-space:normal}
.hg-cards{grid-template-columns:minmax(0,1fr)}
.hg-posts{grid-template-columns:minmax(0,1fr)}
.hg-photo-big{aspect-ratio:4/3}
.hg-shot-big{aspect-ratio:4/5}
.hg-shot-big.hg-shot-big--wide{aspect-ratio:3/2}
.hg-arches,.hg-aa{height:200px}
.hg-pn a:last-child:not(:first-child){text-align:left}
}
@media (prefers-reduced-motion:reduce){[data-gs-root] *{transition:none!important}}${ctx.placeholders ? '.hg-pair .ph-c{font-size:1em}' : ''}`;
}
