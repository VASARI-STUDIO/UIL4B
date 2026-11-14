// Theme 29 (Blueprint), lane hg: the guide site stylesheet, the sheet and its drafting marks. Derived from the book's (lane-bk-css.js) with every class renamed hg-.
// The film and its inks are the sheet's own material (SHEET in index.js); the dark film is the same film stepped down in OKLCH lightness.
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
const cloudCss = (hex, sel) => Object.entries(LOBES).map(([k, [d, w, h]]) => `${sel} .hg-cloud__e--${k}{background-image:${lobe(hex, k, d, w, h)}}`).join('\n');

export function baseCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, W = ctx.weights, K = darkSheet(ctx);
  return `:root{--film:${SHEET.film};--film2:${SHEET.film2};--hair:${SHEET.hair};--ink:${SHEET.ink};--quiet:${SHEET.quiet};--red:${redOf(ctx)};--btext:${L.text};
--chrome:'Chivo','${B.fonts.body.family}';--mono:'Chivo Mono','Chivo';--display:'${d.family}','${B.fonts.body.family}';--body:'${B.fonts.body.family}','Chivo'}
[data-theme="dark"]{--film:${K.film};--film2:${K.film2};--hair:${K.hair};--ink:${K.ink};--quiet:${K.quiet};--red:${redDark(ctx, K.film)};--btext:${D.text}}

/* ---- the sheet: outer hairline frame, zone band, inner heavy frame, title strip ---- */
.hg-sec{position:relative;max-width:1400px;margin:0 auto 48px;padding:24px;border:1px solid var(--quiet);scroll-margin-top:72px}
.hg-zn{position:absolute;left:24px;right:24px;top:0;height:24px;display:grid;grid-template-columns:repeat(8,1fr)}
.hg-zn span{font:400 12px/24px var(--mono);color:var(--quiet);text-align:center;border-left:1px solid var(--quiet)}.hg-zn span:first-child{border-left:0}
.hg-cm{position:absolute;left:50%;top:0;width:1.5px;height:24px;background:var(--ink)}
.hg-zt{position:absolute;top:24px;bottom:24px;width:24px;height:calc(100% - 48px);color:var(--quiet)}.hg-zt path{stroke:currentColor;stroke-width:1}
.hg-zt--l{left:0}.hg-zt--r{right:0}
.hg-fr{position:relative;border:1.5px solid var(--ink);display:grid;grid-template-columns:minmax(0,1fr) 248px;grid-template-areas:"dw tb";background:var(--film)}
.hg-tb{grid-area:tb;border-left:1.5px solid var(--ink)}
.hg-tb__in{position:sticky;top:64px;display:flex;flex-direction:column}
.hg-tb__c{padding:12px 20px 14px;border-bottom:1px solid var(--hair);display:flex;flex-direction:column;gap:2px}
.hg-tb__c--d{border-bottom:1.5px solid var(--ink);padding-top:20px;padding-bottom:20px}
.hg-tb__t{font:500 26px/1.15 var(--chrome);color:var(--ink);overflow-wrap:anywhere}
.hg-tb__s{font:400 13px/1.4 var(--chrome);color:var(--quiet)}
.hg-tb__v{font:400 13px/1.45 var(--chrome)}.hg-tb__p{font-weight:500}
.hg-sn{font:400 22px/1.2 var(--mono)}.hg-sn__of{font-size:13px;color:var(--quiet)}
.hg-tb__lg{display:block;padding:20px}.hg-tb__lg svg{display:block;width:160px;height:auto}
.hg-dw{grid-area:dw;min-width:0;padding:48px 48px 64px;display:flex;flex-direction:column;gap:56px;container-type:inline-size}
.hg-lab{font:400 12px/16px var(--chrome);letter-spacing:.01em;color:var(--quiet);padding-bottom:8px;border-bottom:1px solid var(--hair);margin-bottom:16px}
.hg-m{font-family:var(--mono);font-weight:400}
.hg-disp{font-family:var(--display);font-weight:${W.heading};letter-spacing:-.01em;color:var(--btext)}
.hg-big{font:400 22px/1.45 var(--body);color:var(--btext);max-width:34em;text-wrap:pretty}
.hg-body{font:400 17px/1.6 var(--body);color:var(--btext)}
.hg-note{font:400 15px/1.6 var(--chrome);color:var(--ink);max-width:40em;text-wrap:pretty}
.hg-note__h{font-weight:500}
.hg-q{color:var(--quiet)}
.hg-h3{font:500 17px/1.3 var(--chrome);margin-bottom:16px}
.hg-measure-t{max-width:40em}.hg-block > .hg-measure-t:not(:last-child),.hg-block > .hg-note:not(:last-child){margin-bottom:16px}
.hg-block{display:flex;flex-direction:column}
.hg-split{display:grid;grid-template-columns:1fr 1fr;gap:48px}.hg-split > div{min-width:0;display:flex;flex-direction:column;gap:12px}
.hg-notes{display:flex;flex-direction:column;gap:12px}.hg-notes li{display:grid;grid-template-columns:32px 1fr}
.hg-notes__n{font:400 13px/24px var(--mono);color:var(--ink)}
.hg-tag{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border:1px solid var(--ink);border-radius:50%;font:400 12px/1 var(--mono);color:var(--ink)}
.hg-dt{display:flex;gap:12px;align-items:flex-start}
.hg-dt__t{display:flex;flex-direction:column;gap:4px;min-width:0}
.hg-dt__h{font:500 15px/28px var(--chrome);color:var(--ink);border-bottom:1.5px solid var(--ink);padding-right:32px;align-self:flex-start}
.hg-dt__n{font:400 13px/1.5 var(--chrome);color:var(--quiet);max-width:40em}

/* ---- redlines ---- */
.hg-rl{position:absolute;overflow:visible;color:var(--red)}.hg-rl line{stroke:currentColor;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:0}
.hg-rv{position:absolute;font:400 12px/14px var(--mono);color:var(--red);white-space:nowrap;background:var(--film);padding:0 4px}
.hg-dh{position:absolute;left:0;right:0;height:20px}
.hg-dh--top{bottom:calc(100% + var(--g))}.hg-dh--bottom{top:calc(100% + var(--g))}
.hg-dh .hg-rl{left:0;top:0}.hg-dh .hg-rv{left:50%;top:2px;transform:translateX(-50%)}
.hg-dv{position:absolute;top:0;bottom:0;left:calc(100% + var(--g));width:20px}
.hg-dv .hg-rl{left:0;top:0}.hg-dv .hg-rv{left:24px;top:calc(50% - 7px);padding:0}
.hg-at-s,.hg-at-m{display:none}
@keyframes hg-draw{from{stroke-dashoffset:1}}
@media (prefers-reduced-motion:no-preference){
.hg-rl line{animation:hg-draw 600ms cubic-bezier(.23,1,.32,1) both}
}

/* ---- overview ---- */
.hg-logo{display:block;width:100%}.hg-logo svg{display:block;width:100%;height:auto}
.hg-logo > .logo-slot{width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.hg-ga{padding:40px 0 0}
.hg-ga__lg{position:relative;width:640px}
.hg-hero{font-size:var(--fl);line-height:1;max-width:16ch;text-wrap:balance}
.hg-place{margin-top:20px;font:400 13px/1.4 var(--chrome);color:var(--quiet)}
.hg-traits{display:flex;flex-direction:column;gap:24px}
.hg-traits li{display:grid;grid-template-columns:auto 1fr 28px minmax(0,360px);gap:16px;align-items:center}
.hg-trait{font-size:44px;line-height:1}
.hg-lead{height:1px;background:var(--ink);position:relative}.hg-lead::before{content:"";position:absolute;left:-2px;top:-2px;width:5px;height:5px;border-radius:50%;background:var(--ink)}
/* voice */
.hg-details{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--ink)}
.hg-details li{display:flex;flex-direction:column;justify-content:space-between;gap:32px;padding:32px 32px 32px 0;border-bottom:1px solid var(--ink)}
.hg-details li:nth-child(2n){padding-left:32px;border-left:1px solid var(--ink)}
.hg-ex{font:500 28px/1.2 var(--body);color:var(--btext);letter-spacing:-.01em;text-wrap:pretty}
.hg-rev{display:flex;flex-direction:column}
.hg-rev__h,.hg-rev__r{display:grid;grid-template-columns:48px 1fr 1.2fr 1fr;gap:24px;align-items:start}
.hg-rev__h{font:400 12px/16px var(--chrome);color:var(--quiet);padding-bottom:8px;border-bottom:1.5px solid var(--ink)}
.hg-rev__r{padding:24px 0;border-bottom:1px solid var(--hair)}
.hg-delta{position:relative;width:28px;height:26px}.hg-delta svg{position:absolute;inset:0}.hg-delta path{fill:none;stroke:var(--ink);stroke-width:1}
.hg-delta .hg-m{position:absolute;left:0;right:0;top:9px;text-align:center;font-size:11px;line-height:14px}
.hg-was{font:400 15px/1.6 var(--chrome);color:var(--quiet)}.hg-was s{text-decoration-thickness:1px}
.hg-cloud{position:relative;display:inline-block;margin:10px;font:500 19px/1.4 var(--body);color:var(--btext);padding:8px 14px}
.hg-cloud__e{position:absolute;background-repeat:no-repeat;background-size:100% 100%;pointer-events:none}
.hg-cloud__e--t,.hg-cloud__e--b{left:0;right:0;height:10px;background-repeat:round no-repeat;background-size:18px 10px}
.hg-cloud__e--t{top:-10px}.hg-cloud__e--b{bottom:-10px}
.hg-cloud__e--l,.hg-cloud__e--r{top:0;bottom:0;width:10px;background-repeat:no-repeat round;background-size:10px 18px}
.hg-cloud__e--l{left:-10px}.hg-cloud__e--r{right:-10px}
${cloudCss(redOf(ctx), '')}
${cloudCss(redDark(ctx, K.film), '[data-theme="dark"]')}
.hg-takes{display:flex;flex-direction:column;gap:48px}
.hg-take{display:flex;flex-direction:column;gap:20px;align-items:flex-start}
.hg-measure{position:relative;max-width:520px;margin-top:28px}
.hg-lines{display:flex;flex-direction:column;gap:8px}.hg-lines li{font-size:28px;line-height:1.15}
.hg-lines--s{margin-top:12px}.hg-lines--s li{font-size:20px}
/* controls */
.hg-btn{appearance:none;display:inline-flex;align-items:center;height:40px;padding:0 16px;border:1px solid var(--ink);background:var(--film);color:var(--ink);font:500 13px/1 var(--chrome);text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,transform 120ms ease-out}
.hg-btn:active{transform:scale(.97)}.hg-btn.is-copied{background:var(--ink);color:var(--film)}
.hg-btn--prime{height:48px;padding:0 24px;font-size:15px;background:var(--ink);color:var(--film)}
@media (hover:hover){.hg-btn:hover{background:var(--film2)}.hg-btn--prime:hover{background:var(--quiet);border-color:var(--quiet)}}
.hg-val{appearance:none;border:1px solid transparent;background:transparent;color:var(--ink);font:400 13px/1.3 var(--mono);padding:4px 6px;margin:-4px -6px;cursor:pointer;text-align:left;transition:border-color 120ms ease-out}
@media (hover:hover){.hg-val:hover{border-color:var(--hair)}}
.hg-val.is-copied{border-color:var(--ink)}
.hg-dl{font:500 13px/1.4 var(--chrome);color:var(--ink);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.hg-dls{display:flex;flex-wrap:wrap;gap:4px 14px}
/* logo */
.hg-clear{display:flex;flex-direction:column;gap:24px;padding-top:40px}
.hg-clear__z{position:relative;display:flex;align-self:flex-start;margin-left:64px;padding:calc(480px / var(--ar) * var(--cs))}
.hg-clear__box{position:absolute;inset:0;border:1px dashed var(--ink)}
.hg-clear__pad{position:absolute;left:0;top:0;height:calc(480px / var(--ar) * var(--cs));width:0}
.hg-clear__pad .hg-dv{left:auto;right:calc(100% + 12px)}.hg-clear__pad .hg-dv .hg-rv{left:auto;right:24px}
.hg-clear__lg{position:relative;width:480px}
.hg-clear__lg .hg-dv .hg-rv{left:calc(480px / var(--ar) * var(--cs) - 2px)}
.hg-vers{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-ver{display:grid;grid-template-columns:40px 240px minmax(0,1fr) auto;gap:24px;align-items:center;padding:16px 0;border-bottom:1px solid var(--hair)}
.hg-ver__n{font-size:13px}
.hg-ver__f{display:flex;align-items:center;justify-content:center;height:112px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-ver__t{display:flex;flex-direction:column;gap:4px}.hg-ver__k{font:500 15px/1.4 var(--chrome)}
.hg-min{padding-top:40px}.hg-min__lg{position:relative;display:inline-block}
/* colour */
.hg-fields{display:flex;align-items:flex-start;padding-bottom:40px}
.hg-field{position:relative;width:var(--w);flex:none}
.hg-field__f{display:flex;flex-direction:column;gap:2px;height:360px;padding:12px;box-shadow:inset 0 0 0 1px var(--hair);overflow:hidden}
.hg-field__n{font-size:12px}.hg-field__k{font:500 13px/1.3 var(--chrome)}
.hg-field__f.is-thin{width:100%;box-sizing:border-box;writing-mode:vertical-rl;flex-direction:row;align-items:center;gap:10px;padding:12px 0}
.hg-field__f.is-thin .hg-field__n,.hg-field__f.is-thin .hg-field__k{font-size:12px;line-height:1;white-space:nowrap}
.hg-fins{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-fin{display:grid;grid-template-columns:40px 24px minmax(0,1fr) 260px;gap:20px;padding:20px 0;border-bottom:1px solid var(--hair);align-items:start}
.hg-fin__n{font-size:13px;line-height:24px}.hg-fin__sw{width:24px;height:24px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-fin__t{display:flex;flex-direction:column;gap:6px}.hg-fin__k{font:500 17px/24px var(--chrome)}
.hg-fin__v{display:flex;flex-direction:column;gap:8px}.hg-fin__v div{display:grid;grid-template-columns:56px 1fr}.hg-fin__v dt{font:400 12px/1.6 var(--chrome);color:var(--quiet)}
.hg-ramp{display:flex;margin-top:6px}.hg-ramp li{flex:1}
.hg-ramp__b{display:block;width:100%;height:24px;border:0;padding:0;cursor:pointer}.hg-ramp li.is-base .hg-ramp__b{box-shadow:inset 0 0 0 2px var(--ink)}
.hg-prs{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-pr{display:grid;grid-template-columns:96px minmax(0,1fr) 96px;gap:20px;align-items:center;padding:10px 0;border-bottom:1px solid var(--hair)}
.hg-pr__s{display:flex;align-items:center;justify-content:center;height:48px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-pr__a{font:600 24px/1 var(--body)}.hg-pr__r{text-align:right;font-size:13px}
.hg-roles li{display:grid;grid-template-columns:20px 1fr auto;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid var(--hair)}
.hg-roles__sw{width:20px;height:20px;box-shadow:inset 0 0 0 1px var(--hair)}.hg-roles__n{font-size:14px}
/* typography */
.hg-letter{position:relative;display:flex;flex-direction:column;gap:20px}
.hg-letter__t{position:relative;font-size:112px;line-height:1;max-width:11ch;padding-left:56px}
.hg-letter__cap{position:absolute;left:0;top:calc((1em - 0.72em) / 2);height:.72em;width:0}
.hg-letter__cap .hg-dv{left:16px}.hg-letter__cap .hg-rv{font-size:12px;letter-spacing:0;left:-4px;top:auto;bottom:calc(100% + 6px)}
.hg-wts{display:flex;flex-wrap:wrap;gap:8px 28px;font:400 20px/1.3 var(--body);color:var(--btext)}.hg-wts .hg-m{font-size:12px;color:var(--quiet)}
.hg-faces{display:flex;flex-direction:column;gap:28px}.hg-face{display:grid;grid-template-columns:40px 1fr}.hg-faces__l{margin-top:28px}
.hg-face__d{font-size:56px;line-height:1.05}.hg-face__b{font:400 40px/1.1 var(--body);color:var(--btext)}.hg-face__m{font:400 32px/1.2 '${B.fonts.mono ? B.fonts.mono.family : B.fonts.body.family}';color:var(--btext)}
.hg-tester{display:flex;flex-direction:column;gap:20px;border:1px solid var(--ink);padding:24px}
.hg-tester__c{display:grid;grid-template-columns:1fr 280px;gap:24px}
.hg-field-in{display:flex;flex-direction:column;gap:6px}.hg-field-in label{font:400 12px/16px var(--chrome);color:var(--quiet);display:flex;justify-content:space-between}
.hg-field-in input[type=text]{height:44px;border:1px solid var(--ink);background:var(--film);color:var(--ink);padding:0 12px;font:400 15px var(--chrome);border-radius:0}
.hg-field-in input[type=range]{accent-color:var(--ink);height:44px}
.hg-tester__out{font-size:var(--tester-size,56px);line-height:1.05;overflow-wrap:anywhere}
.hg-scale li{display:grid;grid-template-columns:260px minmax(0,1fr);gap:32px;padding:20px 0;border-bottom:1px solid var(--hair)}
.hg-scale li:first-child{grid-template-columns:minmax(0,1fr);gap:12px}.hg-scale li:first-child .hg-scale__s{max-width:none}
.hg-scale{border-top:1.5px solid var(--ink)}.hg-scale__t{font:500 15px/1.4 var(--chrome)}.hg-scale__k .hg-q{font-size:13px;line-height:1.5}
.hg-scale__s{font-family:var(--body);color:var(--btext);max-width:36em}.hg-scale__s.hg-disp{font-family:var(--display)}
/* imagery */
.hg-ph{display:flex;flex-direction:column;gap:16px}
.hg-photo{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
.hg-ph .hg-photo{box-shadow:0 0 0 1.5px var(--ink)}
/* an empty frame is drawn as the drafter marks a place for a photograph: the film's tone, a hairline edge and a centre cross */
.hg-photo.photo-slot{position:relative;background:var(--film2);box-shadow:inset 0 0 0 1px var(--hair);color:var(--quiet)}
.hg-ph .hg-photo.photo-slot{box-shadow:inset 0 0 0 1.5px var(--ink)}
.hg-photo.photo-slot::before,.hg-photo.photo-slot::after{content:"";position:absolute;background:var(--hair)}
.hg-photo.photo-slot::before{left:0;right:0;top:50%;height:1px}
.hg-photo.photo-slot::after{top:0;bottom:0;left:50%;width:1px}
.hg-shots{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-shotl figure{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;padding:16px 0;border-bottom:1px solid var(--hair)}
.hg-shotl figcaption{display:flex;gap:12px;align-items:flex-start}.hg-shotl__t{display:flex;flex-direction:column;gap:4px;min-width:0}
/* layout */
.hg-gd{display:flex;flex-direction:column;gap:16px;padding-top:84px}
.hg-gd__dims{position:relative;width:var(--w);height:0}.hg-gd__d{position:absolute;top:0;height:0}
.hg-gd__p{position:relative;width:var(--w)}.hg-gd__p > svg{display:block;height:auto}
.hg-gd__d .hg-rv{left:auto;right:calc(100% + 6px);transform:none}
.hg-lay{display:flex;flex-direction:column;gap:56px}
@media (min-width:1200px){
.hg-lay{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0 120px;align-items:start}
.hg-lay .hg-meas{grid-template-columns:minmax(0,1fr);margin-top:100px;max-width:320px}
.hg-lay .hg-meas div + div{padding-left:0;border-left:0;border-top:1px solid var(--hair)}
}
.hg-gd__pg{fill:none;stroke:var(--ink);stroke-width:1.5}.hg-gd__c rect{fill:var(--film2);stroke:var(--quiet);stroke-width:1}
.hg-gd--n{display:none}
.hg-meas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1.5px solid var(--ink);border-bottom:1px solid var(--hair)}
.hg-meas div{padding:16px 16px 16px 0}.hg-meas div + div{padding-left:16px;border-left:1px solid var(--hair)}
.hg-meas dt{font:400 12px/16px var(--chrome);color:var(--quiet)}.hg-meas__v{font:400 32px/1.2 var(--mono)}
.hg-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px}.hg-space li{display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:12px}
.hg-space__b{display:block;border:1px solid var(--ink);background:var(--film2)}
.hg-radii{display:flex;flex-direction:column;gap:12px}.hg-radii li{display:flex;gap:16px;align-items:center}
.hg-radii__b{flex:none;width:56px;height:40px;border:1.5px solid var(--ink);background:var(--film2)}
/* applications */
.hg-shot{position:relative;overflow:hidden;box-shadow:0 0 0 1.5px var(--ink)}.hg-shot img,.hg-shot svg.pl{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hg-app{display:flex;flex-direction:column;gap:16px}
.hg-app--card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:start}
.hg-app__flat{display:flex;flex-direction:column;gap:48px}
.hg-cards{display:flex;flex-direction:column;gap:32px;padding-top:12px}
.hg-card__w{position:relative;width:340px}
.hg-card{position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--hair)}
.hg-card .a{position:absolute}.hg-card .nw{white-space:nowrap}.hg-card .bn{font-family:var(--body)}.hg-card .bd{font-family:var(--display);font-weight:${W.heading}}
.hg-card .hg-logo svg,.hg-card svg{display:block;width:100%;height:auto}
.hg-apps{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.hg-sig{display:flex;flex-direction:column;gap:4px;margin-top:16px;padding-top:16px;border-top:1px solid var(--hair)}.hg-sig__n{font:600 17px/1.4 var(--body);color:var(--btext)}.hg-sig__l{width:168px;margin-top:12px}

@media (max-width:1199px){
.hg-at-l{display:none}.hg-at-m{display:inline}
.hg-ga__lg{width:400px}.hg-clear__lg{width:320px}.hg-clear__z{padding:calc(320px / var(--ar) * var(--cs))}.hg-clear__pad{height:calc(320px / var(--ar) * var(--cs))}.hg-clear__lg .hg-dv .hg-rv{left:calc(320px / var(--ar) * var(--cs) - 2px)}
.hg-letter__t{font-size:72px}
}
@media (max-width:840px){
.hg-at-m{display:none}.hg-at-s{display:inline}
.hg-sec{padding:8px;margin-bottom:32px}
.hg-zn,.hg-zt,.hg-cm{display:none}
.hg-fr{grid-template-columns:minmax(0,1fr);grid-template-areas:"tb" "dw"}
.hg-tb{border-left:0;border-bottom:1.5px solid var(--ink)}
.hg-tb__in{position:static;display:grid;grid-template-columns:1fr 1fr}
.hg-tb__c{padding:10px 14px}.hg-tb__c:nth-child(odd){border-right:1px solid var(--hair)}
.hg-tb__c--d{grid-column:1 / -1;border-right:0!important}
.hg-tb__c:nth-child(4){border-right:1px solid var(--hair)}.hg-tb__c:nth-child(5){border-right:0}
.hg-tb__lg{display:none}
.hg-tb__t{font-size:22px}
.hg-dw{padding:28px 16px 40px;gap:40px}
.hg-ga__lg{width:280px}.hg-hero{font-size:var(--fs)}
.hg-traits li{grid-template-columns:28px 1fr;gap:8px 12px}.hg-traits .hg-lead{display:none}.hg-traits .hg-trait{grid-column:1 / -1;font-size:32px}
.hg-split,.hg-details,.hg-apps,.hg-app--card{grid-template-columns:minmax(0,1fr);gap:32px}
.hg-details li:nth-child(2n){padding-left:0;border-left:0}.hg-details li{padding:24px 0}
.hg-ex{font-size:22px}
.hg-rev__h{display:none}.hg-rev__r{grid-template-columns:40px minmax(0,1fr);gap:12px}.hg-rev__r > :nth-child(n+2){grid-column:2}
.hg-cloud{font-size:17px}
.hg-measure{margin-top:0}.hg-measure .hg-dh{display:none}
.hg-clear__lg{width:180px}.hg-clear__z{padding:calc(180px / var(--ar) * var(--cs));margin-left:48px}.hg-clear__pad{height:calc(180px / var(--ar) * var(--cs))}
.hg-clear__lg .hg-dv .hg-rv{left:calc(180px / var(--ar) * var(--cs) - 2px)}
.hg-ver{grid-template-columns:32px minmax(0,1fr);gap:12px}.hg-ver__f,.hg-ver__t,.hg-ver .hg-dls{grid-column:2}
.hg-fields{flex-direction:column;align-items:stretch;padding-bottom:0}
.hg-field{width:auto}.hg-field .hg-dh{display:none}.hg-field__f,.hg-field__f.is-thin{height:var(--h);writing-mode:horizontal-tb;flex-direction:row;align-items:center;gap:12px;padding:12px}.hg-field__s{margin-left:auto}
.hg-fin{grid-template-columns:32px 24px minmax(0,1fr);gap:12px}.hg-fin__v{grid-column:3}
.hg-pr{grid-template-columns:64px minmax(0,1fr) 64px;gap:12px}
.hg-letter__t{font-size:44px;padding-left:44px}
.hg-face__d{font-size:36px}.hg-face__b{font-size:28px}.hg-face__m{font-size:22px}
.hg-tester{padding:16px}.hg-tester__c{grid-template-columns:minmax(0,1fr)}
.hg-scale li{grid-template-columns:minmax(0,1fr);gap:12px}
.hg-shotl figure{grid-template-columns:minmax(0,1fr);gap:12px}
.hg-gd--w{display:none}.hg-gd--n{display:flex;padding-left:46px}
.hg-meas{grid-template-columns:1fr 1fr}.hg-meas div:nth-child(3){padding-left:0;border-left:0}.hg-meas div:nth-child(n+3){border-top:1px solid var(--hair)}
.hg-card__w{width:340px;max-width:100%}.hg-card__w .hg-dv{display:none}.hg-cards{padding-top:28px}
.hg-card{zoom:.94}
.hg-grp{grid-template-columns:minmax(0,1fr);gap:16px}
.hg-file{grid-template-columns:28px minmax(0,1fr) auto;gap:4px 10px}.hg-file__f,.hg-file__s{grid-column:2;display:inline}.hg-file .hg-dl{grid-column:3;grid-row:1}
.hg-file--logo{grid-template-columns:28px minmax(0,1fr)}.hg-file--logo .hg-dls{grid-column:2}
}
@media (prefers-reduced-motion:reduce){.hg-root *{transition:none!important}.hg-btn:active{transform:none}}`;
}
