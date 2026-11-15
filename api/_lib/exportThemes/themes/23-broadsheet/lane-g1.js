// Theme 23, Broadsheet, lane g1: the brand and voice pages (contents, personality, voice, write-this, messaging, summary, contact-scope).
// Each page is one story on the paper, laid out as the part of a newspaper that does the same job: the index, a glossary, the subeditor's
// headline sheet, the corrections column, wire copy, a front page in brief and the imprint. Every string is read from brand data or ctx;
// no colour id, photo id or brand name is written here. Blocks flow inside one positioned story box, so a longer brand line pushes the
// blocks below it down instead of colliding with them.
import { A, N, G, E, hr, px, pad3, jump, editionLine, folio, fitLines, headLines, fitLogo, bodyWeight, displayWeight, measure, copyGuard, signLine } from './helpers.js';

const page = (ctx, id, inner, guard = true) => {
  const html = `<section class="pg" data-page="${id}">${inner}</section>`;
  return guard ? copyGuard(ctx, id, html) : html;
};
// the largest display size, from max down to min, at which every one of the texts fits w on one line
const fitAll = (ctx, texts, w, max, min) => {
  const wide = Math.max(...texts.map((t) => measure(ctx, t, 100) / 100));
  return Math.max(min, Math.min(max, Math.floor(w / wide)));
};
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// ---- the personality plate: a third photograph, screened like the cover's and the intro's ----------------------------------------
// The server holds no photographs, so there is none to screen; the page sets its lines across the space instead (there is never an empty box).
const plate = () => '';

// a story box: absolutely placed on the grid, its blocks flowing inside it
const story = (x, y, w, inner, style = '') => `<div class="a g1-story" style="left:${px(x)};top:${px(y)};width:${px(w)};${style}">${inner}</div>`;
// the same, hung from the content floor (y 1531), so the page ends on it
const footStory = (inner) => `<div class="a g1-story" style="left:${px(G.left)};bottom:${1587 - G.floor}px;width:1000px">${inner}</div>`;
const dhead = (text, size, lh, cls = 'b-head', tag = 'h2') => `<${tag} class="${cls}" style="font-size:${size}px;line-height:${lh}px">${A(text)}</${tag}>`;

export const guidelines = {
  // ---- 002, contents: the paper's index. Each section is a row that reads like the folio line of the page it opens on (its number, its
  // name), with the section's pages listed in the fourth column and set on one baseline with the name ----
  contents: (ctx) => {
    const secs = ctx.sections, S = fitAll(ctx, secs.map((s) => s.title), 688 - 16, 64, 36), lh = Math.round(S * 1.1);
    const rows = secs.map((s) => {
      const pages = s.pages.map((p) => `<li class="g1-ix-p"><span class="c-note">${A(p.title)}</span><span class="c-label">${pad3(ctx.pageNo(p.id))}</span></li>`).join('');
      return `<div class="g1-ix-row"><p class="c-folio-no g1-ix-n">${pad3(ctx.pageNo(s.pages[0].id))}</p>${dhead(s.title, S, lh, 'b-head g1-ix-t')}<ul class="g1-ix-pages">${pages}</ul></div>`;
    }).join('');
    const head = E(G.left + 56, 40, 'c-folio', A(ctx.pages.find((p) => p.id === 'contents').title));
    return page(ctx, 'contents', folio(ctx, 'contents') + head + story(G.left, G.top, 1000, `<div class="g1-ix">${rows}</div><div class="g1-ix-foot">${jump(ctx, 'contact-scope', 'Who to ask')}</div>`));
  },

  // ---- 004, personality: a glossary of the brand. Each trait is a headword in the display face with what it means beside it, then a
  // screened photograph and the brand's two lines ----
  personality: (ctx) => {
    const B = ctx.brand, P = B.personality, heads = P.map((p) => (/[.!?]$/.test(p.trait) ? p.trait : `${p.trait}.`));
    const S = fitAll(ctx, heads, 488 - 8, 112, 48), lh = Math.round(S * 1.05);
    const rows = P.map((p, i) => `<div class="g1-gl-row">${dhead(heads[i], S, lh, 'b-head g1-gl-w')}<p class="b-deck g1-gl-m">${A(p.means)}</p></div>`).join('');
    // the lines: each a pull quote under an ink rule
    // the sign line is printed on the cover, the typefaces and the shop sign already, so the glossary closes on the brand's other lines, printed whole
    const L = B.lines.others.filter((l) => l !== signLine(ctx)), n = L.length;
    const lines = `<p class="c-label c-ink">In ${NUM[n] || n} line${n === 1 ? '' : 's'}</p>${L.map((l) => `<div class="g1-pq"><i class="hr-flow"></i><p class="b-title">${A(l)}</p></div>`).join('')}${jump(ctx, 'messaging', 'Lines and boilerplate')}`;
    const pl = plate(ctx);
    const lower = pl ? `<div class="g1-two g1-two--ruled"><div>${pl}</div><div>${lines}</div></div>` : `<div class="g1-two"><div>${lines}</div><div></div></div>`;
    return page(ctx, 'personality', folio(ctx, 'personality') + story(G.left, G.top, 1000, `<div class="g1-gl">${rows}</div>${lower}`));
  },

  // ---- 005, voice: the subeditor's headline sheet. The principle that carries the most is set as the splash, the way it would run;
  // the others run down the fourth column, each a habit and the line it produces ----
  voice: (ctx) => {
    const B = ctx.brand, V = B.voice, pr = V.principles;
    const top = pr.reduce((a, b) => (words(b.example) > words(a.example) ? b : a));
    const hd = fitLines(ctx, top.example, { w: 744, max: 120, min: 64, maxLines: 4, step: 2 }), lh = Math.round(hd.size * 0.98);
    // why it is written that way: the write-this entry the example is built from, when there is one
    const why = V.writeThis.find((t) => top.example.includes(t.write.replace(/[.!?]+$/, '')));
    const left = `${headLines(hd.lines, hd.size, lh, 'b-headxl')}<div class="g1-vo-why"><p class="b-brief">${A(top.title)}</p>${why ? `<p class="b-deck">${A(why.because)}</p>` : ''}</div>`;
    const rest = pr.filter((p) => p !== top).map((p) => `<div class="g1-vo-b"><p class="b-brief">${A(p.title)}</p><p class="b-deck g1-vo-ex">${A(p.example)}</p></div>`).join('');
    const right = `<div class="g1-vo-col"><i class="vr"></i><p class="c-label c-ink">${A(NUM[pr.length - 1] ? `${NUM[pr.length - 1][0].toUpperCase()}${NUM[pr.length - 1].slice(1)} more habits` : 'More habits')}</p><div class="g1-vo-list">${rest}</div>${jump(ctx, 'write-this', 'Write this, not that')}</div>`;
    return page(ctx, 'voice', folio(ctx, 'voice') + story(G.left, G.top, 1000, `<div class="g1-vo"><div>${left}</div>${right}</div>`));
  },

  // ---- 006, write-this: the corrections column, set as a marked proof. The line the brand would never write is struck through in
  // press ink, the line it writes instead is set under it, and the reason stands in the margin column ----
  'write-this': (ctx) => {
    const B = ctx.brand, W = B.voice.writeThis, t = ctx.pages.find((p) => p.id === 'write-this').title;
    const hd = fitLines(ctx, `${t}.`, { w: 1000, max: 96, min: 56, maxLines: 1, step: 2 }), lh = Math.round(hd.size * 1.02);
    const S = Math.min(48, ...W.map((w) => { const f = fitLines(ctx, w.write, { w: 744 - 8, max: 48, min: 28, maxLines: 3, step: 2 }); return f.size; }));
    const rows = W.map((w) => `<div class="g1-wt-row"><div><p class="g1-wt-not"><del>${A(w.not)}</del></p>${dhead(w.write, S, Math.round(S * 1.1), 'b-title g1-wt-w', 'p')}</div><p class="c-cap c-quiet g1-wt-why">${A(w.because)}</p></div>`).join('');
    return page(ctx, 'write-this', folio(ctx, 'write-this') + story(G.left, G.top, 1000, `${headLines(hd.lines, hd.size, lh, 'b-head')}<div class="g1-wt">${rows}</div><div class="g1-wt-foot">${jump(ctx, 'messaging', 'Lines and boilerplate')}</div>`));
  },

  // ---- 007, messaging: wire copy. The brand's line is the splash; its other lines run as pull quotes; the boilerplates are filed as
  // wire stories with their length counted; the name rule is the style-book entry. This page exists to print the brand's copy, so the
  // repeated-copy guard (which counts the lines across pages) is not run on it ----
  messaging: (ctx) => {
    const B = ctx.brand, V = B.voice;
    const hd = fitLines(ctx, B.lines.primary, { w: 1000, max: 128, min: 72, maxLines: 2, step: 2 }), lh = Math.round(hd.size * 0.98);
    const others = B.lines.others.map((l) => `<div class="g1-pq"><i class="hr-flow"></i><p class="b-title">${A(l)}</p></div>`).join('');
    const slug = (label, text) => `<p class="g1-ms-slug"><span class="c-label c-ink">${label}</span><span class="c-folio c-quiet">${words(text)} words</span></p><i class="hr-flow"></i>`;
    const wire = `<div class="g1-ms-wire"><div>${slug('Short boilerplate', V.boilerplate25)}<p class="b-deck g1-ms-t">${A(V.boilerplate25)}</p></div>`
      + `<div class="g1-ms-c3"><i class="vr"></i>${slug('Long boilerplate', V.boilerplate50)}<p class="b-body g1-ms-t" lang="en-AU">${A(V.boilerplate50)}</p></div>`
      + `<div class="g1-ms-c4"><i class="vr"></i><p class="g1-ms-slug"><span class="c-label c-ink">Writing the name</span></p><i class="hr-flow"></i><p class="b-body g1-ms-t" lang="en-AU">${A(V.nameRules)}</p>${jump(ctx, 'summary', 'The brand on one page')}</div></div>`;
    return page(ctx, 'messaging', folio(ctx, 'messaging') + story(G.left, G.top, 1000, `${headLines(hd.lines, hd.size, lh, 'b-headxl')}<div class="g1-two g1-ms-lines">${others}</div>${wire}`), false);
  },

  // ---- 032, summary: the brand in brief. Its three rules are the headline, read off its own data; the logo, the colours by share and
  // the two faces stand under it; the lines close the page from the floor. Like messaging, it reprints the brand's copy on purpose ----
  summary: (ctx) => {
    const B = ctx.brand, Lg = ctx.logo, C = ctx.C, R = (B.guideB?.rules || []).slice(0, 3), F = B.fonts;
    const titles = R.map((r) => (/[.!?]$/.test(r.title) ? r.title : `${r.title}.`));
    const hd = fitLines(ctx, titles.join(' '), { w: 1000, max: 64, min: 44, maxLines: 3, step: 2 }), hlh = Math.round(hd.size * 68 / 64);
    const tc = ctx.placeholders ? ' ph-tight' : '';   // slot: compact placeholders, so the page keeps its floor
    const rules = `<div class="g1-su-rules${tc}">${R.map((r, i) => `<div class="g1-su-r${i ? ' g1-ruled' : ''}">${i ? '<i class="vr"></i>' : ''}<p class="b-brief">${A(r.title)}</p><p class="b-deck" lang="en-AU">${A(r.text)}</p></div>`).join('')}</div>`;
    // the logo, the colour version, as large as the first two columns allow
    const lw = fitLogo(ctx, 'colour', 488, 160), lh = lw * Lg.geos.colour.h / Lg.geos.colour.w;
    const logo = `<div class="flogo g1-su-logo" style="width:${px(lw)};height:${px(lh)}">${Lg.html('colour', { width: lw, color: N.ink, label: 'Logo' })}</div>`;
    const faces = [['display', 'Display face', displayWeight(ctx)], ['body', 'Body face', 400]].filter(([k]) => F[k]).map(([k, role, w]) => `<div class="g1-su-f"><p class="g1-su-fn g1-su-fn--${k}" style="font-weight:${w}">${A(F[k].family)}</p><p class="c-cap c-quiet">${role}</p><p class="c-cap c-quiet">Weights <span class="c-mono c-ink">${F[k].weights.join(' ')}</span></p></div>`).join('');
    // the colours as a press bar along the measure, each field as wide as its share; a field too narrow for its label carries it underneath
    const cs = ctx.colours, sh = cs.map((c) => (typeof c.share === 'number' ? c.share : 1 / cs.length)), sum = sh.reduce((a, b) => a + b, 0);
    let used = 0;
    const fields = cs.map((c, i) => {
      const w = i === cs.length - 1 ? 1000 - used : Math.round(1000 * sh[i] / sum); used += w;
      const faint = C.ratio(c.hex, N.paper) < 1.3;
      return `<div class="g1-su-fld" style="width:${w}px"><i class="g1-su-sw" style="background:${c.hex};${faint ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></i>${w >= 120 ? `<p class="c-label">${A(c.name)} <span class="c-folio c-quiet">${Math.round(sh[i] / sum * 100)}%</span></p><p class="c-mono">${A(c.hex)}</p>` : ''}</div>`;
    }).join('');
    const narrow = cs.map((c, i) => ({ c, i, w: Math.round(1000 * sh[i] / sum) })).filter((x) => x.w < 120);
    const nl = narrow.length ? `<p class="g1-su-narrow">${narrow.map((x) => `<span class="c-label">${A(x.c.name)} <span class="c-folio c-quiet">${Math.round(sh[x.i] / sum * 100)}%</span> <span class="c-mono">${A(x.c.hex)}</span></span>`).join('')}</p>` : '';
    const ident = `<div class="g1-two g1-su-id"><div>${logo}</div><div class="g1-su-faces">${faces}</div></div><div class="g1-su-bar">${fields}</div>${nl}`;
    // the lines, from the floor: the brand's primary line and its others, as one ruled list
    const lines = [B.lines.primary, ...B.lines.others];
    const foot = `<p class="c-label c-ink">Its lines</p><ul class="g1-su-lines${tc}">${lines.map((l) => `<li class="b-deck">${A(l)}</li>`).join('')}</ul>${jump(ctx, 'contact-scope', 'Who to ask')}`;
    return page(ctx, 'summary', folio(ctx, 'summary') + story(G.left, G.top, 1000, `${headLines(hd.lines, hd.size, hlh, 'b-head')}${rules}${ident}`) + footStory(foot), false);
  },

  // ---- 033, contact-scope: the imprint. Who to ask is the headline and the address under it; the paper's imprint closes the page from
  // the floor: this edition, what is in it, what is not, and who keeps it ----
  'contact-scope': (ctx) => {
    const B = ctx.brand, ct = B.contact, v = B.version;
    // a team is asked as "the brand team"; a person by name
    const who = /\b(team|studio|office|department|desk)\b/i.test(ct.owner) ? `the ${ct.owner.toLowerCase()}` : ct.owner;
    const hd = fitLines(ctx, `Ask ${who}.`, { w: 1000, max: 144, min: 88, maxLines: 2, step: 2 }), lh = Math.round(hd.size * 0.98);
    const deck = `<p class="g1-cs-deck">Write to <span class="g1-cs-mail">${A(ct.email)}</span> for a logo file, a missing asset or an exception to a rule in this document.</p>`;
    const first = /^1(\.0+)?$/.test(String(v.number));
    const c1 = `<p class="c-label c-ink">This edition</p><i class="hr-flow"></i><p class="g1-cs-ed"><span class="c-folio-no">${A(v.number)}</span><span class="c-cap c-quiet">${A(editionLine(ctx).replace(/^Edition [^,]+,\s*/, ''))}</span></p>${first ? '<p class="c-cap c-ink">First release.</p>' : ''}`;
    const ins = ctx.sections.map((s) => `<li class="g1-cs-in"><span class="c-note">${A(s.title)}</span><span class="c-label">${pad3(ctx.pageNo(s.pages[0].id))}</span></li>`).join('');
    const c2 = `<i class="vr"></i><p class="c-label c-ink">In this document</p><i class="hr-flow"></i><ul>${ins}</ul>`;
    const not = [['Logo files, palette files and fonts', 'In the brand kit.'], ['Interface components and tokens', 'In the UI kit and its code package.'], ['Print specifications and ink values', 'Ask your printer for a proof.']]
      .map(([a, b]) => `<li class="g1-cs-not"><p class="c-note c-ink">${a}</p><p class="c-cap c-quiet">${b}</p></li>`).join('');
    const c3 = `<i class="vr"></i><p class="c-label c-ink">Not in this document</p><i class="hr-flow"></i><ul>${not}</ul>`;
    const c4 = `<i class="vr"></i><p class="c-label c-ink">Who keeps it</p><i class="hr-flow"></i><p class="c-note c-ink g1-cs-k">${A(ct.owner)}</p><p class="c-mono">${A(ct.email)}</p><p class="c-mono">${A(B.applications?.site?.url || '')}</p>`;
    const imprint = `<i class="g1-cs-thick"></i><i class="g1-cs-thin"></i><div class="g1-cs-imp"><div>${c1}</div><div>${c2}</div><div>${c3}</div><div>${c4}</div></div>`;
    return page(ctx, 'contact-scope', folio(ctx, 'contact-scope') + story(G.left, G.top, 1000, `${headLines(hd.lines, hd.size, lh, 'b-headxl')}${deck}`) + footStory(imprint));
  },
};

export function css(ctx) {
  const bw7 = bodyWeight(ctx, 700);
  return `
/* lane g1: every rule is under .pg and the g1- prefix */
.pg .g1-story{display:block}
.pg .g1-story .hr-flow{display:block;height:1px;background:var(--ink)}
.pg .g1-story .vr{position:absolute;left:-12.375px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g1-two{display:grid;grid-template-columns:488px 488px;column-gap:24px;align-items:start}
.pg .g1-two>div{position:relative}
.pg .g1-two--ruled>div+div::before{content:'';position:absolute;left:-12.375px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g1-pq{margin-top:16px}.pg .g1-pq .b-title{margin-top:16px}
.pg .b-brief{font-weight:${bw7}}

/* contents: the index */
.pg .g1-ix-row{position:relative;display:grid;grid-template-columns:56px 688px 24px 232px;align-items:baseline;padding:16px 0 24px;border-top:.75px solid var(--hair)}
.pg .g1-ix-row:first-child{border-top:0;padding-top:8px}
.pg .g1-ix-row:last-child{border-bottom:1px solid var(--ink)}
.pg .g1-ix-row::after{content:'';position:absolute;left:755.625px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g1-ix-n{grid-column:1}.pg .g1-ix-t{grid-column:2;white-space:nowrap}.pg .g1-ix-pages{grid-column:4}
.pg .g1-ix-p{display:flex;justify-content:space-between;gap:8px}
.pg .g1-ix-foot{margin-left:768px;width:232px}

/* personality: the glossary */
.pg .g1-gl-row{position:relative;display:grid;grid-template-columns:488px 488px;column-gap:24px;align-items:baseline;padding:24px 0 40px;border-top:.75px solid var(--hair)}
.pg .g1-gl-row:first-child{border-top:0;padding-top:8px}
.pg .g1-gl-row:last-child{border-bottom:1px solid var(--ink)}
.pg .g1-gl-row::after{content:'';position:absolute;left:499.625px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g1-gl-w{white-space:nowrap}
.pg .g1-gl+.g1-two{margin-top:64px}

/* voice: the headline sheet */
.pg .g1-vo{display:grid;grid-template-columns:744px 232px;column-gap:24px;align-items:start}
.pg .g1-vo-why{width:488px;margin-top:40px}.pg .g1-vo-why .b-deck{margin-top:8px}
.pg .g1-vo-col{position:relative}
.pg .g1-vo-col>.c-label{padding-bottom:8px;border-bottom:1px solid var(--ink)}
.pg .g1-vo-b{padding:16px 0 24px;border-bottom:.75px solid var(--hair)}
.pg .g1-vo-b:last-child{border-bottom:1px solid var(--ink)}
.pg .g1-vo-ex{margin-top:8px}

/* write-this: the marked proof */
.pg .g1-wt{margin-top:40px;border-top:1px solid var(--ink)}
.pg .g1-wt-row{position:relative;display:grid;grid-template-columns:744px 232px;column-gap:24px;align-items:start;padding:24px 0 32px;border-bottom:.75px solid var(--hair)}
.pg .g1-wt-row:last-child{border-bottom:1px solid var(--ink)}
.pg .g1-wt-row::after{content:'';position:absolute;left:755.625px;top:0;bottom:0;width:.75px;background:var(--hair)}
.pg .g1-wt-not{font:400 20px/28px var(--body);color:var(--quiet)}
.pg .g1-wt-not del{text-decoration:line-through;text-decoration-color:var(--ink);text-decoration-thickness:2px}
.pg .g1-wt-w{margin-top:8px;text-wrap:balance}
.pg .g1-wt-why{padding-top:4px}
.pg .g1-wt-foot{margin-left:768px;width:232px}

/* messaging: wire copy */
.pg .g1-ms-lines{margin-top:32px}
.pg .g1-ms-wire{display:grid;grid-template-columns:488px 232px 232px;column-gap:24px;align-items:start;margin-top:64px}
.pg .g1-ms-wire>div{position:relative}
.pg .g1-ms-slug{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding-bottom:8px}
.pg .g1-ms-t{margin-top:16px}

/* summary */
.pg .g1-su-rules{display:grid;grid-template-columns:repeat(3,232px) 232px;column-gap:24px;margin-top:48px;align-items:start}
.pg .g1-su-r{position:relative}.pg .g1-su-r .b-deck{margin-top:12px}
.pg .g1-su-id{margin-top:128px;padding-top:32px;border-top:1px solid var(--ink);align-items:end}
.pg .g1-su-logo svg{display:block}
.pg .g1-su-faces{display:grid;grid-template-columns:232px 232px;column-gap:24px}
.pg .g1-su-fn{font-size:32px;line-height:40px;white-space:nowrap}
.pg .g1-su-fn--display{font-family:var(--display);font-stretch:${ctx.brand.fonts.display.stretch || 100}%;letter-spacing:-0.01em}
.pg .g1-su-fn--body{font-family:var(--body)}
.pg .g1-su-bar{display:flex;margin-top:80px}
.pg .g1-su-fld{flex:none}
.pg .g1-su-sw{display:block;height:200px;margin-bottom:8px}
.pg .g1-su-fld p{padding-right:8px}
.pg .g1-su-narrow{display:flex;justify-content:flex-end;gap:24px;margin-top:8px}
.pg .g1-su-lines{margin-top:8px;border-top:1px solid var(--ink)}
.pg .g1-su-lines li{padding:24px 0;border-bottom:.75px solid var(--hair)}
.pg .g1-su-lines li:last-child{border-bottom:1px solid var(--ink)}

/* contact-scope: the imprint */
.pg .g1-cs-deck{font:400 24px/32px 'Sofia Sans',sans-serif;width:744px;margin-top:40px}
.pg .g1-cs-mail{font:400 22px/32px 'Fragment Mono',monospace;white-space:nowrap}
.pg .g1-cs-thick{display:block;height:3px;background:var(--ink)}
.pg .g1-cs-thin{display:block;height:1px;background:var(--ink);margin-top:4px}
.pg .g1-cs-imp{display:grid;grid-template-columns:repeat(4,232px);column-gap:24px;align-items:stretch;padding-top:24px}
.pg .g1-cs-imp>div{position:relative}
.pg .g1-cs-imp>div:first-child .vr{display:none}
.pg .g1-cs-imp .c-label{padding-bottom:8px}
.pg .g1-cs-imp .hr-flow{margin-bottom:8px}
.pg .g1-cs-ed{display:flex;align-items:baseline;gap:12px}
.pg .g1-cs-in{display:flex;justify-content:space-between;gap:8px}
.pg .g1-cs-not+.g1-cs-not{margin-top:12px}
.pg .g1-cs-k{margin-bottom:4px}
`;
}
