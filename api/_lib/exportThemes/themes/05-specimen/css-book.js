import { cssBookKit } from './css-bookkit.js';
// Styles for theme 05's brand book (bookCss) and the brand kit pages (cssBook). bookCss is only ever loaded by the book itself and
// its canvas boards, and every rule in it sits under the book's root (.bk) or on a kb- class, so nothing reaches the guideline pages.
// The book is the card catalogue: the engine's section index drawn as a cabinet of drawers, open sheets with a guide card's tab on
// the top edge, the call number top left, the rod hole at the foot. One elevation language: 1.5 px Rod lines; no shadows.
// Dark is the drawer interior: Type ground, Card ink. Roles come from the brand; no hex is written here.
const mixHex = (ctx, a, b, t) => '#' + ctx.C.hexToRgb(a).map((v, i) => Math.round(v * t + ctx.C.hexToRgb(b)[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase();
const vars = (ctx, r) => `--kb-ground:${r.surface};--kb-face:${r.raised};--kb-panel:${r.sunken};--kb-ink:${r.text};--kb-soft:${r.textSoft};--kb-quiet:${r.quiet};--kb-quiet-panel:${r.quietOnSunken};--kb-hair:${r.divider};--kb-rod:${r.quiet};--kb-rule:${mixHex(ctx, r.text, r.surface, 0.22)};--kb-edge:${r.border};--kb-action:${r.action};--kb-action-hover:${r.actionHover};--kb-action-ink:${r.actionLabel};--kb-focus:${r.focus};--kb-hole:${r.surface};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, bw = B.ui.border, rev = B.logo.colourways.reversed;
  return `.bk{${vars(ctx, L)}--kb-fix-ground:${L.surface};--kb-fix-face:${L.raised};--kb-fix-ink:${L.text};--kb-fix-soft:${L.textSoft};--kb-fix-quiet:${L.quiet};--kb-fix-hair:${L.divider};--kb-fix-rule:${mixHex(ctx, L.text, L.surface, 0.22)};
--chrome:'Albert Sans',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',serif;--mono:'${m.family}',monospace;--i1:72px;--i2:144px}
[data-theme="dark"] .bk{${vars(ctx, D)}}
body:has(>.bk){background:${L.surface}}
[data-theme="dark"] body:has(>.bk){background:${D.surface}}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.45;color:var(--kb-ink);background:var(--kb-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit;text-underline-offset:3px}
.bk ::selection{background:var(--kb-action);color:var(--kb-action-ink)}
.bk .num{font-variant-numeric:tabular-nums}
.bk .kb-mono{font-family:var(--mono);font-weight:400;letter-spacing:0}
.bk :focus-visible{outline:2px solid var(--kb-focus);outline-offset:2px}
.bk .bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--kb-ink);color:var(--kb-ground);padding:12px 16px;font-weight:600;text-decoration:none}
.bk .bk-skip:focus{top:16px}
.bk .bk-for-dark{display:none}
[data-theme="dark"] .bk .bk-for-dark{display:block}[data-theme="dark"] .bk .bk-for-light{display:none}
.bk .kb-roles.bk-for-dark{display:none}[data-theme="dark"] .bk .kb-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk .kb-roles.bk-for-light{display:none}

/* the index as the cabinet front: one drawer per section, its label in a holder between two screws, a cup pull under it.
   The section in view is the drawer pulled: its label printed on the guide-card Plum */
.bk .bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:28px;padding:32px 20px 24px;background:var(--kb-ground);border-right:1px solid var(--kb-rule)}
.bk .bk-brand{display:block;text-decoration:none;width:132px}
.bk .bk-brand svg{display:block;width:132px;height:auto}
.bk .bk-name{font-family:var(--display);font-size:28px;line-height:1.2}
.bk .bk-menu{display:none}
.bk .bk-nav{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}
.bk .bk-nav ol{display:flex;flex-direction:column;gap:6px;padding:6px;border:1.5px solid var(--kb-rod);border-bottom-width:12px;border-bottom-color:var(--kb-ground);box-shadow:inset 0 -1.5px 0 var(--kb-rod),0 1.5px 0 var(--kb-rod)}
.bk .bk-nav li{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 6px 5px;border:1.5px solid var(--kb-rod)}
.bk .bk-nav li::after{content:"";display:block;width:40px;height:6px;border:1.5px solid var(--kb-rod);border-top:0;border-radius:0 0 7px 7px}
.bk .bk-nav a{position:relative;display:flex;align-items:baseline;justify-content:center;gap:7px;min-width:148px;padding:4px 20px;border:1.5px solid var(--kb-rod);background:var(--kb-face);font:400 14px/20px var(--body);color:var(--kb-ink);text-decoration:none}
.bk .bk-nav a::before,.bk .bk-nav a::after{content:"";position:absolute;top:50%;width:5px;height:5px;margin-top:-2.5px;border:1.5px solid var(--kb-rod);border-radius:50%;box-sizing:border-box}
.bk .bk-nav a::before{left:6px}.bk .bk-nav a::after{right:6px}
.bk .bk-nav .bk-n{font-weight:600}
.bk .bk-nav a[aria-current]{background:var(--kb-action);color:var(--kb-action-ink)}
.bk .bk-nav li:has(a[aria-current]){transform:translateX(6px)}
@media (hover:hover){.bk .bk-nav a:hover{text-decoration:underline}}
.bk .bk-mode{display:inline-flex;align-self:flex-start;border:1.5px solid var(--kb-rod)}
.bk .bk-mode button{appearance:none;border:0;background:transparent;color:var(--kb-ink);font:400 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer}
.bk .bk-mode button[aria-pressed="true"]{background:var(--kb-ink);color:var(--kb-ground);font-weight:600}
.bk .bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk .bk-mode button[aria-pressed="false"]:hover{background:var(--kb-panel)}}

/* an open sheet: call number and running head, the guide tab on the top edge, the body at the indentions, the rod hole at the foot */
.bk main{min-width:0}
.bk main:focus{outline:none}
.kb-sec{padding:40px 64px 32px;scroll-margin-top:0}
.kb-sec>*{max-width:1080px}
.kb-hd{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:56px}
.kb-call{font-size:13px;line-height:18px;color:var(--kb-quiet)}
.kb-rh{font-size:12px;line-height:18px;color:var(--kb-quiet)}
.kb-guide{padding-left:calc(var(--cut,0) * (100% - 320px));border-bottom:1.5px solid var(--kb-rod);margin-bottom:32px}
.kb-tab{display:inline-flex;align-items:center;min-width:240px;height:76px;padding:0 28px 6px;margin-bottom:-1.5px;background:var(--kb-action);color:var(--kb-action-ink);border-radius:12px 12px 0 0;font-family:var(--display);font-weight:400;font-size:48px;line-height:1;white-space:nowrap}
.kb-lead{font-family:var(--body);font-weight:500;font-size:22px;line-height:1.4;max-width:60ch;margin:0 0 64px var(--i1)}
.kb-body{font-family:var(--body);font-size:17px;line-height:1.55;color:var(--kb-soft);max-width:62ch}
.kb-cap{font-size:12px;line-height:1.5;color:var(--kb-quiet)}
.kb-in1{margin-left:var(--i1)}
.kb-in2{margin-left:var(--i2)}
.kb-n{font-family:var(--chrome);font-size:12px;line-height:1.5;color:var(--kb-quiet)}
.kb-sub{margin-top:72px;min-width:0}
.kb-subh{font-family:var(--display);font-weight:400;font-size:36px;line-height:1.1;padding-bottom:.08em;margin-left:var(--i1)}
.kb-subn{font-size:13px;line-height:1.5;color:var(--kb-quiet);margin:4px 0 24px var(--i1)}
.kb-subh+.kb-body,.kb-subh+.kb-ol{margin-top:20px}
.kb-ft{display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:88px;padding-top:20px;border-top:1px solid var(--kb-hair)}
.kb-see{align-self:flex-start;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--kb-soft)}
.kb-see b{font-weight:600;color:var(--kb-ink);margin-right:2px}
.kb-see a{color:var(--kb-ink);text-decoration:underline;text-decoration-color:var(--kb-rod)}
.kb-hole{display:block;flex:none}
.bk .bk-foot{display:flex;justify-content:space-between;gap:16px;padding:24px 64px 32px;border-top:1.5px solid var(--kb-rod);font-size:12px;color:var(--kb-quiet)}
.kb-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;align-items:start}
.kb-two>.kb-sub .kb-subh,.kb-two>.kb-sub .kb-subn{margin-left:0}
.kb-two--logo{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);margin-left:var(--i1)}

/* buttons and links */
.kb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border:${bw}px solid var(--kb-ink);background:transparent;color:var(--kb-ink);font:600 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 150ms ease-out}
.kb-btn.is-copied{background:var(--kb-ink);color:var(--kb-ground)}
.kb-btn--primary{height:52px;padding:0 28px;border-color:transparent;background:var(--kb-action);color:var(--kb-action-ink);font-size:15px}
@media (hover:hover){.kb-btn:hover{background:var(--kb-panel)}.kb-btn--primary:hover{background:var(--kb-action-hover)}.kb-btn.is-copied:hover{background:var(--kb-ink)}}
.kb-btn:active{transform:scale(0.97)}
.kb-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.kb-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:30px;padding:0 10px;border:1px solid var(--kb-edge);font:400 12px/1 var(--chrome);color:var(--kb-ink);text-decoration:none;font-variant-numeric:tabular-nums}
@media (hover:hover){.kb-dl:hover{background:var(--kb-panel)}}
.bk .bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;background:var(--kb-ink);color:var(--kb-ground);font:600 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk .bk-live.is-on{opacity:1}
.bk .bk-live:empty{display:none}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--kb-fix-rule)}

/* 1 overview: the main entry. Call number in the margin, the line as the heading at the first indention, notes at the second */
.kb-sec--overview{padding-top:56px}
.kb-main{display:grid;grid-template-columns:var(--i2) minmax(0,1fr);align-items:start}
.kb-callno{display:flex;flex-direction:column;font-size:14px;line-height:20px;color:var(--kb-ink);padding-top:14px}
.kb-mainh{font-family:var(--display);font-weight:400;font-size:clamp(64px,7.6vw,112px);line-height:1.02;max-width:11ch;padding-bottom:.1em;text-wrap:balance}
.kb-coll{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--kb-quiet);margin:20px 0 0 var(--i1)}
.kb-notes{display:flex;flex-direction:column;gap:16px;margin:48px 0 0 var(--i1);max-width:66ch}
.kb-note{font-family:var(--body);font-size:17px;line-height:1.55;color:var(--kb-soft)}
.kb-note b{font-weight:600;color:var(--kb-ink)}
.kb-note--lead{font-size:22px;line-height:1.4;color:var(--kb-ink)}
.kb-note--lead b{font-weight:600}
.kb-traces{margin-top:96px;padding-top:24px;border-top:1.5px solid var(--kb-rod)}
.kb-traces .kb-subh{font-size:24px;margin-left:var(--i2)}
.kb-bigtrace{font-family:var(--display);font-weight:400;font-size:clamp(56px,6.4vw,96px);line-height:1.08;margin:12px 0 0 var(--i2);padding-bottom:.1em}
.kb-ti{white-space:nowrap}
.kb-bigtrace .num{font-size:.5em;color:var(--kb-quiet);vertical-align:.5em}
.kb-means{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 32px;margin:40px 0 0 var(--i2)}
.kb-means li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:0 4px}
.kb-means p{font-family:var(--body);font-size:16px;line-height:1.5;color:var(--kb-soft)}
.kb-means b{font-weight:600;color:var(--kb-ink)}

/* 2 voice: entries, each with its See reference hanging at the second indention */
.kb-wtn{display:flex;flex-direction:column;gap:40px}
.kb-wt{display:grid;grid-template-columns:var(--i1) minmax(0,1fr);align-items:start}
.kb-wt .kb-n{padding-top:10px}
.kb-wt__w{font-family:var(--display);font-weight:400;font-size:36px;line-height:1.12;padding-bottom:.08em;max-width:24ch}
.kb-wt--first .kb-wt__w{font-size:clamp(56px,6vw,80px);line-height:1.04;max-width:20ch}
.kb-wt__b{font-family:var(--body);font-size:17px;line-height:1.55;color:var(--kb-ink);margin:8px 0 0 var(--i1);max-width:60ch}
.kb-wt__x{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--kb-quiet);margin:6px 0 0 var(--i2);max-width:60ch}
.kb-wt__x b{font-weight:600;color:var(--kb-ink);margin:0 4px}
.kb-lines{display:flex;flex-direction:column;gap:8px;margin-left:var(--i1)}
.kb-lines li{font-family:var(--display);font-size:min(var(--s,44px),11vw);line-height:1.1;padding-bottom:.06em}
.kb-prin{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 48px;margin-left:var(--i1)}
.kb-prin li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:0 4px;align-content:start}
.kb-pr__t{grid-column:2;font-family:var(--body);font-weight:600;font-size:17px;line-height:1.4}
.kb-pr__e{grid-column:2;font-family:var(--display);font-size:28px;line-height:1.2;margin-top:10px;padding-bottom:.08em}
.kb-prin .kb-n{grid-row:1}
.kb-bps{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,6fr);gap:48px;margin-left:var(--i1)}
.kb-bp{display:flex;flex-direction:column;gap:14px;align-items:flex-start;padding-top:16px;border-top:1px solid var(--kb-hair)}
.kb-bp__h{font-family:var(--body);font-weight:600;font-size:15px;line-height:1.4}

/* 3 logo: the main entry as a waterfall on Card stock, the added copies at their own sizes */
.kb-lmain{display:grid;grid-template-columns:var(--i2) minmax(0,1fr);gap:0 0;align-items:start}
.kb-lmain__t{grid-column:1/-1;margin-bottom:20px}
.kb-lmain__t .kb-subn{margin-bottom:12px}
.kb-lmain__t .kb-dls{margin-left:var(--i1)}
.kb-wfall{grid-column:2;background:var(--kb-fix-ground);color:var(--kb-fix-ink);box-shadow:inset 0 0 0 1.5px var(--kb-fix-quiet);padding:8px 32px 16px}
.kb-wfall li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:0 16px;align-items:center;padding:20px 0;border-top:1px solid var(--kb-fix-hair)}
.kb-wfall li:first-child{border-top:0}
.kb-wfall li.is-min{border-bottom:2px solid var(--kb-fix-ink)}
.kb-wfall .kb-wf__k{color:var(--kb-fix-quiet)}
.kb-wf__m{min-width:0}
.kb-wf__m svg,.kb-wf__m .logo-slot{display:block;max-width:100%}
.kb-wf__k{font-family:var(--chrome);font-size:12px;line-height:1.4;color:var(--kb-quiet)}
.kb-stop{grid-column:2;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--kb-soft);margin-top:12px}
.kb-stop b{font-weight:600;color:var(--kb-ink)}
.kb-slotnote{margin-bottom:32px}
.kb-copies{display:flex;flex-wrap:wrap;gap:40px 32px;align-items:flex-end;margin-left:var(--i1)}
.kb-copy{display:flex;flex-direction:column;gap:6px;max-width:100%;min-width:0}
.kb-ground{display:flex;align-items:center;justify-content:center;padding:28px 32px;margin-bottom:8px}
.kb-ground svg,.kb-ground .logo-slot{display:block;max-width:100%}
[data-theme="dark"] .kb-ground:not(.is-hair){box-shadow:inset 0 0 0 1px var(--kb-rule)}
.kb-copy__c{font-family:var(--body);font-size:15px;line-height:1.4}
.kb-copy__c b{font-weight:600}
.kb-copy__no{color:var(--kb-quiet);margin-right:4px}
.kb-copy__w{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--kb-soft);max-width:34ch}
.kb-copy .kb-dls{margin-top:4px}
.kb-clear{display:inline-block;max-width:100%;background:var(--kb-fix-ground);color:var(--kb-fix-ink);box-shadow:inset 0 0 0 1.5px var(--kb-fix-quiet)}
.kb-clear__z{outline:1px dashed var(--kb-action);outline-offset:-1px}
.kb-clear__l{width:360px;max-width:100%;box-shadow:0 0 0 1px var(--kb-fix-hair)}
.kb-clear__l svg,.kb-clear__l .logo-slot{display:block;width:100%;height:auto}
.kb-never{display:flex;flex-direction:column}
.kb-never li{display:grid;grid-template-columns:28px minmax(0,1fr);font-family:var(--body);font-size:16px;line-height:1.5;color:var(--kb-soft);padding:10px 0;border-top:1px solid var(--kb-hair)}
.kb-never li:first-child{border-top:0;padding-top:0}
.kb-never .kb-n{padding-top:2px}

/* 4 colour: the drawer. A card at 5 : 3 printed on the colour's stock, lifted out beside the drawer of its ten ramp steps */
.kb-crows{display:flex;flex-direction:column;gap:48px}
.kb-crow{display:grid;grid-template-columns:440px minmax(0,1fr);gap:0 28px;align-items:end}
.kb-crow--flat{display:flex;flex-wrap:wrap;gap:20px 28px;align-items:flex-end}
.kb-crow--flat .kb-card{width:400px}
.kb-flat{flex:1 1 220px;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--kb-soft);max-width:36ch;padding-bottom:4px}
.kb-card{position:relative;width:100%;max-width:100%;aspect-ratio:5/3;padding:16px 18px 34px;box-shadow:inset 0 0 0 1.5px var(--kb-rod);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);grid-template-rows:auto auto 1fr;gap:0 14px;align-content:start;overflow:hidden}
.kb-lift{transition:transform 500ms cubic-bezier(0.23,1,0.32,1)}
.kb-lift.is-set{transform:translateY(16px)}
.kb-card__no{display:flex;flex-direction:column;align-items:flex-start;font-size:12px;line-height:17px}
.kb-val{appearance:none;border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;overflow-wrap:anywhere}
.kb-cname{appearance:none;border:0;background:transparent;color:inherit;padding:0;cursor:pointer;font-family:var(--display);font-weight:400;font-size:40px;line-height:1;text-align:left;padding-bottom:.1em}
@media (hover:hover){.kb-val:hover,.kb-cname:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}}
.kb-card button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.kb-card__s{font-family:var(--body);font-size:13px;line-height:1.4;margin-top:2px}
.kb-card__n{grid-column:1/-1;font-family:var(--body);font-size:14px;line-height:1.4;margin-top:12px;max-width:46ch}
.kb-card__t{grid-column:1/-1;font-family:var(--body);font-size:12px;line-height:1.4;margin-top:8px}
.kb-card .kb-hole{position:absolute;left:50%;bottom:9px;transform:translateX(-50%)}
.kb-drawer{padding:4px 12px 10px;border:1.5px solid var(--kb-rod);border-top:0;min-width:0}
.kb-edges{display:flex;flex-direction:column;gap:2px}
.kb-edge{height:22px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;box-shadow:inset 0 1px 0 var(--kb-rod)}
.kb-sn{display:block;min-width:36px;padding:0 5px;background:var(--kb-fix-face);color:var(--kb-fix-ink);box-shadow:inset 0 0 0 1px var(--kb-fix-quiet);font-size:12px;line-height:16px;text-align:center}
.kb-sn--w{min-width:0}
.kb-edge.is-base{height:30px;margin:2px -20px 2px -12px;padding:0 12px 0 20px;box-shadow:inset 0 0 0 1.5px var(--kb-rod)}
.kb-edge.is-base .kb-sn{font-weight:600}
.kb-sub--pairs .kb-body{margin-bottom:28px}
.kb-pdrawer{padding:0 12px 14px;border:1.5px solid var(--kb-rod);border-top:0;margin-left:var(--i1)}
.kb-pcs{display:flex;flex-direction:column}
.kb-pc{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px 28px;align-items:center;padding:16px 20px;box-shadow:inset 1px 0 0 var(--kb-rod),inset -1px 0 0 var(--kb-rod),inset 0 1px 0 var(--kb-rod)}
.kb-pl{display:flex;flex-direction:column;gap:2px}
.kb-ratio{font-family:var(--display);font-weight:400;font-size:32px;line-height:1.05;white-space:nowrap;padding-bottom:.06em}
.kb-pu{font-family:var(--body);font-size:13px;line-height:1.4}
.kb-run{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 20px;min-width:0}
.kb-ws{display:flex;flex-direction:column;align-items:flex-start}
.kb-w{display:block;font-family:var(--body);font-weight:500;line-height:1.1;white-space:nowrap;padding-bottom:.06em}
.kb-w--d{font-family:var(--display);font-weight:400}
.kb-ws i{font-style:normal;font-size:12px;line-height:16px;margin-top:2px}
.kb-ws--min i{font-weight:600;text-decoration:underline;text-underline-offset:3px}
.kb-roles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 32px;margin-left:var(--i2)}
.kb-role{appearance:none;width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:48px;padding:6px 0;border:0;border-top:1px solid var(--kb-hair);background:transparent;color:var(--kb-ink);font:400 14px/1.2 var(--body);text-align:left;cursor:pointer}
.kb-role__sw{display:block;width:36px;height:24px;box-shadow:inset 0 0 0 1px var(--kb-rod)}
.kb-role__h{font-size:12px;color:var(--kb-quiet)}
@media (hover:hover){.kb-role:hover .kb-role__n{text-decoration:underline}}

/* 5 typography: the faces as specimens, the scale as an entry at its indentions */
.kb-face{margin-top:24px}
.kb-face+.kb-face{margin-top:96px;padding-top:32px;border-top:1.5px solid var(--kb-rod)}
.kb-face__n{font-family:var(--body);font-weight:400;font-size:min(144px,calc((100cqw - 8px)/(var(--n,6)*.52)));line-height:1.04;padding-bottom:.1em;white-space:nowrap}
.kb-face--d .kb-face__n{font-family:var(--display)}
.kb-sec--typography{container-type:inline-size}
.kb-face .kb-subn{margin-top:8px}
.kb-face__b .kb-sub{margin-top:48px}
.kb-tfall,.kb-weights,.kb-chars,.kb-scale,.kb-tester,.kb-space,.kb-shape{margin-left:var(--i1)}
.kb-tfall li,.kb-weights li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:0 16px;align-items:baseline;padding:10px 0;border-top:1px solid var(--kb-hair);font-family:var(--body)}
.kb-tfall li:first-child,.kb-weights li:first-child{border-top:0;padding-top:0}
.kb-tfall.kb-d li{font-family:var(--display)}
.kb-tfall p{font-size:min(var(--s),10vw);line-height:1.1;padding-bottom:.08em;overflow-wrap:anywhere}
.kb-weights p{font-size:min(56px,11vw);line-height:1.1;padding-bottom:.08em}
.kb-chars{font-family:var(--body)}
.kb-chars.kb-d{font-family:var(--display)}
.kb-chars ul{display:flex;flex-wrap:wrap;gap:0 4px;margin-bottom:8px}
.kb-chars li{font-size:34px;line-height:1.3;min-width:.9em;text-align:center}
.kb-sub--scale .kb-subn{margin-bottom:32px}
.kb-scale{display:flex;flex-direction:column;gap:22px;padding:28px 0 28px;border-top:1.5px solid var(--kb-rod);border-bottom:1.5px solid var(--kb-rod)}
.kb-sc--i1{margin-left:var(--i1)}
.kb-sc--i2{margin-left:var(--i2)}
.kb-sc__s{font-size:min(var(--size),11vw);overflow-wrap:anywhere;padding-bottom:.1em;max-width:30em}
.kb-sc__logo{display:block}
.kb-sc__logo svg,.kb-sc__logo .logo-slot{display:block;max-width:100%;height:auto}
.kb-sc__k{font-size:12px;line-height:1.5;color:var(--kb-quiet);margin-top:4px;max-width:70ch}
.kb-sc__k b{font-weight:600;color:var(--kb-ink)}
.kb-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px;margin-bottom:20px}
.kb-field{display:flex;flex-direction:column;gap:8px}
.kb-field label{font-size:13px;font-weight:600}
.kb-field output{font-weight:400;color:var(--kb-soft);margin-left:8px}
.kb-field input[type=text]{height:48px;padding:0 12px;border:${bw}px solid var(--kb-rod);border-radius:0;background:var(--kb-face);color:var(--kb-ink);font:400 17px/1 var(--body)}
.kb-field input[type=text]:focus-visible{outline:2px solid var(--kb-focus);outline-offset:0}
.kb-field input[type=range]{height:44px;margin:0;accent-color:var(--kb-action);width:100%}
.kb-tester__d{font-family:var(--display);font-size:min(var(--tester-size,64px),12vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere;padding-bottom:.1em}
.kb-tester__b{font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),10vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere;margin-top:8px}
.kb-use{display:flex;flex-direction:column;gap:12px}
.kb-use__h{font-family:var(--display);font-size:44px;line-height:1.1;padding-bottom:.06em}
.kb-use__p{font-family:var(--body);font-size:17px;line-height:1.55;color:var(--kb-soft);max-width:52ch}
.kb-use__c{font-family:var(--body);font-size:12px;line-height:1.4;color:var(--kb-quiet)}
.kb-rules{display:flex;flex-direction:column;gap:18px}
.kb-rules li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px 4px}
.kb-rules .kb-n{grid-row:1/3;padding-top:2px}
.kb-do,.kb-dont{grid-column:2;font-family:var(--body);font-size:16px;line-height:1.5}
.kb-dont{color:var(--kb-soft)}
.kb-do b,.kb-dont b{font-weight:600;color:var(--kb-ink)}
.kb-rules--two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 48px;margin-left:var(--i1)}

/* 6 imagery: the direction as notes, then the shelf list: each row of shots stands on a shelf */
.kb-notes--two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 48px;margin:0 0 0 var(--i1);max-width:none}
.kb-shelf{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:40px 20px}
.kb-shot{grid-column:span 2;min-width:0;display:flex;flex-direction:column}
.kb-shot--0,.kb-shot--3{grid-column:span 4}
.kb-shot--4,.kb-shot--5{grid-column:span 3}
.kb-shot--3{order:4}.kb-shot--2{order:3}
.kb-shot__f{overflow:hidden;aspect-ratio:4/3;border-bottom:4px solid var(--kb-rod)}
.kb-shot--1 .kb-shot__f,.kb-shot--2 .kb-shot__f{aspect-ratio:auto;flex:1}
.kb-shot .photo-slot{height:100%}
.kb-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:13px;line-height:1.5;background:var(--kb-panel);color:var(--kb-quiet-panel)}
.kb-shot__c{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:0 4px;align-items:start;font-family:var(--body);font-size:14px;line-height:1.45;color:var(--kb-soft);margin-top:10px}
.kb-shot__c .kb-n{padding-top:1px}

/* 7 layout */
.kb-grid{display:grid;grid-template-columns:minmax(0,420px) minmax(0,260px);gap:48px;align-items:end;margin-left:var(--i1)}
.kb-page{position:relative;display:grid;background:var(--kb-face);box-shadow:inset 0 0 0 1.5px var(--kb-rod)}
.kb-page__g{display:grid}
.kb-page__g i{display:block;background:var(--kb-panel);box-shadow:inset 0 0 0 1px var(--kb-hair)}
.kb-page .kb-hole{position:absolute;left:50%;bottom:2.4%;transform:translateX(-50%)}
.kb-meas div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;border-top:1px solid var(--kb-hair)}
.kb-meas div:last-child{border-bottom:1px solid var(--kb-hair)}
.kb-meas dt{font-family:var(--body);font-size:16px;color:var(--kb-soft)}
.kb-meas dd{font-family:var(--display);font-size:32px;line-height:1;padding-bottom:.06em}
.kb-space li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:0 16px;align-items:center;padding:6px 0}
.kb-space i{display:block;height:10px;background:var(--kb-ink)}
.kb-shape{display:flex;gap:28px;flex-wrap:wrap;margin-bottom:20px}
.kb-shape div{display:flex;flex-direction:column;gap:8px}
.kb-shape i{display:block;width:120px;height:72px;border:1.5px solid var(--kb-rod);background:var(--kb-face)}
.kb-two .kb-space,.kb-two .kb-shape{margin-left:0}

/* 8 applications: objects at size, the spec under each */
.kb-fig{min-width:0;display:flex;flex-direction:column;gap:14px}
.kb-fig--cards,.kb-fig--posts{margin:0 0 64px var(--i1)}
.kb-spec{display:flex;flex-direction:column;font-size:13px;line-height:1.5;color:var(--kb-quiet)}
.kb-spec b{font-weight:600;color:var(--kb-ink)}
.kb-bcs{display:flex;gap:28px;flex-wrap:wrap}
.kb-bc{position:relative;width:400px;max-width:100%;aspect-ratio:90/55;overflow:hidden;flex:none}
.kb-bc--front{background:${rev.ground};color:${rev.name}}
.kb-bc--back{background:var(--kb-fix-face);color:var(--kb-fix-ink);box-shadow:inset 0 0 0 1.5px var(--kb-fix-quiet)}
.kb-bc__logo{position:absolute;left:30px;top:42%;transform:translateY(-50%)}
.kb-bc__line{position:absolute;left:30px;bottom:24px;font-family:var(--body);font-size:13px}
.kb-bc__mark{position:absolute;left:30px;top:24px}
.kb-bc__who{position:absolute;left:96px;top:24px;font-family:var(--body)}
.kb-bc__who .nm{font-family:var(--display);font-size:24px;line-height:1.1}
.kb-bc__who .rl{font-size:13px;color:var(--kb-fix-soft);margin-top:2px}
.kb-bc__who .ct{font-size:13px;line-height:1.5;margin-top:10px}
.kb-bc .kb-hole{position:absolute;left:50%;bottom:10px;transform:translateX(-50%)}
.kb-bc--back{--kb-hole:var(--kb-fix-ground);--kb-rod:var(--kb-fix-quiet)}
.kb-posts{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end}
.kb-post{position:relative;overflow:hidden;max-width:100%;flex:none;padding:22px}
.kb-post p{position:relative;font-family:var(--display);font-size:30px;line-height:1.04}
.kb-post--sq{width:280px;aspect-ratio:1}.kb-post--pt{width:224px;aspect-ratio:4/5}.kb-post--st{width:158px;aspect-ratio:9/16;padding:16px}
.kb-post--pt p{font-size:26px}.kb-post--st p{font-size:24px}
[data-theme="dark"] .kb-post--st{box-shadow:inset 0 0 0 1px var(--kb-rule)}
.kb-post__lg{position:absolute;left:22px;bottom:22px}
.kb-post--st .kb-post__lg{left:16px;bottom:16px}
.kb-objs{display:grid;grid-template-columns:minmax(0,300px) minmax(0,390px) minmax(0,1fr);gap:40px;align-items:start;margin-left:var(--i1)}
.kb-poster{position:relative;width:100%;padding:28px;background:var(--kb-fix-ground);color:var(--kb-fix-ink);border-top:4px solid ${rev.ground};box-shadow:inset 0 0 0 1.5px var(--kb-fix-quiet)}
.kb-poster p{font-family:var(--display);font-size:40px;line-height:1.04}
.kb-poster__lg{position:absolute;left:28px;bottom:28px}
.kb-email{width:100%;max-width:440px;padding:24px;background:var(--kb-fix-face);color:var(--kb-fix-ink);box-shadow:inset 0 0 0 1.5px var(--kb-fix-quiet);font-family:var(--body)}
.kb-email__n{font-size:17px;font-weight:600}
.kb-email__r{font-size:15px;color:var(--kb-fix-soft)}
.kb-email__c{font-size:15px;line-height:1.5;margin-top:12px}
.kb-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--kb-fix-hair)}
.kb-device{width:100%;border:${bw}px solid var(--kb-ink)}
.kb-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.kb-scr__top{display:flex;justify-content:space-between;align-items:center}
.kb-scr__time{font-size:14px;font-weight:600}
.kb-scr__eta{margin:0;font-size:32px;line-height:1.05}
.kb-scr__note{margin:0;font-size:14px;color:var(--text-soft)}

/* 9 downloads: the cabinet. Each folder a drawer front with its label holder and pull; its files pulled out beneath it */
.kb-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;margin:0 0 40px var(--i1);padding:20px 0;border-top:1px solid var(--kb-hair);border-bottom:1px solid var(--kb-hair)}
.kb-zip__n{font-size:15px;margin-bottom:4px}
.kb-cab{display:flex;flex-direction:column;gap:8px;padding:8px 8px 0;border:1.5px solid var(--kb-rod)}
.kb-plinth{display:block;height:14px;margin:0 -8px;border-top:1.5px solid var(--kb-rod)}
.kb-drw{border:1.5px solid var(--kb-rod)}
.kb-drw__f{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 12px 8px}
.kb-holder{display:inline-flex;align-items:center;gap:10px;min-height:40px;padding:0 10px;border:1.5px solid var(--kb-rod);background:var(--kb-ground);max-width:100%}
.kb-screw{display:block;width:6px;height:6px;border-radius:50%;border:1.5px solid var(--kb-rod);flex:none}
.kb-label{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;padding:4px 14px;background:var(--kb-face);font-family:var(--display);font-weight:400;font-size:28px;line-height:1.15;color:var(--kb-ink)}
.kb-label b{font-family:var(--body);font-weight:600;font-size:17px}
.kb-range{font-family:var(--body);font-size:14px;color:var(--kb-quiet)}
.kb-pull{display:block}
.kb-drw__in{padding:4px 28px 20px;border-top:1px solid var(--kb-hair)}
.kb-files li{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:4px 24px;align-items:center;min-height:48px;padding:6px 0;border-bottom:1px solid var(--kb-hair)}
.kb-files li:last-child{border-bottom:0}
.kb-file__n{font-size:14px;overflow-wrap:anywhere}
.kb-file--logo .kb-file__n{font-family:var(--body);font-weight:600;font-size:16px}
.kb-file__c{font-size:13px;color:var(--kb-quiet)}
.kb-file--logo{grid-template-columns:minmax(0,1fr) 150px auto}
.kb-get{display:inline-flex;align-items:center;min-height:36px;font-weight:600;font-size:13px;text-decoration:underline;text-decoration-color:var(--kb-rod)}
@media (hover:hover){.kb-get:hover{text-decoration-color:currentColor}}
.kb-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:4px}
.kb-icons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 28px;margin:8px 0 4px}
.kb-icon{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:0 12px;align-items:center;min-height:44px;padding:6px 0;border-bottom:1px solid var(--kb-hair);font-size:14px;text-decoration:none;color:var(--kb-ink)}
@media (hover:hover){.kb-icon:hover .kb-icon__n{text-decoration:underline}}

/* narrow: the cabinet folds into a top bar and a Sections menu; each sheet is one card wide */
@media (max-width:840px){
.bk{display:block;--i1:20px;--i2:20px}
.bk .bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;gap:10px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1.5px solid var(--kb-rod)}
.bk .bk-brand{flex:1;width:auto}.bk .bk-brand svg{width:108px}
.bk .bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:76px;padding:0 14px;border:1.5px solid var(--kb-rod);background:transparent;color:var(--kb-ink);font:600 13px/1 var(--chrome);cursor:pointer}
.bk .bk-menu[aria-expanded="true"]{background:var(--kb-ink);color:var(--kb-ground)}
.bk .bk-mode button{height:44px;padding:0 10px;min-width:48px}
.bk .bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:12px 16px 16px;background:var(--kb-ground);border-bottom:1.5px solid var(--kb-rod);max-height:calc(100vh - 60px);overflow:auto}
.bk .bk-top[data-open="true"] .bk-nav{display:block}
.bk .bk-nav a{min-height:44px;align-items:center;width:100%;font-size:16px}
.bk .bk-nav li:has(a[aria-current]){transform:none}
.kb-sec{padding:28px 20px 24px;scroll-margin-top:64px}
.kb-sec>*{max-width:none}
.kb-hd{margin-bottom:40px}
.kb-guide{padding-left:calc(var(--cut,0) * (100% - 210px));margin-bottom:24px}
.kb-tab{min-width:0;height:56px;padding:0 18px 4px;font-size:34px;border-radius:10px 10px 0 0}
.kb-lead{font-size:19px;margin-bottom:48px}
.kb-sub{margin-top:56px}
.kb-subh{font-size:30px}
.kb-ft{margin-top:64px}
.bk .bk-foot{padding:24px 20px;flex-direction:column}
.kb-two,.kb-two--logo{grid-template-columns:minmax(0,1fr);margin-left:0}
.kb-sec--overview{padding-top:32px}
.kb-main{grid-template-columns:minmax(0,1fr)}
.kb-callno{flex-direction:row;gap:16px;padding:0 0 12px}
.kb-mainh{font-size:56px;line-height:1.04}
.kb-coll{margin-left:0}
.kb-notes{margin:32px 0 0 var(--i1)}
.kb-note--lead{font-size:19px}
.kb-traces{margin-top:64px}
.kb-traces .kb-subh{margin-left:0}
.kb-bigtrace{font-size:48px;margin-left:0}
.kb-means{grid-template-columns:minmax(0,1fr);margin-left:0}
.kb-wt{grid-template-columns:28px minmax(0,1fr)}
.kb-wt__w{font-size:28px}
.kb-wt--first .kb-wt__w{font-size:44px}
.kb-wt__b{margin-left:0}
.kb-prin{grid-template-columns:minmax(0,1fr);gap:28px}
.kb-pr__e{font-size:24px}
.kb-bps{grid-template-columns:minmax(0,1fr);gap:32px}
.kb-btn{min-height:44px}
.kb-btn--primary{width:100%}
.kb-lmain{grid-template-columns:minmax(0,1fr)}
.kb-lmain__t .kb-dls{margin-left:var(--i1)}
.kb-wfall,.kb-stop{grid-column:1}
.kb-wfall{padding:4px 16px 12px}
.kb-wfall li{grid-template-columns:52px minmax(0,1fr)}
.kb-copies{flex-direction:column;align-items:stretch;gap:32px}
.kb-ground{padding:24px 16px}
.kb-dl{min-height:44px}
.kb-crow{grid-template-columns:minmax(0,1fr);gap:0}
.kb-crow .kb-drawer{order:-1;border:1.5px solid var(--kb-rod);border-bottom:0;padding:10px 12px 4px}
.kb-crow--flat{flex-direction:column;align-items:stretch}
.kb-crow--flat .kb-card{width:100%}
.kb-card{padding:12px 14px 28px;gap:0 10px}
.kb-card__no{font-size:12px;line-height:15px}
.kb-cname{font-size:28px}
.kb-card__s{font-size:12px}
.kb-card__n{font-size:12px;margin-top:6px}
.kb-card__t{margin-top:4px}
.kb-card .kb-hole{bottom:6px}
.kb-edge.is-base{margin:2px -12px;padding:0 12px}
.kb-lift.is-set{transform:none}
.kb-pdrawer{padding:0 8px 10px}
.kb-pc{grid-template-columns:minmax(0,1fr);padding:14px 14px}
.kb-roles{grid-template-columns:minmax(0,1fr)}
.kb-face__n{font-size:min(96px,calc((100cqw - 8px)/(var(--n,6)*.52)))}
.kb-chars li{font-size:30px}
.kb-tester__c{grid-template-columns:minmax(0,1fr)}
.kb-use__h{font-size:36px}
.kb-rules--two{grid-template-columns:minmax(0,1fr)}
.kb-notes--two{grid-template-columns:minmax(0,1fr)}
.kb-shelf{grid-template-columns:minmax(0,1fr);gap:32px}
.kb-shot,.kb-shot--0,.kb-shot--3,.kb-shot--4,.kb-shot--5{grid-column:auto;order:0}
.kb-shot--1 .kb-shot__f,.kb-shot--2 .kb-shot__f{aspect-ratio:4/3;flex:none}
.kb-grid{grid-template-columns:minmax(0,1fr);gap:24px}
.kb-page{max-width:280px}
.kb-space li{grid-template-columns:52px minmax(0,1fr)}
.kb-space i{max-width:100%}
.kb-fig--cards,.kb-fig--posts{margin-bottom:48px}
.kb-bc__who{left:84px}
.kb-posts{gap:14px}
.kb-post--sq{width:100%}.kb-post--pt{width:calc(58% - 7px)}.kb-post--st{width:calc(42% - 7px)}
.kb-post--pt p{font-size:24px}
.kb-objs{grid-template-columns:minmax(0,1fr);gap:48px}
.kb-poster{max-width:300px}
.kb-zip{margin-left:0}
.kb-cab{padding:6px 6px 0;gap:6px}
.kb-plinth{margin:0 -6px}
.kb-drw__in{padding:4px 14px 14px}
.kb-label{font-size:24px;padding:4px 10px}
.kb-holder{padding:0 6px;gap:6px}
.kb-files li,.kb-file--logo{grid-template-columns:minmax(0,1fr) auto;gap:2px 16px;padding:10px 0}
.kb-files .kb-file__n{grid-column:1/-1}
.kb-file--logo .kb-dls{grid-column:1/-1}
.kb-icons{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.kb-btn:active{transform:none}.kb-lift.is-set{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html:has(.bk){scroll-behavior:smooth}}
@media print{
.bk,[data-theme="dark"] .bk{${vars(ctx, L)}}
.bk{display:block}
.bk .bk-top,.bk .bk-skip,.bk .bk-live,.bk .bk-menu,.bk .bk-mode,.kb-btn,.kb-dls,.kb-dl,.kb-tester,.kb-icons,.kb-zip,.kb-get{display:none!important}
.kb-sec{padding:0 0 24px;break-before:page}
.kb-sec--overview{break-before:auto}
.kb-sec>*{max-width:none}
.kb-crow,.kb-card,.kb-pc,.kb-bc,.kb-post,.kb-shot,.kb-wt{break-inside:avoid}
.kb-lift.is-set{transform:none}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// brand kit pages (read-me, sheets): their styles live in css-bookkit.js, every rule there scoped under .pg--k. Nothing else is
// added here, so no rule of the book can reach the guideline pages.
export function cssBook(ctx) {
  return cssBookKit(ctx);
}
