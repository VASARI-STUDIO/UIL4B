// Theme 31, Contact sheet, lane hk: the kit site's sheet parts (the strip of pages, a cut of bracketed exposures, the paper grid, a code block).
// Copied from lane-bk.js (strip, opening, row, bookCss) with an hk- prefix, so lane hg can change its own copy freely. Every measure is in
// container units of one gate (14.957cqw wide, 29.915cqw at narrow), so the text lines up with the film at every width.
import { A, tokens, frameLabel, loopPath } from './helpers.js';

const r2 = (n) => Math.round(n * 100) / 100;
export const pad2 = (n) => String(n).padStart(2, '0');
const tri = '<i class="hk-tri" aria-hidden="true"></i>';

// a page's frame number on the roll: its place in the kit, from 1
export const frameNo = (K, id) => K.pages.findIndex((p) => p.id === id) + 1;

// ---- the strip: six pages of the kit around this one, the current one circled. Each frame links to its page and its title sits under
// the film on the paper. Two halves of three, side by side at wide and stacked at narrow, as the book's strip.
export function strip(ctx, K, list, curId, { thumb, label = 'Pages around this one', loop = true, draw = true } = {}) {
  const B = ctx.brand, slug = ctx.slug || B.slug, cur = frameNo(K, curId);
  // the words sit in an inner span, so the film they are printed on is their own parent's ground
  const ep = (at, html, cls = '') => `<span class="hk-ep ${cls}" style="--at:${at}" aria-hidden="true"><span class="hk-ep__t">${html}</span></span>`;
  // the stock and the number of the frame it is printed over (the second of its half), as edge numbers run on real film
  const stock = (p) => `${A(B.name)} 400${tri}${pad2(p ? frameNo(K, p.id) : cur)}A`;
  // the edge print rides in the first frame of each half, placed from the half's left edge
  const cell = (p, eps = '') => {
    if (!p) return `<li class="hk-sc" aria-hidden="true"><span class="hk-fc">${eps}<span class="hk-gw"></span><span class="hk-no">00</span></span></li>`;
    const no = frameNo(K, p.id), on = p.id === curId;
    const ring = on && loop ? `<svg class="hk-loop${draw ? ' hk-loop--draw' : ''}" viewBox="495 52 276 212" preserveAspectRatio="none" aria-hidden="true"><path d="${loopPath(slug, 'kit-' + p.id)}"/></svg>` : '';
    return `<li class="hk-sc"><a class="hk-sa" href="${A(K.href(p.id))}"${on ? ' aria-current="page"' : ''}><span class="hk-fc" aria-hidden="true">${eps}<span class="hk-gw"><span class="hk-gate ui"${thumb.dark(p.id) ? ' data-theme="dark"' : thumb.light(p.id) ? ' data-hk-lt' : ''}>${thumb.html(p.id)}</span>${ring}</span><span class="hk-no">${frameLabel(no)}${tri}</span></span><span class="hk-tt">${A(p.title)}</span></a></li>`;
  };
  const secOf = (p) => (p && p.section ? p.section.title : p ? p.title : '');
  const halves = [list.slice(0, 3), list.slice(3, 6)].filter((h) => h.length);
  const half = (h, k) => {
    const eps = k === 0 ? ep(0, `${A(B.name)} UI kit`) + (h.length > 1 ? ep(1, stock(h[1]), 'hk-ep--w') : '') : ep(0, A(secOf(h.find(Boolean)))) + (h.length > 1 ? ep(1, stock(h[1]), 'hk-ep--n') : '');
    return `<ol class="hk-half">${h.map((p, i) => cell(p, i === 0 ? eps : '')).join('')}</ol>`;
  };
  return `<nav class="hk-roll" aria-label="${A(label)}">${halves.map(half).join('')}</nav>`;
}

// the six pages around id: the current one third where the kit allows
export function around(K, id) {
  const i = K.pages.findIndex((p) => p.id === id), n = K.pages.length;
  const s = Math.max(0, Math.min(i - 2, n - 6));
  return K.pages.slice(s, s + 6);
}

// ---- a cut of bracketed exposures: one gate per state or kind, its name in edge print under the gate. frames: [{ label, html, dark, lt, wide }]
export function cut(title, frames) {
  const cell = (f) => `<li class="hk-cc${f.wide ? ' hk-cc--w' : ''}"><div class="hk-cg ui"${f.dark ? ' data-theme="dark"' : f.lt ? ' data-hk-lt' : ''}>${f.html}</div><p class="hk-cl">${A(f.label)}</p></li>`;
  return `<div class="hk-cut" role="group" aria-label="${A(title)}"><span class="hk-ep hk-cut__t" aria-hidden="true"><span class="hk-ep__t">${A(title)}</span></span><ol class="hk-cut__f">${frames.map(cell).join('')}</ol></div>`;
}

// ---- the opening: the caption column on gates 5 and 6 (first in reading order), the enlargement on gates 2 to 4 ----
export function opening({ no, section, title, lede, enl, enlCap = '', dark = false, lt = false, flush = false }) {
  const cap = `<div class="hk-cap"><p class="hk-fno">${A(pad2(no))}</p>${section ? `<p class="hk-ct">${A(section)}</p>` : ''}<hr class="hk-hr"><h1 class="hk-h1">${A(title)}</h1>${lede ? `<p class="hk-words">${A(lede)}</p>` : ''}</div>`;
  const fig = enl ? `<figure class="hk-enl"><div class="hk-print ui${flush ? ' hk-print--flush' : ''}"${dark ? ' data-theme="dark"' : lt ? ' data-hk-lt' : ''}>${enl}</div>${enlCap ? `<figcaption class="hk-enl__c">${A(enlCap)}</figcaption>` : ''}</figure>` : '';
  return `<div class="hk-grid hk-open">${cap}${fig}</div>`;
}

// ---- a long-read row: its name in gate 1, the matter on gates 2 to 4, a note on 5 and 6 (wide: the matter on 2 to 6) ----
export const row = (name, main, side = '', { wide = false } = {}) => `<section class="hk-grid hk-row"><h2 class="hk-k">${A(name)}</h2><div class="${wide ? 'hk-mw' : 'hk-m'}">${main}</div>${side && !wide ? `<div class="hk-s">${side}</div>` : ''}</section>`;
// a band: the name over a cut that runs the sheet's full width
export const band = (name, inner, note = '') => `<section class="hk-band"><div class="hk-grid hk-band__h"><h2 class="hk-k">${A(name)}</h2>${note ? `<p class="hk-note hk-band__n">${A(note)}</p>` : ''}</div>${inner}</section>`;

// ---- code: the markup on a length of unexposed film, edge print for type; the copy button names what it copies ----
export const codeBlock = (title, text, what, id) => `<div class="hk-code"><div class="hk-code__h"><h3 class="hk-code__t" id="${id}">${A(title)}</h3><button type="button" class="hk-copy" data-copy="${A(text)}" data-copy-name="${A(what)}"><span data-copy-text>Copy</span></button></div><pre class="hk-pre" tabindex="0" aria-labelledby="${id}"><code>${A(text)}</code></pre></div>`;

// ---- css ---------------------------------------------------------------------------------------------------------------------------
// the loop drawn by the pencil: a pie that opens 30 degrees a step from 150 degrees, twelve steps, over the loop's box (as the book)
function drawKeys() {
  const N = 12, R = 150, pt = (d) => { const t = (d * Math.PI) / 180; return `${r2(50 + R * Math.cos(t))}% ${r2(50 + R * Math.sin(t))}%`; };
  let k = '';
  for (let i = 0; i <= N; i++) { const p = ['50% 50%']; for (let j = 0; j <= N; j++) p.push(pt(150 + 30 * Math.min(i, j))); k += `${r2((i / N) * 100)}%{clip-path:polygon(${p.join(',')})}`; }
  return `@keyframes hk-draw{${k}}`;
}
// the sprocket holes as a background band: one 12 x 17 hole every 29.25 px
const holes = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29.25' height='17'%3E%3Crect x='8.625' width='12' height='17' rx='2.5' fill='${hex.replace('#', '%23')}'/%3E%3C/svg%3E")`;

export function sheetCss(ctx) {
  const T = tokens(ctx), H = holes(T.hole);
  const film = `background-color:var(--hk-film);background-image:${H},${H};background-repeat:repeat-x;background-size:29.25px 17px;background-position:0 6px,0 calc(100% - 6px)`;
  return `
/* the sheet: a gate is 14.957cqw, a gap 1.7094cqw, the cut end of a strip 0.8547cqw */
.hk-c{container-type:inline-size;max-width:1440px;margin:0 auto}
.hk-grid{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw;display:grid;grid-template-columns:repeat(6,var(--g));column-gap:var(--gap);padding:0 var(--cut)}
.hk-roll,.hk-cut{--g:14.957cqw;--gap:1.7094cqw;--cut:0.8547cqw}
.hk-roll{display:flex;isolation:isolate}
.hk-half{position:relative;flex:none;display:grid;grid-template-columns:repeat(3,calc(var(--g) + var(--gap)));align-content:start}
.hk-sc{display:block;min-width:0}
.hk-sa{display:block;color:var(--hk-soft);text-decoration:none;border-radius:2px}
.hk-fc{position:relative;display:block;padding:40px calc(var(--gap) / 2);${film}}
.hk-gw{position:relative;display:block;aspect-ratio:3/2}
.hk-gate{position:absolute;inset:0;display:block;overflow:hidden;border-radius:2px;background:var(--surface);color:var(--text)}
.hk-gate::after,.hk-cg::after,.hk-print::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1);pointer-events:none}
.hk-no{position:absolute;left:0;right:0;bottom:24px;font:600 12px/12px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;font-variant-numeric:tabular-nums;text-align:center;color:var(--hk-edge)}
.hk-tt{display:block;padding:8px calc(var(--gap) / 2 + 2px) 0;font:500 13px/18px var(--hk-chrome);color:var(--hk-soft);text-wrap:balance}
.hk-sa[aria-current] .hk-tt{color:var(--hk-ink)}
@media (hover:hover){.hk-sa:hover .hk-tt{color:var(--hk-ink);text-decoration:underline;text-underline-offset:3px}}
.hk-sa:focus-visible{outline:2px solid var(--hk-focus);outline-offset:2px}
.hk-ep{position:absolute;z-index:1;top:23px;left:calc(var(--at) * (var(--g) + var(--gap)) + var(--gap) / 2 + 8px);font:600 12px/16px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;color:var(--hk-edge);background:var(--hk-film);padding:0 2px}
.hk-ep__t{display:inline-block;color:var(--hk-edge);background:var(--hk-film)}
.hk-ep--n{display:none}
.hk-tri{display:inline-block;width:0;height:0;margin:0 0 0 6px;border-left:6px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;vertical-align:1px}
.hk-loop{position:absolute;z-index:2;left:-15.714%;top:-25.714%;width:131.43%;height:151.43%;overflow:visible;pointer-events:none;fill:var(--hk-loop)}
${drawKeys()}
.hk-loop--draw{animation:hk-draw 800ms linear 300ms both}
@media (prefers-reduced-motion:reduce){.hk-loop--draw{animation:none}}

/* a cut of bracketed exposures */
.hk-cut{position:relative;isolation:isolate}
.hk-cut__t{left:calc(var(--gap) / 2 + 8px)}
.hk-cut__f{display:flex;flex-wrap:wrap;width:fit-content;max-width:calc(100% + 2px)}
.hk-cc{position:relative;flex:none;box-sizing:border-box;width:calc(var(--g) + var(--gap));display:flex;flex-direction:column;padding:40px calc(var(--gap) / 2);${film};box-shadow:1px 0 0 var(--hk-film)}
.hk-cc--w{width:calc(3 * (var(--g) + var(--gap)))}
.hk-cg{position:relative;flex:1 0 auto;aspect-ratio:3/2;display:flex;align-items:center;justify-content:center;padding:12px;border-radius:2px;background:var(--surface);color:var(--text);min-width:0}
.hk-cg>.hk-w{width:100%;min-width:0}
.hk-cc--w>.hk-cg{aspect-ratio:auto;min-height:calc(var(--g) * 2 / 3)}
.hk-cl{position:absolute;left:0;right:0;bottom:21px;margin:0;font:600 12px/16px var(--hk-chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;text-align:center;color:var(--hk-edge);white-space:nowrap;padding:0 4px}

/* the paper under the strip: the caption column on gates 5 and 6, the enlargement on 2 to 4 */
.hk-open{margin-top:48px;align-items:start}
.hk-cap{grid-column:5 / span 2;grid-row:1}
.hk-enl{grid-column:2 / span 3;grid-row:1;margin:0;min-width:0}
.hk-print{position:relative;display:flex;align-items:center;justify-content:center;min-height:calc((3 * var(--g) + 2 * var(--gap)) * 2 / 3);padding:40px;border-radius:2px;background:var(--surface);color:var(--text);box-shadow:0 0 0 12px var(--hk-film);margin:12px;isolation:isolate}
.hk-print--flush{padding:0;align-items:stretch;justify-content:stretch;overflow:hidden}
.hk-enl__c{margin-top:24px;font:400 12px/16px var(--hk-chrome);color:var(--hk-quiet)}
.hk-fno{font:600 40px/40px var(--hk-chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--hk-ink)}
.hk-ct{margin-top:16px;font:500 14px/20px var(--hk-chrome);color:var(--hk-quiet)}
.hk-hr{margin:24px 0;border:0;border-top:1px solid var(--hk-hair)}
.hk-words{margin-top:16px;font:400 16px/26px var(--hk-body);color:var(--hk-soft);text-wrap:pretty;max-width:60ch}

/* the long read */
.hk-row{margin-top:72px;padding-top:16px;border-top:1px solid var(--hk-hair);row-gap:16px}
.hk-k{grid-column:1;font:500 14px/20px var(--hk-body);color:var(--hk-ink);text-wrap:balance}
.hk-m{grid-column:2 / span 3;min-width:0}
.hk-mw{grid-column:2 / span 5;min-width:0}
.hk-s{grid-column:5 / span 2;min-width:0}
.hk-band{margin-top:72px}
.hk-band__h{padding-top:16px;border-top:1px solid var(--hk-hair);margin-bottom:24px;row-gap:8px}
.hk-band__n{grid-column:2 / span 4}

/* code on unexposed film */
.hk-code+.hk-code{margin-top:24px}
.hk-code__h{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}
.hk-code__t{font:500 14px/20px var(--hk-body);color:var(--hk-ink)}
.hk-pre{margin:0;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:2px;background:var(--hk-film);color:var(--hk-edge);font:400 13px/20px var(--ff-mono);tab-size:2}
.hk-pre code{font:inherit;color:inherit}
.hk-pre:focus-visible{outline:2px solid var(--hk-focus);outline-offset:2px}
.hk-copy{appearance:none;flex:none;min-height:36px;padding:0 14px;border:1px solid var(--hk-line);border-radius:2px;background:transparent;color:var(--hk-ink);font:500 13px/1 var(--hk-chrome);cursor:pointer;transition:background-color 150ms ease-out}
@media (hover:hover){.hk-copy:hover{background:var(--hk-sunk)}}
.hk-copy:focus-visible{outline:2px solid var(--hk-focus);outline-offset:2px}

@media (max-width:840px){
.hk-grid,.hk-roll,.hk-cut{--g:29.915cqw;--gap:3.4188cqw;--cut:1.7094cqw}
.hk-grid{grid-template-columns:1fr}
.hk-roll{flex-direction:column;gap:16px}
.hk-ep--w{display:none}.hk-ep--n{display:block}
.hk-cut__f{width:100%}
.hk-cc{width:50%}
.hk-cc--w{width:100%}
.hk-open{margin-top:32px;row-gap:32px}
.hk-cap,.hk-enl,.hk-k,.hk-m,.hk-mw,.hk-s,.hk-band__n{grid-column:1;grid-row:auto}
.hk-print{padding:24px;min-height:0}
.hk-print--flush{padding:0}
.hk-row,.hk-band{margin-top:48px}
.hk-pre{padding:16px;font-size:12px;line-height:18px}
}`;
}
