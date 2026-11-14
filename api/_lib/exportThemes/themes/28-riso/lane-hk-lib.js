// Lane hk helpers for theme 28 (Riso): the kit site's chrome and the pieces every page shares. The site is the same press job as the PDF kit:
// a plate (the page's name and a note, with the hit numeral printed on it), a pass band down the right edge, and the paper under them.
// The product is never printed with the press: a .ui region is the product's own surface pasted onto the paper, and the real components
// (ctx.ui, componentsCss) sit in it unrestyled. Every class here starts hk-.
import { A, pressOf, val, numeral, displayStem } from './sheet.js';
import { scr } from './press.js';
import { sc, Word, word, rt } from './lane-u1.js';

export { A, val, sc, Word, word, rt };

// the inks as the page prints them: the plate (screened when the brand has one ink only), the text that reads on it, the pass on plate and on paper
export function inks(ctx) {
  const P = pressOf(ctx);
  const plate = P.plateScreen ? scr(P.plate, (P.plateScreen / 100) * 0.88, P.paper) : P.plate;
  const ok = (c) => ctx.ratio(c, plate) >= 4.5;
  const ptxt = ok(P.textOnPlate) ? P.textOnPlate : ok(P.key) ? P.key : ok(P.paper) ? P.paper : P.key;
  return { P, plate, ptxt, passPlate: P.passOnPlate, passPaper: P.passOnPaper };
}

// pages, grouped by section, in the order the kit runs them
export function parts(K) {
  const out = [];
  K.pages.forEach((p, i) => {
    const s = p.section;
    if (!s) return;
    let g = out.find((x) => x.n === s.n);
    if (!g) { g = { n: s.n, title: s.title, pages: [] }; out.push(g); }
    g.pages.push({ ...p, folio: i + 1 });
  });
  return out;
}
export const folio = (K, id) => String(K.pages.findIndex((p) => p.id === id) + 1).padStart(3, '0');
export const pgRef = (K, id) => val(folio(K, id));

// the colour bar: each drum this press prints, then the overprints it shows
export function bar(ctx) {
  const P = pressOf(ctx);
  let out = P.drums.map((d) => `<i class="hk-sq" style="background:${d.hex}"></i>`).join('');
  const seen = new Set();
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) {
    if (seen.has(res)) continue; seen.add(res);
    out += `<span class="hk-ov"><i style="background:${u}"></i><i style="background:${o};mix-blend-mode:multiply"></i></span>`;
  }
  return `<span class="hk-colbar" aria-hidden="true">${out}</span>`;
}

// ---------------------------------------------------------------- the pieces a page is made of

export const lab = (t) => `<h2 class="hk-lab">${t}</h2>`;
export const note = (t, cls = '') => `<p class="hk-note ${cls}">${t}</p>`;
export const b = (t) => `<b class="hk-b">${t}</b>`;

// the product's surface, pasted onto the paper: a .ui region (dark under data-theme)
export const pan = (inner, { mode = 'light', cls = '', style = '' } = {}) => `<div class="ui hk-pan ${cls}" data-theme="${mode}"${style ? ` style="${style}"` : ''}>${inner}</div>`;
// a product surface that follows the site's light/dark switch, for the pages whose subject is not the mode itself
export const live = (inner, { cls = '', style = '' } = {}) => `<div class="ui hk-pan ${cls}"${style ? ` style="${style}"` : ''}>${inner}</div>`;

// a ledger: rows of a note on paper beside the product's surface; the surfaces join into one run, each note level with its component
export function ledger(rows, { mode, mirror = false, wide = false, pad = '' } = {}) {
  const cell = (r) => `<div class="hk-row${mirror ? ' hk-mir' : ''}${wide ? ' hk-wide' : ''}"><div class="hk-n">${r[0]}</div><div class="ui hk-s"${mode ? ` data-theme="${mode}"` : ''}${pad ? ` style="padding:${pad}"` : ''}>${r[1]}</div></div>`;
  return `<div class="hk-led">${rows.map(cell).join('')}</div>`;
}
export const rowLab = (name, html) => `<p class="hk-b">${A(name)}</p>${html ? `<p class="hk-note">${html}</p>` : ''}`;

// a ruled list of facts: cols is a css grid template, head the column names, rows arrays of html (null opens a new group)
export function ruled(cols, head, rows, { cls = '' } = {}) {
  const tr = (cells, c) => `<div class="hk-tr ${c}" style="--hk-c:${cols}">${cells.map((h, i) => `<div class="hk-td">${h == null ? '' : h}</div>`).join('')}</div>`;
  return `<div class="hk-rl ${cls}">${head ? tr(head.map((h) => (h ? `<span class="hk-hd">${h}</span>` : '')), 'hk-th') : ''}${rows.map((r) => (r ? tr(r, '') : '<i class="hk-gap"></i>')).join('')}</div>`;
}
export const tok = (t) => `<span class="hk-v">${A(t)}</span>`;
export const chip = (hex) => `<i class="hk-chip" style="background:${hex}"></i>`;

// a block of code with the engine's copy button: the text to copy rides in a hidden child
export function code(text, name) {
  return `<div class="hk-code"><button type="button" class="hk-copy" data-copy aria-label="Copy ${A(name)}"><span data-copy-text hidden>${A(text)}</span><span aria-hidden="true">Copy</span></button><pre class="hk-pre"><code>${A(text)}</code></pre></div>`;
}

// ---------------------------------------------------------------- one page: plate, then the paper
// hit: { text, left } (the numeral and which side it sits); label: the page's name; plate: the note printed on the plate (html)
export function sheet(ctx, K, { label, hit, plate, body, hitLeft = true, tall = false }) {
  const p = K.page, n = K.pages.findIndex((x) => x.id === p.id);
  const text = String(hit);
  // the numeral is drawn from the brand's own glyph outlines (as the PDF does), so it is a picture, not text the page must measure
  const sz = tall ? 300 : 200, nm = numeral(displayStem(ctx), text, 0, 0, sz, 1e9);
  const nums = (nm.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number), xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  const x1 = Math.min(...xs) - 2, y1 = Math.min(...ys) - 2, w = Math.max(...xs) - x1 + 2, h = Math.max(...ys) - y1 + 2;
  const num = `<div class="hk-hit" aria-hidden="true" style="--hk-w:${Math.round(w)}px"><svg viewBox="${x1} ${y1} ${w} ${h}" focusable="false"><path fill="var(--hk-paper)" transform="translate(-1 -1)" d="${nm.d}"/><path class="hk-hv" fill="var(--hk-hit)" d="${nm.d}"/></svg></div>`;
  const txt = `<div class="hk-pt"><h1 class="hk-h1">${label}</h1><p class="hk-pn">${plate}</p></div>`;
  const prev = K.prev, next = K.next;
  const link = (x, d) => (x ? `<a class="hk-pn-link hk-${d}" href="${x.href}"><span class="hk-pn-d">${d === 'prev' ? 'Previous' : 'Next'}</span><span class="hk-pn-t">${A(x.title)}</span></a>` : '<span></span>');
  const section = p.section ? p.section.title : p.id === 'cover' ? 'UI kit' : p.title;
  const foot = `<footer class="hk-foot">${link(prev, 'prev')}${link(next, 'next')}<div class="hk-fl">${bar(ctx)}<span class="hk-fs">${A(section)}</span><span class="hk-fn hk-v">${String(n + 1).padStart(3, '0')} / ${String(K.pages.length).padStart(3, '0')}</span></div></footer>`;
  return `<div class="hk-sheet"><section class="hk-plate${tall ? ' hk-tallp' : ''}${hitLeft ? '' : ' hk-hr'}"><div class="hk-in hk-pi">${hitLeft ? num + txt : txt + num}</div></section>
<div class="hk-in hk-bd">${body}</div>${foot}</div>`;
}
