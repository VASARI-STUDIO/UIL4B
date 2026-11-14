// Theme 26, Notebook, lane hk: the kit site's stylesheet. The desk is a cool grey, each page a sheet of dotted stock (dots on a 24 px unit,
// an SVG tile, never a gradient), sewn on the left with a dashed thread, and the brand's action colour is the tape. Dark is the black-stock
// notebook. The product is stuck in as pieces cut from its own surfaces (.hk-ui, light or dark), which carry their own tokens so they read
// the same under either notebook mode. Every class here starts hk-.
import { nb } from './helpers.js';
import { colourMap } from '../../engine/tokens.js';

const dotTile = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='1' fill='%23${hex.replace('#', '')}'/%3E%3C/svg%3E")`;
const stitch = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='19'%3E%3Crect x='0.75' y='0' width='1.5' height='11' fill='%23${hex.replace('#', '')}'/%3E%3C/svg%3E")`;

function paperDark(ctx) {
  const f = (l, c, h) => ctx.C.fromOklch(l, c, h), D = ctx.roles.dark;
  const o = { paper: f(0.215, 0.006, 245), dot: f(0.38, 0.008, 240), fold: f(0.32, 0.006, 240), graphite: f(0.74, 0.01, 245), graphiteInk: f(0.92, 0.006, 245), desk: f(0.15, 0.006, 245), tape: D.action, tapeLabel: D.actionLabel, thread: D.text, focus: D.focus };
  o.text = o.graphiteInk;
  return o;
}
function check(ctx, o, mode) {
  for (const [fg, bg, what] of [[o.graphite, o.paper, 'graphite on paper'], [o.text, o.paper, 'text on paper'], [o.graphiteInk, o.desk, 'ink on desk'], [o.tapeLabel, o.tape, 'tape label on tape']]) {
    if (ctx.ratio(fg, bg) < 4.5) throw new Error(`26 kit site, ${mode}: ${what} is ${ctx.ratio(fg, bg).toFixed(2)}:1`);
  }
}
const rgba = (hex, a) => `rgb(${[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)).join(' ')} / ${a})`;
const vars = (o) => `--hk-paper:${o.paper};--hk-dot:${o.dot};--hk-fold:${o.fold};--hk-gr:${o.graphite};--hk-ink:${o.text};--hk-ink2:${o.graphiteInk};--hk-desk:${o.desk};--hk-tape:${o.tape};--hk-tapea:${rgba(o.tape, 0.92)};--hk-tape-ink:${o.tapeLabel};--hk-thread:${o.thread};--hk-focus:${o.focus};--hk-dots:${dotTile(o.dot)};--hk-stitch:${stitch(o.thread)};`;
const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');

export function kitCss(ctx) {
  const B = ctx.brand, W = ctx.weights, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const L = { ...nb(ctx), desk: ctx.C.fromOklch(0.915, 0.006, 240), focus: ctx.roles.light.focus }, Dk = paperDark(ctx);
  check(ctx, L, 'light'); check(ctx, Dk, 'dark');
  const mono = `'${m ? m.family : 'Atkinson Hyperlegible Mono'}','Atkinson Hyperlegible Mono',monospace`;
  return `:root{${vars(L)}--hk-chrome:'Atkinson Hyperlegible Next',sans-serif;--hk-val:'Atkinson Hyperlegible Mono',monospace;--hk-display:'${d.family}',sans-serif;--hk-body:'${b.family}',sans-serif;--hk-mono:${mono};--hk-gut:24px}
[data-theme="dark"]{${vars(Dk)}}
.hk-lt{${decl(colourMap(ctx, 'light'))}}
html{background:var(--hk-desk)}
body{margin:0;background:var(--hk-desk);color:var(--hk-ink2)}
.sx{min-height:100vh;color:var(--hk-ink2);font:400 15px/24px var(--hk-body);-webkit-font-smoothing:antialiased}
.sx :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.sx :where(ul,ol){list-style:none}
.sx :focus-visible{outline:2px solid var(--hk-focus);outline-offset:2px}
.sx-live{position:fixed;left:50%;bottom:24px;z-index:40;transform:translateX(-50%);padding:0 24px;background:var(--hk-tape);color:var(--hk-tape-ink);font:600 13px/24px var(--hk-chrome);max-width:calc(100vw - 48px)}
.sx-live:empty{display:none}
.sx-switching *{transition:none!important}

/* the bar on the desk */
.hk-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0 24px;width:min(1152px,calc(100% - 2*var(--hk-gut)));margin:0 auto;padding:12px 0}
.hk-bar__name{font:600 15px/24px var(--hk-chrome);color:var(--hk-ink2);text-decoration:underline 2px var(--hk-tape);text-underline-offset:4px}
.hk-bar__ctl{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px}
.hk-mode{display:flex}
.hk-btn{appearance:none;border:0;margin:0;min-height:44px;padding:0 12px;background:transparent;color:var(--hk-ink2);font:600 13px/24px var(--hk-chrome);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hk-btn[aria-pressed="true"],.hk-btn[aria-expanded="true"]{background:var(--hk-tapea);color:var(--hk-tape-ink)}
@media (hover:hover){.hk-btn:hover{background:var(--hk-paper)}.hk-btn[aria-pressed="true"]:hover,.hk-btn[aria-expanded="true"]:hover{background:var(--hk-tapea)}}
.hk-index{display:none;width:min(1152px,calc(100% - 2*var(--hk-gut)));margin:0 auto 12px;padding:24px;background:var(--hk-paper);border:1px solid var(--hk-fold);gap:24px 48px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.hk-index.is-open{display:grid}
.hk-index h2{font:600 13px/24px var(--hk-chrome);color:var(--hk-ink2)}
.hk-index a{display:block;min-height:24px;padding:10px 0;font:400 13px/24px var(--hk-chrome);color:var(--hk-ink2);text-decoration:none}
.hk-index a[aria-current="page"]{text-decoration:underline 2px var(--hk-tape);text-underline-offset:4px}
@media (hover:hover){.hk-index a:hover{text-decoration:underline 2px var(--hk-tape);text-underline-offset:4px}}

/* the sheet: dotted stock, sewn on the left */
.hk-sheet{position:relative;isolation:isolate;width:min(1152px,calc(100% - 2*var(--hk-gut)));margin:0 auto 96px;box-sizing:border-box;padding:24px 48px 72px 120px;background:var(--hk-paper) var(--hk-dots);border:1px solid var(--hk-fold)}
.hk-sheet::before{content:'';position:absolute;left:47px;top:48px;bottom:48px;width:3px;background:var(--hk-stitch) repeat-y;z-index:0}
.hk-hole{position:absolute;left:46px;width:5px;height:5px;border-radius:50%;background:var(--hk-thread);z-index:1}
.hk-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 24px;font:400 13px/24px var(--hk-chrome);color:var(--hk-gr)}
.hk-head span{background:var(--hk-paper);padding-right:12px}
.hk-title{width:fit-content;max-width:100%;margin:48px 0 0;padding-right:24px;background:var(--hk-paper);font:${W.heading} clamp(32px,4.4vw,52px)/1.1 var(--hk-display);font-stretch:${d.stretch || 100}%;color:var(--hk-ink);overflow-wrap:break-word}
.hk-body{margin-top:48px;display:flex;flex-direction:column;gap:48px}
.hk-sec{display:flex;flex-direction:column;gap:12px}
.hk-sec>*{min-width:0}

/* tape: the action colour at 0.92, square cut, a 1 px darker edge along the bottom */
.hk-tape{position:relative;display:block;width:fit-content;max-width:100%;box-sizing:border-box;padding:0 12px;background:var(--hk-tapea);color:var(--hk-tape-ink);font:600 13px/24px var(--hk-chrome);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hk-tape::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:oklch(0.3 0.01 245 / 0.10)}
.hk-h2{margin:0}
a.hk-tape{text-decoration:none;min-height:44px;display:flex;align-items:center}

/* text on the paper clears the dots behind it */
.hk-note,.hk-mono,.hk-name,.hk-ink,.hk-lbl{width:fit-content;max-width:100%;background:var(--hk-paper);padding-right:12px;box-sizing:border-box}
.hk-note{font:400 13px/24px var(--hk-chrome);color:var(--hk-gr);max-width:min(100%,62ch)}
.hk-name{font:600 13px/24px var(--hk-chrome);color:var(--hk-ink2)}
.hk-lbl{font:400 13px/24px var(--hk-chrome);color:var(--hk-ink2)}
.hk-mono{font:400 13px/24px var(--hk-val);color:var(--hk-gr);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.hk-ink{font:400 13px/24px var(--hk-val);color:var(--hk-ink2);font-variant-numeric:tabular-nums}

/* a piece cut from the product's own ground */
.hk-pc{position:relative;margin:12px 0 0;min-width:0}
.hk-pc>.hk-tape{position:absolute;left:24px;top:-12px;z-index:3}
.hk-ui{position:relative;isolation:isolate;box-sizing:border-box;padding:36px 24px 24px;background:var(--surface);color:var(--text);border:1px solid var(--hk-fold);min-width:0}
.hk-ui.hk-flush{padding:0;overflow:hidden}
.hk-ui.hk-sunk{background:var(--sunken)}
.hk-ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.hk-ui .ui-display{font-stretch:${d.stretch || 100}%}
.hk-stack{display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.hk-stack>*{max-width:100%}
.hk-wrap{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.hk-cap{font:600 11px/24px var(--hk-chrome);letter-spacing:0.01em;color:var(--text-soft);white-space:nowrap}
.hk-row-in{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:flex-end}
.hk-cell{display:flex;flex-direction:column;gap:6px;min-width:0}

/* pairs and ladders */
.hk-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 48px;align-items:start}
.hk-two--fit{align-items:stretch}
.hk-lrow{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,4fr);gap:12px 48px;align-items:center;margin-top:24px}
.hk-lrow:first-child{margin-top:0}
.hk-says{display:flex;flex-direction:column;gap:0;min-width:0}
.hk-says .hk-tape{margin-bottom:0}
.hk-says+.hk-says{margin-top:12px}
.hk-app{display:flex;flex-direction:column}
.hk-app>div{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.4fr);gap:0 24px;padding:0}
@media (max-width:840px){
  :root{--hk-gut:16px}
  .hk-sheet{padding:16px 16px 48px 40px}
  .hk-sheet::before{left:15px;top:32px;bottom:32px}.hk-hole{left:14px}
  .hk-title{margin-top:32px}
  .hk-body{margin-top:32px;gap:36px}
  .hk-two,.hk-lrow{grid-template-columns:minmax(0,1fr);gap:24px}
  .hk-lrow{gap:6px;margin-top:40px}
  .hk-ui{padding:36px 16px 16px}
  .hk-app>div{grid-template-columns:minmax(0,1fr)}
}

/* colour rows */
.hk-swr{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:0 24px;align-items:center;margin-top:12px}
.hk-sw{box-sizing:border-box;min-height:48px;display:flex;align-items:center;padding:0 12px;font:${W.medium} 14px/20px var(--hk-body);border:1px solid var(--hk-fold)}
.hk-sw.is-edge{border-color:var(--hk-fold)}
.hk-vals{display:flex;flex-wrap:wrap;gap:0 24px}
.hk-inkrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 24px;align-items:baseline;padding:12px 0;border-top:1px solid var(--divider)}
.hk-inkrow .hk-mono,.hk-inkrow .hk-ink{background:transparent}
.hk-big{font-family:var(--hk-display);font-weight:${W.heading};letter-spacing:-0.02em;overflow-wrap:break-word}

/* type scale rows */
.hk-ts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:0 48px;align-items:start;padding:24px 0 0}
.hk-ts__s{background:var(--hk-paper);width:fit-content;max-width:100%;color:var(--hk-ink);padding-right:24px;overflow-wrap:break-word}
@media (max-width:840px){.hk-ts{grid-template-columns:minmax(0,1fr);gap:6px}}

/* spacing squares */
.hk-sq{display:flex;flex-wrap:wrap;align-items:flex-end;gap:24px 24px;padding:0 0 12px}
.hk-sq>div{display:flex;flex-direction:column;gap:0;align-items:flex-start;background:var(--hk-paper)}
.hk-sq i{display:block;background:var(--hk-tape);margin-bottom:12px}
.hk-gapw{position:relative;display:block;width:100%}
.hk-gapw b{position:absolute;right:0;top:0;bottom:0;width:19px;background:var(--hk-tapea)}
.hk-gapw span{position:absolute;right:30px;top:50%;transform:translateY(-50%);font:400 11px/16px var(--hk-val);color:var(--quiet);white-space:nowrap}

/* drawn corner */
.hk-corner{position:relative;height:var(--ch);width:100%;overflow:hidden;background:var(--hk-paper);border:1px solid var(--hk-fold)}
.hk-corner i{position:absolute;left:var(--co);top:var(--co);width:200%;height:200%;box-sizing:border-box;background:var(--surface)}

/* the cover */
.hk-cover{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);width:min(1152px,calc(100% - 2*var(--hk-gut)));margin:0 auto 96px;border:1px solid var(--hk-fold);isolation:isolate}
.hk-end{box-sizing:border-box;min-height:min(78vh,720px);padding:48px;display:flex;flex-direction:column;justify-content:space-between;gap:48px}
.hk-end h1{font:${W.heading} clamp(64px,13vw,168px)/0.95 var(--hk-display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em;overflow-wrap:anywhere}
.hk-end__logo{display:block;max-width:100%;width:171px}
.hk-fly{position:relative;box-sizing:border-box;padding:48px 48px 48px 72px;background:var(--hk-paper) var(--hk-dots);display:flex;flex-direction:column;gap:24px;justify-content:flex-end}
.hk-fly::before{content:'';position:absolute;left:23px;top:48px;bottom:48px;width:3px;background:var(--hk-stitch) repeat-y;z-index:0}
.hk-fly>*{position:relative;z-index:1}
.hk-fly h2{width:fit-content;max-width:100%;background:var(--hk-paper);font:600 15px/24px var(--hk-chrome);color:var(--hk-ink2);padding-right:12px}
@media (max-width:840px){.hk-cover{grid-template-columns:minmax(0,1fr)}.hk-end{min-height:360px;padding:32px 24px}.hk-fly{padding:32px 16px 32px 40px}.hk-fly::before{left:15px}}

/* contents */
.hk-part{display:flex;flex-direction:column;gap:0}
.hk-part .hk-tape{margin-bottom:12px}
.hk-pages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px}
.hk-pages a{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:baseline;min-height:24px;padding:10px 0;color:var(--hk-ink2);text-decoration:none;font:400 13px/24px var(--hk-chrome);background:var(--hk-paper)}
.hk-pages a span:last-child{font:400 13px/24px var(--hk-val);color:var(--hk-gr)}
@media (hover:hover){.hk-pages a:hover span:first-child{text-decoration:underline 2px var(--hk-tape);text-underline-offset:4px}}
@media (max-width:840px){.hk-pages{grid-template-columns:minmax(0,1fr)}}

/* prev and next */
.hk-pn{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;margin-top:72px}
.hk-pn a{display:flex;flex-direction:column;gap:0;min-height:44px;justify-content:center;color:var(--hk-ink2);text-decoration:none;background:var(--hk-paper);padding-right:12px}
.hk-pn a span:first-child{font:400 13px/24px var(--hk-chrome);color:var(--hk-gr)}
.hk-pn a span:last-child{font:600 15px/24px var(--hk-chrome)}
.hk-pn a:last-child{text-align:right;margin-left:auto}
@media (hover:hover){.hk-pn a:hover span:last-child{text-decoration:underline 2px var(--hk-tape);text-underline-offset:4px}}

/* screens, dialog, table, empty */
.hk-phone{width:min(390px,100%);box-sizing:border-box;margin:0 auto}
.hk-sbar{height:44px;display:flex;align-items:center;justify-content:center;font-weight:600}
.hk-pbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:var(--w-hairline) solid var(--divider)}
.hk-pad{padding:20px}
.hk-pfoot{display:flex;flex-direction:column;gap:20px;padding:0 20px 20px}
.hk-scr{width:100%}
.hk-bodyin{display:flex;flex-direction:column;padding:24px;gap:0}
.hk-bodyin>.ui-btn--block{margin-top:24px}
.hk-h{margin:8px 0 24px;font-size:var(--fs-title);line-height:var(--lh-title)}
.hk-form{display:flex;flex-direction:column;gap:16px;max-width:420px}
.hk-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.hk-live>*{max-width:100%}
.hk-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.hk-soft{color:var(--text-soft);max-width:44ch}
.hk-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.hk-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.hk-rider{width:100%;display:flex;align-items:center;gap:12px}
.hk-who{flex:1;min-width:0}
.hk-who p:first-child{font-weight:600;line-height:var(--lh-label)}
.hk-who p:last-child{color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.hk-dl{display:flex;flex-direction:column;gap:12px;margin-top:24px}
.hk-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.hk-dl dd{margin:0;font-weight:600}
.hk-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.hk-scrim .ui-scrim{min-height:280px}
.hk-tbl{min-width:0}
.hk-ui .hk-mono{color:var(--quiet);background:transparent}
.hk-ui .hk-ink{color:var(--text);background:transparent}
.hk-ui .ui-topbar{row-gap:8px}
.hk-ui .ui-topbar>span{flex:none;padding:2px 0 4px}
@media (max-width:840px){
  .hk-inkrow{grid-template-columns:minmax(0,1fr);gap:4px 0}
  .hk-ui .ui-table th,.hk-ui .ui-table td{padding-inline:8px}
  .sx .hk-code pre{white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:visible}
}

/* values and code */
.hk-kv{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:0 24px}
.hk-kv dt,.hk-kv dd{min-width:0}
.hk-kv dt{font:400 13px/24px var(--hk-val);color:var(--hk-ink2);background:var(--hk-paper);padding-right:12px}
.hk-kv dd{font:400 13px/24px var(--hk-val);color:var(--hk-gr);background:var(--hk-paper);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.hk-roles{display:grid;grid-template-columns:24px 24px minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:0 12px;align-items:center}
.hk-roles>*{background:var(--hk-paper)}
.hk-roles i{display:block;width:24px;height:24px;box-sizing:border-box;border:1px solid var(--hk-fold)}
.hk-roles .hk-h3{grid-column:1/-1}
.hk-roles span{font:400 13px/24px var(--hk-val);color:var(--hk-gr);overflow-wrap:anywhere}
.hk-roles span.hk-r{color:var(--hk-ink2)}
@media (max-width:840px){.hk-roles{grid-template-columns:24px 24px minmax(0,1fr)}.hk-roles span.hk-x{display:none}}
.hk-code{position:relative}
.hk-code pre{margin:0;padding:36px 24px 24px;overflow-x:auto;background:var(--surface);color:var(--text);border:1px solid var(--hk-fold);font:400 13px/24px var(--hk-mono);white-space:pre;tab-size:2}
.hk-code .hk-btn{position:absolute;right:0;top:0;z-index:3;background:var(--hk-tapea);color:var(--hk-tape-ink)}
.hk-code.hk-lt{background:transparent}
.hk-files{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:0 24px}
.hk-files dt{font:400 13px/24px var(--hk-val);color:var(--hk-ink2);background:var(--hk-paper);padding:10px 12px 10px 0;min-height:24px}
.hk-files dd{font:400 13px/24px var(--hk-chrome);color:var(--hk-gr);background:var(--hk-paper);padding:10px 12px 10px 0}
@media (prefers-reduced-motion:reduce){.hk-btn{transition:none}}
.ph-b>.ph-l{font-weight:600}
.hk-tbl .ph-c.ph-n{white-space:normal!important}
@media (max-width:840px){.hk-pc>.hk-tape:has(.ph-c){position:relative;left:24px;top:0;margin:0 0 6px;max-width:calc(100% - 48px);white-space:normal;overflow:visible;text-overflow:clip}.hk-tape .ph-c{white-space:normal!important;overflow-wrap:anywhere}}
.hk-who p .ph-c{white-space:normal!important;overflow-wrap:anywhere}
`;
}
