import { cssBookKit } from './css-bookkit.js';
// Styles for theme 04's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages (cssBook, scoped under .pg: appended to css() in index.js; the kit styles come from css-bookkit.js).
// Everything reads colours from the brand's roles; no hex is written here. Hairlines, not shadows.

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, bw = B.ui.border, dw = d.weights[d.weights.length - 1];
  const rev = B.logo.colourways.reversed, buoy = B.logo.colourways['on-buoy'];
  const chrome = 'Public Sans';
  return `:root,.bk--board{${vars(L)}--fix-ground:${L.surface};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};
--chrome:'${chrome}',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.5;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${dw};letter-spacing:0}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* the rail: mark, ruled numbered sections, light and dark */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:32px;padding:48px 24px 32px;border-right:1px solid var(--bk-hair);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;border-top:1px solid var(--bk-ink);padding-top:10px}
.bk-brand::before{content:"Graphic standards";display:block;margin-bottom:14px;font-size:12px;line-height:1.4;color:var(--bk-soft)}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--body);font-weight:600;font-size:20px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
/* binder tabs: one tab per section on the rail's edge, the number on the tab end; the open section's tab joins the page */
.bk-nav{flex:1;min-height:0;overflow:auto;margin-right:-25px}
.bk-nav::before{content:"Contents";display:block;margin:0 25px 8px 0;padding-top:10px;border-top:1px solid var(--bk-ink);font-size:12px;line-height:1.4;color:var(--bk-soft)}
.bk-nav ol{display:flex;flex-direction:column;gap:4px}
.bk-nav a{display:grid;grid-template-columns:minmax(0,1fr) 32px;align-items:center;min-height:36px;padding-left:12px;border:1px solid var(--bk-hair);border-right:0;background:var(--bk-panel);font-size:13px;font-weight:400;line-height:1.25;color:var(--bk-soft);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav a:focus-visible{outline-offset:-4px}
.bk-nav .bk-n{grid-column:2;grid-row:1;align-self:stretch;display:grid;place-items:center;border-left:1px solid var(--bk-hair);color:var(--bk-quiet);font-size:12px;line-height:1;font-variant-numeric:tabular-nums;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav a[aria-current]{background:var(--bk-ground);border-color:var(--bk-ink);color:var(--bk-ink);font-weight:600}
.bk-nav a[aria-current] .bk-n{background:var(--bk-ink);border-color:var(--bk-ink);color:var(--bk-ground)}
@media (hover:hover){.bk-nav a:hover{background:var(--bk-raised);color:var(--bk-ink)}.bk-nav a:hover .bk-n{color:var(--bk-ink)}.bk-nav a[aria-current]:hover{background:var(--bk-ground)}.bk-nav a[aria-current]:hover .bk-n{color:var(--bk-ground)}}
.bk-mode{display:flex;align-self:stretch;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--bk-ink)}
.bk-mode::before{content:"Preview";flex:0 0 100%;margin-bottom:8px;font-size:12px;line-height:1.4;color:var(--bk-soft)}
.bk-mode button{appearance:none;flex:1 1 0;border:${bw}px solid var(--bk-ink);border-radius:0;background:transparent;color:var(--bk-ink);font:400 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button+button{margin-left:-${bw}px}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground);font-weight:600}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: every section is a page of the manual */
.bk main{min-width:0}
.bk main:focus{outline:none}
.bk-sec{padding:48px 56px 96px;scroll-margin-top:0}
.bk-rh{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:248px minmax(0,1fr) auto;gap:0 48px;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-hair);padding:10px 0 8px;margin-bottom:40px;background:var(--bk-ground);font-size:12px;line-height:1.4;color:var(--bk-soft)}
.bk-rh span:nth-child(2){color:var(--bk-ink);font-weight:600}
.bk-std{display:grid;grid-template-columns:248px minmax(0,1fr);gap:0 48px;align-items:start}
.bk-tc{position:sticky;top:64px}
.bk-title{font-family:var(--chrome);font-size:22px;font-weight:600;line-height:1.25;margin-bottom:10px}
.bk-tlead{font-size:13px;line-height:1.5;color:var(--bk-quiet);margin-bottom:18px}
.bk-cl{font-size:13px;line-height:1.5}
.bk-cl li{display:grid;grid-template-columns:40px minmax(0,1fr);padding:9px 0;border-top:1px solid var(--bk-hair)}
.bk-cl li>span{color:var(--bk-quiet)}
.bk-term{font-weight:600;color:var(--bk-ink)}
.bk-work{min-width:0;max-width:792px}
.bk-body{font-family:var(--body);font-size:17px;line-height:1.5;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-h3{font-size:13px;font-weight:600;line-height:1.4;color:var(--bk-ink);margin-bottom:12px;padding-top:10px;border-top:1px solid var(--bk-hair)}
.bk-block{margin-top:64px}
.bk-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:32px 48px;align-items:start}
.bk-two--even{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:24px 56px;border-top:1px solid var(--bk-hair);font-size:12px;color:var(--bk-quiet)}
.bk-fluid>*{display:block;width:100%!important;height:100%!important}
.bk .ph-l,.bk .ph-b .ph-l,.bk .ui .ph-b .ph-l{font-weight:600}
/* a placeholder inside display type falls back to the chrome face, which ships at 400 and 600 only */
.bk .disp .ph-c,.bk .disp .ph-b{font-weight:600}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 14px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:600 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:48px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:15px}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;font-weight:400;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover);color:var(--bk-ground)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);border-radius:${rc}px;font:400 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font:600 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* status: plain words in the engine's status colour, a 6 px dot before them; no fill, box or pill */
.bk .ui .ui-chip{gap:6px}
.bk .ui .ui-chip::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:currentColor}
/* photos and slots */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:12px;font-family:var(--chrome);font-size:12px;line-height:1.4;background:var(--bk-panel);color:var(--bk-quiet-panel)}
.bk-capt{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}

/* 1 overview */
.bk-buoy{display:flex;flex-direction:column;justify-content:space-between;gap:48px;min-height:260px;padding:24px 32px 32px;border-radius:2px}
.bk-buoy__k{font-size:12px;font-weight:600}
.bk-hero{margin:48px 0 56px}
.bk-hero h1{font-size:clamp(48px,5.4vw,80px);line-height:0.92;text-wrap:balance}
.bk-x{margin-top:20px;padding-top:10px;border-top:1px solid var(--bk-hair);font-size:13px;line-height:1.5;color:var(--bk-soft)}

/* 2 voice */
.bk-principles{border-bottom:1px solid var(--bk-hair)}
.bk-principles li{display:grid;grid-template-columns:40px minmax(0,1fr);padding:16px 0;border-top:1px solid var(--bk-hair);align-items:baseline}
.bk-principles .num{font-size:13px;color:var(--bk-quiet)}
.bk-pe{font-size:clamp(32px,3.6vw,48px);line-height:1;text-wrap:balance}
.bk-lines{display:flex;flex-direction:column;gap:4px}
.bk-lines li{font-size:28px;line-height:1.1;color:var(--bk-soft)}
.bk-wtn__h,.bk-wtn__r{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr);gap:24px;padding:12px 0;border-top:1px solid var(--bk-hair)}
.bk-wtn__h{font-size:12px;font-weight:600;border-top:0;padding-top:0}
.bk-wtn__r p{font-family:var(--body);font-size:15px;line-height:1.4}
.bk-wtn__r .w{font-weight:600;color:var(--bk-ink)}
.bk-wtn__r .n{color:var(--bk-quiet);text-decoration:line-through;text-decoration-thickness:1px}
.bk-wtn__r .b{color:var(--bk-soft)}

/* 3 logo, with dimension lines in x */
.bk-vers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 24px}
.bk-ver{min-width:0}
.bk-ver__h{display:flex;gap:12px;align-items:baseline;padding-top:8px;border-top:1px solid var(--bk-ink);margin-bottom:10px;font-size:13px}
.bk-ver__h .num{color:var(--bk-quiet)}
.bk-ver__h b{font-weight:600}
.bk-ground{display:flex;align-items:center;justify-content:center;aspect-ratio:2/1;padding:16px;border-radius:2px}
.bk-ver .bk-capt{margin-top:8px}
.bk-dh,.bk-dv,.bk-dhz{--dim-ink:var(--bk-ink);--dim-bg:var(--bk-ground);--dim-q:var(--bk-quiet)}
.bk-dh i,.bk-dv i,.bk-dhz i{font-style:normal;font-size:12px;line-height:1;color:var(--dim-q);white-space:nowrap}
.bk-dh{position:relative;height:9px;margin-top:12px;border:solid var(--dim-ink);border-width:0 1px}
.bk-dh::before{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:var(--dim-ink)}
.bk-dh i{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 6px;background:var(--dim-bg)}
.bk-dv{position:absolute;width:9px;transform:translateX(-50%);border:solid var(--dim-ink);border-width:1px 0}
.bk-dv::before{content:"";position:absolute;left:4px;top:0;bottom:0;width:1px;background:var(--dim-ink)}
.bk-dv i{position:absolute;left:16px;top:50%;transform:translateY(-50%)}
.bk-dhz{position:absolute;height:9px;transform:translateY(-50%);border:solid var(--dim-ink);border-width:0 1px}
.bk-dhz::before{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:var(--dim-ink)}
.bk-dhz i{position:absolute;left:50%;bottom:14px;transform:translateX(-50%)}
.bk-clear{--dim-ink:var(--fix-ink);--dim-bg:var(--fix-ground);--dim-q:var(--fix-quiet);position:relative;width:100%;border:1px dashed var(--fix-quiet);border-radius:2px;background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear .bk-dv,.bk-clear .bk-dhz{--dim-ink:var(--fix-ink);--dim-q:var(--fix-quiet)}
.bk-clear .bk-dv i,.bk-clear .bk-dhz i{padding:0 3px;background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear__grid{position:absolute;inset:0;width:100%;height:100%;display:block}
.bk-clear__grid .g{fill:none;stroke:var(--fix-hair);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-clear__grid .k{fill:var(--fix-ink)}
.bk-clear__grid .z{fill:none;stroke:var(--fix-ink);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-clear__logo{position:absolute}
.bk-clear__logo>*{display:block;width:100%!important;height:100%!important}
.bk-keys{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 24px;margin-top:16px}
.bk-keys div{padding:8px 0;border-top:1px solid var(--bk-hair)}
.bk-keys dt{font-size:12px;color:var(--bk-quiet)}
.bk-keys dd{font-size:13px;font-weight:600}
.bk-clear__n{margin-top:12px}
.bk-min{display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start}
.bk-min__item{display:flex;flex-direction:column}
.bk-min__logo{color:var(--bk-ink)}
.bk-min__logo>*{display:block;width:100%!important;height:auto!important}
.bk-min .bk-cap{margin-top:8px}
.bk-never{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.bk-never li{min-width:0}
.bk-never p{display:grid;grid-template-columns:40px minmax(0,1fr);margin-top:8px;padding-top:8px;border-top:1px solid var(--bk-hair);font-family:var(--body);font-size:14px;line-height:1.4;color:var(--bk-soft)}
.bk-never .num{font-family:var(--chrome);font-size:13px;color:var(--bk-quiet)}
.bk-mt{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;overflow:hidden;border-radius:2px;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-cross{position:absolute;inset:0;width:100%;height:100%;display:block}
.bk-cross path{fill:none;stroke:var(--fix-ink);stroke-width:1.5;vector-effect:non-scaling-stroke}
.bk-busy{position:absolute;inset:0;width:100%;height:100%;display:block}
.bk-onbusy{position:relative;display:block}
.bk-onbusy.is-plate{padding:6px;background:var(--fix-ground)}
.bk-wakeonly{clip-path:inset(82% 0 0 0);transform:translateY(-43%)}

/* 4 colour: bands as deep as the share of a page */
.bk-sheetn{margin-bottom:24px;max-width:62ch}
.bk-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 24px}
.bk-crow{min-width:0;display:flex;flex-direction:column;gap:12px}
.bk-sw{appearance:none;border:0;border-radius:2px;padding:12px;width:100%;aspect-ratio:1;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;font-family:var(--chrome);cursor:pointer}
.bk-sw:focus-visible{outline-offset:3px}
.bk-sw__no{font-size:12px;font-weight:600}
.bk-sw__share{font-size:56px;line-height:1;font-variant-numeric:tabular-nums}
.bk-chip{display:block;width:100%;aspect-ratio:1;border-radius:2px}
.bk-chips--tones{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-chips--tones .bk-chip{aspect-ratio:2/1}
.bk-key{min-width:0;align-self:start;border-top:1px solid var(--bk-ink);padding-top:8px}
.bk-key dl{margin-top:2px}
.bk-key div{padding:8px 0;border-top:1px solid var(--bk-hair)}
.bk-key dt{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-key dd{font-size:12px;line-height:1.5;color:var(--bk-soft)}
.bk-tint{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:2px}
.bk-tint--none{display:flex;align-items:center;min-height:48px}
.bk-t{display:flex;flex-direction:column;gap:4px}
.bk-t i{display:block;height:28px}
.bk-t em{font-style:normal;font-size:11px;line-height:1;text-align:center;color:var(--bk-quiet);padding-bottom:3px;border-bottom:2px solid transparent}
.bk-t.is-base em{color:var(--bk-ink);border-bottom-color:var(--bk-ink)}
.bk-spec{display:flex;flex-direction:column;border-top:1px solid var(--bk-ink);padding-top:8px}
.bk-cnum{font-size:12px;color:var(--bk-quiet)}
.bk-cname{font-size:17px;font-weight:600;line-height:1.3}
.bk-clands{font-family:var(--body);font-size:14px;line-height:1.4;color:var(--bk-soft);margin:2px 0 12px}
.bk-vals{border-top:1px solid var(--bk-hair)}
.bk-vals div{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-bottom:1px solid var(--bk-hair)}
.bk-vals dt{font-size:12px;color:var(--bk-quiet)}
.bk-vals dd{font-family:var(--mono);font-size:12px;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-copies{display:flex;gap:6px;align-items:center;margin-top:12px}
.bk-copies .bk-cap{margin-right:2px}
.bk-copies .bk-btn{margin-top:0;min-width:0;flex:1 1 0;height:32px;padding:0 6px;font-size:12px}
.bk-pairs{margin-top:24px;border-top:1px solid var(--bk-ink)}
.bk-pair{display:grid;grid-template-columns:44px minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start;padding:16px 0;border-bottom:1px solid var(--bk-hair)}
.bk-pair__c{font-size:13px;color:var(--bk-quiet);padding-top:2px}
.bk-pair__s{font-family:var(--body);line-height:1.3;padding:12px 16px;border-radius:2px}
.bk-pair__s.disp{line-height:1.1}
.bk-pair__i{display:flex;flex-direction:column;gap:2px}
.bk-pair__r{font-size:32px;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums}
.bk-pair__u{font-family:var(--body);font-size:14px;font-weight:500;line-height:1.3}
.bk-pair__n{font-size:12px;line-height:1.4;color:var(--bk-quiet)}
.bk-roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin-top:24px;border-bottom:1px solid var(--bk-hair)}
.bk-role{appearance:none;width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border:0;border-top:1px solid var(--bk-hair);border-radius:0;background:transparent;color:var(--bk-ink);font:400 13px/1.2 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{width:28px;height:28px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__h{font-family:var(--mono);font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.bk-role:hover{background:var(--bk-raised)}}

/* 5 typography */
.bk-sheetn+.bk-h3{margin-top:0}
.bk-tys{border-top:1px solid var(--bk-ink)}
.bk-ty{display:grid;grid-template-columns:40px 188px minmax(0,1fr);gap:0 16px;align-items:start;padding:20px 0;border-bottom:1px solid var(--bk-hair)}
.bk-ty__n{font-size:13px;color:var(--bk-quiet)}
.bk-ty__t,.bk-scale__t{font-size:15px;font-weight:600;line-height:1.3;margin-bottom:2px}
.bk-ty__m .bk-cap{margin-bottom:6px}
.bk-ty__s{min-width:0}
.bk-gt{position:relative;margin:0;padding-left:36px;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-g{position:absolute;left:0;right:0;height:0;pointer-events:none;border-top:1px dashed var(--bk-quiet)}
.bk-g--base{border-top:1px solid var(--bk-ink)}
.bk-rl{position:absolute;box-sizing:border-box;width:7px;border:solid var(--bk-ink);border-width:1px 0}
.bk-rl::before{content:"";position:absolute;left:3px;top:0;bottom:0;width:1px;background:var(--bk-ink)}
.bk-rl--cap{left:6px}
.bk-rl--x{left:20px}
.bk-aa{font-weight:400}
.bk-face__al{font-size:20px;line-height:1.35;margin-top:16px;padding-left:36px;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-faces__n{margin-top:16px}
.bk-tester{padding:16px 0 0;border-top:2px solid var(--bk-ink)}
.bk-tester .bk-h3{border-top:0;padding-top:0}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:24px;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-use__h{font-size:40px;line-height:0.95;margin-bottom:16px}
.bk-use__p{font-family:var(--body);font-size:17px;line-height:1.4;color:var(--bk-soft);margin-bottom:12px;max-width:52ch}
.bk-donts{border-bottom:1px solid var(--bk-hair)}
.bk-donts li{display:grid;grid-template-columns:40px minmax(0,1fr);padding:10px 0;border-top:1px solid var(--bk-hair);font-family:var(--body);font-size:15px;line-height:1.4;color:var(--bk-soft)}
.bk-donts .num{font-family:var(--chrome);font-size:13px;color:var(--bk-quiet)}

/* 6 imagery */
.bk-pull{font-family:var(--body);font-size:22px;font-weight:500;line-height:1.3;color:var(--bk-ink);max-width:34em;text-wrap:balance}
.bk-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin-top:40px}
.bk-dir div{padding:12px 0 16px;border-top:1px solid var(--bk-hair)}
.bk-dir dt{font-size:12px;font-weight:600;margin-bottom:4px}
.bk-dir dd{font-family:var(--body);font-size:15px;line-height:1.4;color:var(--bk-soft)}
.bk-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}
.bk-shot{min-width:0}
.bk-shot__f{overflow:hidden;border-radius:2px;aspect-ratio:3/2}
.bk-shot .photo-slot{height:100%}
.bk-shot .bk-capt{margin-top:8px}

.bk-shot__f.is-draw{background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-draw{display:block;width:100%;height:100%}
.bk-draw .ln{fill:none;stroke:var(--bk-ink);stroke-width:1.5;vector-effect:non-scaling-stroke}
.bk-draw .hl{fill:var(--bk-ink)}
.bk-draw .wk{fill:none;stroke:var(--bk-ink);stroke-width:2.5;vector-effect:non-scaling-stroke}
.bk-draw .oc{fill:var(--bk-raised)}
.bk-draw .sh{fill:none;stroke:var(--bk-quiet);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-draw .wl{fill:none;stroke:var(--bk-quiet);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke}
.bk-draw text{fill:var(--bk-ink);font:600 12px var(--chrome)}
.bk-nophoto{margin-top:16px;max-width:62ch}

/* 7 layout */
.bk-gridfig{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:32px;align-items:start}
.bk-page{display:grid;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-edge);border-radius:2px}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel)}
.bk-meas{display:flex;flex-direction:column}
.bk-meas div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid var(--bk-hair);font-size:13px}
.bk-meas dt{color:var(--bk-quiet)}.bk-meas dd{font-weight:600}
.bk-space{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink)}
.bk-shape{display:flex;gap:24px;margin-bottom:16px}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:96px;height:64px;border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}

/* 8 applications */
.bk-app>.bk-h3{margin-bottom:16px}
.bk-cards{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px}
.bk-card{position:relative;width:360px;max-width:100%;aspect-ratio:90/55;border-radius:2px;overflow:hidden;flex:none}
.bk-card--front{background:${rev.ground};color:${rev.name}}
.bk-card--back{background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-card__logo{position:absolute;left:28px;top:42%;transform:translateY(-50%);width:150px;max-width:50%}
.bk-card__line{position:absolute;left:28px;bottom:22px;font-size:22px;line-height:1}
.bk-card__mark{position:absolute;right:24px;top:22px;width:36px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-size:17px;font-weight:600;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.bk-post{position:relative;overflow:hidden;border-radius:2px;max-width:100%;flex:none;padding:20px}
.bk-post--sq{width:260px;aspect-ratio:1}
.bk-post--pt{width:208px;aspect-ratio:4/5}
.bk-post--st{width:146px;aspect-ratio:9/16;padding:14px}
.bk-post .disp{position:relative;z-index:1;font-size:36px;line-height:0.95}
.bk-post--pt .disp{font-size:32px}.bk-post--st .disp{font-size:28px}
.bk-post__lg{position:absolute;left:20px;bottom:20px;width:96px}
.bk-post--st .bk-post__lg{left:14px;bottom:14px;width:80px}
.bk-sign{width:min(100%,720px)}
.bk-sign__p{container-type:inline-size;display:flex;flex-direction:column;justify-content:space-between;gap:24px;aspect-ratio:3/2;padding:clamp(16px,4.4%,32px);border-radius:2px;background:${rev.ground};color:${rev.name}}
/* on the dark preview a Hull panel (sign, card front, portrait post) sits on a ground of nearly its own colour: a 1 px edge keeps the panel's shape */
[data-theme="dark"] .bk-sign__p,[data-theme="dark"] .bk-card--front,[data-theme="dark"] .bk-post--pt{box-shadow:inset 0 0 0 1px var(--bk-edge)}
.bk-sign__hd{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:16px;border-bottom:1px solid ${D.divider}}
.bk-sign__logo{width:150px;max-width:44%}
.bk-sign__h{font-size:36px;line-height:1}
.bk-sign__rows{flex:1;display:flex;flex-direction:column;gap:12px}
.bk-sign__r{flex:1;display:grid;grid-template-columns:max-content minmax(0,1fr) auto;align-items:center;gap:16px;padding:12px 16px;border-radius:2px;font-family:var(--body)}
.bk-sign__r.is-board{background:${buoy.ground};color:${buoy.name}}
.bk-sign__t{font-size:72px;line-height:1}
.bk-sign__d{display:flex;flex-direction:column;min-width:0}
.bk-sign__dn{font-size:20px;font-weight:600;line-height:1.2}
.bk-sign__note{font-size:14px;line-height:1.3;color:${D.quiet}}
.bk-sign__r.is-board .bk-sign__note{color:${buoy.name}}
.bk-sign__s{font-size:16px;font-weight:600;text-align:right}
.bk-sign .cap{margin-top:12px}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-ground);color:var(--fix-ink);border-radius:2px;box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:600}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair);width:168px;max-width:100%;box-sizing:content-box}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);border-radius:${B.ui.radius.card}px;overflow:hidden}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk-scr__time{font-size:13px;font-weight:600}
.bk-scr__eta{margin:0;font-size:36px;line-height:1.05}
.bk-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* 9 downloads */
.bk-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding:24px 0;border-top:${bw}px solid var(--bk-ink);border-bottom:1px solid var(--bk-hair)}
.bk-zip__n{font-family:var(--mono);font-size:15px;margin-bottom:4px}
/* the index: one ruled row per clause, three columns (clause, item, files) */
.bk-index{--ix:40px minmax(0,11fr) minmax(0,20fr);margin-top:32px;border-top:${bw}px solid var(--bk-ink)}
.bk-ix__h{display:grid;grid-template-columns:var(--ix);gap:0 24px;padding:8px 0 7px;border-bottom:1px solid var(--bk-ink);font-size:12px;line-height:1.4;color:var(--bk-soft)}
.bk-fgroup{display:grid;grid-template-columns:var(--ix);grid-template-rows:auto 1fr;gap:0 24px;align-items:start;padding:16px 0 18px;border-bottom:1px solid var(--bk-hair)}
.bk-fgroup__h{display:contents}
.bk-fgroup__n{grid-column:1;grid-row:1/3;padding-top:2px;font-size:13px;font-weight:600;color:var(--bk-ink)}
.bk-fgroup__h .bk-h3{grid-column:2;grid-row:1;margin-bottom:4px;padding-top:0;border-top:0}
.bk-fgroup__h .bk-cap{grid-column:2;grid-row:2}
.bk-fgroup>.bk-files,.bk-fgroup>.bk-icons{grid-column:3;grid-row:1/3;min-width:0}
.bk-fgroup>.bk-icons+.bk-files{grid-row:3}
.bk-files li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 16px;align-items:center;padding:10px 0;border-top:1px solid var(--bk-hair)}
.bk-files li:first-child{border-top:0;padding-top:0}
.bk-files .bk-file__n{grid-column:1}
.bk-files .bk-cap{grid-column:1;grid-row:2}
.bk-files li .bk-btn{grid-column:2;grid-row:1/3}
.bk-file__n{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.bk-file--logo{grid-template-columns:minmax(0,1fr)!important;gap:6px!important}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:13px;font-weight:600}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:4px}
.bk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:0;margin-bottom:16px;border-top:1px solid var(--bk-ink);border-left:1px solid var(--bk-hair)}
.bk-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 4px 12px;border:solid var(--bk-hair);border-width:0 1px 1px 0;border-radius:0;font-size:12px;text-align:center;overflow-wrap:anywhere;text-decoration:none;color:var(--bk-ink);transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-raised)}}

/* medium: the title column stacks over the work (this block must stay before the 840 px block) */
@media (max-width:1100px){
.bk-sec{padding:40px 40px 80px}
.bk-rh{display:flex;justify-content:space-between;gap:16px}
.bk-std{grid-template-columns:minmax(0,1fr);gap:32px 0}
.bk-tc{position:static;max-width:560px}
.bk-work{max-width:none}
.bk-foot{padding:24px 40px}
}

/* narrow: a top bar and a menu */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-top:3px solid var(--bk-ink);border-bottom:1px solid var(--bk-hair)}
.bk-brand{flex:1;width:auto;border-top:0;padding-top:0}.bk-brand::before,.bk-nav::before{display:none}.bk-brand svg{width:112px}
.bk-mode{display:inline-flex;align-self:auto;flex-wrap:nowrap;padding-top:0;border-top:0}.bk-mode::before{display:none}
.bk-mode button{flex:none}
.bk-name{font-size:18px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:600 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;margin-right:0;padding:12px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-hair);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{min-height:44px;padding-left:14px;border-right:1px solid var(--bk-hair);font-size:15px}.bk-nav a[aria-current]{border-right-color:var(--bk-ink)}.bk-nav .bk-n{font-size:13px}
.bk-sec{padding:32px 20px 64px;scroll-margin-top:60px}
.bk-rh{top:60px}
.bk-rh{margin-bottom:24px;flex-wrap:wrap;gap:4px 16px}
.bk-rh span:nth-child(3){display:none}
.bk-block{margin-top:48px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-buoy{min-height:200px;padding:20px}
.bk-hero{margin:32px 0 40px}
.bk-hero h1{font-size:48px}
.bk-principles li{grid-template-columns:32px minmax(0,1fr)}
.bk-pe{font-size:32px}
.bk-lines li{font-size:24px}
.bk-wtn__h{display:none}
.bk-wtn__r{grid-template-columns:minmax(0,1fr);gap:4px;padding:16px 0}
.bk-vers{grid-template-columns:minmax(0,1fr)}
.bk-never{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-keys{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-chips{grid-template-columns:minmax(0,1fr)}
.bk-chips--tones{grid-template-columns:minmax(0,1fr)}
.bk-sw,.bk-chip,.bk-chips--tones .bk-chip{aspect-ratio:16/9}
.bk-copies .bk-btn{height:44px}
.bk-pair{grid-template-columns:32px minmax(0,1fr);gap:12px}
.bk-pair__i{grid-column:2}
.bk-roles{grid-template-columns:minmax(0,1fr)}
.bk-role{min-height:44px}
.bk-ty{grid-template-columns:32px minmax(0,1fr);gap:12px 12px}
.bk-ty__s{grid-column:1/-1}
.bk-tester{padding:20px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-dir{grid-template-columns:minmax(0,1fr)}
.bk-shots{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-gridfig{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-sign__p{aspect-ratio:auto;gap:20px;padding:16px}
.bk-sign__h{font-size:28px}
.bk-sign__t{font-size:36px}
.bk-sign__r{grid-template-columns:auto minmax(0,1fr);gap:4px 16px;padding:12px}
.bk-sign__s{grid-column:2;text-align:left}
.bk-sign__r>*{min-width:0;overflow-wrap:anywhere}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-index{--ix:40px minmax(0,1fr)}
.bk-ix__h span:nth-child(3){display:none}
.bk-fgroup>.bk-files,.bk-fgroup>.bk-icons,.bk-fgroup>.bk-icons+.bk-files{grid-column:2;grid-row:auto;margin-top:12px}
.bk-files li .bk-btn{margin:0}
.bk-foot{padding:24px 20px;flex-direction:column}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-copies,.bk-tester__c,.bk-icons,.bk-zip,.bk-fgroup,.bk-foot .bk-n{display:none!important}
.bk-sec{padding:0 0 24px;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-tc{position:static}
figure,li,.bk-tile,.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-sign__p,.bk-shot,.bk-scale{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the kit pages and pack boards are .pg pages: appended to css() in index.js.
// Pack boards need .pg--std to be a flex column; this theme's standard page is not, so say so here.
export const cssBook = (ctx) => `${cssBookKit(ctx)}\n.pg--std[data-page^="pack-"]{display:flex;flex-direction:column}`;
