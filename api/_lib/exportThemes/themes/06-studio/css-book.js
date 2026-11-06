import { cssBookKit } from './css-bookkit.js';
import { colourMap } from '../../engine/tokens.js';
import { cssStr, cssNum } from '../../engine/escape.js';
// Styles for theme 06's brand book site (bookCss, scoped under .bk and the root custom properties) and for the brand kit pages
// (cssBook, scoped under .pg: appended to css() in index.js; the kit styles come from css-bookkit.js).
// Studio: an annotated design-system book. Geist chrome at 13 px, titles in Geist 600, the display face only for the big line. Steel
// panels (.bk-fig) hold the brand's real UI, pinned to the light roles (.bk-lt) so a screen always shows what it ships as, with drawn
// dimension marks (.bk-dim) and numbered callouts joined to the part they name by a leader line (.bk-note). Everything reads colours from
// the brand's roles; no hex is written here. Spacing on 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};--bk-danger:${r.danger.fg};`;
// the page's own colours, copied once at the root so a pinned-light region (.bk-lt) can still draw its callouts in the page's mode
const mdVars = `--md-ink:var(--bk-ink);--md-soft:var(--bk-soft);--md-quiet:var(--bk-quiet-panel);--md-edge:var(--bk-edge);--md-ground:var(--bk-ground);--md-panel:var(--bk-panel);--md-hair:color-mix(in srgb,var(--bk-quiet-panel) 32%,transparent);`;
const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, rk = B.ui.radius.card, bw = B.ui.border, dw = cssNum(d.weights[d.weights.length - 1]);
  const rev = B.logo.colourways.reversed;
  return `:root,.bk--board{${vars(L)}${mdVars}--fix-ground:${L.surface};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};
--chrome:'Geist',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(m.family)}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
/* a region pinned to the light roles: the live UI shown as it ships, whichever mode the page is in */
.bk-lt{${decl(colourMap(ctx, 'light'))}${vars(L)}background:var(--surface);color:var(--text)}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.5;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh;position:relative;isolation:isolate;counter-reset:sec}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${dw};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* the rail: a Steel tool panel. Mark, numbered sections as callout badges, light and dark */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:32px;padding:32px 20px 24px;background:var(--bk-panel);box-shadow:inset -1px 0 0 var(--md-hair)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--body);font-weight:600;font-size:20px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav::before{content:"Contents";display:block;margin-bottom:8px;font-size:11px;font-weight:600;line-height:1.4;color:var(--bk-quiet-panel)}
.bk-nav ol{display:flex;flex-direction:column;gap:2px}
.bk-nav a{display:flex;gap:12px;align-items:center;padding:6px 8px;margin:0 -8px;border-radius:${rc}px;font-size:13px;font-weight:500;color:var(--bk-soft);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav .bk-n{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--md-hair);color:var(--bk-quiet-panel);font-size:11px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav a[aria-current]{background:var(--bk-ground);color:var(--bk-ink);font-weight:600}
.bk-nav a[aria-current] .bk-n{background:var(--bk-ink);color:var(--bk-ground);box-shadow:none}
@media (hover:hover){.bk-nav a:hover{background:var(--bk-raised);color:var(--bk-ink)}.bk-nav a[aria-current]:hover{background:var(--bk-ground)}}
.bk-mode{display:inline-flex;align-self:flex-start;padding:2px;gap:2px;border:${bw}px solid var(--bk-ink);border-radius:${rc + 2}px;background:var(--bk-ground)}
.bk-mode button{appearance:none;border:0;border-radius:${Math.max(rc - 2, 2)}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:32px;padding:0 12px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:2px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: one reading column per section, ruled apart; each section opens with its number as a callout tag */
.bk main{min-width:0}
.bk main:focus{outline:none}
.bk-sec{counter-increment:sec;padding:96px 56px;border-top:1px solid var(--bk-hair);scroll-margin-top:0}
.bk-sec:first-of-type{border-top:0}
.bk-sec>*{max-width:1040px}
.bk-head{display:flex;flex-direction:column;gap:16px;margin-bottom:48px}
.bk-head::before{content:counter(sec,decimal-leading-zero);align-self:flex-start;padding:4px 8px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font-size:12px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
.bk-head h2{font-size:clamp(32px,3.4vw,44px);line-height:1.1;font-weight:600;letter-spacing:-0.015em;text-wrap:balance}
.bk-lead{font-family:var(--body);font-size:18px;line-height:1.6;color:var(--bk-soft);max-width:60ch}
.bk-body{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-h3{font-size:13px;font-weight:600;line-height:1.4;color:var(--bk-ink);margin-bottom:12px}
.bk-block{margin-top:64px}
.bk-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:start}
.bk-two--even{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-two--even:has(>.bk-fig){align-items:stretch}
.bk-panel{background:var(--bk-panel);border-radius:${rk}px;padding:24px;box-shadow:inset 0 0 0 1px var(--md-hair)}
.bk-panel .bk-cap,.bk-panel .cap{color:var(--bk-quiet-panel)}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:32px 56px;border-top:1px solid var(--bk-hair);font-size:12px;color:var(--bk-quiet)}

/* the numbered badge: the same circle the nav and the callouts use */
.bk-no{display:inline-grid;place-items:center;flex:none;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--bk-ink);font-size:11px;font-weight:600;line-height:1;color:var(--bk-ink);font-variant-numeric:tabular-nums}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 16px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out,transform 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:44px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:14px;font-weight:600}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-raised)}.bk-panel .bk-btn:hover,.bk-insp .bk-btn:hover,.bk-tree .bk-btn:hover{background:var(--bk-ground)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 12px;border:1px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-raised)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 24px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* photos and slots */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-raised);color:var(--bk-quiet)}

/* Steel panels: a figure with its number and caption along the foot */
.bk-fig{display:flex;flex-direction:column;min-width:0;background:var(--bk-panel);border-radius:${rk}px;box-shadow:inset 0 0 0 1px var(--md-hair);overflow:hidden}
.bk-fig--ann{container-type:inline-size;overflow:visible}
.bk-fig__st{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:32px 24px;min-width:0}
.bk-fig:not(.bk-fig--ann) .bk-fig__st{overflow-x:auto}
.bk-fig__pad{min-width:0;max-width:100%;width:100%}
.bk-figc{display:flex;align-items:baseline;gap:12px;padding:12px 24px;border-top:1px solid var(--md-hair);font-size:12px;line-height:1.5;color:var(--md-quiet)}
.bk-figc .num{flex:none;min-width:24px;font-weight:600;color:var(--md-ink)}
.bk-figc b{display:block;font-weight:600;color:var(--md-ink)}
.bk-figc--rich{align-items:flex-start}
.bk-figc--rich>span:nth-child(2){flex:1;min-width:0}
.bk-figc--rich .bk-dls{flex:none;margin-top:-2px}
.bk-fig--ann .bk-figc{border-radius:0 0 ${rk}px ${rk}px}
.bk-fig--sm .bk-fig__st{align-items:stretch;justify-content:center;padding:24px}
.bk-fig--wide{grid-column:1/-1}
.bk-fig--wide .bk-fig__st{align-items:stretch;justify-content:flex-start}
.bk-fig--clear .bk-fig__st{padding:32px 24px;align-items:center;justify-content:center}
.bk-fig--grid .bk-fig__st{padding:32px 24px}
.bk-fig--scale .bk-fig__st{align-items:stretch;justify-content:flex-start;gap:8px;padding:24px}
.bk-fig--scale{overflow:visible}

/* dimension marks: a rule with end ticks and its label */
.bk-dim{display:flex;align-items:center;gap:8px;font-size:11px;line-height:1;color:var(--bk-quiet-panel)}
.bk-dim i{display:block;position:relative;flex:1;height:1px;background:var(--bk-ink)}
.bk-dim i::before,.bk-dim i::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:var(--bk-ink)}
.bk-dim i::before{left:0}.bk-dim i::after{right:0}
.bk-dim--v{flex-direction:column;width:16px;height:100%;align-items:center}
.bk-dim--v>span{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap}
.bk-dim--v i{width:1px;height:auto;flex:1}
.bk-dim--v i::before,.bk-dim--v i::after{left:-4px;top:auto;width:9px;height:1px}
.bk-dim--v i::before{top:0}.bk-dim--v i::after{bottom:0;right:auto}
.bk-lt .bk-dim{color:var(--bk-quiet)}

/* a logo with its width and height drawn on it */
.bk-mk{display:inline-flex;flex-direction:column;gap:6px;max-width:100%}
.bk-mk__w{display:block;max-width:100%}
.bk-mk__r{display:flex;gap:6px;align-items:stretch}
.bk-mk__h{display:flex;flex:none}
.bk-mk__l{display:block;max-width:100%}
.bk-mk__l svg,.bk-mk__l .logo-slot{display:block;max-width:100%}

/* overview */
.bk-sec--overview{padding-top:64px}
.bk-hero{display:flex;flex-direction:column;gap:24px;margin-bottom:64px}
.bk-hero h1{font-size:clamp(32px,4.6vw,64px);line-height:1.08;max-width:15ch;text-wrap:balance}
.bk-brief{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:start}
.bk-kv div{padding:12px 0;border-top:1px solid var(--bk-hair)}
.bk-kv div:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-kv dt{font-size:12px;font-weight:600;color:var(--bk-ink);margin-bottom:4px}
.bk-kv dd{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-soft)}
.bk-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;margin-top:64px;padding-top:24px;border-top:1px solid var(--bk-hair)}
.bk-traits li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start}
.bk-trait{font-size:20px;font-weight:600;line-height:1.2;margin-bottom:8px}
.bk-glance{display:grid;grid-template-columns:1.4fr 1.2fr 1fr;gap:24px;margin-top:64px}
.bk-glance__f{display:flex;align-items:center;justify-content:center;height:136px;border-radius:${rc}px;background:var(--bk-ground);color:var(--fix-ink)}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-glance__aa{gap:24px;color:var(--bk-ink)}
.bk-glance__aa .disp{font-size:56px;line-height:1}
.bk-glance__b{font-family:var(--body);font-weight:500;font-size:56px;line-height:1}
.bk-glance__bar{display:flex;gap:4px;height:136px}
.bk-glance__bar li{min-width:0;border-radius:${rc}px;box-shadow:inset 0 0 0 1px var(--md-hair)}

/* voice */
.bk-principles{display:flex;flex-direction:column;gap:12px}
.bk-principles li{display:grid;grid-template-columns:24px minmax(0,0.8fr) minmax(0,1.6fr);gap:16px 24px;align-items:center}
.bk-pt{font-size:15px;font-weight:600;line-height:1.4}
.bk-msg{background:var(--bk-panel);border-radius:${rk}px;padding:16px 24px;box-shadow:inset 0 0 0 1px var(--md-hair)}
.bk-pe{font-family:var(--body);font-size:24px;font-weight:500;line-height:1.25;text-wrap:balance}
.bk-lines{display:flex;flex-direction:column}
.bk-lines li{font-family:var(--body);font-size:22px;font-weight:500;line-height:1.3;padding:12px 0;border-top:1px solid var(--bk-hair)}
.bk-lines li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-wtn__h,.bk-wtn__r{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr);gap:24px;padding:16px 0;border-top:1px solid var(--bk-hair)}
.bk-wtn__h{font-size:12px;font-weight:600;padding-top:0;border-top:0}
.bk-wtn__r p{font-family:var(--body);font-size:15px;line-height:1.5}
.bk-wtn__r .w{font-weight:600;color:var(--bk-ink)}
.bk-wtn__r .n{color:var(--bk-quiet);text-decoration:line-through;text-decoration-thickness:1px}
.bk-wtn__r .b{color:var(--bk-soft)}
.bk-panel .bk-body{color:var(--bk-ink)}

/* logo: seven contexts, each a Steel panel holding the real thing */
.bk-ctxs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.bk-ctxs+.bk-body{margin-top:24px}
.bk-ctx{grid-column:span 2}
.bk-ctx--invoice{grid-column:span 3;grid-row:span 2}
.bk-ctx--bar{grid-column:span 3}
.bk-ctx--post{grid-column:1/-1}
.bk-ctx .bk-fig__st{padding:32px 24px}
.bk-ctx--icon .bk-figc--rich,.bk-ctx--avatar .bk-figc--rich,.bk-ctx--stamp .bk-figc--rich{flex-wrap:wrap}
.bk-ctx--icon .bk-figc--rich>span:nth-child(2),.bk-ctx--avatar .bk-figc--rich>span:nth-child(2),.bk-ctx--stamp .bk-figc--rich>span:nth-child(2){flex:1 1 calc(100% - 40px)}
.bk-ctx--icon .bk-dls,.bk-ctx--avatar .bk-dls,.bk-ctx--stamp .bk-dls{margin:0 0 0 36px}
.bk-doc{width:min(100%,400px);display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:${rc}px;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-doc__h{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.bk-doc__n{font-size:12px;font-weight:600;color:var(--quiet)}
.bk-doc__c{font-size:13px;line-height:1.4}
.bk-doc__c span{display:block;font-size:11px;color:var(--quiet)}
.bk-doc__t{display:flex;justify-content:space-between;align-items:baseline;padding-top:12px;border-top:${bw}px solid var(--text);font-size:13px;font-weight:600}
.bk-doc__t b{font-size:20px;font-weight:600}
.bk-app{width:min(100%,420px)}
.bk-app__w{display:block;max-width:100%;margin:0 0 8px 24px}
.bk-app__r{display:flex;gap:8px;align-items:stretch}
.bk-app__v{display:flex;flex:none}
.bk-app__b{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:12px;height:56px;padding:0 16px;border-radius:${rc}px;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-app__b--ink{background:${rev.ground};color:${rev.name};box-shadow:none}
.bk-app__c{font-size:12px;font-weight:500;white-space:nowrap}
.bk-app__b .ui-btn{flex:none}
.bk-icons2{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:center}
.bk-icon2{display:flex;flex-direction:column;gap:8px}
.bk-icon2__w{display:block;width:96px}
.bk-icon2__t{display:grid;place-items:center;width:96px;height:96px;border-radius:22px;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-fav{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:${rc}px ${rc}px 0 0;box-shadow:inset 0 0 0 1px var(--divider);font-size:12px;color:var(--text-soft)}
.bk-fav__v{display:flex;flex:none}
.bk-fav__i{display:block;flex:none}
.bk-fav__i>svg,.bk-fav__i>.logo-slot{display:block;width:100%!important;height:100%!important}
.bk-avatar{display:flex;flex-direction:column;gap:8px}
.bk-avatar__d{display:block;width:128px}
.bk-avatar__c{display:grid;place-items:center;width:128px;height:128px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-stamp{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:20px 24px;border-radius:${rc}px;outline:${bw}px dashed var(--quiet);outline-offset:-6px}
.bk-stamp__t{padding:2px 8px;border:${bw}px solid var(--text);border-radius:4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;line-height:1.3}
.bk-post2{width:min(100%,640px);display:flex;justify-content:space-between;align-items:flex-end;gap:32px;padding:32px;border-radius:${rk}px;background:${rev.ground};color:${rev.name}}
.bk-post2 .disp{font-size:28px;line-height:1.15;max-width:14ch}
.bk-post2 .bk-dim{color:${rev.name}}
.bk-post2 .bk-dim i,.bk-post2 .bk-dim i::before,.bk-post2 .bk-dim i::after{background:${rev.name}}
.bk-clearwrap{overflow:auto;max-width:100%;padding:4px 0 12px}
.bk-clear{position:relative;display:block;background:var(--fix-ground);color:var(--fix-ink);border-radius:${rc}px;box-sizing:border-box}
.bk-clear__in{width:100%;outline:1.5px dashed var(--fix-quiet);outline-offset:0}
.bk-clear svg,.bk-clear .logo-slot{display:block;max-width:100%}
.bk-x{position:absolute;display:grid;place-items:center;font-size:11px;line-height:1;color:var(--fix-quiet);width:var(--u);height:var(--u)}
.bk-x--t{top:0;left:50%;margin-left:calc(var(--u) / -2)}.bk-x--b{bottom:0;left:50%;margin-left:calc(var(--u) / -2)}
.bk-x--l{left:0;top:50%;margin-top:calc(var(--u) / -2)}.bk-x--r{right:0;top:50%;margin-top:calc(var(--u) / -2)}
.bk-min{display:flex;flex-direction:column;align-items:center}
.bk-min__logo{display:inline-flex;flex-direction:column;gap:12px;padding:24px;border-radius:${rc}px;background:var(--fix-ground);color:var(--fix-ink);box-sizing:content-box;max-width:100%}
.bk-min__logo .bk-dim{color:var(--fix-quiet)}
.bk-min__logo .bk-dim i,.bk-min__logo .bk-dim i::before,.bk-min__logo .bk-dim i::after{background:var(--fix-ink)}
.bk-min .bk-body{margin-top:12px}
.bk-never{display:grid;grid-template-columns:minmax(0,1fr);gap:0}
.bk-never li{display:grid;grid-template-columns:16px 24px minmax(0,1fr);gap:8px 12px;align-items:center;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-soft);padding:12px 0;border-top:1px solid var(--bk-hair)}
.bk-never li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-never .bk-no{box-shadow:none;color:var(--bk-quiet);width:24px;justify-self:start}
.bk-x2{position:relative;width:16px;height:16px;color:var(--bk-danger)}
.bk-x2::before,.bk-x2::after{content:"";position:absolute;left:1px;right:1px;top:50%;height:2px;margin-top:-1px;background:currentColor;border-radius:1px;transform:rotate(45deg)}
.bk-x2::after{transform:rotate(-45deg)}

/* colour: the annotated screen */
.bk-scr{--in:20px;--lead:28px;position:relative;width:min(100%,340px);padding:20px;border-radius:${rk}px;background:var(--sunken);box-shadow:0 0 0 ${bw}px var(--bk-ink)}
.bk-scr__card{--in:36px;display:flex;flex-direction:column;gap:0;margin:12px 0;padding:12px 16px 16px;border-radius:${rk}px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--divider)}
.bk-part{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:48px}
.bk-part--bare{min-height:28px}
.bk-part:not(.bk-part--bare){padding-inline:8px}
.bk-part:has(.ui-btn),.bk-part:has(.ui-toast),.bk-part:has(.bk-scr__band){padding-inline:0}
.bk-part--g{margin:-20px -20px 0;min-height:48px}
.bk-part--c{margin:-12px -16px 0;min-height:28px}
.bk-scr__h{font-family:var(--display);font-weight:${dw};letter-spacing:-0.01em;font-size:24px;line-height:1.15;color:var(--text)}
.bk-scr__p{font-size:14px;line-height:1.4;color:var(--text-soft)}
.bk-scr__q{font-size:12px;line-height:1.4;color:var(--quiet)}
.bk-scr__t{font-size:16px;font-weight:600;line-height:1.3;color:var(--text)}
.bk-scr__s{font-size:14px;line-height:1.4;color:var(--text-soft)}
.bk-scr__l{font-size:14px;font-weight:600;line-height:1.4}
.bk-scr__l span{color:var(--action);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
.bk-scr__u{margin-left:auto;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.bk-part .ui-toast{width:100%}
.bk-scr__band{display:flex;align-items:center;min-height:56px;padding:8px 16px;border-radius:${rc}px;background:var(--text)}
.bk-scr__n{font-size:32px;line-height:1.1;color:var(--action)}
.bk-part:has(>.bk-note) .bk-scr__h,.bk-part:has(>.bk-note) .bk-scr__t{position:relative}
/* a note is hidden until its figure is wide enough to hang it outside the screen; below that a small badge sits on the part and the key lists the notes */
.bk-note{display:none;position:absolute;top:50%;transform:translateY(-50%);align-items:center;gap:8px;width:max-content;max-width:208px;background:var(--md-panel);font-size:12px;line-height:1.3;color:var(--md-ink);pointer-events:none}
.bk-note::before{content:"";position:absolute;top:50%;height:1px;width:calc(var(--in) + var(--lead));background:var(--md-edge)}
.bk-note--r{left:calc(100% + var(--in) + var(--lead))}
.bk-note--l{right:calc(100% + var(--in) + var(--lead));flex-direction:row-reverse;text-align:right}
.bk-note--r::before{right:100%}.bk-note--l::before{left:100%}
.bk-note__n{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--md-ink);color:var(--md-ground);font-size:11px;font-style:normal;font-weight:600;line-height:1}
.bk-note__b,.bk-note__t{display:flex;flex-direction:column;gap:1px;min-width:0}
.bk-note__b b,.bk-note__t b{font-weight:600}
.bk-note__b span,.bk-note__t span{color:var(--md-soft)}
.bk-note--pair{max-width:244px}
.bk-note--pair .bk-note__b{flex-direction:row;align-items:center;gap:8px}
.bk-note--l.bk-note--pair .bk-note__b{flex-direction:row-reverse}
.bk-note__s{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:6px;font-family:var(--body);font-size:24px;font-weight:600;line-height:1;box-shadow:0 0 0 1px var(--md-edge)}
.bk-pn{position:absolute;right:0;top:50%;margin-top:-10px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--bk-ink);color:var(--bk-ground);font-size:11px;font-style:normal;font-weight:600;line-height:1;pointer-events:none}
.bk-part--bare .bk-pn{right:8px}
@container (min-width:900px){
.bk-note{display:flex}
.bk-pn{display:none}
.bk-part:has(>.bk-note){outline:1px dashed var(--md-edge);outline-offset:-1px}
.bk-part--bare:has(>.bk-note){outline:0}
.bk-key{grid-template-columns:repeat(5,minmax(0,1fr))}
}
@container (max-width:899px){.bk-part{padding-right:28px}.bk-part--bare{padding-right:0}}
.bk-fig--pairs .bk-fig__st{gap:24px}
.bk-key{counter-reset:k;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
.bk-key .bk-pair::before{counter-increment:k;content:counter(k);position:absolute;left:8px;top:8px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px currentColor;font-size:11px;font-weight:600;line-height:1}
.bk-share .bk-cap{margin-top:12px}
.bk-ruler{position:relative;height:28px}
.bk-ruler>span{position:absolute;top:0;bottom:0;display:flex;align-items:flex-start;padding-left:6px;border-left:1px solid var(--bk-ink);font-size:11px;line-height:1.2;color:var(--bk-quiet)}
.bk-ruler>span:last-child{padding-left:0;padding-right:6px;border-left:0;border-right:1px solid var(--bk-ink);transform:translateX(-100%)}
.bk-ruler>span i{display:none}
.bk-bar{display:flex;height:200px;gap:4px}
.bk-sw{appearance:none;border:0;border-radius:${rc}px;padding:16px;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;font-family:var(--chrome);cursor:pointer}
.bk-sw{box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 16%,transparent)}
.bk-sw:focus-visible{outline-offset:3px}
.bk-sw__share{font-size:12px;font-variant-numeric:tabular-nums}
.bk-sw__name{font-size:15px;font-weight:600;line-height:1.2;display:block}
.bk-sw__hex{font-family:var(--mono);font-size:13px;display:block;margin-top:4px}

/* the inspector: a token table like a dev-tools pane */
.bk-insp{container-type:inline-size;background:var(--bk-panel);border-radius:${rk}px;box-shadow:inset 0 0 0 1px var(--md-hair);overflow:hidden}
.bk-insp__bar,.bk-tree__bar{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 24px;border-bottom:1px solid var(--md-hair)}
.bk-insp__t{font-size:13px;font-weight:600;line-height:1.4}
.bk-insp .bk-cap,.bk-tree .bk-cap{color:var(--bk-quiet-panel)}
.bk-insp__g{padding:16px 24px 24px}
.bk-insp__g+.bk-insp__g{border-top:1px solid var(--md-hair)}
.bk-insp__h{font-size:11px;font-weight:600;line-height:1.4;color:var(--bk-quiet-panel);margin-bottom:8px}
.bk-clist>li+li{border-top:1px solid var(--md-hair)}
.bk-crow{display:grid;grid-template-columns:24px 28px minmax(0,1fr);gap:8px 16px;align-items:center;padding:12px 0}
.bk-crow>.bk-vals,.bk-crow>.bk-copies,.bk-crow>.bk-clands{grid-column:3/-1}
.bk-ix{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--bk-ink);color:var(--bk-ground);font-size:11px;font-weight:600;line-height:1}
.bk-chip{width:28px;height:28px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--md-hair)}
.bk-cname{font-size:14px;font-weight:600;line-height:1.3}
.bk-tok{font-family:var(--mono);font-size:11px;line-height:1.4;color:var(--bk-quiet-panel)}
.bk-clands{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--bk-soft);max-width:70ch}
.bk-vals{display:flex;flex-direction:column;gap:2px}
.bk-vals div{display:flex;gap:12px;align-items:baseline}
.bk-vals dt{width:40px;flex:none;font-size:11px;color:var(--bk-quiet-panel)}
.bk-vals dd{font-family:var(--mono);font-size:12px;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-copies{display:flex;gap:8px;flex-wrap:wrap}
.bk-copies .bk-btn{margin-top:0;min-width:0;height:28px;padding:0 10px;font-size:12px}
@container (min-width:900px){
.bk-crow{grid-template-columns:24px 28px minmax(120px,0.8fr) minmax(220px,1.3fr) auto}
.bk-crow>.bk-vals,.bk-crow>.bk-copies{grid-column:auto}
}
.bk-pair{box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 18%,transparent);position:relative;display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:72px;padding:12px 16px 12px 40px;border-radius:${rc}px;font-family:var(--body)}
.bk-pair__r{font-family:var(--chrome);font-size:18px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;white-space:nowrap}
.bk-pair__u{font-size:13px;font-weight:500;line-height:1.3}
.bk-pair__n{font-family:var(--chrome);font-size:11px}
.bk-pair.is-large{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;gap:24px;min-height:64px}
.bk-pair.is-large .bk-pair__r,.bk-pair.is-large .bk-pair__u{font-size:24px;line-height:1.2}
.bk-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.bk-role{appearance:none;width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;grid-template-areas:"sw n h" "sw t h";column-gap:12px;row-gap:0;align-items:center;padding:8px 12px 8px 8px;border:1px solid var(--md-hair);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:500 13px/1.3 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{grid-area:sw;width:28px;height:28px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__n{grid-area:n}
.bk-role__t{grid-area:t;white-space:nowrap;font-family:var(--mono);font-weight:400;font-size:11px;color:var(--bk-quiet)}
.bk-role__h{grid-area:h;font-family:var(--mono);font-weight:400;font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.bk-role:hover{background:var(--bk-raised)}}

/* typography: each text style at true size on the live card, with size and line height drawn beside it */
.bk-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.bk-face__c{display:grid;grid-template-columns:16px minmax(0,1fr);gap:0 16px;padding:24px;border-radius:${rc}px;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-face__c{flex:1;align-content:start}
.bk-face__m{display:flex;height:120px}
.bk-face__aa{font-size:120px;line-height:1;font-family:var(--body);font-weight:500;color:var(--text)}
.bk-face__aa.disp{font-family:var(--display);font-weight:${dw}}
.bk-face__c>div{grid-column:1/-1;margin-top:16px;padding-top:16px;border-top:1px solid var(--divider)}
.bk-face__n{font-size:15px;font-weight:600;margin-bottom:4px;color:var(--text)}
.bk-face__c .bk-cap{color:var(--quiet)}
.bk-face__al{font-size:18px;line-height:1.45;margin-top:12px;overflow-wrap:anywhere;color:var(--text)}
.bk-faces+.bk-cap{margin-top:24px}
.bk-scale__k{display:flex;gap:24px;font-size:11px;line-height:1.4;color:var(--md-quiet);padding:0 4px}
.bk-scales{display:flex;flex-direction:column;gap:8px}
.bk-scale{--k:1;display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:16px 24px;align-items:center}
.bk-scale__c{display:flex;gap:12px;align-items:flex-start;padding:16px 20px;border-radius:${rc}px;min-width:0;box-shadow:inset 0 0 0 1px var(--divider)}
.bk-scale__d{display:flex;gap:10px;flex:none}
.bk-dm{position:relative;display:flex;align-items:center;justify-content:center;width:12px;flex:none;color:var(--quiet)}
.bk-dm::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;background:currentColor}
.bk-dm::after{content:"";position:absolute;left:0;right:0;top:0;bottom:0;border-top:1px solid currentColor;border-bottom:1px solid currentColor}
.bk-dm em{position:relative;z-index:1;padding:2px 0;background:var(--surface);font-size:10px;font-style:normal;line-height:1;writing-mode:vertical-rl;transform:rotate(180deg);color:var(--text)}
.bk-scale__s{flex:1;min-width:0;margin:0;font-size:calc(var(--size) * var(--k));color:var(--text);overflow-wrap:anywhere}
.bk-scale__t{font-size:13px;font-weight:600}
.bk-scale__m .bk-cap{color:var(--md-quiet)}
.bk-tester{padding:32px}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:32px;font-size:min(var(--tester-size,64px),11vw);line-height:1.1;min-height:1.1em;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-use__h{font-size:28px;line-height:1.15;margin-bottom:16px}
.bk-use__p{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--bk-soft);margin-bottom:12px;max-width:52ch}
.bk-rules li{padding:16px 0;border-top:1px solid var(--bk-hair);display:grid;gap:8px}
.bk-rules li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-rules p{font-family:var(--body);font-size:15px;line-height:1.5;display:grid;grid-template-columns:48px minmax(0,1fr)}
.bk-rules b{font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--bk-ink);padding-top:2px}
.bk-dont{color:var(--bk-soft)}.bk-do{color:var(--bk-ink)}

/* imagery: the first shot leads, the rest follow */
.bk-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;margin-bottom:48px}
.bk-dir div{padding:16px 0;border-top:1px solid var(--bk-hair)}
.bk-dir dt{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;margin-bottom:4px}
.bk-dir dt .num{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--bk-ink);color:var(--bk-ground);font-size:11px;font-weight:600}
.bk-dir dd{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--bk-soft);padding-left:28px}
.bk-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.bk-shot{display:flex;flex-direction:column;min-width:0;padding:8px;background:var(--bk-panel);border-radius:${rk}px;box-shadow:inset 0 0 0 1px var(--md-hair)}
.bk-shot--0{grid-column:span 2;grid-row:span 2}
.bk-shot__f{position:relative;overflow:hidden;border-radius:${Math.max(rk - 8, rc)}px;aspect-ratio:4/3}
.bk-shot--0 .bk-shot__f{flex:1;aspect-ratio:auto;min-height:240px}
.bk-shot--0 .bk-shot__in{position:absolute;inset:0}
.bk-shot__in{height:100%}
.bk-shot .photo-slot{height:100%}
.bk-capt{display:flex;gap:12px;align-items:baseline;padding:12px 8px 8px;font-size:12px;line-height:1.5;color:var(--md-quiet)}
.bk-capt .num{flex:none;font-weight:600;color:var(--md-ink)}
.bk-capt>span:nth-child(2){flex:1;min-width:0}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--md-ink)}

/* layout */
.bk-gridfig{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:24px;align-items:start}
.bk-pw{width:min(100%,360px)}
.bk-pw__w{display:block;margin:0 0 8px 24px}
.bk-pw__r{display:flex;gap:8px;align-items:stretch}
.bk-pw__h{display:flex;flex:none}
.bk-page{flex:1;min-width:0;display:grid;background:var(--bk-ground);box-shadow:inset 0 0 0 1px var(--md-hair);border-radius:${rc}px}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:color-mix(in srgb,var(--bk-action) 16%,transparent)}
.bk-meas{display:flex;flex-direction:column}
.bk-meas div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid var(--bk-hair);font-size:13px}
.bk-meas div:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-meas dt{color:var(--bk-quiet)}.bk-meas dd{font-weight:600}
.bk-space{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink)}
.bk-shape{display:flex;gap:24px;flex-wrap:wrap}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:96px;height:64px;border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}
.bk-gridfig+.bk-block,.bk-block+.bk-body{margin-top:32px}

/* applications */
.bk-figgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:stretch}
.bk-cards{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
.bk-dimbox{flex:0 1 384px;min-width:0}
.bk-dimbox__w{display:block;margin:0 0 8px 24px}
.bk-dimbox__r{display:flex;gap:8px;align-items:stretch}
.bk-dimbox__h{display:flex;flex:none}
.bk-card{position:relative;width:360px;max-width:100%;aspect-ratio:90/55;border-radius:6px;overflow:hidden;flex:none}
.bk-dimbox .bk-card{flex:1;width:auto;min-width:0}
.bk-card--front{background:${rev.ground};color:${rev.name}}
.bk-card--back{background:var(--fix-ground);color:var(--fix-ink)}
.bk-card__logo{position:absolute;left:28px;top:44%;transform:translateY(-50%)}
.bk-card__line{position:absolute;left:28px;bottom:24px;font-size:12px}
.bk-card__mark{position:absolute;right:24px;top:24px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-size:17px;font-weight:600;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;justify-content:center}
.bk-post{position:relative;overflow:hidden;border-radius:${rc}px;max-width:100%;flex:none;padding:24px}
.bk-post--sq{width:280px;aspect-ratio:1}
.bk-post--pt{width:224px;aspect-ratio:4/5;padding:20px}
.bk-post--st{width:158px;aspect-ratio:9/16;padding:16px;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-post .disp{position:relative;font-size:22px;line-height:1.15}
.bk-post--pt .disp{font-size:18px}.bk-post--st .disp{font-size:15px}
.bk-post__lg{position:absolute;left:24px;bottom:24px}
.bk-post--pt .bk-post__lg{left:20px;bottom:20px}.bk-post--st .bk-post__lg{left:16px;bottom:16px}
.bk-sign{width:min(100%,960px);margin-inline:auto}
.bk-sign__d{display:flex;flex-direction:column;gap:8px}
.bk-sign__d>.bk-dim{margin-left:24px}
.bk-sign__v{display:flex;gap:8px;align-items:stretch}
.bk-door{flex:1;min-width:0;position:relative;container-type:inline-size;background:${L.action};color:${L.actionLabel};border-radius:${rk}px;overflow:hidden}
.bk-door__h{position:absolute;left:5cqw;top:9cqw;font-size:5.2cqw;line-height:1.12}
.bk-door__lg{position:absolute;right:5cqw;bottom:4.2cqw;width:24cqw}
.bk-door__lg>svg,.bk-door__lg>.logo-slot{display:block;width:100%!important;height:auto!important}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-ground);color:var(--fix-ink);border-radius:${rc}px;font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:600}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:16px;padding-top:16px;border-top:1px solid var(--fix-hair)}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);border-radius:${rk}px;overflow:hidden;background:var(--bk-ground)}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk-screen .bk-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk-screen .bk-scr__time{font-size:13px;font-weight:600}
.bk-screen .bk-scr__eta{margin:0;font-size:24px;line-height:1.15}
.bk-screen .bk-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk-screen .bk-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* downloads: a project panel with the kit as a file tree */
.bk-tree{background:var(--bk-panel);border-radius:${rk}px;box-shadow:inset 0 0 0 1px var(--md-hair);overflow:hidden}
.bk-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--md-hair);background:var(--bk-ground)}
.bk-zip__n{font-family:var(--mono);font-size:14px;margin-bottom:2px}
.bk-tree__l{padding:8px 12px 16px}
.bk-dir2 summary{display:grid;grid-template-columns:12px 24px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:40px;padding:4px 12px;border-radius:${rc}px;cursor:pointer;list-style:none;transition:background-color 120ms ease-out}
.bk-dir2 summary::-webkit-details-marker{display:none}
@media (hover:hover){.bk-dir2 summary:hover{background:var(--bk-raised)}}
.bk-dir2__c{width:7px;height:7px;border-right:1.5px solid var(--bk-ink);border-bottom:1.5px solid var(--bk-ink);transform:rotate(-45deg);transition:transform 120ms ease-out}
.bk-dir2 details[open]>summary .bk-dir2__c{transform:rotate(45deg)}
.bk-dir2__i{font-size:11px;color:var(--bk-quiet-panel)}
.bk-dir2__n{font-size:14px;font-weight:600}
.bk-dir2__m{font-size:12px;color:var(--bk-quiet-panel);white-space:nowrap}
.bk-dir2 details>:not(summary){margin-left:23px;padding-left:24px;padding-right:12px;border-left:1px solid var(--md-hair)}
.bk-dir2__w{padding-top:4px;padding-bottom:8px}
.bk-dir2 details>.bk-files,.bk-dir2 details>.bk-icons{padding-bottom:12px}
.bk-files li{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:12px 24px;align-items:center;padding:8px 0;border-top:1px solid var(--md-hair)}
.bk-files li:first-child{border-top:0}
.bk-file__n{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.bk-file--logo{grid-template-columns:minmax(0,1fr) auto!important}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:13px;font-weight:500}
.bk-pngs{display:inline-flex;gap:8px;align-items:center;margin-left:8px}
.bk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.bk-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;border:1px solid var(--md-hair);border-radius:${rc}px;background:var(--bk-ground);font-size:12px;text-decoration:none;color:var(--bk-ink);transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-raised)}}

/* medium: the rail stays, two-column groups stack */
@media (max-width:1100px){
.bk-sec{padding:64px 32px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-brief{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-faces{gap:16px}
.bk-gridfig{grid-template-columns:minmax(0,1fr)}
.bk-figgrid{grid-template-columns:minmax(0,1fr)}
.bk-ctx,.bk-ctx--bar{grid-column:span 3}
.bk-ctx--invoice{grid-row:auto}
.bk-foot{padding:32px}
}

/* narrow: a top bar and a menu */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;box-shadow:inset 0 -1px 0 var(--md-hair)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:18px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-panel);box-shadow:inset 0 -1px 0 var(--md-hair);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-nav::before{display:none}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:10px 8px;min-height:44px;font-size:15px}
.bk-sec{padding:48px 20px;scroll-margin-top:60px}
.bk-sec>*{max-width:none}
.bk-sec--overview{padding-top:32px}
.bk-head{margin-bottom:32px}
.bk-head h2{font-size:32px}
.bk-hero{margin-bottom:32px}
.bk-hero h1{font-size:30px}
.bk-lead{font-size:17px}
.bk-block{margin-top:48px}
.bk-traits{grid-template-columns:minmax(0,1fr);gap:24px;margin-top:48px}
.bk-glance{grid-template-columns:minmax(0,1fr);gap:16px;margin-top:48px}
.bk-principles li{grid-template-columns:24px minmax(0,1fr);gap:8px 16px}
.bk-principles .bk-msg{grid-column:1/-1}
.bk-pe{font-size:20px}
.bk-wtn__h{display:none}
.bk-wtn__r{grid-template-columns:minmax(0,1fr);gap:8px;padding:16px 0}
.bk-wtn__r p::before{content:attr(data-l);display:block;font-family:var(--chrome);font-size:12px;font-weight:600;line-height:1.5;color:var(--bk-quiet);text-decoration:none}
.bk-fig__st{padding:20px 12px}
.bk-fig--sm .bk-fig__st{padding:16px 12px}
.bk-figc{padding:12px 16px}
.bk-ctxs{grid-template-columns:minmax(0,1fr)}
.bk-ctx,.bk-ctx--bar,.bk-ctx--invoice,.bk-ctx--post{grid-column:auto}
.bk-ctx .bk-fig__st{padding:20px 12px}
.bk-figc--rich{flex-wrap:wrap}
.bk-doc{padding:16px}
.bk-app__b{padding:0 12px;gap:8px}
.bk-post2{flex-direction:column;align-items:flex-start;gap:24px;padding:24px}
.bk-scr{--lead:0px}
.bk-bar{flex-direction:column;height:360px}
.bk-sw{min-height:72px;flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;flex-wrap:wrap}
.bk-insp__bar,.bk-tree__bar{padding:12px 16px;flex-wrap:wrap;gap:4px 16px}
.bk-insp__g{padding:16px 16px 20px}
.bk-copies .bk-btn{height:44px;flex:1 1 96px}
.bk-key{grid-template-columns:minmax(0,1fr)}
.bk-card__logo{left:20px}.bk-card__line{left:20px;bottom:16px}.bk-card__who{left:20px;bottom:16px}.bk-card__who .nm{font-size:15px}.bk-card__who .rl,.bk-card__who .ct{font-size:12px}.bk-card__who .ct{margin-top:8px}.bk-card__mark{right:16px;top:16px}
.bk-roles{grid-template-columns:repeat(auto-fill,minmax(168px,1fr))}
.bk-role{min-height:44px}
.bk-faces{grid-template-columns:minmax(0,1fr)}
.bk-face__c{padding:16px}
.bk-scale{--k:.62;grid-template-columns:minmax(0,1fr);gap:8px}
.bk-scale__c{padding:12px 16px}
.bk-tester{padding:20px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-dir{grid-template-columns:minmax(0,1fr)}
.bk-shots{grid-template-columns:minmax(0,1fr);gap:16px}
.bk-shot--0{grid-column:auto;grid-row:auto}
.bk-shot--0 .bk-shot__f{flex:none;aspect-ratio:4/3;min-height:0}
.bk-shot--0 .bk-shot__in{position:static}
.bk-sign__d>.bk-dim{margin-left:24px}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-tree__l{padding:8px 4px 12px}
.bk-dir2 summary{grid-template-columns:12px 24px minmax(0,1fr);padding:4px 8px}
.bk-dir2__m{grid-column:3;white-space:normal}
.bk-dir2 details>:not(summary){margin-left:15px;padding-left:12px}
.bk-zip{padding:16px}
.bk-files li{grid-template-columns:minmax(0,1fr) auto;gap:4px 16px}
.bk-files .bk-cap{grid-column:1;grid-row:2}
.bk-files li .bk-btn{grid-column:2;grid-row:1/3}
.bk-file--logo{grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
.bk-pngs{margin-left:0}
.bk-icon{min-height:44px}
.bk-foot{padding:24px 20px;flex-direction:column}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-copies,.bk-tester__c,.bk-icons,.bk-zip{display:none!important}
.bk-sec{padding:0 0 24px;border-top:0;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-sec>*{max-width:none}
figure,li,.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-door,.bk-shot,.bk-scale{break-inside:avoid}
.bk-bar{height:160px}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
