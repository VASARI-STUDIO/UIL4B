// Theme 29 (Blueprint), lane hk: the kit site stylesheet. The sheet (film, inks, frames) is this lane's own; the components are never restyled here,
// only placed. Plates are the shipped .ui region, light or dark, and keep their mode whatever the page's mode is: a drawing of a dark surface stays dark.
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const SHEET = { film: '#EEF1F2', film2: '#E1E6E9', hair: '#C3CBD0', ink: '#1F2A33', quiet: '#56636D' };

export function redOf(ctx) {
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

export function kitCss(ctx) {
  const K = darkSheet(ctx), B = ctx.brand, g = tokenGroups(ctx), stretch = B.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.hk-root{--film:${SHEET.film};--film2:${SHEET.film2};--hair:${SHEET.hair};--ink:${SHEET.ink};--quiet:${SHEET.quiet};--red:${redOf(ctx)};
--chrome:'Chivo',sans-serif;--mono:'Chivo Mono',monospace;--ds:${stretch}%}
html[data-theme="dark"] .hk-root{--film:${K.film};--film2:${K.film2};--hair:${K.hair};--ink:${K.ink};--quiet:${K.quiet};--red:${redDark(ctx, K.film)}}
.hk-root{background:var(--film2);color:var(--ink);font:400 14px/22px var(--chrome);min-height:100vh;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.hk-root *,.hk-root *::before,.hk-root *::after{box-sizing:border-box}
.hk-root :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.hk-root :where(ul,ol){list-style:none}
.hk-root a{color:inherit}
.hk-m{font:400 13px/20px var(--mono)}
/* the plate: the shipped .ui region, in its own mode */
.hk-root .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}color-scheme:light}
.hk-root .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}color-scheme:dark}
.hk-root .ui .ui-display{font-stretch:var(--ds)}
.hk-root .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.hk-plate{position:relative;isolation:isolate;border:1px solid var(--ink);padding:24px;min-width:0;container-type:inline-size}
.hk-plate--bare{padding:0}
.hk-plate--c{display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.hk-plate--row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.hk-plate--fill{align-items:stretch}

/* bar */
.hk-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:24px;min-height:56px;padding:8px 24px;background:var(--film);border-bottom:1.5px solid var(--ink)}
.hk-brand{display:block;flex:none;line-height:0}
.hk-links{display:flex;gap:24px;flex:1;min-width:0;flex-wrap:wrap}
.hk-links a{font:500 14px/22px var(--chrome);color:var(--ink);text-decoration:none;padding:4px 0;border-bottom:1.5px solid transparent}
.hk-links a:hover,.hk-links a[aria-current="page"]{border-bottom-color:var(--ink)}
.hk-mode{display:flex;border:1px solid var(--ink)}
.hk-mode button{font:500 13px/20px var(--chrome);padding:6px 12px;background:transparent;color:var(--ink);border:0;cursor:pointer;min-height:32px}
.hk-mode button+button{border-left:1px solid var(--ink)}
html:not([data-theme="dark"]) .hk-mode [data-mode="light"],html[data-theme="dark"] .hk-mode [data-mode="dark"]{background:var(--ink);color:var(--film)}
.hk-for-dark{display:none}
html[data-theme="dark"] .hk-for-dark{display:block}
html[data-theme="dark"] .hk-for-light{display:none}
.hk-root :focus-visible{outline:2px solid var(--red);outline-offset:2px}
.hk-root .ui :focus-visible{outline:none}

/* the sheet */
.hk-main{padding:32px 24px 8px}
.hk-sec{position:relative;max-width:1400px;margin:0 auto 32px;padding:24px;border:1px solid var(--quiet)}
.hk-zn{position:absolute;left:24px;right:24px;top:0;height:24px;display:grid;grid-template-columns:repeat(8,1fr)}
.hk-zn span{font:400 12px/24px var(--mono);color:var(--quiet);text-align:center;border-left:1px solid var(--quiet)}
.hk-zn span:first-child{border-left:0}
.hk-fr{position:relative;border:1.5px solid var(--ink);display:grid;grid-template-columns:minmax(0,1fr) 248px;background:var(--film)}
.hk-tb{grid-column:2;grid-row:1;border-left:1.5px solid var(--ink)}
.hk-tb__in{position:sticky;top:72px;display:flex;flex-direction:column}
.hk-tb__c{padding:12px 20px 14px;border-bottom:1px solid var(--hair);display:flex;flex-direction:column;gap:2px}
.hk-tb__c--d{border-bottom:1.5px solid var(--ink);padding-top:20px;padding-bottom:20px}
.hk-tb__t{font:500 26px/1.15 var(--chrome);overflow-wrap:anywhere}
.hk-tb__v{font:400 13px/1.45 var(--chrome)}
.hk-tb__p{font-weight:500}
.hk-tb__lg{padding:16px 20px;display:block;line-height:0}
.hk-lab{font:400 12px/16px var(--chrome);color:var(--quiet)}
.hk-dw{grid-column:1;grid-row:1;min-width:0;padding:32px;display:flex;flex-direction:column;gap:48px;container-type:inline-size}

/* drafting marks */
.hk-tag{flex:none;display:inline-grid;place-items:center;width:24px;height:24px;border:1px solid var(--ink);border-radius:50%;background:var(--film);font:400 12px/1 var(--mono);color:var(--ink)}
.hk-tag--sq{border-radius:0}
.hk-det{display:flex;flex-direction:column;gap:16px;min-width:0}
.hk-dt{display:flex;align-items:center;gap:12px;border-bottom:1.5px solid var(--ink);padding-bottom:8px;flex-wrap:wrap}
.hk-dt h2{font:500 18px/24px var(--chrome)}
.hk-dt .hk-lab{margin-left:auto}
.hk-ttl{display:flex;flex-direction:column;gap:12px;max-width:62ch}
.hk-ttl h2{font:500 18px/24px var(--chrome)}
.hk-ttl p{font:400 14px/22px var(--chrome)}

/* a keyed row: key, the live part on its plate, then what it is */
.hk-kr{display:grid;grid-template-columns:24px minmax(0,1fr) 232px;gap:16px;align-items:start}
.hk-kr>.hk-tag{margin-top:2px}
.hk-kd{display:flex;flex-direction:column;gap:2px;min-width:0}
.hk-kd b{font:500 14px/20px var(--chrome)}
.hk-kd span{font:400 13px/20px var(--chrome);color:var(--quiet);overflow-wrap:anywhere}
.hk-kd .hk-m{color:var(--ink)}
.hk-kl{display:flex;flex-direction:column;gap:24px}
.hk-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.hk-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.hk-grid5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.hk-cols{display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:40px;align-items:start}
.hk-cols--r{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
@container (max-width:760px){.hk-cols,.hk-cols--r{grid-template-columns:minmax(0,1fr)}}
.hk-cols .hk-kr{grid-template-columns:24px minmax(0,1fr);row-gap:8px}
.hk-cols .hk-kr>.hk-plate{grid-column:1/-1;grid-row:2}
.hk-cell{display:flex;flex-direction:column;gap:8px;min-width:0}

/* a schedule: ruled rows, no table */
.hk-sch{border-top:1.5px solid var(--ink)}
.hk-sr{display:grid;grid-template-columns:24px minmax(0,1.1fr) minmax(0,1fr) minmax(0,.8fr);gap:16px;align-items:center;padding:8px 0;border-bottom:1px solid var(--hair);min-width:0}
.hk-sr--h{padding:6px 0;font:400 12px/16px var(--chrome);color:var(--quiet);border-bottom:1px solid var(--ink)}
.hk-sr>*{min-width:0;overflow-wrap:anywhere}
.hk-sw{width:24px;height:24px;border:1px solid var(--ink);display:block}
.hk-sr--2{grid-template-columns:32px minmax(0,1fr) minmax(0,1fr)}
.hk-sr--f{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}
.hk-sr--3{grid-template-columns:96px minmax(0,1fr) 72px}
.hk-sr--st{grid-template-columns:176px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)}
.hk-sr--4{grid-template-columns:32px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)}
.hk-notes{display:flex;flex-direction:column;gap:12px;max-width:62ch}
.hk-notes li{display:grid;grid-template-columns:24px 1fr;font:400 13px/20px var(--chrome)}
.hk-notes li>span{font:400 13px/20px var(--mono)}

/* redlines: a true size in px, the brand's action, drawn on the film */
.hk-dim{position:relative;display:block;height:14px;border-left:1px solid var(--red);border-right:1px solid var(--red)}
.hk-dim::after{content:"";position:absolute;left:0;right:0;top:50%;border-top:1.5px solid var(--red)}
.hk-rv{font:400 13px/20px var(--mono);color:var(--red)}
.hk-bar{display:block;height:24px;background:var(--ink)}
.hk-lh{display:flex;flex-direction:column;gap:4px}

/* type specimens inside a plate */
.hk-ts{display:block;max-width:100%;overflow-wrap:anywhere}

/* screens */
.hk-scr{display:flex;flex-direction:column;min-width:0;background:var(--surface);color:var(--text)}
.hk-scr__main{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:0;flex:1}
.hk-scr__track{display:flex;flex-direction:column;gap:16px;padding:24px;border-right:1px solid var(--divider)}
.hk-scr__deliv{display:flex;flex-direction:column;gap:16px;padding:24px;background:var(--raised)}
.hk-scr__ttl{font:500 var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--quiet)}
.hk-scr__eta{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.hk-scr__time{font-size:var(--fs-headline);line-height:var(--lh-headline)}
.hk-scr__time{margin:0;overflow-wrap:anywhere}
.hk-scr__rt{display:flex;justify-content:space-between;gap:8px;font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.hk-scr__rd{display:flex;align-items:center;gap:12px}
.hk-scr__rd>div{flex:1;min-width:0}
/* slot: a placeholder in the rider row may wrap, so it stays clear of the call button at 390 */
.hk-scr__rd>div .ph-n{white-space:normal!important}
.hk-scr__rn{font:500 var(--fs-body)/var(--lh-body) var(--ff-body)}
.hk-scr__rs{font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.hk-scr__dl{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.hk-scr__dl dt{font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.hk-scr__dl dd{font:500 var(--fs-body)/var(--lh-body) var(--ff-body)}
.hk-scr__clock{font:400 var(--fs-caption)/1 var(--ff-body);color:var(--quiet)}
.hk-scr__phone{width:100%;max-width:390px;margin:0 auto;border:1px solid var(--divider)}
.hk-scr>.ui-topbar,.hk-scr>.ui-tabbar{flex:none}
.hk-scr__body{display:flex;flex-direction:column;gap:16px;padding:24px 16px;flex:1}
@container (max-width:700px){.hk-scr__main{grid-template-columns:minmax(0,1fr)}.hk-scr__track{border-right:0;border-bottom:1px solid var(--divider)}}

/* the table stacks at a phone: each row becomes a block, each cell names itself */
.hk-tbl .ui-table{table-layout:auto}
@media (max-width:840px){
.hk-tbl .ui-table,.hk-tbl .ui-table tbody,.hk-tbl .ui-table tr,.hk-tbl .ui-table td{display:block;width:100%}
.hk-tbl .ui-table thead{display:none}
.hk-tbl .ui-table tr{padding:8px 0;border-bottom:var(--w-hairline) solid var(--divider)}
.hk-tbl .ui-table td{height:auto;min-height:32px;padding:4px 12px;border-bottom:0;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:right}
.hk-tbl .ui-table td::before{content:attr(data-l);font:500 var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--quiet);text-align:left}
}

/* code */
.hk-code{margin:0;padding:16px;background:var(--film2);border:1px solid var(--ink);font:400 13px/20px var(--mono);overflow-wrap:anywhere;white-space:pre-wrap;color:var(--ink)}
.hk-copy{font:500 13px/20px var(--chrome);padding:6px 12px;background:var(--film);color:var(--ink);border:1px solid var(--ink);cursor:pointer;min-height:32px}
.hk-copy:hover{background:var(--ink);color:var(--film)}
.hk-copy.is-copied{background:var(--ink);color:var(--film)}
.hk-col{display:flex;flex-direction:column;gap:12px;min-width:0}

/* cover and contents */
.hk-hero{font-family:var(--hd);font-weight:var(--hw);font-stretch:var(--ds);letter-spacing:-0.01em;font-size:min(var(--fl),9cqw);line-height:1.05;max-width:16ch;overflow-wrap:anywhere}
.hk-reg{display:flex;flex-direction:column;gap:8px;min-width:0}
.hk-reg h2{font:500 14px/20px var(--chrome);border-bottom:1.5px solid var(--ink);padding-bottom:6px}
.hk-reg a{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;gap:8px;padding:6px 0;border-bottom:1px solid var(--hair);text-decoration:none;font:400 14px/20px var(--chrome)}
.hk-reg a:hover span:nth-child(2){text-decoration:underline}
.hk-regs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 40px}

/* foot: prev and next close the sheet like a transmittal */
.hk-pn{max-width:1400px;margin:0 auto 24px;padding:0 24px;display:flex;justify-content:space-between;gap:16px}
.hk-pn a{display:flex;flex-direction:column;gap:2px;padding:12px 16px;border:1px solid var(--ink);text-decoration:none;min-width:0;flex:0 1 320px;background:var(--film)}
.hk-pn a:hover{background:var(--ink);color:var(--film)}
.hk-pn a:hover .hk-lab{color:var(--film)}
.hk-pn a:last-child{text-align:right;margin-left:auto}
.hk-pn__t{font:500 15px/22px var(--chrome)}
.hk-foot{max-width:1400px;margin:0 auto;padding:8px 24px 32px;display:flex;justify-content:space-between;gap:16px;font:400 13px/20px var(--chrome);color:var(--ink)}
.sx-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}

@media (max-width:1199px){.hk-regs{grid-template-columns:repeat(2,minmax(0,1fr))}.hk-3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:840px){
.hk-top{padding:8px 16px;gap:4px 12px;flex-wrap:wrap}
.hk-brand{order:1}.hk-mode{order:2;margin-left:auto}.hk-links{order:3;flex:1 1 100%;gap:20px}
.hk-main{padding:16px 8px 8px}
.hk-sec{padding:16px 8px 8px;margin-bottom:16px}
.hk-zn{left:8px;right:8px}
.hk-fr{grid-template-columns:minmax(0,1fr)}
.hk-tb{grid-column:1;grid-row:1;border-left:0;border-bottom:1.5px solid var(--ink)}
.hk-tb__in{position:static;display:grid;grid-template-columns:1fr 1fr}
.hk-tb__c--d{grid-column:1/-1}
.hk-tb__lg{grid-column:1/-1}
.hk-dw{grid-column:1;grid-row:2;padding:20px 16px;gap:40px}
.hk-kr{grid-template-columns:24px minmax(0,1fr);row-gap:8px}
.hk-kr>.hk-plate{grid-column:1/-1;grid-row:2}
.hk-2,.hk-3,.hk-regs{grid-template-columns:minmax(0,1fr)}
.hk-grid5{grid-template-columns:repeat(2,minmax(0,1fr))}
.hk-sr{grid-template-columns:24px minmax(0,1fr) minmax(0,1fr);row-gap:2px}
.hk-sr>:nth-child(4){grid-column:2/-1}
.hk-sr--2,.hk-sr--4{grid-template-columns:32px minmax(0,1fr) minmax(0,1fr)}
.hk-sr--4>:nth-child(4){grid-column:2/-1}
.hk-sr--st{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.hk-sr--st>:nth-child(1),.hk-sr--st>:nth-child(2){grid-column:1/-1}
.hk-sr--st>:nth-child(4){grid-column:auto}
.hk-pn{flex-direction:column;padding:0 8px}
.hk-pn a{flex:1 1 auto}
.hk-foot{flex-direction:column;padding:8px 16px 24px}
.hk-plate{padding:16px}
.hk-dt .hk-lab{margin-left:0}
}
@media (prefers-reduced-motion:reduce){.hk-root *{transition:none!important;animation:none!important}}
`;
}
