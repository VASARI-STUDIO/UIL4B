import { cssBookKit } from './css-bookkit.js';
// Styles for theme 02's brand book site (bookCss): the roll ticket. Every rule is scoped under the book's root (.bk), so nothing reaches
// the guideline pages. Classes start tb-; the engine's shell keeps its own bk- names (bk-top, bk-nav, bk-mode, bk-foot ...).
// Light is Stock with Night ink; dark is Night with Stock ink. Imagery is the one Night section in light (Stage in dark), for rhythm.
// The brand kit pages (read-me, sheets, pack boards) are .pg pages: cssBook is appended to css() in index.js (another lane owns it).

const vars = (r, ground = r.surface) => `--tb-ground:${ground};--tb-raised:${r.raised};--tb-panel:${r.sunken};--tb-ink:${r.text};--tb-soft:${r.textSoft};--tb-quiet:${r.quiet};--tb-quiet-panel:${r.quietOnSunken};--tb-hair:${r.divider};--tb-edge:${r.border};--tb-hole:${r.border};--tb-action:${r.action};--tb-action-hover:${r.actionHover};--tb-action-ink:${r.actionLabel};--tb-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, rk = B.ui.radius.card, bw = B.ui.border, st = d.stretch || 150;
  const cond = `font-family:var(--tb-cond);font-weight:700;font-stretch:50%;letter-spacing:0.02em`;
  return `.bk,.bk--board{${vars(L)}--tb-plate:${L.surface};--tb-plate-ink:${L.text};--tb-fix:${L.surface};
--tb-cond:'Anybody',sans-serif;--tb-disp:'${d.family}',sans-serif;--tb-body:'${b.family}',sans-serif;--tb-mono:'${m.family}',monospace}
[data-theme="dark"] .bk{${vars(D)}--tb-plate:${D.action};--tb-plate-ink:${D.actionLabel}}
.bk .tb-night{${vars(D)}}
[data-theme="dark"] .bk .tb-night{${vars(D, D.raised)}--tb-panel:${D.sunken}}
body:has(>.bk){background:${L.surface}}[data-theme="dark"] body:has(>.bk){background:${D.surface}}
.bk{font-family:var(--tb-body);font-size:15px;line-height:1.5;color:var(--tb-ink);background:var(--tb-ground);-webkit-font-smoothing:antialiased;display:block;min-height:100vh;position:relative;overflow-x:clip}
.bk ::selection{background:${L.action};color:${L.actionLabel}}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk :focus-visible{outline:2px solid var(--tb-focus);outline-offset:2px}
.bk .num{font-variant-numeric:tabular-nums}
.bk .tb-disp,.bk .bk-name{font-family:var(--tb-disp);font-weight:${d.weights[0]};font-stretch:${st}%;letter-spacing:-0.015em;line-height:0.92}
.bk .tb-sn{${cond};font-size:20px;line-height:22px;font-variant-numeric:tabular-nums}
.bk .tb-sl{${cond};font-size:22px;line-height:24px;font-weight:700}
.bk .tb-mono{font-family:var(--tb-mono);font-size:13px;line-height:18px;font-weight:400;letter-spacing:0}
.bk .tb-h3{${cond};font-size:30px;line-height:32px;margin-bottom:16px}
.bk .tb-body{font-size:16px;line-height:1.6;color:var(--tb-soft);max-width:62ch}
.bk .tb-cap{font-size:12px;line-height:1.5;color:var(--tb-quiet)}
.bk .tb-lead{font-size:16px;line-height:1.55;color:var(--tb-soft);max-width:30ch}
.bk .logo-slot{font-family:var(--tb-cond)!important;font-stretch:50%;letter-spacing:0.02em}
.bk .tb-edge{box-shadow:inset 0 0 0 1px var(--tb-hair)}
.bk .tb-block{margin-top:96px}

/* the perforation: drawn holes as a rule, vertical or horizontal, in the hole colour */
.bk .tb-pv{display:block;position:relative;flex:none;width:3px;align-self:stretch;color:var(--tb-hole)}
.bk .tb-pv>svg{position:absolute;left:0;top:0;height:100%;overflow:visible;display:block}
.bk .tb-ph{display:block;position:relative;width:100%;height:3px;color:var(--tb-hole)}
.bk .tb-ph>svg{position:absolute;left:0;top:0;width:100%;overflow:visible;display:block}
.bk .tb-ph--frame{display:none}
.bk .tb-pv--hole,.bk .tb-ph--hole{color:var(--tb-ground)}

/* the shell: the brand plate, the nav in the stub face, the switch, over a perforated edge */
.bk .bk-skip{position:absolute;left:16px;top:-80px;z-index:60;background:var(--tb-ink);color:var(--tb-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk .bk-skip:focus{top:16px}
.bk .bk-top{position:sticky;top:0;z-index:30;display:flex;align-items:stretch;height:72px;background:var(--tb-ground);border-bottom:3px dotted var(--tb-hole)}
.bk .bk-brand{display:flex;align-items:center;flex:none;padding:0 28px;background:var(--tb-plate);color:var(--tb-plate-ink);text-decoration:none}
.bk .bk-brand svg{display:block;width:132px;height:auto}
.bk .bk-name{font-size:30px;line-height:1}
.bk .bk-for-dark{display:none}
[data-theme="dark"] .bk .bk-for-dark{display:block}[data-theme="dark"] .bk .bk-for-light{display:none}
.bk .bk-menu{display:none}
.bk .bk-nav{flex:1;min-width:0;display:flex;padding:0 16px 0 32px}
.bk .bk-nav ol{display:flex;gap:26px;width:100%}
.bk .bk-nav li{display:flex}
.bk .bk-nav a{position:relative;display:flex;align-items:center;gap:6px;${cond};font-size:22px;line-height:1;color:var(--tb-soft);text-decoration:none;transition:color 120ms ease-out}
.bk .bk-nav a:focus-visible{outline-offset:-6px}
.bk .bk-nav .bk-n{color:var(--tb-quiet)}
.bk .bk-nav a[aria-current]{color:var(--tb-ink)}
.bk .bk-nav a[aria-current]::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:5px;background:var(--tb-ink)}
@media (hover:hover){.bk .bk-nav a:hover{color:var(--tb-ink)}}
.bk .bk-mode{display:inline-flex;align-self:center;margin-right:24px;border:${bw}px solid var(--tb-ink);border-radius:${rc}px;overflow:hidden}
.bk .bk-mode button{appearance:none;border:0;background:transparent;color:var(--tb-ink);font:500 13px/1 var(--tb-body);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk .bk-mode button[aria-pressed="true"]{background:var(--tb-ink);color:var(--tb-ground)}
.bk .bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk .bk-mode button[aria-pressed="false"]:hover{background:var(--tb-panel)}}
.bk main{min-width:0}.bk main:focus{outline:none}
.bk .bk-foot{display:flex;justify-content:space-between;gap:16px;padding:28px 56px;border-top:3px dotted var(--tb-hole);${cond};font-size:18px;color:var(--tb-soft)}
.bk .bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:60;padding:12px 20px;border-radius:${rc}px;background:var(--tb-ink);color:var(--tb-ground);font:500 13px/1.3 var(--tb-body);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk .bk-live.is-on{opacity:1}.bk .bk-live:empty{display:none}

/* the frame: the roll column (serial, name, lead) held in view, a perforation, then the work */
.bk .tb-sec{padding:0 56px;background:var(--tb-ground);color:var(--tb-ink);scroll-margin-top:72px}
.bk .tb-sec>*{max-width:1328px;margin-left:auto;margin-right:auto}
.bk .tb-frame{display:grid;grid-template-columns:272px 3px minmax(0,1fr);column-gap:48px;padding:56px 0 112px}
.bk .tb-roll__in{position:sticky;top:104px;display:flex;flex-direction:column;gap:16px}
.bk .tb-rh{${cond};font-size:64px;line-height:0.92;letter-spacing:0.01em}
.bk .tb-main{min-width:0}
.bk .tb-frame--wide .tb-wide-row{grid-column:1/-1;grid-row:1;margin-bottom:72px}
.bk .tb-frame--wide>.tb-roll,.bk .tb-frame--wide>.tb-pv,.bk .tb-frame--wide>.tb-main{grid-row:2}

/* buttons and links */
.bk .tb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:104px;height:40px;padding:0 16px;margin-top:16px;border:${bw}px solid var(--tb-ink);border-radius:${rc}px;background:transparent;color:var(--tb-ink);font:500 13px/1 var(--tb-body);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out,transform 120ms ease-out}
.bk .tb-btn.is-copied{background:var(--tb-ink);color:var(--tb-ground)}
.bk .tb-btn:active{transform:scale(0.97)}
.bk .tb-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk .tb-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:32px;padding:0 10px;border:1px solid var(--tb-edge);border-radius:${rc}px;font:500 12px/1 var(--tb-body);color:var(--tb-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk .tb-btn:hover{background:var(--tb-panel)}.bk .tb-btn.is-copied:hover{background:var(--tb-ink)}.bk .tb-dl:hover{background:var(--tb-panel)}}
.bk .tb-ph.tb-ph{}
.bk img.tb-ph,.bk .photo-slot.tb-ph{display:block;width:100%;height:auto;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--tb-body);font-size:12px;line-height:1.5;background:var(--tb-panel);color:var(--tb-quiet-panel)}

/* fact fields, label over value */
.bk .tb-ff{display:flex;gap:0 40px;margin:0}
.bk .tb-ff div{display:flex;flex-direction:column;gap:4px;min-width:0}
.bk .tb-ff dt{font-size:13px;line-height:16px;font-weight:500}
.bk .tb-ff dd{margin:0;font-size:20px;line-height:24px;font-weight:600}

/* overview: the cover ticket. The stub tears along its perforation once on first load: it drops 12 px and turns 2 degrees.
   It rests torn; the animation runs from joined, so with motion off (or reduced) it is simply shown torn. */
.bk .tb-hero{padding:48px 0 0}
.bk .tb-cv{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1.5fr);column-gap:12px;aspect-ratio:2.75}
.bk .tb-cv__body,.bk .tb-cv__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;background:var(--red);border-radius:${rk}px}
.bk .tb-cv__body{padding:36px 56px 40px 48px;border-top-right-radius:0;border-bottom-right-radius:0}
.bk .tb-cv__stub{padding:36px 32px 40px 36px;border-top-left-radius:0;border-bottom-left-radius:0;transform:translateY(12px) rotate(2deg);transform-origin:0 0;animation:tb-tear 600ms cubic-bezier(0.23,1,0.32,1) 450ms backwards}
@keyframes tb-tear{from{transform:none}}
.bk .tb-cv__body>.tb-pv{position:absolute;right:-1.5px;top:0;bottom:0;height:auto}
.bk .tb-cv__stub>.tb-pv{position:absolute;left:-1.5px;top:0;bottom:0;height:auto}
.bk .tb-cv>div>.tb-ph{display:none}
.bk .tb-cv__top{display:flex;justify-content:space-between;gap:16px}
.bk .tb-cv__mid{display:flex;flex-direction:column;gap:24px}
.bk .tb-cv__line{font-size:clamp(44px,4.6vw,68px);line-height:0.94;text-wrap:balance;max-width:16ch}
.bk .tb-cv__name{font-size:96px;white-space:nowrap}
.bk .tb-ff--cover{gap:0 48px}
.bk .tb-cv__stubname{${cond};font-size:64px;line-height:0.95}
.bk .tb-ff--stub{flex-direction:column;gap:14px}
.bk .tb-ff--stub dd{${cond};font-size:28px;line-height:30px}
.bk .tb-hero__cap{margin-top:28px}
.bk .tb-facts{display:flex;gap:0 32px}
.bk .tb-fact{flex:1 1 0;min-width:0}
.bk .tb-ff--fact dt{${cond};font-size:24px;line-height:26px}
.bk .tb-ff--fact dd{font-size:16px;line-height:1.6;font-weight:400;color:var(--tb-soft)}
.bk .tb-wide{margin-top:72px}
.bk .tb-wide .tb-ph{aspect-ratio:21/9}
.bk .tb-wide figcaption{margin-top:10px}
.bk .tb-traits{margin-top:72px}
.bk .tb-trait{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px 24px;padding-bottom:28px}
.bk .tb-trait>.tb-ph{grid-column:1/-1;margin-bottom:16px}
.bk .tb-trait .tb-sn{padding-top:6px}
.bk .tb-trait__t{font-size:96px;overflow-wrap:anywhere}
.bk .tb-trait--1 .tb-trait__t{font-size:72px}.bk .tb-trait--2 .tb-trait__t{font-size:56px}
.bk .tb-trait .tb-body{grid-column:2}

/* voice */
.bk .tb-prin{display:flex;gap:0 24px}
.bk .tb-prin li{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:10px}
.bk .tb-prin__t{${cond};font-size:26px;line-height:28px}
.bk .tb-prin__e{font-size:24px;line-height:1.02}
.bk .tb-line{display:grid;grid-template-columns:72px minmax(0,1fr);gap:0 24px;align-items:baseline;padding-bottom:20px}
.bk .tb-line>.tb-ph{grid-column:1/-1;margin-bottom:18px}
.bk .tb-line .tb-disp{font-size:40px;line-height:1}
.bk .tb-line--lead .tb-disp{font-size:72px;line-height:0.94;text-wrap:balance}
.bk .tb-wtn__h,.bk .tb-wtn__r{display:grid;grid-template-columns:minmax(0,1.6fr) 3px minmax(0,1fr);column-gap:32px}
.bk .tb-wtn__h{padding-bottom:12px}.bk .tb-wtn__h .tb-sl:last-child{grid-column:3}
.bk .tb-wtn__r{padding-bottom:22px}
.bk .tb-wtn__r>.tb-ph{grid-column:1/-1;margin-bottom:22px}
.bk .tb-wtn__b{display:flex;flex-direction:column;gap:10px}
.bk .tb-wtn__w{font-size:34px;line-height:1}
.bk .tb-wtn__c{font-size:15px;line-height:1.5;color:var(--tb-soft);max-width:56ch}
.bk .tb-wtn__n{font-size:16px;line-height:1.5;color:var(--tb-quiet);text-decoration:line-through;text-decoration-thickness:1px;align-self:center}
.bk .tb-boil,.bk .tb-split{display:grid;grid-template-columns:minmax(0,1fr) 3px minmax(0,1fr);column-gap:40px}
.bk .tb-split--use{grid-template-columns:minmax(0,1fr) 3px minmax(0,1.1fr)}

/* logo: the colour version large on its ground, the rest in two strips split by perforations */
.bk .tb-lv{display:flex;flex-direction:column;min-width:0;flex:1 1 0}
.bk .tb-lv__g{display:flex;align-items:center;justify-content:center;height:220px;padding:20px;border-radius:${rc}px}
.bk .tb-lv--lead .tb-lv__g{height:420px}
.bk .tb-lv figcaption{display:flex;flex-direction:column;gap:6px;padding-top:12px;font-size:14px;line-height:1.5;color:var(--tb-soft)}
.bk .tb-lv figcaption .tb-sl{color:var(--tb-ink)}
.bk .tb-lvs{display:flex;gap:0 20px;margin-top:40px}
.bk .tb-lv--horizontal{flex-grow:1.8}.bk .tb-lv--symbol{flex-grow:0.7}
.bk .tb-slotnote{margin-top:24px}
.bk .tb-clearfig{width:min(100%,520px);margin-bottom:24px}
.bk .tb-clear{position:relative;width:100%;border-radius:${rc}px}
.bk .tb-clear__logo svg,.bk .tb-clear__logo .logo-slot{display:block;width:100%!important;height:auto!important;max-width:100%}
.bk .tb-clear__logo .logo-slot{aspect-ratio:${(ctx.logo.geo.width / ctx.logo.geo.height).toFixed(3)}}
.bk .tb-x{position:absolute;pointer-events:none}
.bk .tb-x i{position:absolute;font-family:var(--tb-disp);font-stretch:${st}%;font-weight:${d.weights[0]};font-style:normal;font-size:24px;line-height:1}
.bk .tb-x--t,.bk .tb-x--b{left:50%;width:0;height:0;padding-top:var(--p);border-left:1.5px solid var(--sign)}
.bk .tb-x--t{top:0}.bk .tb-x--b{bottom:0}
.bk .tb-x--t i,.bk .tb-x--b i{left:8px;top:50%;transform:translateY(-50%)}
.bk .tb-x--l,.bk .tb-x--r{top:50%;height:0;width:0;padding-left:var(--p);border-top:1.5px solid var(--sign)}
.bk .tb-x--l{left:0}.bk .tb-x--r{right:0}
.bk .tb-x--l i,.bk .tb-x--r i{left:50%;top:8px;transform:translateX(-50%)}
.bk .tb-min__logo{display:inline-flex;padding:24px;border-radius:${rc}px}
.bk .tb-min__dim{display:block;margin:10px 0 24px 24px;height:0;border-top:1.5px solid var(--tb-ink);max-width:100%}
.bk .tb-mu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px}
.bk .tb-mu__i{display:grid;grid-template-columns:48px 176px minmax(0,1fr);gap:0 20px;align-items:center;padding-bottom:20px}
.bk .tb-mu__i>.tb-ph{grid-column:1/-1;margin-bottom:20px}
.bk .tb-mu__art{position:relative;isolation:isolate;overflow:hidden;height:112px;display:grid;place-items:center;background:var(--tb-fix);color:${L.text};border-radius:${rc}px}
.bk .tb-mu__t{font-size:15px;line-height:1.45;color:var(--tb-ink)}
.bk .tb-busy{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.bk .tb-mu__on{position:relative;z-index:1}
.bk .tb-mu__cut{clip-path:inset(0 24% 0 0)}
.bk .tb-mu--re .logo-slot{color:${L.text}!important}
.bk .tb-mu__box{padding:12px;border:2px solid ${L.text}}

/* colour: one roll per colour, the biggest share first, three tickets on each roll */
.bk .tb-rolls{display:flex;flex-direction:column;gap:16px}
.bk .tb-cr{display:grid;grid-template-columns:minmax(0,1.3fr) 4px minmax(0,1fr) 4px minmax(0,1fr);min-height:var(--h);border-radius:${rk}px}
.bk .tb-cr>.tb-ph{display:none}
.bk .tb-cr__face{appearance:none;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 24px 22px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:${rk}px 0 0 ${rk}px;width:100%;min-width:0;container-type:inline-size}
.bk .tb-cr__face:focus-visible{outline:3px solid currentColor;outline-offset:-8px}
.bk .tb-cr__n{font-size:min(var(--fs),var(--fit));white-space:nowrap}
.bk .tb-cr__vals,.bk .tb-cr__lands{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:20px 22px;min-width:0}
.bk .tb-cr__lands p{font-size:14px;line-height:1.5;margin-top:4px}
.bk .tb-cr__lands b{font-weight:600}
.bk .tb-fv{appearance:none;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:44px;padding:4px 8px;margin:0 -8px;border:0;border-radius:${rc}px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:box-shadow 120ms ease-out}
.bk .tb-fv__k{font-size:12px;line-height:16px;font-weight:600}
.bk .tb-fv .tb-mono{overflow-wrap:anywhere}
.bk .tb-fv:focus-visible{outline:2px solid currentColor;outline-offset:0}
.bk .tb-fv.is-copied{box-shadow:inset 0 0 0 1.5px currentColor}
@media (hover:hover){.bk .tb-fv:hover,.bk .tb-cr__face:hover .tb-cr__n{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}.bk .tb-fv:hover{box-shadow:inset 0 0 0 1.5px currentColor;text-decoration:none}}
.bk .tb-tones li .tb-ph{margin:0}
.bk .tb-tone{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:0 24px;align-items:center;padding:16px 0}
.bk .tb-tone__sw{display:block;height:64px;border-radius:${rc}px}
.bk .tb-tone__n{font-weight:600;font-size:15px}
.bk .tb-tone__v{display:flex;gap:16px}
.bk .tb-tone__v .tb-fv{margin:0;padding:6px 10px;box-shadow:inset 0 0 0 1px var(--tb-edge)}
.bk .tb-pairs{margin-top:28px;display:flex;flex-direction:column;border-radius:${rk}px;overflow:hidden}
.bk .tb-pr{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:0 32px;min-height:150px;padding:22px 28px 20px}
.bk .tb-pr>.tb-ph{position:absolute;left:0;right:0;top:-2px}
.bk .tb-pr--lead{min-height:220px}.bk .tb-pr.is-large{min-height:120px}
.bk .tb-pr__b{display:flex;flex-direction:column;gap:6px;align-self:stretch;justify-content:space-between}
.bk .tb-pr__u{font-size:17px;line-height:1.35;font-weight:600}
.bk .tb-pr__nm{font-size:13px;line-height:1.4}
.bk .tb-pr__p dt{font-size:13px;line-height:16px;font-weight:500}
.bk .tb-pr__p dd{margin:0;font-size:84px;line-height:1;white-space:nowrap}
.bk .tb-pr--lead .tb-pr__p dd{font-size:112px}.bk .tb-pr.is-large .tb-pr__p dd{font-size:56px}
.bk .tb-roles{display:flex;margin-top:24px}
.bk .tb-roles li{flex:1 1 0;min-width:0}
.bk .tb-roles--dark{display:none}
[data-theme="dark"] .bk .tb-roles--dark{display:flex}[data-theme="dark"] .bk .tb-roles--light{display:none}
.bk .tb-role{appearance:none;width:100%;display:flex;flex-direction:column;gap:6px;padding:0 0 8px;border:0;background:transparent;color:var(--tb-ink);font:500 12px/1.3 var(--tb-body);text-align:left;cursor:pointer}
.bk .tb-role__sw{display:block;height:72px;box-shadow:inset 0 0 0 1px var(--tb-hair)}
.bk .tb-roles li:first-child .tb-role__sw{border-radius:${rk}px 0 0 ${rk}px}.bk .tb-roles li:last-child .tb-role__sw{border-radius:0 ${rk}px ${rk}px 0}
.bk .tb-role__h{font-size:12px;color:var(--tb-quiet)}
.bk .tb-role:focus-visible{outline-offset:-2px}
@media (hover:hover){.bk .tb-role:hover .tb-role__n{text-decoration:underline;text-underline-offset:3px}}

/* typography: one hard ticket at true proportion carrying the print hierarchy, its stub the spec */
.bk .tb-ht{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1.5fr);aspect-ratio:2.75;border-radius:${rk}px}
.bk .tb-ht__b{display:flex;flex-direction:column;justify-content:space-between;gap:6px;padding:32px 40px 30px;min-width:0}
.bk .tb-hl{font-size:var(--size);white-space:nowrap}
.bk .tb-ht__f{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
.bk .tb-ht__ff{display:flex;gap:0 32px;margin:0}
.bk .tb-ht__ff div{display:flex;flex-direction:column;gap:2px}
.bk .tb-ht__ff dd{margin:0;font-size:17px;line-height:1.3;font-weight:600}
.bk .tb-ht__s{position:relative;padding:28px 28px 24px 34px;min-width:0;display:flex;flex-direction:column;gap:12px}
.bk .tb-ht__s>.tb-pv{position:absolute;left:-3px;top:0;bottom:0;height:auto}
.bk .tb-ht__s>.tb-ph{display:none}
.bk .tb-hs{display:flex;flex-direction:column;gap:10px}
.bk .tb-hs li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:0 8px}
.bk .tb-hs .tb-sn{font-size:16px;line-height:18px;grid-row:1/4}
.bk .tb-hs__t{${cond};font-size:18px;line-height:18px}
.bk .tb-hs__s,.bk .tb-hs__u{font-size:12px;line-height:16px}
.bk .tb-ht__below{display:grid;grid-template-columns:minmax(0,62ch) minmax(0,1fr);gap:48px;margin-top:28px;align-items:start}
.bk .tb-ht__para{color:var(--tb-soft)}
.bk .tb-faces{display:grid;grid-template-columns:minmax(0,1.4fr) 3px minmax(0,1fr);column-gap:40px}
.bk .tb-face{display:flex;flex-direction:column;gap:8px;min-width:0}
.bk .tb-face__aa{font-size:220px;line-height:0.8;margin-bottom:16px}
.bk .tb-face--2 .tb-face__aa{font-size:150px;font-weight:500}
.bk .tb-face__n{${cond};font-size:34px;line-height:1}
.bk .tb-face--1 .tb-face__al{font-weight:${d.weights[0]}}
.bk .tb-face__al{font-size:20px;line-height:1.4;margin-top:12px;overflow-wrap:anywhere}
.bk .tb-faces__mono{margin-top:32px;max-width:70ch}
.bk .tb-tester{--tb-focus:var(--tb-ground);padding:36px 40px;background:var(--tb-ink);color:var(--tb-ground);border-radius:${rk}px}
.bk .tb-tester .tb-h3,.bk .tb-field label,.bk .tb-field output{color:var(--tb-ground)}
.bk .tb-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk .tb-field{display:flex;flex-direction:column;gap:8px}
.bk .tb-field label{font-size:13px;font-weight:600}
.bk .tb-field output{font-weight:400;margin-left:8px}
.bk .tb-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--tb-edge);border-radius:${rc}px;background:var(--tb-ground);color:var(--tb-ink);font:400 16px/1 var(--tb-body)}
.bk .tb-field input[type=range]{height:44px;margin:0;accent-color:${L.action};width:100%}
.bk .tb-tester__d{margin-top:32px;font-size:min(var(--tester-size,64px),12vw);line-height:1;min-height:1em;overflow-wrap:anywhere}
.bk .tb-tester__b{margin-top:16px;font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk .tb-use__h{font-size:44px;line-height:0.95;margin-bottom:16px}
.bk .tb-use__p{font-size:15px;line-height:1.6;color:var(--tb-soft);margin-bottom:12px;max-width:52ch}
.bk .tb-row{display:grid;grid-template-columns:minmax(0,1fr) 3px minmax(0,1fr);column-gap:24px;padding:16px 0 18px}
.bk .tb-row p{font-size:15px;line-height:1.5}
.bk .tb-row .tb-sl{display:block;margin-bottom:4px;font-size:20px;line-height:22px}
.bk .tb-row__s{color:var(--tb-soft)}

/* imagery: the one Night section, the shot list a pad of stubs */
.bk .tb-ff--dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 48px;margin-bottom:72px}
.bk .tb-ff--dir dt{${cond};font-size:24px;line-height:26px;font-weight:700}
.bk .tb-ff--dir dd{font-size:15px;line-height:1.55;font-weight:400;color:var(--tb-soft)}
.bk .tb-shot{display:grid;grid-template-columns:220px 3px minmax(0,1fr);column-gap:32px;padding-bottom:28px}
.bk .tb-shot>.tb-ph{grid-column:1/-1;margin-bottom:28px}
.bk .tb-shot__s{display:flex;flex-direction:column;gap:12px}
.bk .tb-sn--big{font-size:56px;line-height:1}
.bk .tb-shot__f .tb-ph{aspect-ratio:16/9}
.bk .tb-shot--1 .tb-shot__f{width:72%}.bk .tb-shot--1 .tb-shot__f .tb-ph{aspect-ratio:4/3}
.bk .tb-shot--2 .tb-shot__f{width:86%}.bk .tb-shot--2 .tb-shot__f .tb-ph{aspect-ratio:3/2}

/* layout */
.bk .tb-grid{display:grid;grid-template-columns:minmax(0,1fr) 3px 220px;column-gap:32px}
.bk .tb-page{display:grid;background:var(--tb-raised);box-shadow:inset 0 0 0 1px var(--tb-edge);border-radius:${rc}px}
.bk .tb-page__g{display:grid}
.bk .tb-page__g i{display:block;background:var(--tb-panel)}
.bk .tb-ff--meas{flex-direction:column;justify-content:space-between;gap:20px}
.bk .tb-ff--meas dt{${cond};font-size:22px;line-height:24px;color:var(--tb-soft)}
.bk .tb-ff--meas dd{${cond};font-size:60px;line-height:1}
.bk .tb-space{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap}
.bk .tb-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk .tb-space i{display:block;background:var(--tb-ink)}
.bk .tb-shape{display:flex;gap:32px;margin-bottom:20px;flex-wrap:wrap}
.bk .tb-shape div{display:flex;flex-direction:column;gap:8px}
.bk .tb-shape i{display:block;width:96px;height:64px;border:${bw}px solid var(--tb-ink)}

/* applications: rows of pieces split by perforations, each with its serial and name */
.bk .tb-aprow{display:grid;grid-template-columns:minmax(0,1fr);column-gap:40px;padding-bottom:40px}
.bk .tb-aprow--1{grid-template-columns:minmax(0,1.1fr) 3px minmax(0,1fr)}
.bk .tb-aprow--3{grid-template-columns:minmax(0,1.2fr) 3px minmax(0,1fr)}
.bk .tb-aptear{margin-bottom:32px}
.bk .tb-ap{display:flex;flex-direction:column;gap:16px;min-width:0}
.bk .tb-ap__h{display:flex;gap:12px;align-items:baseline}
.bk .tb-ap__t{font-size:30px;line-height:32px}
.bk .tb-ap .tb-cap{max-width:44ch}
.bk .tb-poster{container-type:inline-size;position:relative;width:min(100%,420px);aspect-ratio:594/841;border-radius:${rc}px;overflow:hidden}
.bk .tb-poster__h{position:absolute;left:8cqw;right:6cqw;top:8cqw;font-size:14cqw;line-height:0.9}
.bk .tb-poster__f{position:absolute;left:8cqw;right:8cqw;bottom:26cqw;display:flex;flex-direction:column;gap:1cqw;font-size:max(13px,4.4cqw);line-height:1.3;font-weight:600}
.bk .tb-poster__logo{position:absolute;left:8cqw;bottom:8cqw;width:52cqw}
.bk .tb-poster__logo svg,.bk .tb-poster__logo .logo-slot{display:block;width:100%!important;height:auto!important}
.bk .tb-poster__logo .logo-slot{aspect-ratio:${(ctx.logo.geo.width / ctx.logo.geo.height).toFixed(3)}}
.bk .tb-device{width:min(100%,390px);background:var(--tb-ground);border:${bw}px solid var(--tb-ink);border-radius:${rk}px;overflow:hidden}
.bk .tb-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk .tb-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk .tb-scr__time{font-size:13px;font-weight:600}
.bk .tb-scr__eta{margin:0;font-size:44px;line-height:0.95}
.bk .tb-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk .tb-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}
.bk .tb-posts{--u:300px;display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.bk .tb-post{position:relative;overflow:hidden;flex:none;padding:calc(var(--w)*0.07);container-type:inline-size;border-radius:${rc}px}
.bk .tb-post--sq{--w:var(--u);width:var(--w);aspect-ratio:1}
.bk .tb-post--pt{--w:calc(var(--u)*0.8);width:var(--w);aspect-ratio:4/5}
.bk .tb-post--st{--w:calc(var(--u)*0.5625);width:var(--w);aspect-ratio:9/16}
.bk .tb-post .tb-disp{font-size:15cqw;line-height:0.92}
.bk .tb-post--st .tb-disp{font-size:12cqw;line-height:1}
.bk .tb-post__lg{position:absolute;left:calc(var(--w)*0.07);bottom:calc(var(--w)*0.07)}
.bk .tb-cards{display:flex;flex-wrap:wrap;gap:16px}
.bk .tb-card{position:relative;width:340px;max-width:100%;aspect-ratio:90/55;border-radius:${rc}px;overflow:hidden;flex:none;container-type:inline-size}
.bk .tb-card__logo{position:absolute;left:8cqw;top:40%;transform:translateY(-50%)}
.bk .tb-card__line{position:absolute;left:8cqw;bottom:7cqw;font-size:12px}
.bk .tb-card__mark{position:absolute;right:7cqw;top:7cqw}
.bk .tb-card__who{position:absolute;left:8cqw;bottom:7cqw}
.bk .tb-card__who .nm{font-size:max(16px,6cqw);line-height:1}
.bk .tb-card__who .rl{font-size:12px;margin-top:4px}
.bk .tb-card__who .ct{font-size:12px;line-height:1.45;margin-top:8px}
.bk .tb-email{width:min(100%,440px);padding:28px;border-radius:${rk}px}
.bk .tb-email__n{font-size:16px;font-weight:600}
.bk .tb-email__r,.bk .tb-email__c{font-size:14px;line-height:1.5}
.bk .tb-email__c{margin-top:12px}
.bk .tb-email__l{margin-top:20px;padding-top:16px;border-top:1px solid}

/* downloads: the stub book. The zip a whole ticket, its stub the link; each folder a pad of stubs */
.bk .tb-zip{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1.5fr);min-height:200px;border-radius:${rk}px}
.bk .tb-zip__b{display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:28px 32px;background:var(--tb-ink);color:var(--tb-ground);border-radius:${rk}px 0 0 ${rk}px}
.bk .tb-zip__n{font-size:16px}
.bk .tb-zip__c{font-size:14px}
.bk .tb-zip__s{position:relative;display:flex;align-items:center;justify-content:center;padding:24px;background:${L.action};color:${L.actionLabel};${cond};font-size:34px;line-height:1;text-align:center;text-decoration:none;border-radius:0 ${rk}px ${rk}px 0;transition:background-color 120ms ease-out}
.bk .tb-zip__s>.tb-pv{position:absolute;left:-1.5px;top:0;bottom:0;height:auto}
.bk .tb-zip__s>.tb-ph{display:none}
.bk .tb-zip__s:focus-visible{outline:3px solid var(--tb-ink);outline-offset:3px}
@media (hover:hover){.bk .tb-zip__s:hover{background:${L.actionHover}}}
.bk .tb-pad{display:grid;grid-template-columns:220px minmax(0,1fr);column-gap:40px;margin-top:72px}
.bk .tb-pad__h .tb-h3{font-family:var(--tb-disp);font-stretch:${st}%;font-weight:${d.weights[0]};font-size:34px;line-height:1;letter-spacing:-0.015em}
.bk .tb-file{display:grid;grid-template-columns:minmax(0,1fr) 3px 136px;column-gap:20px;align-items:center}
.bk .tb-file--logo{grid-template-columns:minmax(0,1fr) 3px auto}
.bk .tb-file>.tb-ph{grid-column:1/-1}
.bk .tb-file__b{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:4px 16px;align-items:baseline;padding:14px 0;min-width:0}
.bk .tb-file__n{overflow-wrap:anywhere}
.bk .tb-file--logo .tb-file__n{font-size:15px;font-weight:600}
.bk .tb-file__s{display:flex;align-items:center;min-height:44px;${cond};font-size:22px;color:var(--tb-ink);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:4px}
.bk .tb-file__s--set{flex-wrap:wrap;gap:8px 16px;text-decoration:none;font:inherit;padding:8px 0}
@media (hover:hover){.bk a.tb-file__s:hover{text-decoration-thickness:3px}.bk .tb-icon:hover{background:var(--tb-raised)}}
.bk .tb-icons{display:flex;flex-wrap:wrap;margin-bottom:12px}
.bk .tb-icon{display:flex;flex-direction:column;align-items:center;gap:6px;width:92px;padding:14px 6px;font-size:12px;text-decoration:none;color:var(--tb-ink);border-radius:${rc}px;transition:background-color 120ms ease-out}

/* medium: the nav drops to a second row under the plate */
@media (max-width:1100px){
.bk .bk-top{flex-wrap:wrap;height:auto}
.bk .bk-brand{height:72px;padding:0 24px}
.bk .bk-mode{margin-left:auto}
.bk .bk-nav{order:3;flex:0 0 100%;height:52px;padding:0 24px;border-top:1px solid var(--tb-hair);overflow-x:auto}
.bk .bk-nav .bk-n{display:none}
.bk .bk-nav a{white-space:nowrap}
.bk .tb-sec{padding:0 40px;scroll-margin-top:128px}
.bk .tb-roll__in{top:148px}
.bk .tb-frame{grid-template-columns:200px 3px minmax(0,1fr);column-gap:32px}
.bk .tb-rh{font-size:48px}
.bk .bk-foot{padding-left:40px;padding-right:40px}
.bk .tb-mu{grid-template-columns:minmax(0,1fr)}
.bk .tb-pr--lead .tb-pr__p dd{font-size:84px}.bk .tb-pr__p dd{font-size:64px}
}

/* narrow: one ticket wide. The roll folds over each section; stubs fold under their bodies along a horizontal perforation */
@media (max-width:840px){
.bk .bk-top{flex-wrap:nowrap;align-items:center;gap:8px;min-height:64px;padding:0 12px 0 0}
.bk .bk-brand{height:64px;padding:0 16px}.bk .bk-brand svg{width:104px}
.bk .bk-name{font-size:24px}
.bk .bk-menu{display:inline-flex;margin-left:auto;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--tb-ink);border-radius:${rc}px;background:transparent;color:var(--tb-ink);font:500 13px/1 var(--tb-body);cursor:pointer}
.bk .bk-menu[aria-expanded="true"]{background:var(--tb-ink);color:var(--tb-ground)}
.bk .bk-mode{margin:0}
.bk .bk-mode button{height:44px;padding:0 10px;min-width:44px}
.bk .bk-nav{display:none;position:absolute;left:0;right:0;top:100%;height:auto;padding:8px 16px 16px;background:var(--tb-ground);border-top:0;border-bottom:3px dotted var(--tb-hole);max-height:calc(100vh - 64px);overflow:auto;overscroll-behavior:contain}
.bk .bk-top[data-open="true"] .bk-nav{display:block}
.bk .bk-nav ol{flex-direction:column;gap:0}
.bk .bk-nav a{padding:10px 4px;min-height:48px;font-size:28px}
.bk .bk-nav .bk-n{display:inline;width:28px}
.bk .bk-nav a[aria-current]::after{display:none}
.bk .bk-nav a[aria-current]{text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:6px}
.bk .tb-sec{padding:0 20px;scroll-margin-top:64px}
.bk .tb-sec>*{max-width:none}
.bk .tb-frame,.bk .tb-frame--wide{grid-template-columns:minmax(0,1fr);padding:32px 0 72px}
.bk .tb-frame--wide>*{grid-row:auto!important}
.bk .tb-frame--wide .tb-wide-row{margin-bottom:48px}
.bk .tb-roll__in{position:static;gap:12px}
.bk .tb-rh{font-size:52px}
.bk .tb-lead{max-width:none}
.bk .tb-pv--frame{display:none}
.bk .tb-ph--frame{display:block;margin:28px 0 32px}
.bk .tb-block{margin-top:64px}
.bk .tb-boil,.bk .tb-split,.bk .tb-split--use,.bk .tb-faces,.bk .tb-aprow--1,.bk .tb-aprow--3,.bk .tb-grid{grid-template-columns:minmax(0,1fr);row-gap:40px}
.bk .tb-boil>.tb-pv,.bk .tb-split>.tb-pv,.bk .tb-faces>.tb-pv,.bk .tb-aprow>.tb-pv,.bk .tb-grid>.tb-pv,.bk .tb-facts>.tb-pv,.bk .tb-prin>.tb-pv,.bk .tb-lvs>.tb-pv{display:none}
.bk .tb-hero{padding-top:24px}
.bk .tb-cv{grid-template-columns:minmax(0,1fr);aspect-ratio:auto;row-gap:12px}
.bk .tb-cv__body{padding:24px 20px 28px;gap:28px;border-radius:${rk}px ${rk}px 0 0}
.bk .tb-cv__stub{padding:24px 20px;gap:16px;border-radius:0 0 ${rk}px ${rk}px;transform:translateY(12px) rotate(2deg)}
.bk .tb-cv>div>.tb-pv{display:none}
.bk .tb-cv__body>.tb-ph{display:block;position:absolute;left:0;right:0;bottom:-1.5px;top:auto}
.bk .tb-cv__stub>.tb-ph{display:block;position:absolute;left:0;right:0;top:-1.5px}
.bk .tb-cv__line{font-size:40px}
.bk .tb-cv__name{font-size:56px}
.bk .tb-cv__logo svg{width:100%!important;height:auto!important;max-width:280px}
.bk .tb-ff--cover{flex-wrap:wrap;gap:16px 28px}
.bk .tb-cv__stubname{font-size:48px}
.bk .tb-ff--stub{flex-direction:row;gap:28px}
.bk .tb-hero__cap{margin-top:36px}
.bk .tb-facts,.bk .tb-prin{flex-direction:column;gap:28px}
.bk .tb-wide{margin-top:48px}.bk .tb-wide .tb-ph{aspect-ratio:4/3}
.bk .tb-trait{grid-template-columns:48px minmax(0,1fr);gap:8px 12px}
.bk .tb-trait__t{font-size:52px}.bk .tb-trait--1 .tb-trait__t{font-size:44px}.bk .tb-trait--2 .tb-trait__t{font-size:38px}
.bk .tb-prin__e{font-size:26px}
.bk .tb-line{grid-template-columns:48px minmax(0,1fr);gap:0 12px}
.bk .tb-line .tb-disp{font-size:30px}.bk .tb-line--lead .tb-disp{font-size:42px}
.bk .tb-wtn__h{display:none}
.bk .tb-wtn__r{grid-template-columns:minmax(0,1fr);row-gap:10px}
.bk .tb-wtn__r>.tb-pv{display:none}
.bk .tb-wtn__w{font-size:28px}
.bk .tb-wtn__n::before{content:"Not that: ";text-decoration:none;display:inline-block;margin-right:4px;font-weight:600}
.bk .tb-lvs{flex-direction:column;gap:32px;margin-top:32px}
.bk .tb-lv__g{height:180px}.bk .tb-lv--lead .tb-lv__g{height:240px}
.bk .tb-lv__g svg{max-width:100%;height:auto}
.bk .tb-mu__i{grid-template-columns:40px minmax(0,1fr);gap:12px}
.bk .tb-mu__art{grid-column:2}.bk .tb-mu__t{grid-column:2}
.bk .tb-cr{grid-template-columns:minmax(0,1fr);min-height:0}
.bk .tb-cr>.tb-pv{display:none}.bk .tb-cr>.tb-ph{display:block}
.bk .tb-cr__face{min-height:calc(var(--h) * 0.5);border-radius:${rk}px ${rk}px 0 0}
.bk .tb-cr__n{font-size:min(var(--fs),var(--fit))}
.bk .tb-cr__vals,.bk .tb-cr__lands{padding:16px 20px}
.bk .tb-tone{grid-template-columns:64px minmax(0,1fr);gap:12px 16px}
.bk .tb-tone__v{grid-column:1/-1;flex-wrap:wrap;gap:8px}
.bk .tb-pr{grid-template-columns:minmax(0,1fr);gap:16px;min-height:0;padding:20px}
.bk .tb-pr{container-type:inline-size}
.bk .tb-pr__p dd,.bk .tb-pr--lead .tb-pr__p dd{font-size:min(64px,14cqw)}.bk .tb-pr.is-large .tb-pr__p dd{font-size:min(44px,12cqw)}
.bk .tb-roles,[data-theme="dark"] .bk .tb-roles--dark{flex-direction:column}
.bk .tb-role{flex-direction:row;align-items:center;gap:12px;min-height:48px;padding:4px 0;font-size:13px}
.bk .tb-role__sw{width:40px;height:40px;flex:none;border-radius:${rc}px!important}
.bk .tb-role__h{margin-left:auto}
.bk .tb-ht{grid-template-columns:minmax(0,1fr);aspect-ratio:auto}
.bk .tb-ht__b{padding:24px 20px;gap:12px}
.bk .tb-hl{font-size:min(var(--size),14vw);white-space:normal}
.bk .tb-ht__s{padding:28px 20px 24px}
.bk .tb-ht__s>.tb-pv{display:none}.bk .tb-ht__s>.tb-ph{display:block;position:absolute;left:0;right:0;top:-3px}
.bk .tb-ht__ff{flex-wrap:wrap;gap:12px 24px}
.bk .tb-ht__below{grid-template-columns:minmax(0,1fr);gap:16px}
.bk .tb-face__aa{font-size:160px}.bk .tb-face--2 .tb-face__aa{font-size:120px}
.bk .tb-tester{padding:24px 20px}
.bk .tb-tester__c{grid-template-columns:minmax(0,1fr)}
.bk .tb-use__h{font-size:36px}
.bk .tb-row{grid-template-columns:minmax(0,1fr);row-gap:12px}
.bk .tb-row>.tb-pv{display:none}
.bk .tb-ff--dir{grid-template-columns:minmax(0,1fr);margin-bottom:48px}
.bk .tb-shot{grid-template-columns:minmax(0,1fr);row-gap:16px}
.bk .tb-shot>.tb-pv{display:none}
.bk .tb-shot__f,.bk .tb-shot--1 .tb-shot__f,.bk .tb-shot--2 .tb-shot__f{width:100%;order:-1}
.bk .tb-sn--big{font-size:40px}
.bk .tb-ff--meas{flex-direction:row;flex-wrap:wrap;gap:20px 32px}
.bk .tb-ff--meas dd{font-size:44px}
.bk .tb-posts{container-type:inline-size;gap:10px}
.bk .tb-post--sq{--w:100cqw}.bk .tb-post--pt{--w:calc((100cqw - 10px) * 0.587)}.bk .tb-post--st{--w:calc((100cqw - 10px) * 0.413)}
.bk .tb-card{width:100%}
.bk .tb-zip{grid-template-columns:minmax(0,1fr)}
.bk .tb-zip__b{border-radius:${rk}px ${rk}px 0 0}
.bk .tb-zip__s{min-height:88px;border-radius:0 0 ${rk}px ${rk}px}
.bk .tb-zip__s>.tb-pv{display:none}.bk .tb-zip__s>.tb-ph{display:block;position:absolute;left:0;right:0;top:-1.5px}
.bk .tb-pad{grid-template-columns:minmax(0,1fr);margin-top:56px}
.bk .tb-pad__h{margin-bottom:16px}
.bk .tb-file{grid-template-columns:minmax(0,1fr) 3px 96px;column-gap:14px}
.bk .tb-file--logo{grid-template-columns:minmax(0,1fr)}
.bk .tb-file--logo>.tb-pv{display:none}
.bk .tb-file__b{grid-template-columns:minmax(0,1fr);gap:4px}
.bk .tb-file__s{font-size:20px}
.bk .bk-foot{padding:24px 20px;flex-direction:column}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important;animation:none!important}.bk .tb-btn:active{transform:none}html:has(.bk){scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html:has(.bk){scroll-behavior:smooth}}

@media print{
.bk,[data-theme="dark"] .bk,.bk .tb-night{${vars(L)}}
.bk .bk-top,.bk .bk-skip,.bk .bk-live,.bk .bk-menu,.bk .bk-mode,.bk .tb-btn,.bk .tb-dls,.bk .tb-tester__c,.bk .tb-icons,.bk .tb-zip,.bk .tb-pad{display:none!important}
.bk .tb-sec{padding:0 0 24px;break-before:page}
.bk .tb-sec--overview{break-before:auto}
.bk .tb-roll__in{position:static}
.bk figure,.bk li,.bk .tb-cr,.bk .tb-pr,.bk .tb-ht,.bk .tb-card,.bk .tb-post,.bk .tb-poster{break-inside:avoid}
.bk{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js. The kit lane owns cssBookKit.
export function cssBook(ctx) { return cssBookKit(ctx); }
