// Theme 30, Fluted: the brand book stylesheet (lane bk). One ground per mode (the roles' surface), the theme's chrome face for heads and keys,
// DM Mono for every value, hairlines for structure and radius 0 on every theme element (the brand's radii only on its own controls and UI art).
// The bands are SVG drawn in lane-bk-glass.js; here they are sized, swapped by width, and their reed profile swapped by mode. No hex is written here.

const vars = (r) => `--g:${r.surface};--ink:${r.text};--soft:${r.textSoft};--quiet:${r.quiet};--hair:${r.divider};--edge:${r.border};--panel:${r.raised};--strong:${r.action};--strong-hover:${r.actionHover};--strong-ink:${r.actionLabel};--focus:${r.focus};`
  + ['success', 'warning', 'danger', 'info'].map((t) => `--t-${t}:${r[t].fg};`).join('');

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights;
  const rc = B.ui.radius.control;
  return `:root,.bk--board{${vars(L)}--chrome:'Familjen Grotesk',sans-serif;--dm:'DM Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'DM Mono'}',monospace;--wrap:min(1312px,calc(100% - 128px))}
[data-theme="dark"]{${vars(D)}}
body{background:var(--g);color:var(--ink)}
.bk{background:var(--g);color:var(--ink);font:${W.regular} 16px/25px var(--body);-webkit-font-smoothing:antialiased;font-kerning:normal;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em}
.bk .fl-v{font:400 15px/20px var(--dm);color:var(--quiet);font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.fl-for-dark{display:none}[data-theme="dark"] .fl-for-dark{display:inline}[data-theme="dark"] .fl-for-light{display:none}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--ink);color:var(--g);padding:12px 16px;font:500 15px/1 var(--chrome);text-decoration:none}
.bk-skip:focus{top:16px}

/* ---- the running head of the site: brand, sections and the preview switch ---- */
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:32px;padding:0 64px;height:64px;background:var(--g);border-bottom:1px solid var(--hair)}
.bk-brand{display:block;flex:none;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font:500 18px/1.2 var(--chrome)}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;flex-wrap:wrap;gap:0 24px;list-style:none;margin:0;padding:0}
.bk-nav a{display:flex;gap:8px;align-items:baseline;padding:20px 0 19px;font:500 15px/20px var(--chrome);color:var(--soft);text-decoration:none;border-bottom:2px solid transparent;transition:border-color 150ms ease-out,color 150ms ease-out}
.bk-nav .bk-n{font:400 15px/20px var(--dm);color:var(--quiet)}
.bk-nav a[aria-current]{color:var(--ink);border-bottom-color:var(--strong)}
@media (hover:hover){.bk-nav a:hover{color:var(--ink);border-bottom-color:var(--edge)}}
.bk-mode{display:inline-flex;flex:none;border:1px solid var(--edge)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--ink);font:500 15px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--ink);color:var(--g)}
.bk-mode button:focus-visible{outline-offset:-4px}
.bk main{display:block;overflow-x:clip}
.bk main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;width:var(--wrap);margin:0 auto;padding:32px 0 48px;border-top:1px solid var(--hair);font:400 15px/20px var(--chrome);color:var(--quiet)}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translate(-50%,12px);z-index:40;padding:12px 20px;background:var(--ink);color:var(--g);font:500 15px/20px var(--chrome);visibility:hidden;pointer-events:none;transition:transform 180ms ease-out,visibility 0s linear 180ms;max-width:calc(100vw - 32px)}
.bk-live.is-on{visibility:visible;transform:translate(-50%,0);transition:transform 180ms ease-out}
.bk-live:empty{display:none}

/* ---- a section: the quiet top, the band, the key, the appendix ---- */
.fl-in{width:var(--wrap);margin:0 auto}
.fl-sec{position:relative;padding:120px 0 96px;scroll-margin-top:64px;border-top:1px solid var(--hair)}
.fl-sec--open{border-top:0;padding-top:64px}
.fl-top{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;align-items:end;min-height:360px}
.fl-top__t{grid-column:1 / span 5;display:flex;flex-direction:column;gap:24px;align-self:start}
.fl-top__b{grid-column:6 / span 3;container-type:inline-size;justify-self:stretch}
.fl-run{display:flex;gap:16px;align-items:baseline;font:500 15px/20px var(--chrome);color:var(--ink);margin-bottom:24px}
.fl-no{font:400 15px/20px var(--dm);color:var(--quiet)}
.fl-run__n{margin-left:auto;font-weight:400;color:var(--quiet)}
.fl-h{font-size:64px;line-height:64px;max-width:777px;overflow-wrap:break-word}
.fl-h__1{display:block;color:var(--ink)}
.fl-h__2{display:block;color:var(--quiet)}
.fl-lead{font:${W.regular} 16px/25px var(--body);color:var(--soft);max-width:468px}
/* the band: full bleed, one drawing per width, the reed profile per mode */
.fl-band{margin:72px 0 0;width:100%;line-height:0}
.fl-svg{display:block;width:100%;height:auto}
.fl-fx--d{display:none}[data-theme="dark"] .fl-fx--d{display:inline}[data-theme="dark"] .fl-fx--l{display:none}
@keyframes fl-settle{from{transform:scale(-1.6,1)}}
.fl-settle use{animation:fl-settle 700ms cubic-bezier(0.23,1,0.32,1) both}
@media (prefers-reduced-motion:reduce){.fl-settle use{animation:none}}
.fl-keyrow{display:flex;flex-direction:column;gap:12px;padding:24px 0 0}
.fl-key{display:flex;flex-wrap:wrap;gap:12px 40px}
.fl-key li{display:flex;align-items:center;gap:8px;font:400 15px/20px var(--chrome);color:var(--soft)}
.fl-arch{flex:none;display:block;color:var(--quiet)}
.fl-key__n{color:var(--soft)}
.fl-keynote{max-width:620px}
/* the appendix */
.fl-body{display:flex;flex-direction:column;gap:24px;padding-top:96px}
.fl-h3{font:500 15px/20px var(--chrome);color:var(--ink);padding-top:24px;border-top:1px solid var(--hair);margin-top:24px}
.fl-p{font:${W.regular} 16px/25px var(--body);color:var(--soft);max-width:620px}
.fl-q{font:400 15px/20px var(--chrome);color:var(--quiet)}
.fl-narrow{max-width:620px}
.fl-do{font:500 15px/20px var(--chrome);color:var(--ink);margin-right:8px}
.fl-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 64px}
.fl-two > div{display:flex;flex-direction:column;gap:16px;min-width:0}
.fl-rows{display:flex;flex-direction:column}
.fl-rows > div{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:16px 0;border-top:1px solid var(--hair)}
.fl-rows dt{grid-column:1 / span 2;font:500 15px/20px var(--chrome);color:var(--ink);padding-top:3px}
.fl-rows dd{grid-column:3 / span 5;color:var(--soft);max-width:620px}
.fl-rows > div:last-child{border-bottom:1px solid var(--hair)}
/* controls: text buttons in the chrome, values in DM Mono; the one filled button is the kit */
.bk .bk-btn{appearance:none;cursor:pointer;font:500 15px/20px var(--chrome);color:var(--ink);background:transparent;border:1px solid var(--edge);border-radius:0;padding:9px 15px;transition:background-color 150ms ease-out,border-color 150ms ease-out,transform 120ms ease-out}
.bk .bk-btn:active{transform:scale(0.97)}
@media (hover:hover){.bk .bk-btn:hover{border-color:var(--ink)}}
.bk .fl-val{font:400 15px/20px var(--dm);color:var(--soft);border:0;padding:4px 0;text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:4px}
@media (hover:hover){.bk .fl-val:hover{text-decoration-color:var(--ink)}}
.bk .bk-btn.is-copied{border-color:var(--ink)}
.bk .fl-cp{align-self:flex-start}
.bk .fl-btn{display:inline-block;background:var(--strong);border-color:var(--strong);color:var(--strong-ink);text-decoration:none;padding:15px 24px;border-radius:${rc}px}
@media (hover:hover){.bk .fl-btn:hover{background:var(--strong-hover);border-color:var(--strong-hover)}}
.fl-dl{font:500 15px/20px var(--chrome);color:var(--ink);text-decoration:underline;text-decoration-color:var(--edge);text-underline-offset:4px}
@media (hover:hover){.fl-dl:hover{text-decoration-color:var(--ink)}}
.fl-dls{display:flex;flex-wrap:wrap;gap:4px 16px}
.fl-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 64px}
.fl-rules li{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--hair);color:var(--soft)}
.fl-logo{display:block;width:var(--lw);max-width:100%}
.fl-logo svg{display:block;width:100%;height:auto}
.fl-slot{display:flex;align-items:center;justify-content:center;max-width:100%;border:1.5px dashed var(--quiet);color:var(--quiet);font:400 15px/20px var(--chrome);text-align:center;padding:4px}

/* overview */
.fl-cover__lg{display:flex;justify-content:flex-end}
.fl-cover__lg .fl-logo,.fl-cover__lg .fl-slot{width:min(var(--lw,360px),100%)}
.fl-sec--overview .fl-h{font-size:72px;line-height:72px}
.fl-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.fl-traits li{display:flex;flex-direction:column;gap:8px}
.fl-trait{font-size:32px;line-height:36px;color:var(--ink)}
/* voice */
.fl-say{display:flex;flex-direction:column}
.fl-say li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:16px 0;border-top:1px solid var(--hair);align-items:baseline}
.fl-say .fl-v{grid-column:1}
.fl-say__t{grid-column:2 / span 2;font:500 15px/20px var(--chrome);color:var(--ink)}
.fl-say__x{grid-column:4 / span 5;font-size:32px;line-height:36px;color:var(--ink)}
.fl-wtn{display:flex;flex-direction:column}
.fl-wtn li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:16px 0;border-top:1px solid var(--hair)}
.fl-wtn__w{grid-column:1 / span 3;color:var(--ink)}
.fl-wtn__n{grid-column:4 / span 2;color:var(--quiet)}
.fl-wtn li .fl-q{grid-column:6 / span 3}
.fl-take{display:flex;flex-direction:column;gap:16px}
.fl-lines li{font-size:28px;line-height:36px;color:var(--ink);padding:8px 0}
/* logo */
.fl-logo-big{display:flex;justify-content:flex-end}
.fl-vers{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:32px 16px}
.fl-vers li{display:flex;flex-direction:column;gap:12px}
.fl-ver__g{display:flex;align-items:center;justify-content:center;height:160px;padding:24px;border:1px solid var(--hair)}
.fl-ver__k{display:flex;flex-direction:column;gap:4px}
.fl-ver__n{font:500 15px/20px var(--chrome);color:var(--ink)}
.fl-clear__b{display:inline-block;outline:1px dashed var(--edge);outline-offset:0;max-width:100%}
.fl-min{padding:24px 0}
.fl-never{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 16px}
.fl-never li{padding-top:12px;border-top:1px solid var(--hair);color:var(--soft)}
/* colour */
.fl-cols{display:flex;flex-direction:column}
.fl-col{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:24px 0;border-top:1px solid var(--hair)}
.fl-col__sw{grid-column:1 / span 2;height:120px;border:1px solid var(--hair)}
.fl-col__t{grid-column:3 / span 6;display:flex;flex-direction:column;gap:12px;min-width:0}
.fl-col__n{font:500 15px/20px var(--chrome);color:var(--ink);display:flex;gap:16px;align-items:baseline}
.fl-vals{display:flex;flex-wrap:wrap;gap:4px 32px}
.fl-vals div{display:flex;gap:8px;align-items:baseline}
.fl-vals dt{font:400 15px/20px var(--chrome);color:var(--quiet)}
.fl-ramp{display:flex;gap:0}
.fl-ramp li{flex:1}
.bk .fl-ramp__b{display:block;width:100%;height:28px;border:0;padding:0;cursor:pointer}
.fl-roles li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--hair)}
.fl-roles__sw{width:24px;height:24px;border:1px solid var(--hair)}
.fl-roles__n{color:var(--soft)}
/* typography */
.fl-face-big{font-size:120px;line-height:1;color:var(--ink);text-align:right;white-space:nowrap}
.fl-faces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.fl-faces li{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--hair)}
.fl-face__n{font-size:32px;line-height:40px;color:var(--ink)}
.fl-tester{--tester-size:64px;display:flex;flex-direction:column;gap:24px}
.fl-tester__out{font-size:var(--tester-size);line-height:1.05;color:var(--ink);overflow-wrap:anywhere;min-height:1em}
.fl-tester__c{display:grid;grid-template-columns:2fr 1fr;gap:24px}
.fl-field{display:flex;flex-direction:column;gap:8px}
.fl-field label{font:500 15px/20px var(--chrome);color:var(--ink);display:flex;justify-content:space-between}
.fl-field input[type="text"]{font:${W.regular} 16px/24px var(--body);color:var(--ink);background:transparent;border:1px solid var(--edge);border-radius:${rc}px;padding:11px 12px}
.fl-field input[type="range"]{accent-color:var(--strong);width:100%;height:44px}
.fl-scale{display:flex;flex-direction:column}
.fl-scale li{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:24px 0;border-top:1px solid var(--hair);align-items:baseline}
.fl-scale__k{grid-column:1 / span 3;display:flex;flex-direction:column;gap:4px}
.fl-scale__t{font:500 15px/20px var(--chrome);color:var(--ink)}
.fl-scale__s{grid-column:4 / span 5;color:var(--ink);overflow-wrap:break-word;max-width:760px}
/* imagery */
.fl-photo-big{aspect-ratio:4/5;width:100%;overflow:hidden}
.bk .fl-photo{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;background:var(--panel);border:1px dashed var(--edge);color:var(--soft);font:400 15px/20px var(--chrome)}
.fl-photo-big .photo-slot{height:100%}
.bk .fl-brief{flex-direction:column;align-items:flex-start;justify-content:space-between;gap:8px;text-align:left;background:var(--g)}
.bk .fl-brief b{font:500 15px/20px var(--chrome);color:var(--ink)}
.fl-brief span{max-width:34em}
.fl-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 16px}
.fl-shots li{display:flex;flex-direction:column;gap:8px}
.fl-shots figure{display:flex;flex-direction:column;gap:8px}
.fl-shots .fl-photo{aspect-ratio:4/3;height:auto}
/* layout */
.fl-meas{display:flex;flex-wrap:wrap;gap:12px 40px}
.fl-meas div{display:flex;gap:8px;align-items:baseline}
.fl-meas dt{font:400 15px/20px var(--chrome);color:var(--soft)}
.fl-space{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}
.fl-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.fl-space i{display:block;background:var(--strong)}
.fl-radii{display:flex;flex-wrap:wrap;gap:24px}
.fl-radii li{display:flex;flex-direction:column;gap:8px}
.fl-radii i{display:block;width:72px;height:72px;border:1.5px solid var(--ink)}
/* applications */
.fl-shot-big{width:100%;aspect-ratio:3/4;overflow:hidden}
.fl-shot-big img,.fl-shot-big svg.pl{display:block;width:100%;height:100%;object-fit:cover;object-position:30% 70%}
.fl-shot img,.fl-shot svg.pl{display:block;width:100%;height:auto}
.fl-two--app > div{gap:16px}
.fl-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.fl-card{aspect-ratio:90/55;display:flex;flex-direction:column;justify-content:center;padding:16px 20px;border:1px solid var(--hair);container-type:inline-size}
.fl-card__lg .fl-logo,.fl-card__lg .fl-slot{width:min(200px,70cqw)}
.fl-card--back{justify-content:space-between;font:400 15px/20px var(--body)}
.fl-card__nm{font:500 15px/20px var(--body)}
.fl-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.fl-post{aspect-ratio:1;display:flex;flex-direction:column;justify-content:space-between;padding:16px;border:1px solid var(--hair)}
.fl-post p{font-size:24px;line-height:28px}
.fl-post__lg .fl-logo{width:40px}
.fl-email{display:flex;flex-direction:column;gap:4px;padding:24px 0;border-top:1px solid var(--hair);color:var(--soft)}
.fl-email__n{font:500 16px/24px var(--body);color:var(--ink)}
.fl-email__l{margin-top:16px}
/* downloads */
.fl-zip{display:flex;flex-direction:column;gap:12px;align-items:flex-end}
.fl-groups{display:flex;flex-direction:column}
.fl-group{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;padding:24px 0;border-top:1px solid var(--hair)}
.fl-group__k{grid-column:1 / span 3;display:flex;flex-direction:column;gap:8px}
.fl-group__k .fl-h3{border:0;padding:0;margin:0}
.fl-group__v{grid-column:4 / span 5;min-width:0}
.fl-files{display:flex;flex-direction:column}
.fl-file{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;padding:8px 0;border-bottom:1px solid var(--hair)}
.fl-file__n{flex:1 1 200px;color:var(--ink);min-width:0;overflow-wrap:anywhere}
.fl-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px 16px;margin-bottom:16px}
.fl-icon{display:flex;gap:8px;align-items:center;font:400 15px/20px var(--chrome);color:var(--soft);text-decoration:none;padding:6px 0}
@media (hover:hover){.fl-icon:hover span{text-decoration:underline}}
.fl-icon svg{flex:none;color:var(--ink)}

@media (min-width:841px){
.fl-svg--n{display:none}
}
@media (max-width:840px){
:root,.bk--board{--wrap:calc(100% - 32px)}
.bk-top{padding:0 16px;gap:16px;flex-wrap:wrap;height:auto;min-height:56px}
.bk-brand{width:112px}.bk-brand svg{width:112px}
.bk-menu{display:inline-flex;align-items:center;margin-left:auto;appearance:none;background:transparent;border:1px solid var(--edge);color:var(--ink);font:500 15px/1 var(--chrome);height:40px;padding:0 14px;cursor:pointer}
.bk-nav{display:none;flex-basis:100%;order:3;padding:0 0 12px}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}
.bk-nav a{padding:10px 0;border-bottom:1px solid var(--hair)}
.bk-mode button{height:40px;padding:0 12px}
.fl-svg--w{display:none}
.fl-sec{padding:72px 0 64px}
.fl-sec--open{padding-top:32px}
.fl-top{grid-template-columns:minmax(0,1fr);min-height:0;row-gap:40px}
.fl-top__t,.fl-top__b{grid-column:1}
.fl-run{margin-bottom:8px}
.fl-run__n{display:none}
.fl-h,.fl-sec--overview .fl-h{font-size:40px;line-height:44px}
.fl-band{margin-top:48px}
.fl-key{gap:8px 24px}
.fl-body{padding-top:64px}
.fl-rows > div,.fl-say li,.fl-wtn li,.fl-col,.fl-scale li,.fl-group{grid-template-columns:minmax(0,1fr);row-gap:8px}
.fl-rows dt,.fl-rows dd,.fl-say .fl-v,.fl-say__t,.fl-say__x,.fl-wtn__w,.fl-wtn__n,.fl-wtn li .fl-q,.fl-col__sw,.fl-col__t,.fl-scale__k,.fl-scale__s,.fl-group__k,.fl-group__v{grid-column:1}
.fl-col__sw{height:64px}
.fl-say__x{font-size:26px;line-height:32px}
.fl-two,.fl-rules,.fl-traits,.fl-never,.fl-faces,.fl-tester__c,.fl-shots,.fl-posts{grid-template-columns:minmax(0,1fr)}
.fl-cover__lg,.fl-logo-big,.fl-zip{justify-content:flex-start;align-items:flex-start}
.fl-face-big{text-align:left}
.fl-cards{grid-template-columns:minmax(0,1fr)}
.fl-photo-big{aspect-ratio:4/3}
.fl-shot-big{aspect-ratio:4/5}
}
@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk .bk-btn:active{transform:none}}`;
}
