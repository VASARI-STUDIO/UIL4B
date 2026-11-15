// Theme 31, Contact sheet: lane hg's CSS (the guidelines website). Imported by lane-hg.js only.
// The sheet is measured in container units of one gate (14.957cqw at wide, 29.915cqw at narrow), as in the book, so the text lines up with the film.
import { tokens } from './helpers.js';

const r2 = (n) => Math.round(n * 100) / 100;
// the loop drawn by the pencil: a pie that opens 30 degrees a step from 150 degrees, twelve steps, over the loop's box
function drawKeys() {
  const N = 12, R = 150, pt = (d) => { const t = (d * Math.PI) / 180; return `${r2(50 + R * Math.cos(t))}% ${r2(50 + R * Math.sin(t))}%`; };
  let k = '';
  for (let i = 0; i <= N; i++) { const p = ['50% 50%']; for (let j = 0; j <= N; j++) p.push(pt(150 + 30 * Math.min(i, j))); k += `${r2((i / N) * 100)}%{clip-path:polygon(${p.join(',')})}`; }
  return `@keyframes hg-draw{${k}}`;
}
// the header logo: whichever colourway's name reads better on each mode's surface
function headerFix(ctx) {
  const cw = ctx.brand.logo.colourways, L = ctx.roles.light.surface, D = ctx.roles.dark.surface;
  if (!cw.colour || !cw.reversed) return '';
  let s = '';
  if (ctx.ratio(cw.colour.name, L) < ctx.ratio(cw.reversed.name, L)) s += ':root:not([data-theme="dark"]) .hg-brand .hg-for-light{display:none!important}:root:not([data-theme="dark"]) .hg-brand .hg-for-dark{display:block!important}\n';
  if (ctx.ratio(cw.reversed.name, D) < ctx.ratio(cw.colour.name, D)) s += '[data-theme="dark"] .hg-brand .hg-for-dark{display:none!important}[data-theme="dark"] .hg-brand .hg-for-light{display:block!important}\n';
  return s;
}

export function hgCss(ctx) {
  const T = tokens(ctx), L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, st = d.stretch || 100, hw = ctx.weights.heading;
  const vars = (r) => `--hg-ground:${r.surface};--hg-ink:${r.text};--hg-soft:${r.textSoft};--hg-quiet:${r.quiet};--hg-hair:${r.divider};--hg-line:${r.border};--hg-panel:${r.raised};--hg-sunk:${r.sunken};--hg-act:${r.action};--hg-act-ink:${r.actionLabel};--hg-focus:${r.focus};`;
  const disp = `font-family:var(--hg-display);font-weight:${hw};font-stretch:${st}%`;
  return `:root{${vars(L)}--hg-film:${T.film};--hg-hole:${T.hole};--hg-gate:${T.gate};--hg-edge:${T.edge};--hg-loop:${T.loop};
--hg-chrome:'Instrument Sans',sans-serif;--hg-display:'${d.family}',serif;--hg-body:'${B.fonts.body.family}',sans-serif;--hg-mono:'${B.fonts.mono.family}',monospace;color-scheme:light}
:root[data-theme="dark"]{${vars(D)}color-scheme:dark}
html{background:var(--hg-ground)}
.hg{background:var(--hg-ground);color:var(--hg-ink);font:400 16px/1.55 var(--hg-body);-webkit-font-smoothing:antialiased;min-height:100vh}
.hg :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.hg :where(ul,ol){list-style:none}
.hg :focus-visible{outline:2px solid var(--hg-focus);outline-offset:2px}
:root:not([data-theme="dark"]) .hg-for-dark,[data-theme="dark"] .hg-for-light{display:none!important}
.hg-defs{position:absolute;width:0;height:0;overflow:hidden}
.hg-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.hg-m{font-family:var(--hg-mono);font-weight:400;font-size:.9em}
.hg-lab{font:500 12px/16px var(--hg-chrome);color:var(--hg-quiet)}

/* the bar: one sticky row on the paper */
.hg-skip{position:absolute;left:16px;top:-80px;z-index:40;background:var(--hg-ink);color:var(--hg-ground);padding:12px 16px;font:500 14px/20px var(--hg-chrome);text-decoration:none}
.hg-skip:focus{top:12px}
.hg-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;height:56px;padding:0 clamp(16px,4.2vw,60px);background:var(--hg-ground);border-bottom:1px solid var(--hg-hair)}
.hg-brand{flex:none;display:block;width:120px;line-height:0;color:var(--hg-ink)}
.hg-logo{display:block;line-height:0}
.hg-logo>*{display:block;width:100%!important;height:auto!important}
.hg-sites{display:flex;gap:4px;margin-left:auto}
.hg-sites a{display:flex;align-items:center;height:36px;padding:0 10px;border-radius:2px;font:500 14px/1 var(--hg-chrome);color:var(--hg-soft);text-decoration:none;transition:background-color 150ms ease-out,color 150ms ease-out}
.hg-sites a[aria-current]{color:var(--hg-ink);box-shadow:inset 0 -2px 0 var(--hg-ink);border-radius:0}
@media (hover:hover){.hg-sites a:hover{color:var(--hg-ink);background:var(--hg-sunk)}}
.hg-btn{appearance:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border:1px solid var(--hg-line);border-radius:2px;background:transparent;color:var(--hg-ink);font:500 14px/1 var(--hg-chrome);cursor:pointer;transition:background-color 150ms ease-out,transform 120ms ease-out}
.hg-btn:active{transform:scale(.97)}
.hg-btn[aria-expanded="true"]{background:var(--hg-ink);color:var(--hg-ground);border-color:var(--hg-ink)}
@media (hover:hover){.hg-btn[aria-expanded="false"]:hover{background:var(--hg-sunk)}}
.hg-mode{flex:none;display:inline-flex;padding:2px;border:1px solid var(--hg-line);border-radius:2px}
.hg-mode button{appearance:none;border:0;border-radius:1px;background:transparent;color:var(--hg-soft);font:500 13px/1 var(--hg-chrome);height:30px;padding:0 12px;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
:root:not([data-theme="dark"]) .hg-mode [data-mode="light"],[data-theme="dark"] .hg-mode [data-mode="dark"]{background:var(--hg-ink);color:var(--hg-ground)}
@media (hover:hover){:root:not([data-theme="dark"]) .hg-mode [data-mode="dark"]:hover,[data-theme="dark"] .hg-mode [data-mode="light"]:hover{color:var(--hg-ink);background:var(--hg-sunk)}}
.hg-mode button:focus-visible{outline-offset:-2px}

/* contents panel: every page by section, under the bar */
.hg-toc{position:fixed;z-index:30;top:56px;left:0;right:0;max-height:calc(100vh - 56px);overflow:auto;overscroll-behavior:contain;background:var(--hg-ground);border-bottom:1px solid var(--hg-line);box-shadow:0 12px 24px -12px oklch(0 0 0 / .18)}
.hg-toc[data-open="false"]{display:none}
.hg-toc__in{max-width:1440px;margin:0 auto;padding:24px clamp(16px,4.2vw,60px) 32px}
.hg-toc__f{margin-bottom:16px}
.hg-toc__l{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 40px}
.hg-toc__s{font:600 12px/16px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hg-quiet);margin-bottom:4px}
.hg-toc__a{display:flex;gap:10px;align-items:baseline;padding:6px 0;font:500 14px/20px var(--hg-body);color:var(--hg-ink);text-decoration:none}
.hg-toc__a[aria-current]{text-decoration:underline;text-underline-offset:4px}
@media (hover:hover){.hg-toc__a:hover{text-decoration:underline;text-underline-offset:4px}}
.hg-toc__n{font:600 12px/16px var(--hg-chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--hg-quiet);min-width:18px}

/* the sheet: a gate is 14.957cqw, a gap 1.7094cqw, the cut end of a strip 0.8547cqw */
.hg-wrap,.hg-cover,.hg-contents{padding:0 clamp(16px,4.2vw,60px)}
.hg-c{display:block;container-type:inline-size;max-width:1440px;margin:0 auto}
main.hg-c{padding-bottom:72px}
main.hg-c:focus{outline:none}
.hg-pstrip{padding-top:40px}
.hg-grid{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw;display:grid;grid-template-columns:repeat(6,var(--g));column-gap:var(--gap);padding:0 var(--cut)}
.hg-roll{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw;display:flex}
.hg-half{position:relative;isolation:isolate;flex:1 1 50%;display:grid;grid-template-columns:repeat(3,var(--g));column-gap:var(--gap);align-items:start;padding:40px var(--cut) 0}
.hg-half::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:0;height:calc(80px + var(--g) / 1.5);background:var(--hg-film)}
.hg-holes{position:absolute;left:0;width:100%;height:17px;overflow:hidden}
.hg-holes--t{top:6px}.hg-holes--b{top:calc(57px + var(--g) / 1.5)}
.hg-ep{position:absolute;top:23px;left:calc(var(--cut) + var(--at) * (var(--g) + var(--gap)) + 8px);font:600 12px/16px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;color:var(--hg-edge);background:var(--hg-film)}
.hg-tri{display:inline-block;width:0;height:0;margin:0 0 0 6px;border-left:6px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;vertical-align:1px}
.hg-fr{display:block;min-width:0;color:var(--hg-soft);text-decoration:none;border-radius:2px}
.hg-fr:focus-visible{outline-offset:4px}
.hg-gw{position:relative;display:block;aspect-ratio:3/2}
.hg-gate{position:absolute;inset:0;overflow:hidden;border-radius:2px;background:var(--hg-film);transition:transform 150ms ease-out}
.hg-gate::after,.hg-enl::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1);pointer-events:none}
.hg-gate--e{box-shadow:inset 0 0 0 1px var(--hg-gate)}
.hg-gate--e::after{box-shadow:none}
.hg-no{position:absolute;left:0;right:0;top:calc(100% + 4px);font:600 12px/12px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;font-variant-numeric:tabular-nums;text-align:center;color:var(--hg-edge)}
.hg-no{left:50%;right:auto;transform:translateX(-50%);padding:0 2px;background:var(--hg-film)}
.hg-ti{display:block;margin-top:52px;font:500 13px/18px var(--hg-body);color:var(--hg-soft);text-wrap:balance}
.hg-fr[aria-current] .hg-ti{color:var(--hg-ink);font-weight:600}
@media (hover:hover){.hg-fr:hover .hg-ti{color:var(--hg-ink);text-decoration:underline;text-underline-offset:3px}}
.hg-loop{position:absolute;z-index:2;left:-15.714%;top:-25.714%;width:131.43%;height:151.43%;overflow:visible;pointer-events:none;fill:var(--hg-loop)}
${drawKeys()}
.hg-loop--draw{animation:hg-draw 800ms linear 300ms both}
@media (prefers-reduced-motion:reduce){.hg-loop--draw{animation:none}}

/* exposures: each frame's inner, drawn in the frame's own container units */
.hg-xc{position:absolute;inset:0;display:block;container-type:size;overflow:hidden;border-radius:inherit}
.hg-img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;object-fit:cover}
.hg-plate{overflow:hidden}
.hg-xc>.hg-img,.hg-xc>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hg-slot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;border:1px dashed var(--hg-edge);border-radius:2px;background:var(--hg-film);text-align:center}
.hg-edge{font:600 12px/16px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hg-edge);background:var(--hg-film)}
.hg-xg{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}
.hg-lg{display:block;line-height:0}
.hg-lg>*{width:100%!important;height:100%!important}
.hg-xrow{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr}
.hg-xrow>.hg-xg,.hg-xquad>.hg-xg{position:relative}
.hg-xquad{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.hg-xclear{position:relative;display:block;outline:1px dashed currentColor;outline-offset:0}
.hg-xclear__lg{position:absolute;display:block;line-height:0}
.hg-xclear__lg>*{width:100%!important;height:100%!important}
.hg-rj{display:block;width:100%;display:grid;place-items:center}
.hg-rj--s>.hg-lg{transform:scaleX(1.45)}
.hg-rj--r>.hg-lg{transform:rotate(-14deg)}
.hg-x{position:absolute;z-index:1;inset:0;width:100%;height:100%;pointer-events:none}
.hg-xbands{position:absolute;inset:0;display:flex}
.hg-xbands>span{flex:1 1 0;min-width:0;display:flex;align-items:flex-end;padding:4cqw 3cqw}
.hg-xbands--s>span{flex-basis:0}
.hg-xbands>span{padding:4cqw 2cqw}
.hg-xbands .hg-xs{font-size:max(12px,3.2cqw);font-weight:600}
.hg-xs{font:500 max(12px,4.4cqw)/1.2 var(--hg-body);overflow-wrap:anywhere}
.hg-xaa{${disp};font-size:min(52cqh,22cqw);line-height:1;letter-spacing:-0.02em}
.hg-xg:has(.hg-xaa--b){grid-template-columns:1fr 1fr;grid-auto-flow:column}
.hg-xaa--b{font-family:var(--hg-body);font-weight:500;font-stretch:100%}
.hg-xr{position:absolute;left:5cqw;bottom:4cqw}
.hg-xline{${disp};font-size:max(12px,7.2cqw);line-height:1.1;letter-spacing:-0.01em;text-align:center;text-wrap:balance;padding:0 10cqw}
.hg-xh{display:grid;gap:4cqw;padding:0 10cqw;width:100%}
.hg-xh__1{${disp};font-size:max(12px,8cqw);line-height:1.08;text-wrap:balance}
.hg-xh__2{font-weight:400}
.hg-xh .ph-n,.hg-xline .ph-n{white-space:normal!important}
.hg-xgrid{position:absolute;display:grid}
.hg-xgrid i{display:block;background:currentColor;opacity:.12}
.hg-xsig{display:grid;gap:2cqw;padding:0 10cqw;width:100%;border-left:0}
.hg-xsig__n{${disp};font-size:max(12px,8cqw);line-height:1.1}
.hg-xmos{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:2.5cqw;padding:4cqw}
.hg-xm{position:relative;display:block;overflow:hidden;border-radius:1px}
.hg-xm>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hg-xm--b{display:flex;align-items:center;justify-content:center;border:max(1px,.4cqw) dashed currentColor}
.hg-xm--b .hg-xs{font-size:max(11px,3.4cqw);line-height:1.2}
.hg-gate .hg-xs{display:none}

/* the opening: the enlargement on gates 2 to 4, the caption column on 5 and 6 */
.hg-open{margin-top:48px;align-items:start}
.hg-enlf{grid-column:2 / span 3;min-width:0}
.hg-enl{position:relative;aspect-ratio:3/2;overflow:hidden;border-radius:2px;background:var(--hg-film)}
.hg-figc{margin-top:12px;font:400 14px/22px var(--hg-body);color:var(--hg-soft);text-wrap:pretty}
.hg-figc__t{display:block;font-weight:500;color:var(--hg-ink)}
.hg-cap{grid-column:5 / span 2;min-width:0}
.hg-fno{font:600 40px/40px var(--hg-chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--hg-ink)}
.hg-sect{margin-top:16px;font:600 12px/16px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hg-quiet)}
.hg-h1{margin-top:24px;padding-top:24px;border-top:1px solid var(--hg-hair);${disp};font-size:40px;line-height:44px;letter-spacing:-0.01em;color:var(--hg-ink);text-wrap:balance}
.hg-words{margin-top:16px;font:400 16px/26px var(--hg-body);color:var(--hg-soft);text-wrap:pretty;max-width:60ch}

/* the long read: the name in gate 1, the matter on 2 to 4, a note on 5 and 6 */
.hg-row{margin-top:72px;padding-top:16px;border-top:1px solid var(--hg-hair);row-gap:16px}
.hg-row--n{margin-top:0;padding-top:24px}
.hg-k{grid-column:1;font:500 14px/20px var(--hg-body);color:var(--hg-ink);text-wrap:balance}
.hg-mm{grid-column:2 / span 3;min-width:0}
.hg-mw{grid-column:2 / span 5;min-width:0}
.hg-mf{grid-column:1 / -1;min-width:0}
.hg-s{grid-column:5 / span 2;min-width:0}
.hg-p{font:400 16px/26px var(--hg-body);color:var(--hg-soft);text-wrap:pretty;max-width:65ch}
.hg-p--l{font-size:18px;line-height:28px;color:var(--hg-ink)}
.hg-p+.hg-p{margin-top:12px}
.hg-lead{${disp};font-size:28px;line-height:36px;color:var(--hg-ink);text-wrap:pretty;max-width:32em}
.hg-big{${disp};font-size:clamp(32px,4.4cqw,56px);line-height:1.08;letter-spacing:-0.01em;color:var(--hg-ink);text-wrap:balance}
.hg-quote{${disp};font-size:28px;line-height:36px;color:var(--hg-ink);text-wrap:pretty}
.hg-note{font:400 14px/22px var(--hg-body);color:var(--hg-quiet);max-width:40ch}
.hg-a{color:var(--hg-ink);text-underline-offset:4px}
.hg-lines{display:grid;gap:12px}
.hg-lines li{${disp};font-size:24px;line-height:32px;color:var(--hg-ink)}
.hg-traits{display:grid;gap:32px}
.hg-traits li{display:grid;grid-template-columns:calc(2 * var(--g) + var(--gap)) 1fr;column-gap:var(--gap);align-items:baseline}
.hg-trait{${disp};font-size:40px;line-height:44px;letter-spacing:-0.01em;color:var(--hg-ink)}
.hg-wtn{display:grid;gap:24px}
.hg-wtn li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--gap);row-gap:8px;padding-bottom:24px;border-bottom:1px solid var(--hg-hair)}
.hg-wtn li:last-child{padding-bottom:0;border-bottom:0}
.hg-wtn .hg-lab{display:block;margin-bottom:4px}
.hg-wtn__w{font:500 18px/28px var(--hg-body);color:var(--hg-ink)}
.hg-wtn__n{font:400 16px/26px var(--hg-body);color:var(--hg-quiet)}
.hg-wtn__b{grid-column:1 / -1;font:400 14px/22px var(--hg-body);color:var(--hg-soft);max-width:65ch}
.hg-dl{display:grid;gap:12px;margin-top:12px}
.hg-dl dt,.hg-vals dt,.hg-dir dt,.hg-meas dt,.hg-meta dt,.hg-mail__h dt{font:500 12px/16px var(--hg-chrome);color:var(--hg-quiet)}
.hg-dl dd{margin-top:2px;font:400 15px/22px var(--hg-body);color:var(--hg-ink)}
.hg-vals{display:grid;grid-template-columns:max-content 1fr;gap:8px 24px;align-items:baseline}
.hg-vals>div{display:contents}
.hg-vals dd{font:400 15px/22px var(--hg-body);color:var(--hg-ink)}
.hg-chip{display:block;width:var(--g);aspect-ratio:3/2;border-radius:2px}
.hg-chip--s{width:48px}
.hg-chip--r{width:24px;aspect-ratio:1;box-shadow:inset 0 0 0 1px var(--hg-hair)}
:root:not([data-theme="dark"]) .is-near-l,[data-theme="dark"] .is-near-d{box-shadow:inset 0 0 0 1px var(--hg-hair)}
[data-theme="dark"] .is-near-d{box-shadow:inset 0 0 0 1px var(--hg-soft)}
.hg-tones{display:grid;gap:16px}
.hg-tones li{display:grid;grid-template-columns:48px 1fr auto;gap:16px;align-items:center}
.hg-tone__n{font:500 14px/20px var(--hg-body);color:var(--hg-ink)}
.hg-tone__x{font:400 14px/22px var(--hg-body);color:var(--hg-soft);text-wrap:pretty}
.hg-roles,.hg-sumc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px var(--gap)}
.hg-roles li,.hg-sumc li{display:grid;grid-template-columns:24px 1fr auto;gap:12px;align-items:center;font-size:15px;color:var(--hg-ink)}
.hg-sumc li{grid-template-columns:48px 1fr auto}
.hg-roles__n{font:400 14px/20px var(--hg-body);color:var(--hg-soft)}
.hg-ts{display:flex;min-height:176px;border-radius:2px;overflow:hidden}
.hg-tf{flex:var(--share) 1 0;min-width:0;display:grid;grid-template-rows:auto 1fr;padding:14px 12px}
.hg-tf__n{font:600 14px/20px var(--hg-body);overflow-wrap:anywhere}
.hg-tf__p{align-self:end;${disp};font-size:40px;line-height:1;font-variant-numeric:tabular-nums}
.hg-shares{display:grid;gap:12px}
.hg-shares li{display:grid;grid-template-columns:var(--g) 1fr;column-gap:var(--gap);align-items:baseline;padding-bottom:12px;border-bottom:1px solid var(--hg-hair)}
.hg-shares__p{${disp};font-size:32px;line-height:1;font-variant-numeric:tabular-nums;color:var(--hg-ink)}
.hg-shares__n{font:500 16px/24px var(--hg-body);color:var(--hg-ink)}
.hg-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--gap)}
.hg-pair{display:grid;align-content:space-between;gap:24px;min-height:144px;padding:16px;border-radius:2px}
.hg-pair__r{${disp};font-size:32px;line-height:1;font-variant-numeric:tabular-nums}
.hg-pair__u{font:400 14px/20px var(--hg-body);text-wrap:pretty}
.hg-pair--lg .hg-pair__u{${disp};font-size:24px;line-height:30px}

/* prints: a version on its own ground, 3:2, two gates wide */
.hg-prints{display:grid;grid-template-columns:repeat(3,calc(2 * var(--g) + var(--gap)));gap:40px var(--gap)}
.hg-pr{min-width:0}
.hg-print{position:relative;isolation:isolate;aspect-ratio:3/2;display:grid;place-items:center;overflow:hidden;border-radius:2px;container-type:inline-size}
.hg-print--big{max-width:100%}
.hg-print--ph .hg-lg--ph{position:absolute;left:6%;bottom:8%;z-index:1}
.hg-pr__n{margin-top:12px;font:500 14px/20px var(--hg-body);color:var(--hg-ink)}
.hg-pr__x{margin-top:2px;font:400 14px/22px var(--hg-body);color:var(--hg-soft);max-width:44ch;text-wrap:pretty}
.hg-clear{position:relative;max-width:560px;border:1px dashed var(--hg-quiet);border-radius:2px}
.hg-clear__lg{position:absolute;display:block;outline:1px solid var(--hg-hair)}
.hg-clear__lg .hg-logo>*{width:100%!important;height:100%!important}
.hg-clear__lg .hg-logo{height:100%}
.hg-min{margin-bottom:16px}
.hg-smalls{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 32px;margin:16px 0 0;padding:0;list-style:none}
.hg-smalls li{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.hg-small{display:block}
.hg-post{${disp};font-size:max(16px,7.2cqw);line-height:1.1;letter-spacing:-0.01em;text-align:center;text-wrap:balance;padding:0 10cqw}
.hg-post--l{font-size:max(24px,7cqw)}
.hg-print--sign{aspect-ratio:3/2}
.hg-brief{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--hg-line);border-radius:2px;background:var(--hg-sunk);color:var(--hg-ink);text-align:center}
.hg-brief__t{font:600 12px/16px var(--hg-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase}
.hg-brief__n{font:400 13px/18px var(--hg-mono);color:var(--hg-soft)}
.hg-pr__b{margin-top:12px}
.hg-shot{position:relative;aspect-ratio:3/2;overflow:hidden;border-radius:2px;background:var(--hg-film)}
.hg-shot>:not(.hg-img){position:absolute;inset:0;width:100%;height:100%}
.hg-shot::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);pointer-events:none}
[data-theme="dark"] .hg-shot::after{box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1)}
.hg-plates{display:grid;grid-template-columns:repeat(2,calc(3 * var(--g) + 2 * var(--gap)));column-gap:var(--gap)}
.hg-plate{min-width:0}

/* type */
.hg-faces{display:grid;gap:40px}
.hg-face{display:grid;gap:8px}
.hg-face__n{color:var(--hg-ink);overflow-wrap:anywhere}
.hg-face--d .hg-face__n{${disp};font-size:clamp(40px,5.6cqw,80px);line-height:1.05;letter-spacing:-0.01em}
.hg-face--b .hg-face__n{font:600 clamp(32px,3.6cqw,52px)/1.1 var(--hg-body)}
.hg-face--m .hg-face__n{font:400 clamp(24px,2.6cqw,36px)/1.2 var(--hg-mono)}
.hg-face__c{font:400 18px/28px var(--hg-body);color:var(--hg-soft);overflow-wrap:anywhere}
.hg-face--d .hg-face__c{font-family:var(--hg-display);font-weight:${hw};font-stretch:${st}%}
.hg-face--m .hg-face__c{font-family:var(--hg-mono);font-size:15px}
.hg-face__d{font:400 14px/22px var(--hg-body);color:var(--hg-soft)}
.hg-scale li{display:grid;grid-template-columns:var(--g) minmax(0,1fr);column-gap:var(--gap);align-items:baseline;padding:24px 0;border-top:1px solid var(--hg-hair)}
.hg-scale li:first-child{border-top:0;padding-top:0}
.hg-sc__t{font:500 14px/20px var(--hg-body);color:var(--hg-ink)}
.hg-sc__m{font:400 13px/20px var(--hg-body);color:var(--hg-quiet);text-wrap:pretty}
.hg-sc__s{font-family:var(--hg-body);font-size:calc(var(--size) * 1px);color:var(--hg-ink);max-width:60ch;text-wrap:pretty;overflow-wrap:anywhere}
.hg-sc__s--d{font-family:var(--hg-display);font-stretch:${st}%;letter-spacing:-0.01em;text-wrap:balance;max-width:none}
.hg-inuse{display:grid;gap:16px}
.hg-inuse__h{${disp};font-size:clamp(32px,4cqw,56px);line-height:1.08;letter-spacing:-0.01em;color:var(--hg-ink);text-wrap:balance}
.hg-inuse__c{font:400 12px/18px var(--hg-body);color:var(--hg-quiet)}
.hg-ui li{display:grid;grid-template-columns:minmax(96px,auto) 80px 1fr;gap:16px;align-items:baseline;padding:10px 0;border-top:1px solid var(--hg-hair);font-size:15px;color:var(--hg-ink)}
.hg-ui li:first-child{border-top:0;padding-top:0}
.hg-ui__t{font:500 14px/20px var(--hg-body)}
.hg-ui__u{font:400 14px/22px var(--hg-body);color:var(--hg-soft)}
.hg-rules li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--gap);padding:16px 0;border-top:1px solid var(--hg-hair)}
.hg-rules li:first-child{border-top:0;padding-top:0}
.hg-rules p{font:400 16px/24px var(--hg-body);color:var(--hg-ink);text-wrap:pretty}
.hg-rules .hg-rules__dont{color:var(--hg-soft)}
.hg-rules .hg-lab{display:block;margin-bottom:4px}
.hg-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px var(--gap)}
.hg-dir dd{margin-top:6px;font:400 16px/26px var(--hg-body);color:var(--hg-ink);text-wrap:pretty;max-width:52ch}

/* layout */
.hg-pg{display:block;width:100%;height:auto}
.hg-pg__p{fill:var(--hg-panel);stroke:var(--hg-line);stroke-width:1;vector-effect:non-scaling-stroke}
.hg-pg__c{fill:var(--hg-sunk)}
.hg-pg__m{fill:none;stroke:var(--hg-quiet);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke}
.hg-meas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px var(--gap)}
.hg-meas dd{margin-top:4px;${disp};font-size:28px;line-height:32px;font-variant-numeric:tabular-nums;color:var(--hg-ink)}
.hg-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 24px}
.hg-space li{display:grid;justify-items:start;gap:8px;font-size:14px;color:var(--hg-soft)}
.hg-space i{display:block;background:var(--hg-ink)}
.hg-radii{display:flex;flex-wrap:wrap;gap:24px 40px}
.hg-radii li{min-width:96px}
.hg-radii i{display:block;width:96px;height:64px;border:1px solid var(--hg-ink)}

/* applications */
.hg-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gap)}
.hg-card{aspect-ratio:85/55;display:grid;align-content:space-between;justify-items:start;padding:8%;border-radius:2px}
.hg-card--b{place-content:center;justify-items:center}
.hg-card__lg{display:block;width:44%;line-height:0}
.hg-card--b .hg-card__lg{width:56%}
.hg-card__lg>*{width:100%!important;height:100%!important}
.hg-card__n{font:500 15px/20px var(--hg-body)}
.hg-card__r{font:400 13px/18px var(--hg-body)}
.hg-mail{display:grid;gap:12px;padding:24px;border-radius:2px;background:var(--hg-panel);max-width:640px}
.hg-mail__h{display:grid;gap:8px;padding-bottom:16px;margin-bottom:4px;border-bottom:1px solid var(--hg-hair)}
.hg-mail__h>div{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:baseline}
.hg-mail__h dd{font:400 15px/22px var(--hg-body);color:var(--hg-ink)}
.hg-mail .hg-p{color:var(--hg-ink)}
.hg-sig{margin-top:12px;padding-top:16px;border-top:1px solid var(--hg-hair)}
.hg-sig__lg{display:block;width:96px;margin-bottom:12px}
.hg-sig__n{font:500 15px/22px var(--hg-body);color:var(--hg-ink)}
.hg-sig__r{font:400 14px/20px var(--hg-body);color:var(--hg-soft)}

/* front: the line, then the whole roll as the contents */
.hg-cover>*,.hg-contents>*{max-width:1440px;margin-left:auto;margin-right:auto}
.hg-cover{padding-top:64px;padding-bottom:48px}
.hg-head{display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px 48px}
.hg-stamp{width:200px;max-width:100%;margin-bottom:32px}
.hg-h1--c{margin:0;padding:0;border:0;font-size:${st > 100 ? 'clamp(30px,6vw,88px)' : 'clamp(48px,8vw,120px)'};line-height:1;letter-spacing:-0.02em;max-width:${st > 100 ? 16 : 12}em}
.hg-meta{display:flex;gap:32px;padding-bottom:12px}
.hg-meta dd{margin-top:4px;font:500 14px/20px var(--hg-body);color:var(--hg-ink)}
.hg-cover .hg-words{margin-top:32px;font-size:18px;line-height:28px}
.hg-contents{padding-bottom:72px}
.hg-ch{margin-bottom:24px;padding-top:16px;border-top:1px solid var(--hg-hair);row-gap:8px}
.hg-sheet{display:grid;gap:32px}
.hg-sheet .hg-grid,.hg-sheet .hg-roll{--g:14.957cqw}

/* prev and next */
.hg-foot{padding:0 clamp(16px,4.2vw,60px) 48px}
.hg-pn{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 0;border-top:1px solid var(--hg-hair)}
.hg-pn__a{display:grid;gap:4px;padding:8px 0;color:var(--hg-ink);text-decoration:none;border-radius:2px}
.hg-pn__a--next{text-align:right;justify-items:end}
.hg-pn__t{display:flex;gap:10px;align-items:baseline;font:500 18px/26px var(--hg-body)}
.hg-pn__n{font:600 14px/20px var(--hg-chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--hg-quiet)}
@media (hover:hover){.hg-pn__a:hover .hg-pn__t{text-decoration:underline;text-underline-offset:4px}}
.hg-fine{padding-top:16px;border-top:1px solid var(--hg-hair);font:400 12px/16px var(--hg-chrome);color:var(--hg-quiet)}

@media (max-width:840px){
.hg-top{padding:0 16px;gap:8px}
.hg-brand{width:96px;margin-right:auto}
.hg-sites{display:none}
.hg-btn{padding:0 10px}
.hg-mode button{padding:0 8px}
.hg-toc__l{grid-template-columns:1fr}
.hg-wrap,.hg-cover,.hg-contents,.hg-foot{padding-left:16px;padding-right:16px}
.hg-pstrip{padding-top:24px}
.hg-grid,.hg-roll,.hg-sheet .hg-grid,.hg-sheet .hg-roll{--g:29.915cqw;--gap:3.4188cqw;--cut:1.7094cqw}
.hg-grid{grid-template-columns:1fr}
.hg-roll{flex-direction:column;gap:16px}
.hg-half--x{display:none}
.hg-ep--w{display:none}
.hg-ti{font-size:12px;line-height:16px}
.hg-open{margin-top:32px;row-gap:24px}
.hg-enlf,.hg-cap,.hg-k,.hg-mm,.hg-mw,.hg-mf,.hg-s{grid-column:1}
.hg-h1{font-size:32px;line-height:36px}
.hg-h1--c{font-size:${st > 100 ? 30 : 48}px;line-height:${st > 100 ? 34 : 52}px}
.hg-head{grid-template-columns:1fr}
.hg-meta{gap:24px;padding-bottom:0}
.hg-row{margin-top:48px}
.hg-traits li,.hg-wtn li,.hg-scale li,.hg-rules li,.hg-shares li{grid-template-columns:1fr;row-gap:6px}
.hg-trait{font-size:32px;line-height:36px}
.hg-lead,.hg-quote{font-size:24px;line-height:32px}
.hg-prints{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 12px}
.hg-plates,.hg-cards{grid-template-columns:1fr;row-gap:24px}
.hg-ts{flex-direction:column}
.hg-tf{flex:none;min-height:calc(56px + var(--share) * 160px);grid-template-columns:1fr auto;grid-template-rows:auto}
.hg-tf__p{font-size:32px;align-self:start}
.hg-roles,.hg-sumc,.hg-dir{grid-template-columns:1fr}
.hg-sc__s--d{font-size:min(calc(var(--size) * 1px),12cqw)}
.hg-face__c{font-size:16px;line-height:24px}
.hg-ui li{grid-template-columns:1fr auto;row-gap:2px}
.hg-ui__u{grid-column:1 / -1}
.hg-pn{grid-template-columns:1fr}
.hg-pn__a--next{text-align:left;justify-items:start}
.hg-mail{padding:16px}
.hg-sheet{gap:24px}
}
`;
}
