// Theme 28 (Riso), lane hg: the guide site. Every guidelines page is one sheet of the run, as in the brand book (lane-bk): a plate across its head,
// a pass of the key drum screened down its right edge, and the hit, a numeral in the brand's display face cut out of the plate and printed a few px
// out of register. The hit is a real count from ctx, and the note beside it says what it counts. The press is in lane-hg-press.js, the pages in
// lane-hg-pages.js. Exports only guideSite.
import { pressOf, faceFor, A } from './sheet.js';
import { bookBrand } from './copy.js';
import { sheet, pressCss } from './lane-hg-press.js';
import { pageHtml } from './lane-hg-pages.js';

const fc = (ctx, role, weight) => { const f = faceFor(ctx, role, weight); return `font-family:var(--g-${role === 'display' ? 'display' : 'body'});font-weight:${f.weight};font-style:${f.style === 'italic' ? 'italic' : 'normal'}${f.stretch ? `;font-stretch:${f.stretch}%` : ''}`; };
const cwFor = (ctx, ground) => { const cws = ctx.brand.logo.colourways; return Object.keys(cws).filter((k) => cws[k].ground).sort((a, b) => ctx.ratio(cws[a].ground, ground) - ctx.ratio(cws[b].ground, ground))[0]; };
const logoAt = (ctx, id, ground, w, label) => { const k = cwFor(ctx, ground); return ctx.logo.html(id, { width: w, colourway: k, color: ctx.brand.logo.colourways[k].name, label }); };
const logoBoth = (ctx, id, w, label) => `<span class="hg-lg hg-for-light">${logoAt(ctx, id, pressOf(ctx).paper, w, label)}</span><span class="hg-lg hg-for-dark">${logoAt(ctx, id, ctx.roles.dark.surface, w, label)}</span>`;
const pad3 = (n) => String(n).padStart(3, '0');

// ---- the front: the cover sheet and the contents sheet ----
function cover(ctx) {
  const B = bookBrand(ctx), n = ctx.sections.length, np = ctx.pages.length, P = pressOf(ctx);
  ctx.pair(P.textOnPlate, P.plate, { size: 40, what: 'site cover head' });
  const title = `<h1 class="hg-title hg-title--cover" id="hg-t-cover" style="${fc(ctx, 'display', ctx.weights.heading)}">${(String(ctx.brand.lines.primary).match(/[^.!?]+[.!?]+/g) || [ctx.brand.lines.primary]).map((x) => `<span class="hg-sent">${A(x.trim())}</span>`).join(' ')}</h1>`;
  const body = `<div class="hg-intro"><span class="hg-intro__lg">${logoBoth(ctx, 'colour', 240, `${B.name} logo`)}</span><p class="hg-lead">${A(B.description)}</p></div>
<p class="hg-meta">${A(B.name)} brand guidelines, ${A(ctx.versionLine)}</p>`;
  return sheet(ctx, 'cover', { count: n, title, note: `${A(ctx.cap(n === 1 ? 'section' : 'sections'))} in these guidelines, ${np} pages in all.`, folio: `${pad3(1)} / ${pad3(np)}`, foot: 'Cover', wide: 300, narrow: 120 }, body);
}
function contents(ctx, S) {
  const total = ctx.pages.length, n = total, ns = ctx.sections.length, units = (sec) => (S ? (S.sections.find((x) => x.n === sec.n) || { units: [] }).units : []);
  const dsp = fc(ctx, 'display', ctx.weights.heading);
  const row = (sec) => {
    const us = units(sec);
    const links = us.length ? us.map((u) => `<li><a class="hg-toc__a" href="${A(u.file)}">${A(u.title)}<span class="hg-v hg-toc__p">${pad3(ctx.pageNo(u.ids ? u.ids[0] : u.id))}</span></a></li>`).join('') : (sec.pages || []).map((p) => `<li><span class="hg-toc__a">${A(p.title)}<span class="hg-v hg-toc__p">${pad3(ctx.pageNo(p.id))}</span></span></li>`).join('');
    return `<li class="hg-toc__s"><span class="hg-v hg-toc__n">${String(sec.n).padStart(2, '0')}</span><h3 class="hg-toc__t" style="${dsp}">${A(sec.title)}</h3><ul class="hg-toc__l">${links}</ul></li>`;
  };
  return sheet(ctx, 'contents', { count: n, title: 'Contents', h1: false, note: `${A(ctx.cap(n === 1 ? 'page' : 'pages'))} in all, in ${ns} sections. Each page is one sheet.`, folio: `${pad3(ctx.pageNo('contents') || 2)} / ${pad3(total)}`, foot: 'Contents' }, `<ol class="hg-toc">${ctx.sections.map(row).join('')}</ol>`);
}

// ---- the chrome: a slug line across the bench, the contents panel, and prev and next at the foot ----
function shell(ctx, S) {
  const B = ctx.brand, cur = S.unit && S.unit.id;
  const panel = `<nav class="hg-panel" id="hg-panel" data-open="false" aria-label="Contents"><div class="hg-panel__in">${S.sections.map((s) => `<div class="hg-panel__s"><p class="hg-panel__h"><span class="hg-v">${String(s.n).padStart(2, '0')}</span> ${A(s.title)}</p><ul>${s.units.map((u) => `<li><a href="${A(u.file)}"${u.id === cur ? ' aria-current="page"' : ''}>${A(u.title)}</a></li>`).join('')}</ul></div>`).join('')}</div></nav>`;
  const pn = (u, k) => (u ? `<a class="hg-pn__${k}" href="${A(u.file)}" rel="${k === 'p' ? 'prev' : 'next'}"><span class="hg-pn__k">${k === 'p' ? 'Previous' : 'Next'}</span><span class="hg-pn__t" style="${fc(ctx, 'display', ctx.weights.heading)}">${A(u.title)}</span></a>` : '<span></span>');
  return `<div data-gs-root class="hg">
<header class="hg-top"><a class="hg-brand" href="index.html" aria-label="${A(B.name)} brand guidelines, home">${logoBoth(ctx, 'horizontal', 128, `${B.name} logo`)}</a>
<nav class="hg-links" aria-label="Site"><a href="index.html"${S.isFront ? ' aria-current="page"' : ''}>Guidelines</a><a href="../ui-kit-html/index.html">UI kit</a></nav>
<button type="button" class="hg-btn" data-gs-toggle aria-controls="hg-panel">Contents</button>
<div class="hg-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div>${panel}</header>
<main id="main" class="hg-main">${S.body}${S.isFront ? '' : `<nav class="hg-pn" aria-label="Pages">${pn(S.prev, 'p')}${pn(S.next, 'n')}</nav>`}</main>
<footer class="hg-foot"><span>${A(B.name)} brand guidelines, ${A(ctx.versionLine)}</span></footer></div>`;
}

function css(ctx) {
  const P = pressOf(ctx);
  return `${pressCss(ctx)}
[data-gs-root]{--g-bmono:'${(ctx.brand.fonts.mono || ctx.brand.fonts.body).family}',monospace}
body{margin:0}
.hg-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:12px 32px;background:var(--g-bench);border-bottom:1px solid var(--g-key)}
.hg-brand{display:block;flex:none;width:128px;line-height:0}
/* the logo slot (slot edition) sits in this link: set it as the other slots are, in the key, not as a link */
.hg-brand{color:var(--g-key);text-decoration:none}
.hg-brand svg{display:block;width:128px;height:auto}
.hg-links{display:flex;gap:24px;flex:1;min-width:0}
.hg-links a{display:block;padding:8px 0;font:500 15px/1.2 var(--g-body);color:var(--g-key);text-decoration:none;border-bottom:2px solid transparent;transition:border-color 120ms ease-out}
.hg-links a[aria-current]{border-bottom-color:var(--g-key)}
@media (hover:hover){.hg-links a:hover{border-bottom-color:var(--g-plate)}}
.hg-btn{appearance:none;border:1px solid var(--g-key);border-radius:0;background:transparent;color:var(--g-key);height:40px;padding:0 16px;font:500 15px/1 var(--g-body);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
@media (hover:hover){.hg-btn:hover{background:var(--g-key);color:var(--g-bench)}}
.hg-btn:active{transform:scale(.97)}
.hg-top:has(.hg-panel[data-open="true"]) .hg-btn{background:var(--g-key);color:var(--g-bench)}
.hg-mode{display:inline-flex;border:1px solid var(--g-key)}
.hg-mode button{appearance:none;border:0;border-radius:0;background:transparent;color:var(--g-key);font:500 15px/1 var(--g-body);height:38px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
:root:not([data-theme="dark"]) .hg-mode [data-mode="light"],[data-theme="dark"] .hg-mode [data-mode="dark"]{background:var(--g-key);color:var(--g-bench)}
.hg-mode button:focus-visible{outline-offset:-4px}
.hg-panel{display:none;position:absolute;left:0;right:0;top:100%;max-height:calc(100vh - 64px);overflow:auto;overscroll-behavior:contain;background:var(--g-bench);border-bottom:1px solid var(--g-key)}
.hg-panel[data-open="true"]{display:block}
.hg-panel__in{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px 32px;max-width:1280px;margin:0 auto;padding:24px 32px 32px}
.hg-panel__h{font:600 15px/1.3 var(--g-body);padding-bottom:8px;border-bottom:1px solid var(--g-key);margin-bottom:4px}
.hg-panel a{display:block;padding:8px 0;font:400 15px/1.3 var(--g-body);color:var(--g-key);text-decoration:none}
.hg-panel a[aria-current]{font-weight:600;text-decoration:underline;text-underline-offset:4px}
@media (hover:hover){.hg-panel a:hover{text-decoration:underline;text-underline-offset:4px}}
.hg-main{display:block;padding:32px 32px 0}
.hg-main:focus{outline:none}
.hg-pn{display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;max-width:1280px;margin:0 auto;padding:8px 0 16px}
.hg-pn a{display:flex;flex-direction:column;gap:4px;padding:16px 0 12px;border-top:1px solid var(--g-key);color:var(--g-key);text-decoration:none}
.hg-pn__n{text-align:right;align-items:flex-end}
.hg-pn__k{font:500 14px/1.3 var(--g-body)}
.hg-pn__t{font-size:24px;line-height:1.15}
@media (hover:hover){.hg-pn a:hover .hg-pn__t{text-decoration:underline;text-underline-offset:4px}}
.hg-foot{max-width:1280px;margin:0 auto;padding:16px 0 48px;font:400 14px/1.4 var(--g-body)}
@media (max-width:840px){.hg-top{flex-wrap:wrap;padding:10px 16px;gap:8px 16px}.hg-brand,.hg-brand svg{width:104px}.hg-links{order:3;flex:1 1 auto;gap:20px}.hg-btn{margin-left:auto;order:2}.hg-mode{order:4}.hg-btn,.hg-mode button{height:44px}.hg-panel{top:100%}.hg-panel__in{padding:16px}.hg-main{padding:12px 0 0}.hg-pn,.hg-foot{padding-left:16px;padding-right:16px}.hg-pn{gap:8px 16px}.hg-pn__t{font-size:20px}}

/* type in the body */
.hg-lead{font:400 22px/1.45 var(--g-body);max-width:40ch}
.hg-p{font:400 16px/1.55 var(--g-body);max-width:68ch}
.hg-h3{font:600 16px/1.3 var(--g-body);padding-top:12px;border-top:1px solid var(--g-key)}
.hg-do{font-weight:600}
.hg-meta{font:400 15px/1.4 var(--g-body)}
.hg-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px 40px}
.hg-two > div{display:flex;flex-direction:column;gap:16px}
.hg-rows{display:grid;gap:0}
.hg-rows > div{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px 32px;padding:12px 0;border-top:1px solid var(--g-key);align-items:baseline}
.hg-rows dt{font:600 15px/1.5 var(--g-body)}
.hg-rules{display:grid;gap:20px}
.hg-rules li{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px 40px;padding-top:16px;border-top:1px solid var(--g-key);font:400 16px/1.55 var(--g-body)}
.hg-lg{line-height:0}
.hg-lg svg{display:block;max-width:100%;height:auto}
.hg-mock{display:flex;flex-direction:column;gap:8px}
.hg-mock img,.hg-mock svg.pl{display:block;width:100%;height:auto;max-width:960px}
.hg-sign{display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:24px 48px;align-items:start}
.hg-sign--wide{grid-template-columns:minmax(0,1fr)}
.hg-sign__t{display:flex;flex-direction:column;gap:24px}
.hg-sw{display:block;width:20px;height:20px;flex:none;outline:1px solid var(--g-key);outline-offset:-1px}

/* cover, intro */
.hg-title--cover{font-size:clamp(40px,5.6cqi,84px);max-width:none}
/* the brand line breaks between its sentences, never inside one (inside only when the column is too narrow for it) */
.hg-sent{display:block}
.hg-intro{display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px 48px;align-items:start}
.hg-intro__lg{display:block;width:240px}
.hg-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px 40px}
.hg-pair > div{display:flex;flex-direction:column;gap:12px}
.hg-traits{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:32px 40px}
.hg-traits li{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--g-key)}
.hg-traits__n{font-size:14px}
.hg-trait{font-size:36px;line-height:1.1}

/* contents */
.hg-toc{display:grid;gap:0}
.hg-toc__s{display:grid;grid-template-columns:48px 220px minmax(0,1fr);gap:8px 24px;padding:20px 0;border-top:1px solid var(--g-key);align-items:baseline}
.hg-toc__n{font-size:14px}
.hg-toc__t{font-size:28px;line-height:1.1}
.hg-toc__l{display:flex;flex-wrap:wrap;gap:0 28px}
.hg-toc__a{display:flex;gap:8px;align-items:baseline;padding:10px 0;font:400 16px/1.3 var(--g-body);color:var(--g-key);text-decoration:none;min-height:44px}
a.hg-toc__a{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}
@media (hover:hover){a.hg-toc__a:hover{text-decoration-thickness:2px}}
.hg-toc__p{font-size:13px}

/* voice */
.hg-say{display:grid;gap:24px}
.hg-say li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:8px 40px;align-items:baseline;padding-bottom:24px;border-bottom:1px solid var(--g-key)}
.hg-say__k{font:600 16px/1.4 var(--g-body)}
.hg-say__x{font-size:36px;line-height:1.15;max-width:28ch}
.hg-wtn{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:32px 40px}
.hg-wtn li{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--g-key)}
.hg-wtn__w{font:600 20px/1.35 var(--g-body)}
.hg-wtn__n{font:400 16px/1.45 var(--g-body)}
.hg-lines{display:grid;gap:12px}
.hg-lines li{font-size:clamp(28px,4cqi,48px);line-height:1.1;max-width:24ch}

/* logo */
.hg-logohero{max-width:520px}
.hg-vers{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:32px}
.hg-ver{display:flex;flex-direction:column;gap:8px}
.hg-ver__g{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;padding:16px;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-ver__g svg{display:block;max-width:100%;height:auto}
.hg-ver__k{font:600 16px/1.3 var(--g-body)}
.hg-clear{max-width:480px}
.hg-clear__b{outline:1px dashed var(--g-key);outline-offset:-1px}
.hg-min{display:flex}
.hg-grounds{display:grid;gap:24px}
.hg-grounds li{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:8px 32px;align-items:center}
.hg-ground{display:flex;align-items:center;justify-content:center;aspect-ratio:2/1;padding:16px;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-ground svg{display:block;max-width:100%;height:auto}
.hg-miss{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:24px}
.hg-miss li{display:flex;flex-direction:column;gap:8px}
.hg-miss__a{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;padding:16px;overflow:hidden;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-miss__a svg{display:block;max-width:100%;height:auto}
.hg-miss__k{font:600 16px/1.3 var(--g-body)}
.hg-boxed{padding:12px;border:2px solid var(--g-key)}
.hg-never{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px 40px;font:400 16px/1.5 var(--g-body)}

/* colour */
.hg-cols,.hg-cvs{display:grid;gap:0}
.hg-col,.hg-cv{display:grid;grid-template-columns:120px minmax(0,1fr);gap:24px;padding:24px 0;border-top:1px solid var(--g-key)}
.hg-col__sw{display:block;width:120px;height:120px;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-col__t{display:flex;flex-direction:column;gap:12px}
.hg-col__n{font:600 20px/1.25 var(--g-body)}
.hg-ramp{display:flex;flex-wrap:wrap;gap:12px 16px}
.hg-ramp li{display:flex;flex-direction:column;gap:4px;font-size:13px;line-height:1.35}
.hg-ramp i{display:block;width:56px;height:24px;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-share{display:flex;height:120px;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-shares{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px 32px}
.hg-shares li{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--g-key)}
.hg-shares li .hg-v{margin-left:auto}
.hg-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px}
.hg-pc{display:flex;flex-direction:column;gap:8px}
.hg-pc__s{display:flex;align-items:flex-end;height:96px;padding:12px;font:400 24px/1 var(--g-val);outline:1px solid var(--g-key);outline-offset:-1px}
.hg-pc__s--n{align-items:center}
.hg-pc__s--n i{display:block;width:24px;height:24px}

/* type */
.hg-faces{display:grid;gap:24px}
.hg-faces--2{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
.hg-face{display:flex;flex-direction:column;gap:8px;padding-bottom:24px;border-bottom:1px solid var(--g-key)}
.hg-face__big{font-size:clamp(40px,7cqi,96px);line-height:1.05;overflow-wrap:anywhere}
.hg-scale,.hg-use{display:grid;gap:0}
.hg-scale li,.hg-use li{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px 40px;padding:24px 0;border-top:1px solid var(--g-key)}
.hg-scale__k{display:flex;flex-direction:column;gap:6px}
.hg-scale__t{font:600 16px/1.3 var(--g-body)}
.hg-scale__s,.hg-use__s{font-size:var(--fs);overflow-wrap:anywhere;max-width:30em}

/* imagery */
.hg-shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:32px 24px}
.hg-shot figure{display:flex;flex-direction:column;gap:8px}
.hg-photo{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;background:var(--g-bench);outline:1px solid var(--g-key);outline-offset:-1px}

/* layout */
.hg-gridw{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:24px 48px;align-items:start}
.hg-grid{position:relative;width:100%;background:var(--g-paper);outline:1px solid var(--g-key);outline-offset:-1px}
.hg-grid__c{display:grid;height:100%}
.hg-grid__c i{display:block;background:var(--g-plate);mix-blend-mode:var(--g-pblend)}
.hg-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px}
.hg-space li{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font-size:13px}
.hg-space i{display:block;background:var(--g-plate)}
.hg-radii{display:grid;gap:12px}
.hg-radii li{display:flex;align-items:center;gap:16px}
.hg-radii i{display:block;width:48px;height:48px;border:1px solid var(--g-key);flex:none}
.hg-lays{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.hg-lays li{display:flex;flex-direction:column;gap:8px}
.hg-lay{position:relative;isolation:isolate;overflow:hidden;aspect-ratio:794/1123;background:var(--g-paper);outline:1px solid var(--g-key);outline-offset:-1px;container-type:inline-size}
.hg-lay__plate{position:absolute;left:0;top:0;width:100%;background:var(--g-plate);mix-blend-mode:var(--g-pblend)}
.hg-lay__pass{position:absolute;top:0;right:0;width:20%;height:100%;background:var(--g-pass);mix-blend-mode:var(--g-bblend)}
.hg-lay__t{position:absolute;left:8%;width:62%;font-size:11cqi;line-height:1.05;color:var(--g-key)}
.hg-lay__t--p{color:var(--g-ptxt)}
.hg-lay__lg{position:absolute;left:8%;bottom:6%;display:block;width:38%}
.hg-lay__lg svg{display:block;width:100%;height:auto}

/* applications */
.hg-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:24px}
.hg-card{position:relative;width:100%;max-width:560px;aspect-ratio:90/55;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;font:400 16px/1.4 var(--g-body);outline:1px solid var(--g-key);outline-offset:-1px}
.hg-card--b{background:var(--g-paper);color:var(--g-key)}
.hg-card__lg{display:block;width:170px}
.hg-card__lg svg{display:block;width:100%;height:auto}
.hg-card__nm{font-weight:600;font-size:20px}
.hg-card__ct{margin-top:8px}
.hg-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.hg-post{position:relative;aspect-ratio:1;padding:20px;display:flex;flex-direction:column;justify-content:space-between;outline:1px solid var(--g-key);outline-offset:-1px}
.hg-post p{font-size:clamp(20px,2.6cqi,30px);line-height:1.1}
.hg-post__lg{display:block;width:48px}
.hg-post__lg svg{display:block;width:100%;height:auto}
.hg-drums{display:grid;gap:0}
.hg-drums li{display:flex;align-items:center;gap:16px;padding:10px 0;border-bottom:1px solid var(--g-key)}
.hg-email{display:flex;flex-direction:column;gap:4px;max-width:520px;padding:24px;outline:1px solid var(--g-key);outline-offset:-1px;font:400 16px/1.45 var(--g-body)}
.hg-email__n{font-weight:600;font-size:20px}
.hg-email__l{margin-top:16px;width:180px}
.hg-device{max-width:420px;padding:10px;border:1px solid var(--g-key)}
.hg-screen{padding:16px;display:flex;flex-direction:column;gap:12px}
.hg-scr__top{display:flex;justify-content:space-between;align-items:center}
.hg-scr__eta,.hg-scr__note{margin:0}

/* summary, contact */
.hg-sum__lg{display:block;max-width:280px}
.hg-sumr{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px 40px}
.hg-sumr li{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--g-key)}
.hg-sumr .hg-say__k{font-size:24px;line-height:1.15}
.hg-nots{display:grid;gap:12px}

/* the one moment: on the cover the pass drops in and the hit lands after it */
@keyframes hg-feed{from{transform:translateY(-16px)}}
@keyframes hg-land{from{opacity:0}}
.hg-sh--cover .hg-pass{animation:hg-feed 640ms cubic-bezier(.23,1,.32,1) both}
.hg-sh--cover .hg-hit{animation:hg-land 300ms ease-out 760ms both}
@media (prefers-reduced-motion:reduce){.hg-sh--cover .hg-pass,.hg-sh--cover .hg-hit{animation:none}}

@media (max-width:840px){
.hg-intro{grid-template-columns:1fr}
.hg-intro__lg{width:176px}
.hg-lead{font-size:19px}
.hg-rows > div,.hg-say li,.hg-scale li,.hg-use li,.hg-toc__s{grid-template-columns:1fr}
.hg-say__x{font-size:28px}
.hg-trait{font-size:30px}
.hg-toc__t{font-size:26px}
.hg-col,.hg-cv{grid-template-columns:72px minmax(0,1fr);gap:16px}
.hg-col__sw{width:72px;height:72px}
.hg-scale__s,.hg-use__s{font-size:min(var(--fs),40px)}
.hg-gridw,.hg-grounds li,.hg-sign{grid-template-columns:1fr}
.hg-lays{grid-template-columns:1fr;max-width:320px}
.hg-posts{grid-template-columns:1fr}
.hg-post p{font-size:26px}
.hg-card{padding:16px}
}
`;
}

export const guideSite = {
  css,
  shell,
  front(ctx, S) { return cover(ctx) + contents(ctx, S); },
  page(ctx, id) { return id === 'cover' ? cover(ctx) : id === 'contents' ? contents(ctx, null) : pageHtml(ctx, id); },
  adapt: { strip: [], noLink: '.hg-v,.hg-pc__s,.hg-meta,.hg-foot' },
  darkSample: ['cover', 'palette', 'logo-grounds'],
};
