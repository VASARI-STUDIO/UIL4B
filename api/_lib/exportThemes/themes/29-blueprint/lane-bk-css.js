// Theme 29 (Blueprint), lane bk: the brand book stylesheet. The film and its inks are the sheet's own material (SHEET in index.js); the dark film
// is the same film stepped down in OKLCH lightness, and the redline is the brand's action stepped until it holds 7 : 1 on each film.
import { BOOK_SECTIONS } from '../../engine/book.js';
// copied from index.js (importing it from a lane would wait on the loader that is importing this lane)
const SHEET = { film: '#EEF1F2', film2: '#E1E6E9', hair: '#C3CBD0', ink: '#1F2A33', quiet: '#56636D' };
function redOf(ctx) {
  const C = ctx.C, L = ctx.roles.light, o = C.toOklch(L.action);
  const gap = Math.abs(o.H - 245), hueGap = Math.min(gap, 360 - gap);
  if (hueGap < 35 || o.C < 0.06) return '#B23A2A';
  let hex = L.action;
  for (let l = o.L; C.ratio(hex, SHEET.film) < 7 && l > 0.2; l -= 0.02) hex = C.fromOklch(l, o.C, o.H);
  return hex;
}

function darkSheet(ctx) {
  const C = ctx.C, f = C.toOklch(SHEET.film), at = (l, c = f.C) => C.fromOklch(l, c, f.H);
  return { film: at(0.2), film2: at(0.25), hair: at(0.4), ink: at(0.94), quiet: at(0.78) };
}
function redDark(ctx, film) {
  const C = ctx.C, o = C.toOklch(redOf(ctx));
  let hex = redOf(ctx);
  for (let l = o.L; C.ratio(hex, film) < 7 && l < 0.95; l += 0.02) hex = C.fromOklch(l, o.C, o.H);
  return hex;
}

// the revision cloud: a run of arcs along each edge, one strip per edge, tiled so a whole number of lobes fits the edge
const lobe = (hex, tile, d, w, h) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path d='${d}' fill='none' stroke='${hex}' stroke-width='1.25'/></svg>`)}")`;
const LOBES = { t: ['M0 9.4A9 8.8 0 0 1 18 9.4', 18, 10], b: ['M0 0.6A9 8.8 0 0 0 18 0.6', 18, 10], l: ['M9.4 0A8.8 9 0 0 0 9.4 18', 10, 18], r: ['M0.6 0A8.8 9 0 0 1 0.6 18', 10, 18] };
const cloudCss = (hex, sel) => Object.entries(LOBES).map(([k, [d, w, h]]) => `${sel} .bp-cloud__e--${k}{background-image:${lobe(hex, k, d, w, h)}}`).join('\n');

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, W = ctx.weights, K = darkSheet(ctx);
  const draw = BOOK_SECTIONS.map((s) => `.bk:has(.bk-nav a[data-sec="${s.id}"][aria-current]) #${s.id} .bp-rl line{animation:bp-draw 600ms cubic-bezier(.23,1,.32,1) both}`).join('\n');
  return `:root,.bk--board{--film:${SHEET.film};--film2:${SHEET.film2};--hair:${SHEET.hair};--ink:${SHEET.ink};--quiet:${SHEET.quiet};--red:${redOf(ctx)};--btext:${L.text};
--chrome:'Chivo','${B.fonts.body.family}';--mono:'Chivo Mono','Chivo';--display:'${d.family}','${B.fonts.body.family}';--body:'${B.fonts.body.family}','Chivo'}
[data-theme="dark"]{--film:${K.film};--film2:${K.film2};--hair:${K.hair};--ink:${K.ink};--quiet:${K.quiet};--red:${redDark(ctx, K.film)};--btext:${D.text}}
body{background:var(--film);color:var(--ink)}
.bk{background:var(--film);color:var(--ink);font:400 15px/1.6 var(--chrome);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.bp-for-dark{display:none}[data-theme="dark"] .bp-for-dark{display:inline}[data-theme="dark"] .bp-for-light{display:none}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--ink);color:var(--film);padding:12px 16px;font:500 13px/1 var(--chrome);text-decoration:none}
.bk-skip:focus{top:16px}
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:10px 32px;background:var(--film);border-bottom:1.5px solid var(--ink)}
.bk-brand{display:block;flex:none;text-decoration:none;width:132px}.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font:500 18px/1.2 var(--chrome)}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;flex-wrap:wrap;gap:0 20px;list-style:none;margin:0;padding:0}
.bk-nav a{display:flex;gap:6px;align-items:baseline;padding:10px 0;font:500 13px/1.2 var(--chrome);color:var(--ink);text-decoration:none;border-bottom:1.5px solid transparent;transition:border-color 120ms ease-out}
.bk-nav .bk-n{font-family:var(--mono);font-weight:400;font-size:12px;color:var(--quiet)}
.bk-nav a[aria-current]{border-bottom-color:var(--red)}
@media (hover:hover){.bk-nav a:hover{border-bottom-color:var(--hair)}}
.bk-mode{display:inline-flex;flex:none;border:1px solid var(--ink)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--ink);font:500 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--ink);color:var(--film)}
.bk-mode button:focus-visible{outline-offset:-4px}
.bk main{display:block;padding:40px 24px 0;overflow-x:clip}
.bk main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;max-width:1400px;margin:0 auto;padding:16px 0 48px;font:400 13px/1.4 var(--chrome);color:var(--quiet)}
.bk-live{position:fixed;left:50%;bottom:24px;z-index:40;padding:12px 20px;background:var(--ink);color:var(--film);font:500 13px/1.3 var(--chrome);visibility:hidden;transform:translate(-50%,12px);transition:transform 180ms cubic-bezier(.23,1,.32,1),visibility 0s 180ms;max-width:calc(100vw - 32px)}
.bk-live.is-on{visibility:visible;transform:translate(-50%,0);transition:transform 180ms cubic-bezier(.23,1,.32,1)}.bk-live:empty{display:none}

/* ---- the sheet: outer hairline frame, zone band, inner heavy frame, title strip ---- */
.bp-sec{position:relative;max-width:1400px;margin:0 auto 48px;padding:24px;border:1px solid var(--quiet);scroll-margin-top:72px}
.bp-zn{position:absolute;left:24px;right:24px;top:0;height:24px;display:grid;grid-template-columns:repeat(8,1fr)}
.bp-zn span{font:400 12px/24px var(--mono);color:var(--quiet);text-align:center;border-left:1px solid var(--quiet)}.bp-zn span:first-child{border-left:0}
.bp-cm{position:absolute;left:50%;top:0;width:1.5px;height:24px;background:var(--ink)}
.bp-zt{position:absolute;top:24px;bottom:24px;width:24px;height:calc(100% - 48px);color:var(--quiet)}.bp-zt path{stroke:currentColor;stroke-width:1}
.bp-zt--l{left:0}.bp-zt--r{right:0}
.bp-fr{position:relative;border:1.5px solid var(--ink);display:grid;grid-template-columns:minmax(0,1fr) 248px;grid-template-areas:"dw tb";background:var(--film)}
.bp-tb{grid-area:tb;border-left:1.5px solid var(--ink)}
.bp-tb__in{position:sticky;top:64px;display:flex;flex-direction:column}
.bp-tb__c{padding:12px 20px 14px;border-bottom:1px solid var(--hair);display:flex;flex-direction:column;gap:2px}
.bp-tb__c--d{border-bottom:1.5px solid var(--ink);padding-top:20px;padding-bottom:20px}
.bp-tb__t{font:500 26px/1.15 var(--chrome);color:var(--ink);overflow-wrap:anywhere}
.bp-tb__s{font:400 13px/1.4 var(--chrome);color:var(--quiet)}
.bp-tb__v{font:400 13px/1.45 var(--chrome)}.bp-tb__p{font-weight:500}
.bp-sn{font:400 22px/1.2 var(--mono)}.bp-sn__of{font-size:13px;color:var(--quiet)}
.bp-tb__lg{display:block;padding:20px}.bp-tb__lg svg{display:block;width:160px;height:auto}
.bp-dw{grid-area:dw;min-width:0;padding:48px 48px 64px;display:flex;flex-direction:column;gap:56px;container-type:inline-size}
.bp-lab{font:400 12px/16px var(--chrome);letter-spacing:.01em;color:var(--quiet);padding-bottom:8px;border-bottom:1px solid var(--hair);margin-bottom:16px}
.bp-m{font-family:var(--mono);font-weight:400}
.bp-disp{font-family:var(--display);font-weight:${W.heading};letter-spacing:-.01em;color:var(--btext)}
.bp-big{font:400 22px/1.45 var(--body);color:var(--btext);max-width:34em;text-wrap:pretty}
.bp-body{font:400 17px/1.6 var(--body);color:var(--btext)}
.bp-note{font:400 15px/1.6 var(--chrome);color:var(--ink);max-width:40em;text-wrap:pretty}
.bp-note__h{font-weight:500}
.bp-q{color:var(--quiet)}
.bp-h3{font:500 17px/1.3 var(--chrome);margin-bottom:16px}
.bp-measure-t{max-width:40em}.bp-block > .bp-measure-t:not(:last-child),.bp-block > .bp-note:not(:last-child){margin-bottom:16px}
.bp-block{display:flex;flex-direction:column}
.bp-split{display:grid;grid-template-columns:1fr 1fr;gap:48px}.bp-split > div{min-width:0;display:flex;flex-direction:column;gap:12px}
.bp-notes{display:flex;flex-direction:column;gap:12px}.bp-notes li{display:grid;grid-template-columns:32px 1fr}
.bp-notes__n{font:400 13px/24px var(--mono);color:var(--ink)}
.bp-tag{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border:1px solid var(--ink);border-radius:50%;font:400 12px/1 var(--mono);color:var(--ink)}
.bp-dt{display:flex;gap:12px;align-items:flex-start}
.bp-dt__t{display:flex;flex-direction:column;gap:4px;min-width:0}
.bp-dt__h{font:500 15px/28px var(--chrome);color:var(--ink);border-bottom:1.5px solid var(--ink);padding-right:32px;align-self:flex-start}
.bp-dt__n{font:400 13px/1.5 var(--chrome);color:var(--quiet);max-width:40em}

/* ---- redlines ---- */
.bp-rl{position:absolute;overflow:visible;color:var(--red)}.bp-rl line{stroke:currentColor;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:0}
.bp-rv{position:absolute;font:400 12px/14px var(--mono);color:var(--red);white-space:nowrap;background:var(--film);padding:0 4px}
.bp-dh{position:absolute;left:0;right:0;height:20px}
.bp-dh--top{bottom:calc(100% + var(--g))}.bp-dh--bottom{top:calc(100% + var(--g))}
.bp-dh .bp-rl{left:0;top:0}.bp-dh .bp-rv{left:50%;top:2px;transform:translateX(-50%)}
.bp-dv{position:absolute;top:0;bottom:0;left:calc(100% + var(--g));width:20px}
.bp-dv .bp-rl{left:0;top:0}.bp-dv .bp-rv{left:24px;top:calc(50% - 7px);padding:0}
.bp-at-s,.bp-at-m{display:none}
@keyframes bp-draw{from{stroke-dashoffset:1}}
@media (prefers-reduced-motion:no-preference){
${draw}
}

/* ---- overview ---- */
.bp-logo{display:block;width:100%}.bp-logo svg{display:block;width:100%;height:auto}
.bp-logo > .logo-slot{width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.bp-ga{padding:40px 0 0}
.bp-ga__lg{position:relative;width:640px}
.bp-hero{font-size:var(--fl);line-height:1;max-width:16ch;text-wrap:balance}
.bp-place{margin-top:20px;font:400 13px/1.4 var(--chrome);color:var(--quiet)}
.bp-traits{display:flex;flex-direction:column;gap:24px}
.bp-traits li{display:grid;grid-template-columns:auto 1fr 28px minmax(0,360px);gap:16px;align-items:center}
.bp-trait{font-size:44px;line-height:1}
.bp-lead{height:1px;background:var(--ink);position:relative}.bp-lead::before{content:"";position:absolute;left:-2px;top:-2px;width:5px;height:5px;border-radius:50%;background:var(--ink)}
/* voice */
.bp-details{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--ink)}
.bp-details li{display:flex;flex-direction:column;justify-content:space-between;gap:32px;padding:32px 32px 32px 0;border-bottom:1px solid var(--ink)}
.bp-details li:nth-child(2n){padding-left:32px;border-left:1px solid var(--ink)}
.bp-ex{font:500 28px/1.2 var(--body);color:var(--btext);letter-spacing:-.01em;text-wrap:pretty}
.bp-rev{display:flex;flex-direction:column}
.bp-rev__h,.bp-rev__r{display:grid;grid-template-columns:48px 1fr 1.2fr 1fr;gap:24px;align-items:start}
.bp-rev__h{font:400 12px/16px var(--chrome);color:var(--quiet);padding-bottom:8px;border-bottom:1.5px solid var(--ink)}
.bp-rev__r{padding:24px 0;border-bottom:1px solid var(--hair)}
.bp-delta{position:relative;width:28px;height:26px}.bp-delta svg{position:absolute;inset:0}.bp-delta path{fill:none;stroke:var(--ink);stroke-width:1}
.bp-delta .bp-m{position:absolute;left:0;right:0;top:9px;text-align:center;font-size:11px;line-height:14px}
.bp-was{font:400 15px/1.6 var(--chrome);color:var(--quiet)}.bp-was s{text-decoration-thickness:1px}
.bp-cloud{position:relative;display:inline-block;margin:10px;font:500 19px/1.4 var(--body);color:var(--btext);padding:8px 14px}
.bp-cloud__e{position:absolute;background-repeat:no-repeat;background-size:100% 100%;pointer-events:none}
.bp-cloud__e--t,.bp-cloud__e--b{left:0;right:0;height:10px;background-repeat:round no-repeat;background-size:18px 10px}
.bp-cloud__e--t{top:-10px}.bp-cloud__e--b{bottom:-10px}
.bp-cloud__e--l,.bp-cloud__e--r{top:0;bottom:0;width:10px;background-repeat:no-repeat round;background-size:10px 18px}
.bp-cloud__e--l{left:-10px}.bp-cloud__e--r{right:-10px}
${cloudCss(redOf(ctx), '')}
${cloudCss(redDark(ctx, K.film), '[data-theme="dark"]')}
.bp-takes{display:flex;flex-direction:column;gap:48px}
.bp-take{display:flex;flex-direction:column;gap:20px;align-items:flex-start}
.bp-measure{position:relative;max-width:520px;margin-top:28px}
.bp-lines{display:flex;flex-direction:column;gap:8px}.bp-lines li{font-size:28px;line-height:1.15}
.bp-lines--s{margin-top:12px}.bp-lines--s li{font-size:20px}
/* controls */
.bp-btn{appearance:none;display:inline-flex;align-items:center;height:40px;padding:0 16px;border:1px solid var(--ink);background:var(--film);color:var(--ink);font:500 13px/1 var(--chrome);text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,transform 120ms ease-out}
.bp-btn:active{transform:scale(.97)}.bp-btn.is-copied{background:var(--ink);color:var(--film)}
.bp-btn--prime{height:48px;padding:0 24px;font-size:15px;background:var(--ink);color:var(--film)}
@media (hover:hover){.bp-btn:hover{background:var(--film2)}.bp-btn--prime:hover{background:var(--quiet);border-color:var(--quiet)}}
.bp-val{appearance:none;border:1px solid transparent;background:transparent;color:var(--ink);font:400 13px/1.3 var(--mono);padding:4px 6px;margin:-4px -6px;cursor:pointer;text-align:left;transition:border-color 120ms ease-out}
@media (hover:hover){.bp-val:hover{border-color:var(--hair)}}
.bp-val.is-copied{border-color:var(--ink)}
.bp-dl{font:500 13px/1.4 var(--chrome);color:var(--ink);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.bp-dls{display:flex;flex-wrap:wrap;gap:4px 14px}
/* logo */
.bp-clear{display:flex;flex-direction:column;gap:24px;padding-top:40px}
.bp-clear__z{position:relative;display:flex;align-self:flex-start;margin-left:64px;padding:calc(480px / var(--ar) * var(--cs))}
.bp-clear__box{position:absolute;inset:0;border:1px dashed var(--ink)}
.bp-clear__pad{position:absolute;left:0;top:0;height:calc(480px / var(--ar) * var(--cs));width:0}
.bp-clear__pad .bp-dv{left:auto;right:calc(100% + 12px)}.bp-clear__pad .bp-dv .bp-rv{left:auto;right:24px}
.bp-clear__lg{position:relative;width:480px}
.bp-clear__lg .bp-dv .bp-rv{left:calc(480px / var(--ar) * var(--cs) - 2px)}
.bp-vers{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.bp-ver{display:grid;grid-template-columns:40px 240px minmax(0,1fr) auto;gap:24px;align-items:center;padding:16px 0;border-bottom:1px solid var(--hair)}
.bp-ver__n{font-size:13px}
.bp-ver__f{display:flex;align-items:center;justify-content:center;height:112px;box-shadow:inset 0 0 0 1px var(--hair)}
.bp-ver__t{display:flex;flex-direction:column;gap:4px}.bp-ver__k{font:500 15px/1.4 var(--chrome)}
.bp-min{padding-top:40px}.bp-min__lg{position:relative;display:inline-block}
/* colour */
.bp-fields{display:flex;align-items:flex-start;padding-bottom:40px}
.bp-field{position:relative;width:var(--w);flex:none}
.bp-field__f{display:flex;flex-direction:column;gap:2px;height:360px;padding:12px;box-shadow:inset 0 0 0 1px var(--hair);overflow:hidden}
.bp-field__n{font-size:12px}.bp-field__k{font:500 13px/1.3 var(--chrome)}
.bp-field__f.is-thin{width:100%;box-sizing:border-box;writing-mode:vertical-rl;flex-direction:row;align-items:center;gap:10px;padding:12px 0}
.bp-field__f.is-thin .bp-field__n,.bp-field__f.is-thin .bp-field__k{font-size:12px;line-height:1;white-space:nowrap}
.bp-fins{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.bp-fin{display:grid;grid-template-columns:40px 24px minmax(0,1fr) 260px;gap:20px;padding:20px 0;border-bottom:1px solid var(--hair);align-items:start}
.bp-fin__n{font-size:13px;line-height:24px}.bp-fin__sw{width:24px;height:24px;box-shadow:inset 0 0 0 1px var(--hair)}
.bp-fin__t{display:flex;flex-direction:column;gap:6px}.bp-fin__k{font:500 17px/24px var(--chrome)}
.bp-fin__v{display:flex;flex-direction:column;gap:8px}.bp-fin__v div{display:grid;grid-template-columns:56px 1fr}.bp-fin__v dt{font:400 12px/1.6 var(--chrome);color:var(--quiet)}
.bp-ramp{display:flex;margin-top:6px}.bp-ramp li{flex:1}
.bp-ramp__b{display:block;width:100%;height:24px;border:0;padding:0;cursor:pointer}.bp-ramp li.is-base .bp-ramp__b{box-shadow:inset 0 0 0 2px var(--ink)}
.bp-prs{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.bp-pr{display:grid;grid-template-columns:96px minmax(0,1fr) 96px;gap:20px;align-items:center;padding:10px 0;border-bottom:1px solid var(--hair)}
.bp-pr__s{display:flex;align-items:center;justify-content:center;height:48px;box-shadow:inset 0 0 0 1px var(--hair)}
.bp-pr__a{font:600 24px/1 var(--body)}.bp-pr__r{text-align:right;font-size:13px}
.bp-roles li{display:grid;grid-template-columns:20px 1fr auto;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid var(--hair)}
.bp-roles__sw{width:20px;height:20px;box-shadow:inset 0 0 0 1px var(--hair)}.bp-roles__n{font-size:14px}
/* typography */
.bp-letter{position:relative;display:flex;flex-direction:column;gap:20px}
.bp-letter__t{position:relative;font-size:112px;line-height:1;max-width:11ch;padding-left:56px}
.bp-letter__cap{position:absolute;left:0;top:calc((1em - 0.72em) / 2);height:.72em;width:0}
.bp-letter__cap .bp-dv{left:16px}.bp-letter__cap .bp-rv{font-size:12px;letter-spacing:0;left:-4px;top:auto;bottom:calc(100% + 6px)}
.bp-wts{display:flex;flex-wrap:wrap;gap:8px 28px;font:400 20px/1.3 var(--body);color:var(--btext)}.bp-wts .bp-m{font-size:12px;color:var(--quiet)}
.bp-faces{display:flex;flex-direction:column;gap:28px}.bp-face{display:grid;grid-template-columns:40px 1fr}.bp-faces__l{margin-top:28px}
.bp-face__d{font-size:56px;line-height:1.05}.bp-face__b{font:400 40px/1.1 var(--body);color:var(--btext)}.bp-face__m{font:400 32px/1.2 '${B.fonts.mono ? B.fonts.mono.family : B.fonts.body.family}';color:var(--btext)}
.bp-tester{display:flex;flex-direction:column;gap:20px;border:1px solid var(--ink);padding:24px}
.bp-tester__c{display:grid;grid-template-columns:1fr 280px;gap:24px}
.bp-field-in{display:flex;flex-direction:column;gap:6px}.bp-field-in label{font:400 12px/16px var(--chrome);color:var(--quiet);display:flex;justify-content:space-between}
.bp-field-in input[type=text]{height:44px;border:1px solid var(--ink);background:var(--film);color:var(--ink);padding:0 12px;font:400 15px var(--chrome);border-radius:0}
.bp-field-in input[type=range]{accent-color:var(--ink);height:44px}
.bp-tester__out{font-size:var(--tester-size,56px);line-height:1.05;overflow-wrap:anywhere}
.bp-scale li{display:grid;grid-template-columns:260px minmax(0,1fr);gap:32px;padding:20px 0;border-bottom:1px solid var(--hair)}
.bp-scale li:first-child{grid-template-columns:minmax(0,1fr);gap:12px}.bp-scale li:first-child .bp-scale__s{max-width:none}
.bp-scale{border-top:1.5px solid var(--ink)}.bp-scale__t{font:500 15px/1.4 var(--chrome)}.bp-scale__k .bp-q{font-size:13px;line-height:1.5}
.bp-scale__s{font-family:var(--body);color:var(--btext);max-width:36em}.bp-scale__s.bp-disp{font-family:var(--display)}
/* imagery */
.bp-ph{display:flex;flex-direction:column;gap:16px}
.bp-photo{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
.bp-ph .bp-photo{box-shadow:0 0 0 1.5px var(--ink)}
/* an empty frame is drawn as the drafter marks a place for a photograph: the film's tone, a hairline edge and a centre cross */
.bp-photo.photo-slot{position:relative;background:var(--film2);box-shadow:inset 0 0 0 1px var(--hair);color:var(--quiet)}
.bp-ph .bp-photo.photo-slot{box-shadow:inset 0 0 0 1.5px var(--ink)}
.bp-photo.photo-slot::before,.bp-photo.photo-slot::after{content:"";position:absolute;background:var(--hair)}
.bp-photo.photo-slot::before{left:0;right:0;top:50%;height:1px}
.bp-photo.photo-slot::after{top:0;bottom:0;left:50%;width:1px}
.bp-shots{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.bp-shotl figure{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;padding:16px 0;border-bottom:1px solid var(--hair)}
.bp-shotl figcaption{display:flex;gap:12px;align-items:flex-start}.bp-shotl__t{display:flex;flex-direction:column;gap:4px;min-width:0}
/* layout */
.bp-gd{display:flex;flex-direction:column;gap:16px;padding-top:84px}
.bp-gd__dims{position:relative;width:var(--w);height:0}.bp-gd__d{position:absolute;top:0;height:0}
.bp-gd__p{position:relative;width:var(--w)}.bp-gd__p > svg{display:block;height:auto}
.bp-gd__d .bp-rv{left:auto;right:calc(100% + 6px);transform:none}
.bp-lay{display:flex;flex-direction:column;gap:56px}
@media (min-width:1200px){
.bp-lay{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0 120px;align-items:start}
.bp-lay .bp-meas{grid-template-columns:minmax(0,1fr);margin-top:100px;max-width:320px}
.bp-lay .bp-meas div + div{padding-left:0;border-left:0;border-top:1px solid var(--hair)}
}
.bp-gd__pg{fill:none;stroke:var(--ink);stroke-width:1.5}.bp-gd__c rect{fill:var(--film2);stroke:var(--quiet);stroke-width:1}
.bp-gd--n{display:none}
.bp-meas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1.5px solid var(--ink);border-bottom:1px solid var(--hair)}
.bp-meas div{padding:16px 16px 16px 0}.bp-meas div + div{padding-left:16px;border-left:1px solid var(--hair)}
.bp-meas dt{font:400 12px/16px var(--chrome);color:var(--quiet)}.bp-meas__v{font:400 32px/1.2 var(--mono)}
.bp-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px}.bp-space li{display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:12px}
.bp-space__b{display:block;border:1px solid var(--ink);background:var(--film2)}
.bp-radii{display:flex;flex-direction:column;gap:12px}.bp-radii li{display:flex;gap:16px;align-items:center}
.bp-radii__b{flex:none;width:56px;height:40px;border:1.5px solid var(--ink);background:var(--film2)}
/* applications */
.bp-shot{position:relative;overflow:hidden;box-shadow:0 0 0 1.5px var(--ink)}.bp-shot img,.bp-shot svg.pl{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bp-app{display:flex;flex-direction:column;gap:16px}
.bp-app--card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:start}
.bp-app__flat{display:flex;flex-direction:column;gap:48px}
.bp-cards{display:flex;flex-direction:column;gap:32px;padding-top:12px}
.bp-app--flat{grid-template-columns:minmax(0,1fr)}.bp-app--flat .bp-cards{flex-direction:row;flex-wrap:wrap;gap:48px}
.bp-card__w{position:relative;width:340px}
.bp-card{position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--hair)}
.bp-card .a{position:absolute}.bp-card .nw{white-space:nowrap}.bp-card .bn{font-family:var(--body)}.bp-card .bd{font-family:var(--display);font-weight:${W.heading}}
.bp-card .bp-logo svg,.bp-card svg{display:block;width:100%;height:auto}
.bp-apps{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.bp-sig{display:flex;flex-direction:column;gap:4px;margin-top:16px;padding-top:16px;border-top:1px solid var(--hair)}.bp-sig__n{font:600 17px/1.4 var(--body);color:var(--btext)}.bp-sig__l{width:168px;margin-top:12px}
/* downloads */
.bp-zip{display:flex;flex-direction:column;gap:20px;align-items:flex-start}
.bp-zip__n{font-size:${'clamp(40px,6cqw,80px)'};line-height:1}
.bp-zip__a{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center}
.bp-grps{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.bp-grp{display:grid;grid-template-columns:300px minmax(0,1fr);gap:32px;padding:24px 0;border-bottom:1px solid var(--hair)}
.bp-file{display:grid;grid-template-columns:32px minmax(0,1fr) 48px 72px auto;gap:12px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--hair)}
.bp-file--logo{grid-template-columns:32px 140px minmax(0,1fr)}
.bp-file__no,.bp-file__f,.bp-file__s{font-size:12px;color:var(--quiet)}.bp-file__n{overflow-wrap:anywhere;font-size:14px}
.bp-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:4px 16px;margin-bottom:12px}
.bp-icon{display:flex;gap:8px;align-items:center;padding:6px 0;font:400 13px/1.3 var(--chrome);text-decoration:none}.bp-icon svg{flex:none}
@media (hover:hover){.bp-icon:hover span,.bp-dl:hover{text-decoration-thickness:2px}}

@media (max-width:1199px){
.bp-at-l{display:none}.bp-at-m{display:inline}
.bp-ga__lg{width:400px}.bp-clear__lg{width:320px}.bp-clear__z{padding:calc(320px / var(--ar) * var(--cs))}.bp-clear__pad{height:calc(320px / var(--ar) * var(--cs))}.bp-clear__lg .bp-dv .bp-rv{left:calc(320px / var(--ar) * var(--cs) - 2px)}
.bp-letter__t{font-size:72px}
.bk-top{flex-wrap:wrap;padding:10px 16px;gap:12px}
.bk-menu{display:inline-flex;margin-left:auto;appearance:none;align-items:center;height:44px;padding:0 14px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--ink);color:var(--film)}
.bk-nav{display:none;order:3;flex-basis:100%}.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}.bk-nav a{padding:12px 0;font-size:15px}
.bk-mode button{height:44px}
}
@media (max-width:840px){
.bp-at-m{display:none}.bp-at-s{display:inline}
.bk main{padding:24px 8px 0}
.bp-sec{padding:8px;margin-bottom:32px}
.bp-zn,.bp-zt,.bp-cm{display:none}
.bp-fr{grid-template-columns:minmax(0,1fr);grid-template-areas:"tb" "dw"}
.bp-tb{border-left:0;border-bottom:1.5px solid var(--ink)}
.bp-tb__in{position:static;display:grid;grid-template-columns:1fr 1fr}
.bp-tb__c{padding:10px 14px}.bp-tb__c:nth-child(odd){border-right:1px solid var(--hair)}
.bp-tb__c--d{grid-column:1 / -1;border-right:0!important}
.bp-tb__c:nth-child(4){border-right:1px solid var(--hair)}.bp-tb__c:nth-child(5){border-right:0}
.bp-tb__lg{display:none}
.bp-tb__t{font-size:22px}
.bp-dw{padding:28px 16px 40px;gap:40px}
.bp-ga__lg{width:280px}.bp-hero{font-size:var(--fs)}
.bp-traits li{grid-template-columns:28px 1fr;gap:8px 12px}.bp-traits .bp-lead{display:none}.bp-traits .bp-trait{grid-column:1 / -1;font-size:32px}
.bp-split,.bp-details,.bp-apps,.bp-app--card{grid-template-columns:minmax(0,1fr);gap:32px}
.bp-details li:nth-child(2n){padding-left:0;border-left:0}.bp-details li{padding:24px 0}
.bp-ex{font-size:22px}
.bp-rev__h{display:none}.bp-rev__r{grid-template-columns:40px minmax(0,1fr);gap:12px}.bp-rev__r > :nth-child(n+2){grid-column:2}
.bp-cloud{font-size:17px}
.bp-measure{margin-top:0}.bp-measure .bp-dh{display:none}
.bp-clear__lg{width:180px}.bp-clear__z{padding:calc(180px / var(--ar) * var(--cs));margin-left:48px}.bp-clear__pad{height:calc(180px / var(--ar) * var(--cs))}
.bp-clear__lg .bp-dv .bp-rv{left:calc(180px / var(--ar) * var(--cs) - 2px)}
.bp-ver{grid-template-columns:32px minmax(0,1fr);gap:12px}.bp-ver__f,.bp-ver__t,.bp-ver .bp-dls{grid-column:2}
.bp-fields{flex-direction:column;align-items:stretch;padding-bottom:0}
.bp-field{width:auto}.bp-field .bp-dh{display:none}.bp-field__f,.bp-field__f.is-thin{height:var(--h);writing-mode:horizontal-tb;flex-direction:row;align-items:center;gap:12px;padding:12px}.bp-field__s{margin-left:auto}
.bp-fin{grid-template-columns:32px 24px minmax(0,1fr);gap:12px}.bp-fin__v{grid-column:3}
.bp-pr{grid-template-columns:64px minmax(0,1fr) 64px;gap:12px}
.bp-letter__t{font-size:44px;padding-left:44px}
.bp-face__d{font-size:36px}.bp-face__b{font-size:28px}.bp-face__m{font-size:22px}
.bp-tester{padding:16px}.bp-tester__c{grid-template-columns:minmax(0,1fr)}
.bp-scale li{grid-template-columns:minmax(0,1fr);gap:12px}
.bp-shotl figure{grid-template-columns:minmax(0,1fr);gap:12px}
.bp-gd--w{display:none}.bp-gd--n{display:flex;padding-left:46px}
.bp-meas{grid-template-columns:1fr 1fr}.bp-meas div:nth-child(3){padding-left:0;border-left:0}.bp-meas div:nth-child(n+3){border-top:1px solid var(--hair)}
.bp-card__w{width:340px;max-width:100%}.bp-card__w .bp-dv{display:none}.bp-cards{padding-top:28px}
.bp-card{zoom:.94}
.bp-grp{grid-template-columns:minmax(0,1fr);gap:16px}
.bp-file{grid-template-columns:28px minmax(0,1fr) auto;gap:4px 10px}.bp-file__f,.bp-file__s{grid-column:2;display:inline}.bp-file .bp-dl{grid-column:3;grid-row:1}
.bp-file--logo{grid-template-columns:28px minmax(0,1fr)}.bp-file--logo .bp-dls{grid-column:2}
}
@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bp-btn:active{transform:none}}`;
}
