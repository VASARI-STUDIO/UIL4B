// Theme 31, Contact sheet, lane hk: the HTML UI kit (kitSite). The kit is the same contact sheet as the book: every page opens with a strip
// of six pages around it, the current one circled in grease pencil and each frame a link; under it hang the caption column and the
// enlargement, the page's component live and printed large. States are bracketed exposures, one gate a state, the state in edge print under
// its gate. There are no photographs: every frame holds live components. Light is the paper, dark the darkroom; the film is film in both.
// Every class starts hk-. The sheet parts are in lane-hk-sheet.js, the page contents in lane-hk-pages.js.
import { A, tokens, cwOn } from './helpers.js';
import { colourMap } from '../../engine/tokens.js';
import { strip, around, opening, frameNo, sheetCss } from './lane-hk-sheet.js';
import { PAGES, benches, thumb } from './lane-hk-pages.js';

// ---- a page: the strip, the opening, then its bands and rows ----
function render(ctx, K) {
  const p = K.page, id = p.id, P = (PAGES[id] || (() => ({})))(ctx, K);
  const front = id === 'cover' || id === 'contents';
  const title = id === 'cover' ? `${ctx.brand.name} UI kit` : p.title;
  const section = p.section ? `${p.section.n} ${p.section.title}` : id === 'cover' ? ctx.versionLine : '';
  let body = strip(ctx, K, around(K, id), id, { thumb });
  body += opening({ no: frameNo(K, id), section, title, lede: P.lede, enl: P.enl, enlCap: P.enlCap, dark: P.dark, lt: P.lt, flush: P.flush });
  if (front) {
    // the whole roll as the contents: every page a frame, in strips of six
    const all = K.pages;
    let roll = '';
    for (let i = 0; i < all.length; i += 6) roll += strip(ctx, K, all.slice(i, i + 6), id, { thumb, loop: false, label: `Pages ${i + 1} to ${Math.min(all.length, i + 6)}` });
    body += `<section class="hk-band"><div class="hk-grid hk-band__h"><h2 class="hk-k">The whole roll</h2><p class="hk-note hk-band__n">${A(`${all.length} pages. Each frame opens its page.`)}</p></div><div class="hk-rolls">${roll}</div></section>`;
  }
  body += (P.parts || []).join('\n');
  return body;
}

// ---- the shell: one sticky bar on the paper, then the sheet, then previous and next ----
function shell(ctx, K, body) {
  const B = ctx.brand, p = K.page, L = ctx.roles.light, D = ctx.roles.dark;
  const logo = (bg, cls) => `<span class="hk-brand__l ${cls}" aria-hidden="true">${ctx.logo.html('horizontal', { width: 132, colourway: cwOn(ctx, bg), label: '' })}</span>`;
  const item = (q) => `<li><a href="${A(K.href(q.id))}"${q.id === p.id ? ' aria-current="page"' : ''}><span class="hk-mn">${A(String(frameNo(K, q.id)).padStart(2, '0'))}</span><span>${A(q.title)}</span></a></li>`;
  const fronts = K.pages.filter((q) => !q.section);
  const menu = `<div class="hk-menu" id="hk-menu"><div class="hk-menu__in"><section><h2 class="hk-menu__h">Front</h2><ol>${fronts.map(item).join('')}</ol></section>${K.sections.map((s) => `<section><h2 class="hk-menu__h">${A(`${s.n} ${s.title}`)}</h2><ol>${s.pages.map(item).join('')}</ol></section>`).join('')}</div></div>`;
  const lk = (x, rel, word) => (x ? `<a class="hk-pn__a hk-pn__a--${rel}" href="${A(K.href(x.id))}" rel="${rel}"><span class="hk-pn__w">${word}</span><span class="hk-pn__t">${A(x.id === 'cover' ? 'Front page' : x.title)}</span></a>` : '<span></span>');
  return `<div class="sx hk" data-page="${A(p.id)}">
<header class="hk-top">
<a class="hk-brand" href="${A(K.href('cover'))}" aria-label="${A(B.name)} UI kit, front page">${logo(L.surface, 'hk-for-light')}${logo(D.surface, 'hk-for-dark')}</a>
<p class="hk-kind">UI kit</p>
<button type="button" class="hk-tb hk-menu-b" data-disclosure aria-controls="hk-menu" aria-expanded="false">Contents</button>
<div class="hk-mode" role="group" aria-label="Theme"><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>
${menu}
</header>
<main class="hk-main" id="hk-main" tabindex="-1"><div class="hk-c">
${body}
<nav class="hk-grid hk-pn" aria-label="Previous and next">${lk(K.prev, 'prev', 'Previous')}${lk(K.next, 'next', 'Next')}</nav>
</div></main>
<footer class="hk-foot"><span>${A(B.name)} UI kit</span><span>${A(ctx.versionLine)}</span></footer>
<p class="sx-live" id="sx-live" aria-live="polite"></p>
</div>`;
}

// ---- css ----
function css(ctx) {
  const T = tokens(ctx), L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, stretch = d.stretch || 100;
  const vars = (r) => `--hk-ground:${r.surface};--hk-ink:${r.text};--hk-soft:${r.textSoft};--hk-quiet:${r.quiet};--hk-hair:${r.divider};--hk-line:${r.border};--hk-panel:${r.raised};--hk-sunk:${r.sunken};--hk-focus:${r.focus};`;
  const M = colourMap(ctx, 'light');
  const lightUi = Object.entries(M).map(([k, v]) => `--${k}:${v}`).join(';');
  // which logo reads on each mode's ground: the one made for it (cwOn), drawn twice and swapped by mode
  return `:root{${vars(L)}--hk-film:${T.film};--hk-hole:${T.hole};--hk-gate:${T.gate};--hk-edge:${T.edge};--hk-loop:${T.loop};
--hk-chrome:'Instrument Sans',sans-serif;--hk-display:'${d.family}',serif;--hk-body:'${B.fonts.body.family}',sans-serif;--hk-mono:'${B.fonts.mono.family}',monospace}
[data-theme="dark"]{${vars(D)}}
[data-hk-lt]{${lightUi};color-scheme:light}
body{margin:0;background:var(--hk-ground)}
.hk{background:var(--hk-ground);color:var(--hk-ink);font:400 16px/1.55 var(--hk-body);-webkit-font-smoothing:antialiased;min-height:100vh}
.hk :where(h1,h2,h3,p,ul,ol,dl,dd,figure,pre){margin:0;padding:0}
.hk :where(.hk-c ul,.hk-c ol,.hk-menu ol){list-style:none}
.hk :focus-visible{outline:2px solid var(--hk-focus);outline-offset:2px}
:root:not([data-theme="dark"]) .hk-for-dark,[data-theme="dark"] .hk-for-light{display:none!important}
.hk-mono{font-family:var(--ff-mono);font-variant-numeric:tabular-nums}
.hk-disp{font-family:var(--hk-display);font-stretch:${stretch}%;font-weight:${ctx.weights.heading}}

/* the bar */
.hk-top{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:16px;height:56px;padding:0 clamp(16px,4.2vw,60px);background:var(--hk-ground);border-bottom:1px solid var(--hk-hair)}
.hk-brand{flex:none;display:block;width:132px;line-height:0;color:var(--hk-ink);border-radius:2px}
.hk-brand__l,.hk-logo{display:block;line-height:0}
.hk-brand__l>*,.hk-logo>*{display:block;width:100%!important;height:auto!important;max-width:100%}
.hk-brand__l>.logo-slot,.hk-logo>.logo-slot{aspect-ratio:132/31.5}
.hk-brand__l svg,.hk-logo svg{display:block;width:100%;height:auto}
.hk-kind{font:600 12px/16px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hk-quiet);margin-right:auto}
.hk-tb{appearance:none;height:36px;padding:0 14px;border:1px solid var(--hk-line);border-radius:2px;background:transparent;color:var(--hk-ink);font:500 14px/1 var(--hk-chrome);cursor:pointer;transition:background-color 150ms ease-out}
@media (hover:hover){.hk-tb:hover{background:var(--hk-sunk)}}
.hk-tb[aria-expanded="true"]{background:var(--hk-ink);color:var(--hk-ground)}
.hk-mode{flex:none;display:inline-flex;padding:2px;border:1px solid var(--hk-line);border-radius:2px}
.hk-mode button{appearance:none;border:0;border-radius:1px;background:transparent;color:var(--hk-soft);font:500 13px/1 var(--hk-chrome);height:30px;padding:0 12px;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
.hk-mode button[aria-pressed="true"]{background:var(--hk-ink);color:var(--hk-ground)}
@media (hover:hover){.hk-mode button[aria-pressed="false"]:hover{color:var(--hk-ink);background:var(--hk-sunk)}}
.hk-mode button:focus-visible{outline-offset:-2px}
.hk-menu{display:none;position:absolute;left:0;right:0;top:56px;max-height:calc(100vh - 56px);overflow:auto;overscroll-behavior:contain;background:var(--hk-ground);border-bottom:1px solid var(--hk-hair)}
.hk-menu.is-open{display:block}
.hk-menu__in{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px 32px;max-width:1440px;margin:0 auto;padding:24px clamp(16px,4.2vw,60px) 32px}
.hk-menu__h{font:600 12px/16px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hk-quiet);padding-bottom:8px;border-bottom:1px solid var(--hk-hair);margin-bottom:4px}
.hk-menu a{display:flex;gap:10px;align-items:baseline;padding:6px 0;min-height:32px;box-sizing:border-box;font:500 14px/20px var(--hk-chrome);color:var(--hk-soft);text-decoration:none}
.hk-menu a[aria-current]{color:var(--hk-ink);text-decoration:underline;text-underline-offset:3px}
@media (hover:hover){.hk-menu a:hover{color:var(--hk-ink)}}
.hk-mn{font:600 12px/16px var(--hk-chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--hk-quiet)}
.hk-main{display:block;padding:40px clamp(16px,4.2vw,60px) 0}
.hk-main:focus{outline:none}
.hk-foot{display:flex;justify-content:space-between;gap:16px;margin:72px clamp(16px,4.2vw,60px) 0;padding:24px 0 48px;border-top:1px solid var(--hk-hair);font:400 12px/16px var(--hk-chrome);color:var(--hk-quiet)}
.sx-live{position:fixed;left:clamp(16px,4.2vw,60px);bottom:32px;z-index:20;margin:0;padding:12px 16px;border-radius:2px;background:var(--hk-ink);color:var(--hk-ground);font:500 14px/20px var(--hk-chrome)}
.sx-live:empty{display:none}

${sheetCss(ctx)}

/* the opening's caption */
.hk-h1{font:${ctx.weights.heading} 40px/44px var(--hk-display);font-stretch:${stretch}%;letter-spacing:-0.01em;color:var(--hk-ink);text-wrap:balance}
[data-page="cover"] .hk-h1{font-size:clamp(40px,5vw,64px);line-height:1.05}

/* the thumbnails: flat shapes in the kit's own colours */
.hk-th{position:absolute;inset:0;display:block;background:var(--surface)}
.hk-th__i{position:absolute;display:block}
.hk-th__aa{position:absolute;left:0;right:0;top:14%;text-align:center;font:${ctx.weights.heading} 30cqh/1 var(--hk-display);font-family:var(--ff-display);color:var(--text)}
.hk-gw{container-type:size}
.hk-th__aa{font-size:42cqh}
.hk-th__aa--l{left:8%;right:auto;top:24%;font-size:min(46cqh,28cqw)}

/* the paper's words */
.hk-p{font:400 16px/26px var(--hk-body);color:var(--hk-soft);text-wrap:pretty;max-width:65ch}
.hk-note{font:400 14px/22px var(--hk-body);color:var(--hk-quiet);max-width:44ch;text-wrap:pretty}
.hk-vals{display:grid;gap:0}
.hk-vals>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--hk-hair)}
.hk-vals dt{font:400 14px/20px var(--hk-body);color:var(--hk-soft)}
.hk-vals dd{font:400 13px/20px var(--hk-mono);color:var(--hk-ink);text-align:right;overflow-wrap:anywhere}
.hk-uses li{font:400 14px/22px var(--hk-body);color:var(--hk-quiet);padding:4px 0}
.hk-uses .hk-mono{color:var(--hk-ink);margin-right:6px}
.hk-scan{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 32px}
.hk-scan__s{font:600 12px/16px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--hk-quiet);margin-bottom:4px}
.hk-scan .hk-vals dd{font-size:12px}
.hk-tok{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}
.hk-tok li{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 0;border-bottom:1px solid var(--hk-hair);font:400 13px/20px var(--hk-body);color:var(--hk-ink)}
.hk-tok__n{min-width:0;flex:0 1 auto}
.hk-tok__v{margin-left:auto;color:var(--hk-soft);text-align:right;font-size:12px}
.hk-sw{flex:none;width:20px;height:20px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--hk-hair)}
.hk-scale li{display:grid;grid-template-columns:calc(var(--g) + var(--gap)) minmax(0,1fr);gap:16px var(--gap);padding:16px 0;border-bottom:1px solid var(--hk-hair);align-items:baseline}
.hk-scale__t{font:500 14px/20px var(--hk-body);color:var(--hk-ink)}
.hk-scale__s{color:var(--hk-ink);background:transparent;text-wrap:pretty;max-width:40ch;min-width:0}

/* inside the prints and gates: layout only, the components keep their own styles */
.hk-stack{display:flex;flex-direction:column;gap:12px;width:100%}
.hk-stack--l{max-width:400px}
.hk-acts{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.hk-acts--c{flex-direction:column}
.hk-why{margin:0;text-align:center}
.hk-two{display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%;max-width:520px}
.hk-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 32px;width:100%}
.hk-col{display:flex;flex-direction:column;min-width:0}
.hk-col--w{grid-column:1/-1}
.hk-ui-lab{font:var(--fw-label) var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--text-soft);margin-bottom:4px}
.hk-ui-body{font:var(--fw-body) var(--fs-body)/var(--lh-body) var(--ff-body);color:var(--text);max-width:52ch}
.hk-ui-cap{font:var(--fw-caption) var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.hk-z{zoom:2;width:100%}
.hk-zz{zoom:1.4;width:100%;display:flex;justify-content:center}
.hk-bset{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:center}
.hk-chips{display:flex;flex-wrap:wrap;gap:16px 24px}
.hk-dlg{width:100%;display:flex;justify-content:center;padding:40px 24px;background:var(--sunken);border-radius:2px}
.hk-dlg .ui-dialog{position:static;max-width:420px;width:100%}
.hk-tw{width:100%;padding:24px}
.hk-tw--n{display:none}
.hk-wide{width:100%}
.hk-top-ui{padding:0 24px}
.hk-scr{width:100%;background:var(--surface)}
.hk-scr__b{display:flex;flex-direction:column;gap:16px;padding:20px 24px 32px;align-items:flex-start}
.hk-scr__b .hk-disp{margin:0}
.hk-scr__l{width:100%}
.hk-phone .ui-row__main .ph-n{white-space:normal!important}
.hk-phone{width:100%;max-width:320px;border-radius:4px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--divider)}
.hk-scr--p .hk-scr__b{padding:16px}
.hk-sp{display:block;background:var(--action);border-radius:1px}
.hk-rad{display:block;width:56px;height:56px;box-shadow:inset 0 0 0 1px var(--edge)}
.hk-bd{display:block;width:72px;height:48px;border-radius:2px}
.hk-gr{position:absolute;inset:0;display:block;border-radius:inherit}
.hk-cg:has(.hk-gr){padding:0;overflow:hidden}
.hk-rolls{display:grid;gap:24px}

/* previous and next */
.hk-pn{margin-top:96px;padding-top:16px;border-top:1px solid var(--hk-hair)}
.hk-pn__a{display:flex;flex-direction:column;gap:4px;padding:8px 0;color:var(--hk-ink);text-decoration:none;min-height:44px;border-radius:2px}
.hk-pn__a--prev{grid-column:1 / span 2}
.hk-pn__a--next{grid-column:5 / span 2;text-align:right}
.hk-pn__w{font:500 12px/16px var(--hk-chrome);color:var(--hk-quiet)}
.hk-pn__t{font:${ctx.weights.heading} 24px/30px var(--hk-display);font-stretch:${stretch}%}
@media (hover:hover){.hk-pn__a:hover .hk-pn__t{text-decoration:underline;text-underline-offset:4px}}

@media (max-width:840px){
.hk-top{padding:0 16px;gap:8px}
.hk-brand{width:96px}
.hk-kind{display:none}
.hk-brand{margin-right:auto}
.hk-mode button{padding:0 10px}
.hk-menu__in{grid-template-columns:1fr 1fr;padding:16px}
.hk-main{padding:24px 16px 0}
.hk-foot{flex-direction:column;gap:4px;margin:48px 16px 0}
.sx-live{right:16px;bottom:16px}
.hk-scan,.hk-tok,.hk-cols,.hk-two{grid-template-columns:1fr}
.hk-scale li{grid-template-columns:1fr}
.hk-z{zoom:1.25}
.hk-zz{zoom:1}
.hk-pn{grid-template-columns:1fr 1fr;column-gap:16px;margin-top:64px}
.hk-pn__a--prev,.hk-pn__a--next{grid-column:auto}
.hk-pn__t{font-size:18px;line-height:24px}
.hk-tw{padding:16px}
.hk-tw--w{display:none}.hk-tw--n{display:block}
.hk-top-ui .ui-topbar__links{display:none}
}`;
}

export const kitSite = { css, shell, pages: {}, fallback: render, benches };
