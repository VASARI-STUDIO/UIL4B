// Theme 32, Dieline, lane ht: the parts both web sites share (the guidelines site and the UI kit site). A page is the brand's pack, die-cut and
// run down the screen as the brand book runs it (lane-bk.js): panels joined by dashed folds, solid cuts on the outer edges, the pack's closure
// at the top and the bottom of the net, and a tuck flap on the first panel's right edge carrying the section's number and name. Printed panels
// keep the brand's colours in both modes (they are ink on board); the unprinted board, the cutting mat round it and the windows follow the
// light and dark switch. The bar at the top carries the locator net from the PDF: the palette by share, this page's colour outlined.
// Classes are prefixed hs- and custom properties --hs-, so nothing here can meet the PDF lanes' CSS or the kit's tokens.
import { allocate, measure, wrap, esc } from './geom.js';

export const A = esc;
export const KIT_DIR = 'ui-kit-html';

// ---- die lines: inline SVG with no viewBox, so a line runs any length and its dash stays in px (fold 8/6, seal 1.5/5 round) ----
export const svgH = (kind, cls = '') => `<svg class="hs-ln hs-ln--h hs-${kind} ${cls}" aria-hidden="true" focusable="false"><line x1="0" y1="0.75" x2="100%" y2="0.75"/></svg>`;
export const svgV = (kind, cls = '') => `<svg class="hs-ln hs-ln--v hs-${kind} ${cls}" aria-hidden="true" focusable="false"><line x1="0.75" y1="0" x2="0.75" y2="100%"/></svg>`;
const crimp = () => `<svg class="hs-crimp" aria-hidden="true" focusable="false">${[3, 6, 9, 12].map((y) => `<line x1="0" y1="${y + 0.5}" x2="100%" y2="${y + 0.5}"/>`).join('')}</svg>`;
const notch = (s) => `<svg class="hs-notch hs-notch--${s}" viewBox="0 0 12 14" width="12" height="14" aria-hidden="true" focusable="false"><path class="hs-notch__f" d="${s === 'l' ? 'M0 0L10 7L0 14Z' : 'M12 0L2 7L12 14Z'}"/><path class="hs-notch__l" d="${s === 'l' ? 'M0 0L10 7L0 14' : 'M12 0L2 7L12 14'}"/></svg>`;
export const valve = () => `<svg class="hs-valve" viewBox="-24 -24 48 48" width="48" height="48" aria-hidden="true" focusable="false"><circle r="22"/><circle r="8"/></svg>`;

// ---- fitted display type: the largest size that sets the text in the line count with the real glyphs. The size is a cap that scales with the
// panel (cqw), so a longer placeholder still fits; wide (a 760 px panel) and narrow (a phone panel, 264 px) are fitted apart ----
export function fitSize(ctx, text, { w, max, min, lines, role = 'display', weight }) {
  const wt = weight || (role === 'display' ? ctx.weights.heading : ctx.weights.regular);
  for (let s = max; s >= min; s -= 2) {
    const L = wrap(ctx, role, wt, text, s, w);
    if (L.length <= lines && L.every((l) => measure(ctx, role, wt, l, s) <= w)) return s;
  }
  const longest = Math.max(...String(text).split(/\s+/).map((x) => measure(ctx, role, wt, x, min)));
  return Math.max(12, Math.floor(min * Math.min(1, w / longest)));
}
const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;
export const WIDE = 760, NARROW = 264;
export function fit(ctx, text, wide, narrow, opts = {}) {
  const sw = fitSize(ctx, text, { w: WIDE, ...opts, ...wide }), sn = fitSize(ctx, text, { w: NARROW, ...opts, ...narrow });
  return `--fw:${cq(sw, wide.w || WIDE)};--fn:${cq(sn, narrow.w || NARROW)}`;
}
// a size that only caps the longest word, for text that wraps freely at a set size
export function wordCap(ctx, text, size, role, weight, w = NARROW) {
  const longest = Math.max(...String(text).split(/\s+/).map((x) => measure(ctx, role, weight, x, size)));
  return longest <= w ? `${size}px` : `min(${size}px,${(size * 100 / longest).toFixed(3)}cqw)`;
}

// ---- panels ----
export const printVars = (R, hex) => { const t = R.textOn(hex); return `--f:${hex};--fi:${t.ink};--fq:${t.quiet};--fl:${R.lineOn(hex)}`; };
// the logo on a printed ground (its own colourway), or on the board (one for each mode)
export function logoOn(ctx, R, id, ground, w, label = 'Logo') {
  const k = R.colourwayOn(ground), cw = ctx.brand.logo.colourways[k], g = ctx.logo.geos[id];
  return `<span class="hs-logo" style="--lw:${w}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label })}</span>`;
}
export const logoBoard = (ctx, R, id, w) => `<span class="hs-for-light">${logoOn(ctx, R, id, ctx.roles.light.surface, w)}</span><span class="hs-for-dark">${logoOn(ctx, R, id, ctx.roles.dark.surface, w)}</span>`;

// the net: panels top to bottom ({ html, hex, cls }), the pack's closure above the first and below the last, the tuck flap on the first.
// `hex` on the net names the page's colour for the locator in the bar.
export function net(ctx, R, P, panels, { flap, hex, cls = '' } = {}) {
  const k = P.kind, n = panels.length;
  const top = k === 'box' ? `<div class="hs-tuck hs-tuck--top" aria-hidden="true"></div>`
    : k === 'satchel' ? `<div class="hs-sflap" aria-hidden="true" style="${printVars(R, R.front.hex)}"><span class="hs-peel"><svg focusable="false"><rect x="0.75" y="0.75" width="100%" height="100%"/></svg></span></div>` : '';
  const bot = k === 'box' ? `<div class="hs-tuck hs-tuck--bot" aria-hidden="true"></div>` : '';
  const body = panels.map((p, i) => {
    let deco = i ? svgH('fold', 'hs-top') : '';
    if (!i && k === 'bag') deco = `${crimp()}${svgH('seal', 'hs-sealt')}${notch('l')}${notch('r')}`;
    if (i === n - 1 && k === 'bag') deco += svgH('fold', 'hs-gusset');
    if (i === n - 1 && k === 'satchel') deco += svgH('seal', 'hs-weld');
    const fl = !i && flap ? `<div class="hs-flap"><span class="hs-hinge">${svgV('fold')}</span><p class="hs-flap__n" aria-hidden="true">${A(flap.n)}</p><p class="hs-flap__t">${A(flap.t)}</p></div>` : '';
    return `<div class="hs-pn${p.hex ? ' hs-pn--print' : ''}${!i ? ' is-first' : ''}${i === n - 1 ? ' is-last' : ''} ${p.cls || ''}"${p.hex ? ` style="${printVars(R, p.hex)}"` : ''}>${deco}${fl}<div class="hs-in">${p.html}</div></div>`;
  }).join('');
  return `<div class="hs-net is-${k} ${cls}"${hex ? ` data-hex="${hex}"` : ''}>${top}${body}${bot}</div>`;
}
// a die-cut window: the product seen through the board. A .ui region on the kit's surface; dark forces the dark surface in both modes.
export const win = (inner, { dark = false, cls = '', label = '' } = {}) =>
  `<div class="hs-win ${cls}"><div class="ui hs-win__ui"${dark ? ' data-theme="dark"' : ''}${label ? ` role="group" aria-label="${A(label)}"` : ''}>${inner}</div></div>`;

// ---- small text blocks ----
export const h2 = (t) => `<h2 class="hs-h2">${t}</h2>`;
export const lead = (t) => `<p class="hs-lead">${t}</p>`;
export const para = (t) => `<p class="hs-p">${t}</p>`;
export const quiet = (t) => `<p class="hs-q">${t}</p>`;
export const rows = (list) => `<dl class="hs-rows">${list.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
export const rules = (list) => `<ul class="hs-rules">${list.map((r) => `<li>${svgH('fold', 'hs-rulefold')}<p><span class="hs-do">Do</span> ${A(r.do)}</p><p class="hs-q"><span class="hs-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;
export const mono = (t) => `<span class="m">${A(t)}</span>`;
// cells joined by folds (a strip of the net): each cell may be printed (hex) or board
export const strip = (cells, cls = '') => `<ul class="hs-strip ${cls}">${cells.map((c) => `<li class="hs-cell${c.hex ? ' hs-cell--print' : ''} ${c.cls || ''}"${c.style ? ` style="${c.style}"` : ''}>${svgV('fold', 'hs-cellv')}${svgH('fold', 'hs-cellh')}${c.html}</li>`).join('')}</ul>`;
export const cellVars = (R, hex) => ({ hex, style: printVars(R, hex) });

// ---- the bar: the logo, the two parts, the locator net and the mode switch ----
export function bar(ctx, R, { part, hex, toggle, home = 'index.html' }) {
  const B = ctx.brand, other = part === 'guidelines' ? `../${KIT_DIR}/index.html` : '../guidelines-html/index.html';
  const parts = [['guidelines', 'Brand guidelines'], ['kit', 'UI kit']].map(([k, t]) => `<a class="hs-part" href="${k === part ? home.replace(/[^/]*$/, 'index.html') : other}"${k === part ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const ws = allocate(R.order.map((c) => c.share), 160, 6);
  const loc = `<span class="hs-loc" aria-hidden="true">${R.order.map((c, i) => `<i style="width:${ws[i]}px;background:${c.hex}" class="${R.isGround(c.hex) ? 'is-ground' : ''}${hex && c.hex.toLowerCase() === hex.toLowerCase() ? ' is-here' : ''}"></i>`).join('')}</span>`;
  return `<header class="hs-top" id="hs-top">
<a class="hs-home" href="index.html" aria-label="${A(B.name)} ${part === 'kit' ? 'UI kit' : 'brand guidelines'}, home">${logoBoard(ctx, R, 'horizontal', 128)}</a>
<nav class="hs-parts" aria-label="Parts">${parts}</nav>${loc}
<div class="hs-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>
${toggle}
</header>`;
}

// the running order as a strip of the net: one panel a section, the pages on it, folds between them
export function contentsNav(sections, { cur, front, href, frontTitle }) {
  const secs = sections.map((s) => `<li class="hs-ns${s.pages.some((q) => q.id === cur) ? ' is-here' : ''}">${svgH('fold', 'hs-nsfold')}<p class="hs-ns__t"><span class="hs-ns__n">${s.n}</span>${A(s.title)}</p><ol>${s.pages.map((q) => `<li><a href="${href(q)}"${q.id === cur ? ' aria-current="page"' : ''}><span class="hs-ns__r">${q.ref}</span><span>${A(q.title)}</span></a></li>`).join('')}</ol></li>`).join('');
  return `<nav class="hs-nav" id="hs-nav" aria-label="Contents" data-open="false"><a class="hs-nav__front" href="index.html"${front ? ' aria-current="page"' : ''}>${A(frontTitle)}</a><ol class="hs-nav__secs">${secs}</ol></nav>`;
}
// previous and next: two dust flaps under the net
export function pager(prev, next) {
  const cell = (u, k) => (u ? `<a class="hs-pg hs-pg--${k}" href="${u.href}" rel="${k}"><span class="hs-pg__k">${k === 'prev' ? 'Previous' : 'Next'}</span><span class="hs-pg__t">${u.ref ? `<span class="hs-pg__r">${A(u.ref)}</span> ` : ''}${A(u.title)}</span></a>` : '<span></span>');
  return `<nav class="hs-pager" aria-label="Previous and next page">${cell(prev, 'prev')}${cell(next, 'next')}</nav>`;
}

// ---- CSS shared by both sites. --hs-* are the sheet and board roles by mode; printed panels set --f, --fi, --fq, --fl inline ----
export function netCss(ctx, R) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights;
  const rc = B.ui.radius.control, lum = (h) => ctx.C.luminance(h);
  const v = (r, die) => `--hs-sheet:${r.sunken};--hs-board:${r.surface};--hs-ink:${r.text};--hs-soft:${r.textSoft};--hs-quiet:${r.quiet};--hs-qsheet:${r.quietOnSunken};--hs-hair:${r.divider};--hs-edge:${r.border};--hs-die:${die};--hs-focus:${r.focus};--hs-action:${r.action};--hs-action-ink:${r.actionLabel}`;
  // the flap is as wide as the longest section name needs at 15 px, so no name breaks inside a word
  const names = [...ctx.sections.map((s) => s.title), 'Brand guidelines', 'UI kit'];
  const fw = Math.max(128, Math.ceil(Math.max(...names.map((t) => measure(ctx, 'chrome', 500, t, 15))) * 1.04) + 40);
  return `:root{${v(L, lum(L.surface) > 0.97 ? L.textSoft : L.quiet)};--hs-fw:${fw}px;--hs-chrome:'Funnel Sans',sans-serif;--hs-val:'Spline Sans Mono',monospace;--hs-display:'${d.family}',sans-serif;--hs-body:'${b.family}',sans-serif;--hs-mono:'${m ? m.family : 'Spline Sans Mono'}',monospace}
[data-theme="dark"]{${v(D, D.quiet)}}
body{background:var(--hs-sheet);color:var(--hs-ink)}
.hs-switching *,.sx-switching *{transition:none!important}
.hs{background:var(--hs-sheet);color:var(--hs-ink);font:400 15px/1.55 var(--hs-body);-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
.hs :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.hs :where(ul,ol){list-style:none}
.hs :where(a){color:inherit}
.hs .disp{font-family:var(--hs-display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}
.hs .m{font-family:var(--hs-val);font-weight:400;font-size:13px}
.hs :focus-visible{outline:2px solid var(--hs-focus);outline-offset:2px}
.hs .hs-pn--print :focus-visible,.hs .hs-cell--print :focus-visible{outline-color:var(--fi)}
.hs-for-dark{display:none}[data-theme="dark"] .hs-for-dark{display:inline}[data-theme="dark"] .hs-for-light{display:none}
.hs-skip{position:absolute;left:16px;top:-80px;z-index:4;background:var(--hs-ink);color:var(--hs-board);padding:12px 16px;border-radius:${rc}px;font:500 13px/1 var(--hs-chrome);text-decoration:none}
.hs-skip:focus{top:16px}
.hs-logo{display:block;width:min(var(--lw),100%)}
.hs-logo>svg,.hs-logo>.logo-slot{display:block;width:100%!important;height:auto}

/* the bar */
.hs-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:32px;min-height:64px;padding:0 40px;background:var(--hs-sheet);border-bottom:1px solid var(--hs-hair);font:500 13px/1.2 var(--hs-chrome)}
.hs-home{display:block;flex:none;width:128px}
.hs-parts{display:flex;gap:24px;align-self:stretch}
.hs-part{display:flex;align-items:center;text-decoration:none;color:var(--hs-qsheet);box-shadow:inset 0 -2px 0 transparent;white-space:nowrap;transition:box-shadow 120ms ease-out,color 120ms ease-out}
.hs-part[aria-current]{color:var(--hs-ink);box-shadow:inset 0 -2px 0 var(--hs-ink)}
@media (hover:hover){.hs-part:not([aria-current]):hover{color:var(--hs-ink);box-shadow:inset 0 -2px 0 var(--hs-edge)}}
.hs-loc{display:flex;margin-left:auto;height:14px;flex:none}
.hs-loc i{display:block;height:100%;position:relative}
.hs-loc i.is-ground{box-shadow:inset 0 0 0 1px var(--hs-die)}
.hs-loc i.is-here{outline:1.5px solid var(--hs-ink);outline-offset:2px;z-index:1}
.hs-mode{display:inline-flex;flex:none;border:1.5px solid var(--hs-ink);border-radius:${rc}px;overflow:hidden}
.hs-mode button{appearance:none;border:0;background:transparent;color:var(--hs-ink);font:500 13px/1 var(--hs-chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hs-mode button[aria-pressed="true"]{background:var(--hs-ink);color:var(--hs-sheet)}
.hs-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.hs-mode button[aria-pressed="false"]:hover{background:var(--hs-hair)}}
.hs-ctl{display:none}

/* columns: the running order, then the page */
.hs-cols{flex:1;display:grid;grid-template-columns:232px minmax(0,1fr);column-gap:56px;padding:0 40px}
.hs-nav{position:sticky;top:64px;align-self:start;max-height:calc(100vh - 64px);overflow:auto;overscroll-behavior:contain;padding:40px 4px 40px 0;font:400 14px/1.35 var(--hs-chrome)}
.hs-nav__front{display:block;padding:6px 0 14px;font-weight:500;text-decoration:none;color:var(--hs-ink)}
.hs-nav__front[aria-current]{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1.5px}
.hs-ns{position:relative;padding:14px 0 10px}
.hs-ns .hs-nsfold{color:var(--hs-die)}
.hs-ns__t{display:flex;gap:10px;font-weight:500;color:var(--hs-ink);padding-bottom:6px}
.hs-ns__n{font-variant-numeric:tabular-nums;color:var(--hs-qsheet);min-width:16px}
.hs-ns ol a{display:grid;grid-template-columns:36px minmax(0,1fr);padding:5px 0;text-decoration:none;color:var(--hs-qsheet);border-radius:${rc}px}
.hs-ns__r{font-variant-numeric:tabular-nums}
.hs-ns ol a[aria-current]{color:var(--hs-ink);font-weight:500;box-shadow:inset 2px 0 0 var(--hs-ink);padding-left:10px;grid-template-columns:26px minmax(0,1fr)}
@media (hover:hover){.hs-ns ol a:not([aria-current]):hover{color:var(--hs-ink);text-decoration:underline;text-underline-offset:3px}}
.hs-main{min-width:0;padding:48px 0 0}
.hs-main:focus{outline:none}
.hs-head{max-width:calc(880px + var(--hs-fw));margin:0 0 40px;display:flex;flex-direction:column;gap:8px}
.hs-kick{font:500 13px/1.3 var(--hs-chrome);color:var(--hs-qsheet)}
.hs-h1{font:500 40px/1.1 var(--hs-chrome);letter-spacing:-0.01em;color:var(--hs-ink);text-wrap:balance}
.hs-h1 .hs-ref{font-variant-numeric:tabular-nums;color:var(--hs-qsheet);margin-right:12px}
.hs-sub{font:400 17px/1.5 var(--hs-body);color:var(--hs-soft);max-width:40em}
.hs-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;padding:24px 40px 40px;font:400 13px/1.4 var(--hs-chrome);color:var(--hs-qsheet)}

/* ---- the net ---- */
.hs-net{position:relative;width:min(880px,calc(100% - var(--hs-fw)));--hs-padx:56px}
.hs-pn{--f:var(--hs-board);--fi:var(--hs-ink);--fq:var(--hs-quiet);--fl:var(--hs-die);position:relative;isolation:isolate;background:var(--f);color:var(--fi);border-left:1.5px solid var(--fl);border-right:1.5px solid var(--fl);padding:56px var(--hs-padx) 64px}
.hs-in{position:relative;z-index:1;container-type:inline-size;display:flex;flex-direction:column;gap:24px}
.hs-ln{position:absolute;overflow:visible;pointer-events:none;z-index:0;color:var(--fl)}
.hs-ln line,.hs-crimp line{stroke:currentColor;stroke-width:1.5;fill:none}
.hs-fold line{stroke-dasharray:8 6}
.hs-seal line{stroke-dasharray:1.5 5;stroke-linecap:round}
.hs-ln--h{left:0;top:0;width:100%;height:2px}
.hs-ln--v{left:0;top:0;width:2px;height:100%}
/* closures: bag (seal, crimp, tear notches, gusset fold), box (tuck flaps), satchel (closing flap with its peel strip, weld seam) */
.hs-net.is-bag .hs-pn.is-first{border-top:1.5px solid var(--fl);padding-top:112px}
.hs-crimp{position:absolute;left:0;top:44px;width:100%;height:16px;color:var(--fl);pointer-events:none}
.hs-crimp line{stroke-width:1}
.hs-sealt{top:44px}
.hs-notch{position:absolute;top:72px;z-index:2}.hs-notch--l{left:-1.5px}.hs-notch--r{right:-1.5px}
.hs-notch__f{fill:var(--hs-sheet)}.hs-notch__l{fill:none;stroke:var(--fl);stroke-width:1.5}
.hs-net.is-bag .hs-pn.is-last,.hs-net.is-satchel .hs-pn.is-last{border-bottom:1.5px solid var(--fl);padding-bottom:88px}
.hs-gusset{top:auto;bottom:40px}.hs-weld{top:auto;bottom:16px}
.hs-tuck{position:relative;height:88px;margin:0 12px;background:var(--hs-board);border:1.5px solid var(--hs-die)}
.hs-tuck--top{border-bottom:0;border-radius:32px 32px 0 0}
.hs-tuck--bot{border-top:0;border-radius:0 0 32px 32px}
.hs-net.is-box .hs-pn.is-first{border-top:0}
.hs-net.is-box .hs-pn.is-first::before,.hs-net.is-box .hs-pn.is-last::after{content:"";position:absolute;left:0;right:0;height:0;border-top:1.5px dashed var(--fl)}
.hs-net.is-box .hs-pn.is-first::before{top:0}.hs-net.is-box .hs-pn.is-last::after{bottom:0}
.hs-sflap{position:relative;height:104px;background:var(--f);border:1.5px solid var(--fl);border-bottom:0;border-radius:48px 48px 0 0}
.hs-peel{position:absolute;left:32px;right:32px;top:24px;height:24px;color:var(--fl)}
.hs-peel svg{display:block;width:100%;height:100%;overflow:visible}.hs-peel rect{width:calc(100% - 1.5px);height:calc(100% - 1.5px);fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:1.5 5;stroke-linecap:round}
.hs-net.is-satchel .hs-pn.is-first .hs-ln.hs-top,.hs-net.is-satchel .hs-pn.is-first::before{display:none}
.hs-net.is-satchel .hs-pn.is-first{border-top:0}
.hs-valve{position:absolute;right:48px;top:120px;color:var(--fl);z-index:0}
.hs-valve circle{fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:1.5 5;stroke-linecap:round}
/* the tuck flap: the section's number and name on the first panel's right edge */
.hs-flap{position:absolute;z-index:2;left:100%;margin-left:-1.5px;top:48px;width:var(--hs-fw);min-height:184px;padding:20px 16px 24px 20px;background:var(--hs-board);color:var(--hs-ink);border:1.5px solid var(--hs-die);border-left:0;border-radius:0 32px 32px 0;display:flex;flex-direction:column;gap:8px}
.hs-hinge{position:absolute;left:0;top:-1.5px;bottom:-1.5px;width:1.5px;background:var(--f);color:var(--fl)}
.hs-flap__n{font:500 13px/1 var(--hs-chrome);font-variant-numeric:tabular-nums;color:var(--hs-quiet)}
.hs-flap__t{font:500 15px/1.25 var(--hs-chrome);color:var(--hs-ink)}

/* ---- type in the panels ---- */
.hs-fit{font-size:var(--fw);line-height:0.95;text-wrap:balance}
@container (max-width:${NARROW + 40}px){.hs-fit{font-size:var(--fn)}}
.hs-lead{font:400 21px/1.4 var(--hs-body);max-width:34em;text-wrap:pretty}
.hs-p{font:400 15px/1.55 var(--hs-body);color:var(--fi);max-width:40em;text-wrap:pretty}
.hs-q{font:400 13px/1.5 var(--hs-body);color:var(--fq);text-wrap:pretty}
.hs-h2{font:500 15px/1.3 var(--hs-chrome);color:var(--fi);margin-top:16px}
.hs-do{font-family:var(--hs-chrome);font-weight:500}
.hs-two{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.hs-two>div{display:flex;flex-direction:column;gap:12px;min-width:0}
.hs-two .hs-h2{margin-top:0}
.hs-rows{display:flex;flex-direction:column}
.hs-rows>div{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;padding:12px 0;border-top:1px solid var(--fl)}
.hs-pn--print .hs-rows>div{border-top-color:color-mix(in srgb,var(--fl) 50%,var(--f))}
.hs-rows dt{font:500 13px/1.5 var(--hs-chrome);color:var(--fi)}
.hs-rows dd{font:400 15px/1.55 var(--hs-body);color:var(--fi);max-width:40em}
.hs-rules{display:flex;flex-direction:column}
.hs-rules li{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:16px 0}
.hs-rulefold{color:var(--fl)}
/* a strip of cells joined by folds */
.hs-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));border:1.5px solid var(--fl);margin:0}
.hs-cell{position:relative;isolation:isolate;display:flex;flex-direction:column;gap:8px;padding:24px;min-width:0;background:var(--f,transparent);color:var(--fi)}
.hs-cell .hs-cellv{left:-1.5px}.hs-cell .hs-cellh{top:-1.5px}
.hs-cell--print{--fq:inherit}
/* a die-cut window: the cut drawn just outside the opening, the kit's own surface inside */
.hs-win{position:relative;border:1.5px solid var(--fl);background:var(--hs-board);isolation:isolate}
.hs-win__ui{padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start;min-width:0}
.hs-win .photo-slot,.hs .photo-slot{display:flex;align-items:flex-end;background:var(--hs-sheet);color:var(--hs-ink);padding:16px;font:400 13px/1.45 var(--hs-body);aspect-ratio:4/3;box-shadow:inset 0 0 0 1px var(--hs-die)}

/* prev and next: two dust flaps under the net */
.hs-pager{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:min(880px,calc(100% - var(--hs-fw)));margin:24px 0 64px}
.hs-pg{display:flex;flex-direction:column;gap:6px;padding:20px 24px;text-decoration:none;background:var(--hs-board);border:1.5px solid var(--hs-die);border-top-style:dashed;clip-path:polygon(0 0,100% 0,100% calc(100% - 20px),calc(100% - 20px) 100%,20px 100%,0 calc(100% - 20px));transition:background-color 120ms ease-out}
.hs-pg--next{text-align:right;align-items:flex-end}
.hs-pg__k{font:500 13px/1 var(--hs-chrome);color:var(--hs-quiet)}
.hs-pg__t{font:500 17px/1.3 var(--hs-chrome);color:var(--hs-ink)}
.hs-pg__r{font-variant-numeric:tabular-nums;color:var(--hs-quiet)}
@media (hover:hover){.hs-pg:hover{background:var(--hs-sheet)}.hs-pg:hover .hs-pg__t{text-decoration:underline;text-underline-offset:4px}}

@media (max-width:840px){
.hs-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 12px;padding:0 16px;position:static}
.hs-home{min-height:56px;display:flex;align-items:center;width:112px}
.hs-loc{display:none}
.hs-parts{grid-column:1/-1;grid-row:2;margin:0 -16px;padding:0 16px;gap:0;border-top:1px solid var(--hs-hair)}
.hs-part{flex:1 1 0;justify-content:center;min-height:44px}
.hs-cols{display:block;padding:0 16px}
.hs-side{position:sticky;top:0;z-index:2;margin:0 -16px;background:var(--hs-sheet);border-bottom:1px solid var(--hs-hair)}
.hs-ctl{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:0 16px;border:0;background:none;color:var(--hs-ink);font:500 14px/1.3 var(--hs-chrome);text-align:left;cursor:pointer}
.hs-ctl svg{transition:transform 150ms ease-out}.hs-ctl[aria-expanded="true"] svg{transform:rotate(180deg)}
.hs-nav{display:none;position:static;max-height:min(70vh,560px);padding:0 16px 16px}
.hs-nav[data-open="true"],.hs-nav.is-open{display:block}
.hs-main{padding-top:28px}
.hs-head{margin-bottom:28px}
.hs-h1{font-size:30px}
.hs-sub{font-size:16px}
.hs-net{--hs-fw:40px;--hs-padx:24px;width:calc(100% - 40px)}
.hs-pn{padding-top:40px;padding-bottom:48px}
.hs-net.is-bag .hs-pn.is-first{padding-top:104px}
.hs-flap{width:40px;min-height:160px;padding:14px 0 16px;align-items:center;border-radius:0 20px 20px 0}
.hs-flap__t{writing-mode:vertical-rl;font-size:13px;white-space:nowrap}
.hs-tuck{height:56px}.hs-sflap{height:80px;border-radius:32px 32px 0 0}.hs-peel{left:24px;right:24px;top:20px;height:20px}
.hs-valve{right:20px;top:96px}
.hs-lead{font-size:18px}
.hs-two,.hs-rules li{grid-template-columns:minmax(0,1fr);gap:12px}
.hs-rows>div{grid-template-columns:minmax(0,1fr);gap:4px}
.hs-strip{grid-template-columns:minmax(0,1fr)}
.hs-win__ui{padding:16px}
.hs-pager{width:100%;grid-template-columns:1fr;gap:12px;margin-bottom:40px}
.hs-foot{flex-direction:column;padding:20px 16px 32px}
}
@media (prefers-reduced-motion:reduce){.hs *{transition:none!important}}`;
}
