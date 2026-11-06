// Styles for theme 09's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages (cssBook, scoped under .pg: appended to css() in index.js; the kit styles come from css-bookkit.js).
// A drawing set on the web: each section is a framed sheet (outer rule, inner rule, title block at the foot), Plaster ground,
// White for the things drawn on it, Bluestone rules, Brick only for redlines, key tags and the one action.
// Everything reads colours from the brand's roles; no hex is written here. Edges, not shadows.
import { cssBookKit } from './css-bookkit.js';

// ground is Plaster (raised), cards and fields are White (surface), panels are the deeper plaster (sunken)
const vars = (r) => `--bk-ground:${r.raised};--bk-raised:${r.surface};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};--bk-red:${r.action};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, rcard = B.ui.radius.card, bw = B.ui.border;
  const rev = B.logo.colourways.reversed;
  const ramp = Array.from({ length: 10 }, (_, i) => `.bk-ramp__s i:nth-child(${i + 1}){height:${14 + i * 2}px}`).join('');
  return `:root,.bk--board{${vars(L)}--fix-white:${L.surface};--fix-plaster:${L.raised};--fix-red:${L.action};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};
--chrome:'Manrope',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.5;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* the index: the drawing list down the left, a ruled column with the sheet numbers in boxes */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:32px;padding:32px 24px;border-right:1px solid var(--bk-ink);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--display);font-weight:800;font-size:22px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto;border-top:1px solid var(--bk-ink)}
.bk-nav ol{display:flex;flex-direction:column}
.bk-nav a{display:flex;gap:12px;align-items:center;padding:8px 0 8px 0;border-bottom:1px solid var(--bk-hair);font-size:13px;font-weight:500;color:var(--bk-soft);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav .bk-n{display:inline-grid;place-items:center;width:24px;height:24px;flex:none;border:1px solid var(--bk-edge);color:var(--bk-quiet);font-variant-numeric:tabular-nums;font-weight:400;font-size:12px}
.bk-nav a[aria-current]{color:var(--bk-ink);font-weight:600}
.bk-nav a[aria-current] .bk-n{border-color:var(--bk-ink);background:var(--bk-ink);color:var(--bk-ground)}
@media (hover:hover){.bk-nav a:hover{color:var(--bk-ink);background:var(--bk-panel)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;overflow:hidden}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: every section is a sheet. An outer rule, an inner rule 6 px in, and the title block closing it. */
.bk main{min-width:0;padding:20px}
.bk main:focus{outline:none}
.bk-sec{position:relative;margin:0 0 20px;padding:56px 56px 6px;border:1px solid var(--bk-ink);box-shadow:inset 0 0 0 5px var(--bk-ground),inset 0 0 0 6px var(--bk-ink);scroll-margin-top:20px}
.bk-sec>*{max-width:1040px}
.bk-sec>.bk-tbk{max-width:none}
.bk-lead{font-family:var(--body);font-size:18px;line-height:1.6;color:var(--bk-soft);max-width:60ch}
.bk-body{font-family:var(--body);font-size:16px;line-height:1.65;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-h3{font-size:12px;font-weight:600;line-height:1.4;color:var(--bk-ink);margin-bottom:12px}
.bk-block{margin-top:72px}
.bk-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:start}
.bk-two--even{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-stack{display:flex;flex-direction:column;gap:24px}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:8px 8px 24px;font-size:12px;color:var(--bk-quiet)}
.bk-k{display:block;font:400 11px/14px var(--chrome);color:var(--bk-quiet);margin-bottom:2px}

/* the title block at the foot of a sheet: ruled cells, key above value */
.bk-tbk{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,.6fr) minmax(0,.5fr) minmax(0,1.3fr);margin:72px -50px 0;border-top:1px solid var(--bk-ink)}
.bk-tbk>div{padding:10px 20px;font-size:13px;line-height:18px;font-weight:500}
.bk-tbk>div+div{border-left:1px solid var(--bk-hair)}
.bk-tbk>div:first-child{padding-left:50px}

/* key bubbles: a Brick ring around a tag, as on a drawing */
.bk-bub{display:inline-grid;place-items:center;flex:none;min-width:28px;height:28px;padding:0 6px;border:1px solid var(--bk-red);border-radius:14px;background:var(--bk-ground);color:var(--bk-red);font:600 12px/1 var(--chrome);font-variant-numeric:tabular-nums}
.bk-bub--abs{position:absolute;transform:translate(-50%,-50%);--bk-red:var(--fix-red);background:var(--fix-plaster)}

/* redlines: Brick lines with end ticks. The printed number is the drawn length: the heading's font size, set in the --sz and --lbl pair. */
.bk-rl{position:absolute;left:32px;top:0;height:var(--sz);width:0;border-left:1px solid var(--bk-red);display:block}
.bk-rl::before,.bk-rl::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--bk-red)}
.bk-rl::before{top:0}.bk-rl::after{bottom:-1px}
.bk-rl b{position:absolute;right:9px;top:50%;transform:translateY(-50%);font:600 12px/12px var(--chrome);color:var(--bk-red);font-variant-numeric:tabular-nums}
.bk-rl b::before{content:var(--lbl)}
.bk-ht,.bk-hero{--sz:56px;--lbl:"56"}
.bk-hero{--sz:88px;--lbl:"88"}
.bk-head{margin-bottom:56px}
.bk-ht{position:relative;padding-left:48px}
.bk-ht h2{font-size:var(--sz);line-height:1;white-space:nowrap}
.bk-head .bk-lead{margin:24px 0 0 48px}

/* dimension lines in flow: Brick, end ticks, the label sits beside the line, never on it */
.bk-dim{position:relative;color:var(--bk-red);font:600 12px/16px var(--chrome);font-variant-numeric:tabular-nums;white-space:nowrap}
.bk-dim--h{display:flex;justify-content:center;align-items:flex-end;height:22px;margin-bottom:8px;border-bottom:1px solid var(--bk-red)}
.bk-dim--h::before,.bk-dim--h::after{content:'';position:absolute;bottom:-4px;height:7px;border-left:1px solid var(--bk-red)}
.bk-dim--h::before{left:0}.bk-dim--h::after{right:-1px}
.bk-dim--h span{padding-bottom:5px}
.bk-dim--v{display:flex;align-items:center;align-self:stretch;border-left:1px solid var(--bk-red);padding-left:10px;margin-left:12px}
.bk-dim--v::before,.bk-dim--v::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--bk-red)}
.bk-dim--v::before{top:0}.bk-dim--v::after{bottom:-1px}

/* a framed detail: the drawing, then a ruled strip with its bubble, title and note */
.bk-fig{display:flex;flex-direction:column;border:1px solid var(--bk-ink);background:var(--bk-raised);min-width:0}
.bk-fig__d{flex:1;padding:24px;min-width:0}
.bk-fig__tb{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:10px 16px;border-top:1px solid var(--bk-ink)}
.bk-fig__tb .bk-h3{margin:0}
.bk-fig__tb .bk-cap{flex:1 1 200px;text-align:right}
@media (max-width:840px){.bk-fig__tb .bk-cap{text-align:left}}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 14px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:48px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:15px;font-weight:600}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);border-radius:${rc}px;font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* photos and slots */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel)}
.bk-capt{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt>span:not(.bk-bub):not(.bk-dls){flex:1 1 120px;min-width:0}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}

/* overview: the cover sheet */
.bk-sec--overview{padding-top:72px;padding-bottom:72px}
.bk-hero h1{display:flex;flex-direction:column}
.bk-hl{position:relative;display:block;padding-left:48px;font-size:var(--sz);line-height:1;white-space:nowrap;text-wrap:nowrap}
.bk-hero__lead{margin:28px 0 0 48px;font:500 24px/32px var(--body);color:var(--bk-ink)}
.bk-tb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);margin-top:72px;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink)}
.bk-tb__l{padding-right:24px}
.bk-tb__r{border-left:1px solid var(--bk-hair);padding:10px 0 10px 24px}
.bk-cell{padding:10px 0;border-top:1px solid var(--bk-hair);font-family:var(--body);font-size:14px;line-height:20px}
.bk-cell:first-child{border-top:0}
.bk-big{display:block;font:600 22px/28px var(--chrome)}
.bk-sheets{font-size:13px;line-height:24px}
.bk-sheets a{display:block;text-decoration:none}
.bk-sheets span{display:inline-block;width:32px;color:var(--bk-quiet)}
@media (hover:hover){.bk-sheets a:hover{text-decoration:underline;text-underline-offset:3px}}
.bk-sec--overview .bk-two{margin-top:72px}
.bk-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;margin-top:72px;padding-top:24px;border-top:1px solid var(--bk-ink)}
.bk-traits li{display:flex;gap:12px;align-items:flex-start}
.bk-trait{font-family:var(--body);font-size:20px;font-weight:600;line-height:1.2;margin-bottom:8px}

/* voice: general notes, title strips, a revision table */
.bk-principles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;border-top:1px solid var(--bk-ink)}
.bk-principles li{display:flex;gap:16px;align-items:flex-start;padding:24px 0;border-bottom:1px solid var(--bk-hair)}
.bk-pt{font-family:var(--body);font-size:15px;font-weight:600;line-height:1.4;margin-bottom:8px}
.bk-pe{font-family:var(--body);font-size:24px;font-weight:500;line-height:1.25;color:var(--bk-ink);text-wrap:balance}
.bk-lines{border-top:1px solid var(--bk-ink)}
.bk-lines li{position:relative;padding:14px 0 14px 20px;border-bottom:1px solid var(--bk-hair);font-family:var(--body);font-size:22px;font-weight:500;line-height:1.3}
.bk-lines li::before{content:'';position:absolute;left:0;top:14px;bottom:14px;border-left:2px solid var(--bk-red)}
.bk-wtn{border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink)}
.bk-wtn__h,.bk-wtn__r{display:grid;grid-template-columns:44px minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,1fr);gap:0 24px;padding:16px 0;border-top:1px solid var(--bk-hair);align-items:baseline}
.bk-wtn__h{font-size:12px;font-weight:600;padding:8px 0;border-top:0;border-bottom:1px solid var(--bk-ink)}
.bk-wtn__r p{font-family:var(--body);font-size:15px;line-height:1.5}
.bk-wtn__r .r{align-self:start}
.bk-wtn__r .w{font-weight:600;color:var(--bk-ink)}
.bk-wtn__r .n{color:var(--bk-red);text-decoration:line-through;text-decoration-thickness:1px}
.bk-wtn__r .b{color:var(--bk-soft)}
.bk-notes{align-items:stretch}
.bk-notes>div{padding:20px;border:1px solid var(--bk-ink);background:var(--bk-raised)}

/* logo: a sheet of lettered details in a ruled zone grid; clear space and smallest size are details H and J */
.bk-zone{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--bk-hair);border:1px solid var(--bk-ink)}
.bk-tile{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px;background:var(--bk-ground)}
.bk-ground{height:190px;display:flex;align-items:center;justify-content:center;padding:12px;border-radius:0;min-width:0}
.bk-ground--draw{background:var(--fix-plaster);--bk-red:var(--fix-red);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-ground--draw:empty{display:none}
.bk-tile--symbol .logo-slot,.bk-card__mark .logo-slot{writing-mode:vertical-rl;transform:rotate(180deg);width:32px!important}
.bk-slotnote{margin-top:40px}
.bk-cs{padding:28px 0 0 36px}
.bk-cs__box{position:relative;display:inline-block;max-width:100%}
.bk-cs__box .bk-dim{position:absolute;margin:0;padding:0;align-self:auto}
.bk-cs__box .bk-dim--h{left:0;top:-26px}
.bk-cs__box .bk-dim--v{left:-20px;top:0;width:0}
.bk-cs__box .bk-dim--v span{position:absolute;right:9px;top:50%;transform:translateY(-50%)}
.bk-clear{display:inline-block;max-width:100%;background:var(--fix-plaster);color:var(--fix-ink);border:1.5px dashed var(--fix-quiet)}
.bk-clear svg,.bk-clear .logo-slot{display:block;max-width:100%}
.bk-min__box{display:inline-block;color:var(--fix-ink)}
.bk-min__logo{display:block;margin-bottom:12px}
.bk-min__logo svg{display:block}
.bk-min__d{margin-bottom:0}
.bk-never{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;border-top:1px solid var(--bk-ink)}
.bk-never li{display:flex;gap:12px;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-soft);padding:12px 0;border-bottom:1px solid var(--bk-hair)}
.bk-never li::before{content:'\\00d7' / '';flex:none;width:16px;color:var(--bk-red);font:600 18px/1.2 var(--chrome)}

/* colour: a drawn elevation, then a ruled finishes schedule keyed to it */
.bk-fig--elev .bk-fig__d{padding:0;background:var(--fix-plaster)}
.bk-elev{position:relative;background:var(--fix-plaster);--bk-red:var(--fix-red)}
.bk-elev svg{display:block;width:100%;height:auto}
.bk-el{stroke:var(--fix-ink);stroke-width:1.5;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.bk-el-m{fill:none;stroke:var(--fix-ink);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-el-hair{fill:none;stroke:var(--fix-hair);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-el-d{fill:var(--fix-ink)}
.bk-lead-l{fill:none;stroke:var(--fix-red);stroke-width:1;vector-effect:non-scaling-stroke}
.bk-lead-d{fill:var(--fix-red)}
.bk-sched__h,.bk-crow{display:grid;grid-template-columns:44px 64px minmax(0,1fr) minmax(0,1.25fr) 72px;gap:0 16px;align-items:start}
.bk-sched__h{padding:0 0 8px;font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-sched__h span:last-child{grid-column:4/-1}
.bk-clist{border-top:1px solid var(--bk-ink)}
.bk-crow{padding:16px 0;border-bottom:1px solid var(--bk-hair)}
.bk-key{display:flex;align-items:center;height:64px}
.bk-sw{appearance:none;border:0;border-radius:0;width:64px;height:64px;padding:6px 8px;display:grid;align-items:end;justify-items:start;font:500 12px/1 var(--chrome);font-variant-numeric:tabular-nums;cursor:pointer}
.bk-sw:focus-visible{outline-offset:2px}
.bk-chip{display:block;width:64px;height:64px}
.bk-cinfo{min-height:64px}
.bk-cname{font-size:15px;font-weight:600;line-height:1.3}
.bk-clands{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--bk-soft);margin-top:2px}
.bk-vals{display:grid;grid-auto-rows:32px}
.bk-vals div{display:flex;gap:12px;align-items:center}
.bk-vals dt{width:48px;flex:none;font-size:12px;color:var(--bk-quiet)}
.bk-vals dd{font-family:var(--mono);font-size:12px;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-copies{display:grid;grid-auto-rows:32px;align-items:center}
.bk-copies .bk-btn{margin:0;min-width:0;width:72px;height:28px}
.bk-ramp{grid-column:2/-1;display:flex;align-items:flex-end;gap:16px;margin-top:16px}
.bk-ramp__s{display:flex;align-items:flex-end;flex:1;max-width:420px}
.bk-ramp__s i{display:block;flex:1 1 0;min-width:0}
${ramp}
.bk-ramp__s i.is-base{position:relative;outline:2px solid var(--bk-red);outline-offset:1px}
.bk-pairs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px;margin-top:24px}
.bk-pairc .bk-dim{margin-bottom:6px}
.bk-pair{display:flex;flex-direction:column;justify-content:flex-end;gap:2px;min-height:96px;padding:12px 14px;font-family:var(--body)}
.bk-pair__u{font-size:14px;font-weight:500;line-height:1.3}
.bk-pair__n{font-family:var(--chrome);font-size:12px}
.bk-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin-top:24px;background:var(--bk-hair);border:1px solid var(--bk-ink)}
.bk-role{appearance:none;width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:0;border-radius:0;background:var(--bk-ground);color:var(--bk-ink);font:500 13px/1.2 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{width:28px;height:28px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__h{font-family:var(--mono);font-weight:400;font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.bk-role:hover{background:var(--bk-panel)}}

/* typography: the lettering sheet. Guides and dimensions are in em so they scale with the type; labels print px at 1x. */
.bk-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px}
.bk-face__fr{margin-bottom:16px;padding:24px 24px 24px 0;border:1px solid var(--bk-ink);background:var(--bk-raised)}
.bk-face__n{font-size:15px;font-weight:600;margin-bottom:4px}
.bk-face__al{font-size:20px;line-height:1.45;margin-top:20px;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-faces+.bk-cap{margin-top:32px}
.bk-lf{position:relative;font-size:var(--fs)}
.bk-g{position:absolute;left:0;right:0;height:0;border-top:1px dashed var(--bk-edge)}
.bk-g--b{border-top:1px solid var(--bk-ink)}
.bk-vd{position:absolute;display:block;width:0;border-left:1px solid var(--bk-red)}
.bk-vd::before,.bk-vd::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--bk-red)}
.bk-vd::before{top:0}.bk-vd::after{bottom:-1px}
.bk-vd--c{left:10px}.bk-vd--x{left:24px}.bk-vd--l{left:auto;right:12px}
.bk-lf--big .bk-vd--c{left:56px}.bk-lf--big .bk-vd--x{left:104px}
.bk-vl{position:absolute;top:50%;transform:translateY(-50%);font:600 12px/12px var(--chrome);color:var(--bk-red);white-space:nowrap;font-variant-numeric:tabular-nums}
.bk-vl--l{right:calc(100% + 8px)}
.bk-lf__t{position:relative;isolation:isolate;margin:0 36px 0 44px;color:var(--bk-ink);overflow-wrap:anywhere}
/* guides repeat on every line of a wrapped sample: one tile per line of leading, cap and x lines dashed, baseline solid, under the type */
.bk-lf__t::before,.bk-lf__t::after{content:'';position:absolute;z-index:-1;top:0;bottom:0;left:-44px;right:-36px;background-repeat:repeat-y;background-size:100% calc(var(--lh)*1em);pointer-events:none}
.bk-lf__t::before{background-image:linear-gradient(to bottom,transparent 0 calc(var(--cy)*1em),var(--gc,var(--bk-edge)) 0 calc(var(--cy)*1em + 1px),transparent 0 calc(var(--xy)*1em),var(--gc,var(--bk-edge)) 0 calc(var(--xy)*1em + 1px),transparent 0);-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 5px,transparent 5px 8px);mask-image:repeating-linear-gradient(90deg,#000 0 5px,transparent 5px 8px)}
.bk-lf__t::after{background-image:linear-gradient(to bottom,transparent 0 calc(var(--by)*1em),var(--bk-ink) 0 calc(var(--by)*1em + 1px),transparent 0)}
.bk-lf--big .bk-lf__t::before,.bk-lf--big .bk-lf__t::after{display:none}
.bk-lf--big .bk-lf__t{margin:0 0 0 144px}
.bk-scales{border-top:1px solid var(--bk-ink)}
.bk-legend{margin-bottom:16px;max-width:62ch}
.bk-scale{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;padding:28px 0;border-bottom:1px solid var(--bk-hair);align-items:center}
.bk-scale__t{font-size:13px;font-weight:600}
.bk-scale__d{margin-top:8px}
.bk-rv{color:var(--bk-red);font-weight:600}
.bk-tester{padding:32px;background:var(--bk-raised);border:1px solid var(--bk-ink)}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:32px;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-use__h{font-size:34px;line-height:1.05;margin-bottom:16px}
.bk-use__p{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--bk-soft);margin-bottom:12px;max-width:52ch}
.bk-rules li{padding:16px 0;border-top:1px solid var(--bk-hair);display:grid;gap:6px}
.bk-rules li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-rules p{font-family:var(--body);font-size:15px;line-height:1.5;display:grid;grid-template-columns:48px minmax(0,1fr)}
.bk-rules b{font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--bk-ink);padding-top:2px}
.bk-inuse{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:48px;align-items:start}
.bk-inuse .bk-use__h{margin-bottom:0}
.bk-rules--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px;border-top:1px solid var(--bk-hair)}
.bk-rules--2 li{border-top:0;border-bottom:1px solid var(--bk-hair)}
.bk-dont{color:var(--bk-soft)}.bk-do{color:var(--bk-ink)}

/* imagery: notes in a ruled row, then the plates on the sheet */
.bk-dir{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:64px;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink)}
.bk-dir div{padding:16px 16px 16px 0}
.bk-dir div+div{padding-left:16px;border-left:1px solid var(--bk-hair)}
.bk-dir dt{font-size:12px;font-weight:600;margin-bottom:4px}
.bk-dir dd{font-family:var(--body);font-size:14px;line-height:1.55;color:var(--bk-soft)}
.bk-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px;align-items:end}
.bk-shot{min-width:0}
.bk-shot__f{overflow:hidden;border:1px solid var(--bk-ink)}
.bk-shot .bk-capt{margin-top:10px;align-items:center}
.bk-shot--0 .bk-shot__f,.bk-shot--3 .bk-shot__f{aspect-ratio:3/2}
.bk-shot--1 .bk-shot__f{aspect-ratio:3/4}
.bk-shot--2 .bk-shot__f{aspect-ratio:1}
.bk-shot--4 .bk-shot__f,.bk-shot--5 .bk-shot__f{aspect-ratio:4/3}
.bk-shot .photo-slot{height:100%;position:relative}
.bk-shot .photo-slot::before{content:'';position:absolute;inset:8px;border:1px dashed var(--bk-quiet-panel);border-radius:2px;opacity:.5;pointer-events:none}

/* layout: the page grid with three redlines at its own proportion, then two lettered details */
.bk-gridfig{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:48px;align-items:start}
.bk-gridfig__r{display:grid;gap:32px;min-width:0}
.bk-gdims{position:relative;margin-bottom:8px}
.bk-gd{position:absolute;height:22px}
.bk-gd .bk-dim{margin:0;width:100%}
.bk-page{display:grid;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-ink)}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel)}
.bk-meas{display:flex;flex-direction:column;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink)}
.bk-meas div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid var(--bk-hair);font-size:13px}
.bk-meas div:first-child{border-top:0}
.bk-meas dt{color:var(--bk-quiet)}.bk-meas dd{font-weight:600}
.bk-details{display:grid;gap:24px}
.bk-details>div{position:relative;padding:20px 20px 20px 60px;border:1px solid var(--bk-ink);background:var(--bk-raised)}
.bk-details .bk-bub{position:absolute;left:16px;top:16px}
.bk-space{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink)}
.bk-shape{display:flex;gap:32px;margin-bottom:16px;flex-wrap:wrap}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:96px;height:64px;border:${bw}px solid var(--bk-ink);background:var(--bk-raised)}

/* applications: each one a framed drawing with its own title strip */
.bk-drawings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.bk-fig--wide{grid-column:1/-1}
@media (min-width:1101px){
.bk-fig--c,.bk-fig--d{grid-column:1}
.bk-fig--e{grid-column:2;grid-row:3/span 2}
.bk-fig--e .bk-fig__d{display:flex;justify-content:center}
}
.bk-cards{display:flex;gap:48px;flex-wrap:wrap;align-items:flex-start}
.bk-cardfig{width:360px;max-width:100%;flex:none}
.bk-cardfig--v{display:flex;width:auto;max-width:100%;align-items:stretch}
.bk-cardfig--v>div:first-child{width:360px;max-width:100%}
.bk-cardfig--v .bk-dim--v{margin-top:30px}
.bk-card{position:relative;width:100%;aspect-ratio:90/55;border-radius:${rc}px;overflow:hidden}
.bk-card--front{background:${rev.ground};color:${rev.name}}
.bk-card--back{background:var(--fix-white);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-card__logo{position:absolute;left:28px;top:44%;transform:translateY(-50%)}
.bk-card__line{position:absolute;left:28px;bottom:22px;font:500 12px/1.3 var(--body)}
.bk-card__mark{position:absolute;right:24px;top:22px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-size:17px;font-weight:600;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.bk-post{position:relative;overflow:hidden;border-radius:${rc}px;max-width:100%;flex:none;padding:20px}
.bk-post--sq{width:280px;aspect-ratio:1}
.bk-post--pt{width:224px;aspect-ratio:4/5}
.bk-post--st{width:158px;aspect-ratio:9/16;padding:16px}
.bk-post .disp{position:relative;font-size:30px;line-height:0.98}
.bk-post--pt .disp{font-size:26px}
.bk-post__fig{font:800 22px/1.1 var(--display);letter-spacing:-0.01em}
.bk-post__lg{position:absolute;left:20px;bottom:20px}
.bk-sign{width:min(100%,960px)}
.bk-sign__row{display:flex;align-items:stretch}
.bk-sign__main{flex:1;min-width:0}
.bk-sign__v{margin-top:30px}
.bk-hoard{container-type:inline-size;position:relative;aspect-ratio:2/1;border-radius:${rc}px;overflow:hidden;padding:5cqw;display:flex;flex-direction:column;justify-content:space-between}
.bk-hoard .disp{font-size:7.2cqw;line-height:0.98;max-width:12ch}
.bk-hoard__logo svg,.bk-hoard__logo .logo-slot{display:block;max-width:100%}
.bk-hoard__logo{width:min(220px,28cqw)}
.bk-hoard__logo svg{width:100%;height:auto}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-white);color:var(--fix-ink);border-radius:${rcard}px;box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:600}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair)}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);border-radius:${rcard}px;overflow:hidden}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk-scr__time{font-size:13px;font-weight:600}
.bk-scr__eta{margin:0;font-size:28px;line-height:1.1}
.bk-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* downloads: the drawing register. Sheet, title, revision, format; a folder is a sheet, a file a line on it. */
.bk-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding:24px;border:1px solid var(--bk-ink);background:var(--bk-raised)}
.bk-zip__n{font-family:var(--mono);font-size:15px;margin-bottom:4px}
.bk-reg{margin-top:48px;border-top:1px solid var(--bk-ink)}
.bk-reg__h,.bk-fgroup__h,.bk-file{display:grid;grid-template-columns:72px minmax(0,1.7fr) minmax(0,1fr) minmax(0,.8fr) 104px;gap:0 16px;align-items:center;padding-left:8px;padding-right:8px}
.bk-reg__h{padding-top:8px;padding-bottom:8px;font-size:12px;font-weight:600;border-bottom:1px solid var(--bk-ink)}
.bk-fgroup{border-bottom:1px solid var(--bk-ink)}
.bk-fgroup__h{padding-top:14px;padding-bottom:14px;background:var(--bk-panel)}
.bk-fgroup__h .bk-h3{margin:0 0 2px}
.bk-fgroup__h .bk-cap,.bk-fgroup__h .bk-no{color:var(--bk-quiet-panel)}
.bk-no{font-size:12px;color:var(--bk-quiet)}
.bk-file{padding-top:10px;padding-bottom:10px;border-top:1px solid var(--bk-hair)}
.bk-file__n{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:13px;font-weight:500}
.bk-file--logo .bk-dls{grid-column:3/-1}
.bk-file .bk-btn--quiet{justify-self:end}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.bk-fgroup>div:not(.bk-fgroup__h)>.bk-icons{margin:16px 8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:0;border-top:1px solid var(--bk-hair);border-left:1px solid var(--bk-hair)}
.bk-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;box-shadow:inset -1px -1px 0 var(--bk-hair);font-size:12px;text-decoration:none;color:var(--bk-ink);transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-panel)}}

/* medium: the redlined lines step down, the printed numbers with them */
@media (min-width:841px) and (max-width:1100px){
.bk-hero{--sz:64px;--lbl:"64"}
.bk-ht{--sz:48px;--lbl:"48"}
.bk-sec{padding:48px 40px 6px}
.bk-sec--overview{padding-bottom:56px}
.bk-tbk{margin:56px -34px 0}
.bk-tbk>div:first-child{padding-left:34px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-inuse{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-rules--2{grid-template-columns:minmax(0,1fr)}
.bk-zone{grid-template-columns:repeat(2,minmax(0,1fr))}
/* the three posts share one row at every width here: the container sets each width and type size in the 280 : 224 : 158 proportion */
.bk-posts{container-type:inline-size;gap:16px;flex-wrap:nowrap}
.bk-post--sq{width:min(280px,calc((100cqw - 32px)*.423))}
.bk-post--pt{width:min(224px,calc((100cqw - 32px)*.338))}
.bk-post--st{width:min(158px,calc((100cqw - 32px)*.239));padding:12px}
.bk-post--sq .disp{font-size:min(30px,calc((100cqw - 32px)*.0453))}
.bk-post--pt .disp{font-size:min(26px,calc((100cqw - 32px)*.0393))}
.bk-post__fig{font-size:min(22px,calc((100cqw - 32px)*.0332))}
.bk-post--st .bk-post__lg{left:12px;right:12px;bottom:12px}
.bk-post__lg svg,.bk-post__lg .logo-slot{max-width:100%;height:auto}
.bk-gridfig{grid-template-columns:minmax(0,1fr)}
.bk-scale{grid-template-columns:minmax(0,1fr);gap:12px}
.bk-sched__h{display:none}
.bk-crow{grid-template-columns:44px 64px minmax(0,1fr) 72px}
.bk-cinfo{grid-column:3/-1}
.bk-vals{grid-column:2/4}
.bk-copies{grid-column:4}
.bk-ramp{margin-top:8px}
.bk-pairs{grid-template-columns:repeat(3,minmax(0,1fr))}
.bk-roles{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-drawings{grid-template-columns:minmax(0,1fr)}
.bk-principles{grid-template-columns:minmax(0,1fr)}
}

/* narrow: a top bar and a menu */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-ink)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:20px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-top:0;border-bottom:1px solid var(--bk-ink);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:10px 8px;min-height:44px;font-size:15px}
.bk .bk-nav a[aria-current]{background:var(--bk-panel)}
.bk main{padding:10px}
.bk-sec{padding:32px 20px 6px;margin-bottom:10px;scroll-margin-top:70px}
.bk-sec--overview{padding-bottom:40px}
.bk-sec>*{max-width:none}
.bk-head{margin-bottom:32px}
.bk-hero{--sz:48px;--lbl:"48"}
.bk-ht{--sz:40px;--lbl:"40"}
.bk-ht,.bk-hl{padding-left:44px}
.bk-rl{left:28px}
.bk-head .bk-lead,.bk-hero__lead{margin-left:0}
.bk-hero__lead{font-size:20px;line-height:28px}
.bk-lead{font-size:17px}
.bk-block{margin-top:48px}
.bk-tbk{grid-template-columns:repeat(2,minmax(0,1fr));margin:40px -14px 0}
.bk-tbk>div{padding:8px 14px;border-top:1px solid var(--bk-hair)}
.bk-tbk>div:nth-child(-n+2){border-top:0}
.bk-tbk>div:first-child{padding-left:14px}
.bk-tbk>div:nth-child(odd){border-left:0}
.bk-tbk>div:last-child{grid-column:1/-1}
.bk-tb{grid-template-columns:minmax(0,1fr);margin-top:48px}
.bk-tb__l{padding-right:0}
.bk-tb__r{border-left:0;border-top:1px solid var(--bk-hair);padding-left:0}
.bk-sec--overview .bk-two{margin-top:48px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-inuse{grid-template-columns:minmax(0,1fr);gap:20px}
.bk-rules--2{grid-template-columns:minmax(0,1fr)}
.bk-traits{grid-template-columns:minmax(0,1fr);gap:24px;margin-top:48px}
.bk-principles{grid-template-columns:minmax(0,1fr)}
.bk-pe{font-size:22px}
.bk-wtn__h{display:none}
.bk-wtn__r{grid-template-columns:44px minmax(0,1fr);gap:4px 12px;padding:16px 0}
.bk-wtn__r p{grid-column:2}
.bk-wtn__r .r{grid-row:1/5}
.bk-zone{grid-template-columns:minmax(0,1fr)}
.bk-never{grid-template-columns:minmax(0,1fr)}
.bk-sched__h{display:none}
.bk-crow{grid-template-columns:44px 64px minmax(0,1fr) 72px;gap:0 12px}
.bk-cinfo{grid-column:3/-1}
.bk-vals{grid-column:1/4}
.bk-copies{grid-column:4}
.bk-ramp{flex-wrap:wrap;gap:8px 12px;margin-top:8px}
.bk-ramp__s{flex:1 1 100%;order:3}
.bk-pairs{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}
.bk-roles{grid-template-columns:minmax(0,1fr)}
.bk-role{min-height:44px}
.bk-faces{grid-template-columns:minmax(0,1fr);gap:40px}
.bk-lf--big{font-size:min(var(--fs),30vw)}
.bk-lf--big .bk-vd--c{left:48px}.bk-lf--big .bk-vd--x{left:88px}
.bk-lf--big .bk-lf__t{margin-left:120px}
.bk-lf{font-size:min(var(--fs),11vw)}
.bk-lf--big{font-size:min(var(--fs),30vw)}
.bk-scale{grid-template-columns:minmax(0,1fr);gap:16px}
.bk-tester{padding:20px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-dir{grid-template-columns:minmax(0,1fr)}
.bk-dir div,.bk-dir div+div{padding:14px 0;border-left:0;border-top:1px solid var(--bk-hair)}
.bk-dir div:first-child{border-top:0}
.bk-shots{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-shot .bk-shot__f{aspect-ratio:4/3}
.bk-gridfig{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-details>div{padding:16px 16px 16px 56px}
.bk-drawings{grid-template-columns:minmax(0,1fr)}
.bk-fig__d{padding:16px}
.bk-cards{gap:40px}
.bk-sign__v{display:none}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-copies .bk-btn{min-height:28px}
.bk-reg__h{display:none}
.bk-fgroup__h,.bk-file{grid-template-columns:56px minmax(0,1fr);gap:4px 12px;align-items:start}
.bk-fgroup__h>*:not(.bk-no),.bk-file>*:not(.bk-no){grid-column:2}
.bk-fgroup__h>span:last-child:empty{display:none}
.bk-file .bk-btn--quiet{justify-self:start}
.bk-file--logo .bk-dls{grid-column:2}
.bk-pngs{margin-left:0}
.bk-icon{min-height:44px}
.bk-foot{padding:8px 8px 24px;flex-direction:column}
}
@media (max-width:560px){
.bk-hero{--sz:36px;--lbl:"36"}
.bk-ht{--sz:32px;--lbl:"32"}
.bk-hero__lead{font-size:18px;line-height:26px}
.bk-bub--abs{min-width:22px;height:22px;font-size:11px;padding:0 4px;border-radius:11px}
/* card front and back stay one width: the back's 55 mm line reads sideways in a 33 px column the front reserves too */
.bk-cardfig{width:100%;padding-right:33px}
.bk-cardfig--v{padding-right:0}
.bk-cardfig--v>div:first-child{flex:1 1 0;width:auto;min-width:0}
.bk-cardfig--v .bk-dim--v{flex:none;width:25px;margin-left:8px;padding-left:8px}
.bk-cardfig--v .bk-dim--v span{writing-mode:vertical-rl;transform:rotate(180deg)}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-copies,.bk-tester__c,.bk-icons,.bk-zip,.bk-reg,.bk-foot .bk-n{display:none!important}
.bk main{padding:0}
.bk-sec{margin:0;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-sec>*{max-width:none}
figure,li,.bk-tile,.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-hoard,.bk-shot,.bk-scale,.bk-fig{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
