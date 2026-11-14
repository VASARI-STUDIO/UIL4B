// Theme 29 (Blueprint), lane hk: parts of the kit site. Each page is one sheet of the drawing set; the live components sit on plates (the shipped .ui
// region, light or dark), keyed with numbered tags that read across to what they are. Mono only for literal values; every class starts hk-.
import { esc as A } from '../../engine/brand.js';

export { A };
export const pad2 = (n) => String(n).padStart(2, '0');
export const pad3 = (n) => String(n).padStart(3, '0');
export const sc = (ctx) => ctx.brand.ui.screen.content;
export const ex = (ctx) => ({ checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', ...(sc(ctx).example || {}) });
export const mono = (t) => `<span class="hk-m">${A(t)}</span>`;
export const uniq = (html, tag) => html.replace(/dlg-t/g, tag);

// the scale each sheet prints in its title block (a measure of the sheet, not an invented figure)
export const SCALE = { cover: '1:1, sizes in px', contents: 'Not to scale' };
export const scaleOf = (id) => SCALE[id] || '1:1, sizes in px';

export const tag = (n) => `<span class="hk-tag" aria-hidden="true">${n}</span>`;
export const det = (n, title, scale = '', body = '') => `<section class="hk-det" aria-label="${A(title)}"><div class="hk-dt"><span class="hk-tag hk-tag--sq" aria-hidden="true">${String.fromCharCode(64 + n)}</span><h2>${A(title)}</h2>${scale ? `<span class="hk-lab">${scale}</span>` : ''}</div>${body}</section>`;
export const plate = (inner, { dark = false, cls = 'hk-plate--c', style = '' } = {}) => `<div class="ui hk-plate ${cls}"${dark ? ' data-theme="dark"' : ''}${style ? ` style="${style}"` : ''}>${inner}</div>`;
// a keyed row: the key, the live part on its plate, then its name and a literal note
export const kr = (n, name, note, inner, opt = {}) => `<div class="hk-kr">${tag(n)}${plate(inner, opt)}<div class="hk-kd"><b>${A(name)}</b>${note ? `<span>${note}</span>` : ''}</div></div>`;
export const notes = (items) => `<ol class="hk-notes">${items.map((t, i) => `<li><span aria-hidden="true">${i + 1}</span><p>${t}</p></li>`).join('')}</ol>`;
export const ttl = (title, text) => `<div class="hk-ttl"><p>${text}</p></div>`;
export const label = (t) => `<p class="hk-lab">${t}</p>`;
// a schedule row (no table): cells are html
export const sr = (cells, cls = '') => `<div class="hk-sr ${cls}">${cells.map((c) => `<div>${c}</div>`).join('')}</div>`;
export const sch = (head, rows, cls = '') => `<div class="hk-sch" role="list">${head ? `<div class="hk-sr hk-sr--h ${cls}" aria-hidden="true">${head.map((c) => `<div>${c}</div>`).join('')}</div>` : ''}${rows.map((r) => `<div class="hk-sr ${cls}" role="listitem">${r.map((c) => `<div>${c}</div>`).join('')}</div>`).join('')}</div>`;

export const revOf = (ctx) => {
  const v = ctx.brand.version, d = new Date(v.date + 'T00:00:00Z');
  return `${mono(v.number)}, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
};

const logoBoth = (ctx, w) => ctx.edition === 'slot'
  ? ctx.logo.html('horizontal', { width: w, label: 'Logo' })
  : `<span class="hk-for-light">${ctx.logo.html('horizontal', { width: w, colourway: 'colour', label: 'Logo' })}</span><span class="hk-for-dark">${ctx.logo.html('horizontal', { width: w, colourway: 'reversed', label: 'Logo' })}</span>`;
export { logoBoth };

// the whole page: bar, the sheet (zones, frame, title strip, drawing), prev and next, foot
export function shell(ctx, K, body) {
  const B = ctx.brand, p = K.page, cover = p.id === 'cover';
  const bar = `<header class="hk-top"><a class="hk-brand" href="index.html" aria-label="${A(B.name)} UI kit, start">${logoBoth(ctx, 132)}</a>
<nav class="hk-links" aria-label="Sections"><a href="../guidelines-html/index.html">Guidelines</a><a href="index.html"${cover ? ' aria-current="page"' : ''}>UI kit</a><a href="contents.html"${p.id === 'contents' ? ' aria-current="page"' : ''}>Contents</a></nav>
<div class="hk-mode" role="group" aria-label="Colour mode"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div></header>`;
  const zones = `<div class="hk-zn" aria-hidden="true">${Array.from({ length: 8 }, (_, k) => `<span>${k + 1}</span>`).join('')}</div>`;
  const sec = p.section ? `${pad2(p.section.n)} ${A(p.section.title)}` : '';
  const head = cover ? `<p class="hk-tb__t">Title sheet</p>` : `<h1 class="hk-tb__t" id="h-${p.id}">${A(p.title)}</h1>`;
  const tb = `<div class="hk-tb"><div class="hk-tb__in">
<div class="hk-tb__c hk-tb__c--d">${sec ? `<p class="hk-lab">${sec}</p>` : ''}${head}<p class="hk-tb__v">UI kit</p></div>
<div class="hk-tb__c"><p class="hk-lab">Sheet</p><p class="hk-tb__v">${mono(pad3(p.no))} of ${mono(pad3(K.pages.length))}</p></div>
<div class="hk-tb__c"><p class="hk-lab">Scale</p><p class="hk-tb__v">${A(scaleOf(p.id))}</p></div>
<div class="hk-tb__c"><p class="hk-lab">Revision</p><p class="hk-tb__v">${revOf(ctx)}</p></div>
<div class="hk-tb__c"><p class="hk-lab">Project</p><p class="hk-tb__v hk-tb__p">${A(B.name)}</p><p class="hk-tb__v">UI kit</p></div>
<span class="hk-tb__lg">${logoBoth(ctx, 160)}</span></div></div>`;
  const pn = `<nav class="hk-pn" aria-label="Previous and next sheet">${K.prev ? `<a href="${A(K.href(K.prev.id))}"><span class="hk-lab">Previous</span><span class="hk-pn__t">${A(K.prev.title)}</span></a>` : '<span></span>'}${K.next ? `<a href="${A(K.href(K.next.id))}"><span class="hk-lab">Next</span><span class="hk-pn__t">${A(K.next.title)}</span></a>` : ''}</nav>`;
  return `<div class="sx hk-root">${bar}<main id="main" class="hk-main" tabindex="-1"><section class="hk-sec" aria-labelledby="h-${p.id}">${zones}<div class="hk-fr">${tb}<div class="hk-dw">${body}</div></div></section></main>${pn}<footer class="hk-foot"><span>${A(B.name)} UI kit, ${A(ctx.versionLine)}</span><span>Made with UIL4B</span></footer></div>`;
}
