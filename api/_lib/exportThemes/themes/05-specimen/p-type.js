// Guidelines pages for theme 05, Catalogue: proportion, typefaces, hierarchy, type-in-use, type-rules. Styles are in css-p-type.js
// (classes start kt-). Open sheets from the gate's frame (call number top left, rod hole at the foot), each with one piece of real
// catalogue furniture: a drawer of card edges seen from the side (proportion), guide-card tabs at first, second and third cut
// (typefaces), a guide card with a printed card filed in front of it (hierarchy), a piece with plain captions (type in use) and
// entries behind staggered guide tabs on the card's ruled indentions (type rules). Every value comes from ctx; no brand name or
// hex is written here.
import { A, nameOf } from './helpers.js';
import { sheet, hole, inkOn, same } from './guidelines-k.js';

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const fam = (ctx, t) => ctx.brand.fonts[t.face].family;
// a step set at its own spec: face, weight, size and line
const setIn = (ctx, t) => `font-size:${t.size}px;line-height:${t.line};${t.face === 'display' ? 'font-family:var(--display);font-weight:400' : `font-family:var(--body);font-weight:${t.weight}`}`;

export const pType = {
  // the drawer from the side is the page: one card edge for each per cent of a typical page (every tenth edge stands taller so the
  // run can be counted), a guide card with its share on the tab at the front of each run. Under the drawer, the entries filed in
  // the same order: each colour's edge, its name and the job it does. The share is printed once, on the tab
  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pct = (c) => Math.round(c.share * 100);
    let at = 0;
    const runs = cs.map((c) => {
      const k = Math.max(1, pct(c));
      const edges = Array.from({ length: k }, (_, j) => `<i class="kt-e${j ? '' : ' kt-e--guide'}${(at + j + 1) % 10 ? '' : ' kt-e--ten'}"></i>`).join('');
      at += k;
      return `<li class="kt-run" style="--c:${c.hex};flex:${k} 1 0"><span class="kt-dtab ph-tight" style="color:${inkOn(ctx, c.hex)}"><span class="num">${pct(c)}%</span></span><span class="kt-edges">${edges}</span></li>`;
    }).join('');
    // run-in entries, as a catalogue card sets them: the name, then its job on the same line
    const entries = cs.map((c) => `<li class="kt-pe"><i class="kt-pedge" style="background:${c.hex}"></i><p class="kt-pt"><b class="k-disp kt-pn">${A(c.name)}</b> <span class="num">${Math.max(1, pct(c))}</span> ${Math.max(1, pct(c)) === 1 ? "edge" : "edges"}.</p></li>`).join('');
    const inner = `<p class="k-lead">On a typical page ${A(cs[0].name)} takes ${pct(cs[0])}% and ${A(cs.at(-1).name)} the least. The accent is small so that it still stands out.</p>
<figure class="kt-dr"><div class="kt-dbox"><ol class="kt-runs" role="img" aria-label="${cs.map((c) => `${A(c.name)} ${pct(c)}%`).join(', ')}">${runs}</ol><span class="kt-rod"></span></div>
<figcaption class="kt-dcap">One card edge for each per cent of a typical page, every tenth edge taller. The guide card at the front of each run carries its share on the tab.</figcaption></figure>
<ol class="kt-pes">${entries}</ol>`;
    return sheet(ctx, 'proportion', inner, 'kt-pg-prop');
  },

  // each face is a section of the drawer behind its own guide card, the tabs cut first, second and third across the width
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale, S = ctx.brand.type.sample;
    const toks = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    // the sizes the brand sets a face at; the display face only at 44 px and under, so a line fits the sheet
    const sizes = (face, max = 999) => [...new Set(sc.filter((s) => s.face === face && s.size <= max).map((s) => s.size))].sort((x, y) => y - x);
    const wname = { 400: 'Regular', 500: 'Medium' };
    const bw = b.weights.filter((w) => w <= 500);
    const line = A(ctx.brand.ui.screen.content.deliveries[3].to); // a book title, so the primary line is not a specimen here too
    const glyphs = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
    const cs = (cls) => `<div class="kt-cs ${cls}">${glyphs.map((g) => `<p>${g}</p>`).join('')}</div>`;
    const wfText = (list, txt, cls, st = '') => `<ol class="kt-wf ph-tight">${list.map((s) => `<li><span class="kt-wsz num">${s} px${s <= 12 ? ',<br>true size' : ''}</span><span class="kt-wt ${cls}" style="font-size:${s}px;${st}">${txt}</span></li>`).join('')}</ol>`;
    const guide = (cut, name, cls, role, body) => `<section class="kt-tf kt-tf--${cut}"><h2 class="kt-ftab ${cls}"><span>${name}</span></h2><div class="kt-tfb"><p class="kt-frole">${role}</p>${body}</div></section>`;
    const ws = bw.map((w) => `<li><span class="kt-wsz num">${w}, ${wname[w] || ''}</span><span class="kt-w" style="font-weight:${w};font-size:${w >= 500 ? 22 : 17}px;line-height:${w >= 500 ? 1.36 : 1.53}">${A(w >= 500 ? ctx.brand.voice.principles[1].example : ctx.brand.voice.principles[3].example)}</span></li>`).join('');
    const hx = `${A(ctx.roles.light.action)}&nbsp;&nbsp;${A(ctx.roles.light.text)}`;
    const s1 = guide(1, A(d.family), 'k-disp', `Display, weight ${d.weights.join(', ')}. Used for ${A(toks('display'))}.`,
      `<div class="kt-dspec">${wfText(sizes('display', 44), line, 'k-disp', 'line-height:1.15')}${cs('kt-cs--d k-disp')}</div>`);
    const s2 = guide(2, A(b.family), 'kt-ftab--b', `Body, weights ${bw.join(' and ')}. Used for ${A(toks('body'))}.`,
      `<div class="kt-bspec"><div>${wfText(sizes('body'), line, 'kt-body', 'line-height:1.25')}${cs('kt-cs--b')}</div><ul class="kt-ws">${ws}</ul></div>`);
    const s3 = guide(3, A(m.family), 'kt-ftab--m', 'Only for a hex, a token or a code string.',
      wfText([24, 16, 12], hx, 'k-mono', 'line-height:1.35'));
    const lic = `${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts. Weight 600 of ${A(b.family)} sits inside interface components only.`;
    const inner = `<p class="k-lead kt-tlead">Two faces do the work. ${A(d.family)} sets the line you read first. ${A(b.family)} carries everything after it.</p>
<div class="kt-tfs">${s1}${s2}${s3}</div>
<div class="kt-tfoot"><p class="k-trace kt-trc"><span class="num">1.</span> ${A(d.family)}. <span class="num">2.</span> ${A(b.family)}. <span class="num">3.</span> ${A(m.family)}.</p><p class="kt-lic">${lic}</p></div>`;
    return sheet(ctx, 'typefaces', inner, 'kt-pg-tf');
  },

  // the card's own anatomy is the scale: a printed card at 5 : 3 filed in front of a guide card. The guide card carries the
  // wordmark and the spec of every step, numbered as tracings are and read down the columns; every step's number stands in one
  // column just past the printed card's right edge
  hierarchy(ctx) {
    const S = ctx.brand.type, c = ctx.brand.ui.screen.content, V = ctx.brand.voice.principles;
    // the card for one book: its title as the headline, the author line as the title, the voice's description as the lead
    const samples = { headline: c.deliveries[0].to, title: c.deliveries[0].when, lead: V[0].example, body: S.sample.paragraph, small: c.pickup, caption: S.sample.caption };
    const n = (t) => S.scale.indexOf(t) + 1;
    const key = S.scale.map((t) => `<li><b class="kt-kn num">${n(t)}.</b><p><b class="kt-kt">${A(ctx.cap(t.token))}</b> <span class="num">${t.size} px, line ${t.line}</span><br>${A(fam(ctx, t))} ${t.weight}. ${A(t.use)}.</p></li>`).join('');
    const wm = S.scale.find((t) => t.token === 'wordmark');
    const parts = S.scale.filter((t) => t !== wm).map((t, i) => `<div class="kt-hp ${i ? 'kt-hp--2' : 'kt-hp--1'} kt-hp--${A(t.token)}"><p style="${setIn(ctx, t)}">${A(samples[t.token] || '')}</p><i class="kt-hn num" aria-hidden="true">${n(t)}</i></div>`).join('');
    const body = tok(ctx, 'body'), cap = tok(ctx, 'caption');
    const inner = `<p class="k-lead">${S.scale.length} steps, each with one job. Reading text is ${body.size} px and captions are ${cap.size} px. Nothing sits between.</p>
<div class="kt-hy">
<div class="kt-hg">
${wm ? `<div class="kt-hwm">${ctx.logo.html('colour', { width: 230, label: 'Your logo goes here' })}<i class="kt-hn kt-hn--wm num" aria-hidden="true">${n(wm)}</i></div>` : ''}
<ol class="kt-hkey" style="grid-template-rows:repeat(${Math.ceil(S.scale.length / 2)},auto)">${key}</ol></div>
<article class="kt-hc ph-tight" aria-label="A catalogue card set in the type scale">
<p class="kt-hcall k-mono">${A(ctx.brand.version.number)}</p>
${parts}
${hole(18)}
</article></div>`;
    return sheet(ctx, 'hierarchy', inner, 'kt-pg-hy');
  },

  // a piece set the way the brand sets it, each part named in a plain caption directly under it (label holders stay on drawer
  // fronts and shelf edges)
  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const spec = (name, t) => `<p class="kt-ucap"><b>${name}.</b> ${A(fam(ctx, t))} ${t.weight}, <span class="num">${t.size} px, line ${t.line}</span>. ${A(t.use)}.</p>`;
    const inner = `<p class="k-lead">A headline, a paragraph and a caption, set the way ${A(ctx.brand.name)} sets them.</p>
<div class="kt-use">
<div class="kt-uh"><h2 style="${setIn(ctx, h)}">${A(ctx.brand.ui.screen.content.deliveries[0].to)}</h2>${spec('Headline', h)}</div>
<div class="kt-ub">
<figure class="kt-uf">${ctx.photo('spread', { style: 'width:400px;height:540px' })}<figcaption style="${setIn(ctx, cp)}">${A(S.sample.caption)}</figcaption>${spec('Caption', cp)}</figure>
<div class="kt-up"><p style="${setIn(ctx, bd)}">${A(S.sample.paragraph)}</p>${spec('Paragraph', bd)}</div>
</div></div>`;
    return sheet(ctx, 'type-in-use', inner, 'kt-pg-use');
  },

  // each rule is filed behind its own guide card, the tabs cut left, centre and right in turn. The do is the entry at the first
  // indention with the right setting beside it; the don't is a note under it at the second indention, opening "Not:", with the
  // wrong setting beside it. The card's two indentions are drawn as ruled lines that run behind the text
  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, books = c.deliveries;
    const q = ctx.pairs.find((p) => p.fg === (ctx.colours.find((x) => x.role === 'quiet text') || {}).id && same(p.bgHex, ctx.roles.light.surface));
    const d = (st, t, cls = '') => `<span class="kt-demo ${cls}" style="${st}">${A(t)}</span>`;
    // a different sample for each rule, from the brand's own list. The first rule's right setting is the page's one large line,
    // at the headline size; the second is set at 24 px, the smallest the display face is used at, so a demo fits its column
    const h = tok(ctx, 'headline'), t1 = books[1]?.to || books[0].to, t2 = books[2]?.to || books[0].to;
    const demos = [
      [d(`font-size:${h.size}px;line-height:${h.line}`, t1, 'k-disp'), d('font-size:14px;line-height:1.2', t1, 'k-disp')],
      [d('font-size:24px;line-height:1.15', t2, 'k-disp'), d('font-size:24px;line-height:1.15;text-transform:uppercase;letter-spacing:0.14em', t2, 'k-disp')],
      [d('font-family:var(--body);font-size:17px;line-height:1.3', c.eta), d('font-family:var(--body);font-size:9px;line-height:1.3', c.eta)],
      [d('font-family:var(--body);font-size:14px;line-height:1.4;color:var(--rod)', ctx.brand.type.sample.caption), ''],
      [`<span class="kt-demo k-mono" style="font-size:15px">${A(ctx.roles.light.action)}</span>`, `<span class="kt-demo k-mono" style="font-size:15px">${A(c.form.book)}</span>`],
    ];
    const names = ['Display size', 'Case and spacing', 'Reading size', 'Secondary text', 'Mono'];
    const extra = [null, null, null, q ? ` ${A(nameOf(ctx, q.fg))} on ${A(nameOf(ctx, q.bg))} measures <span class="num">${q.ratioText} : 1</span>.` : '', null];
    const cuts = ['l', 'c', 'r'];
    const rows = R.map((r, i) => {
      const nm = names[i] || `Rule ${i + 1}`;
      return `<li class="kt-re kt-re--${cuts[i % 3]} ${i ? '' : 'kt-re--first'}"><h2 class="kt-rtab"><span>${nm}</span></h2>
<div class="kt-rdo"><p class="kt-rtx"><span>${A(r.do)}${extra[i] || ''}</span></p><div class="kt-rdm">${demos[i]?.[0] || ''}</div></div>
<div class="kt-rnot"><p class="kt-rtx"><span><b class="kt-not">Not:</b> ${A(r.dont)}</span></p><div class="kt-rdm kt-rdm--no">${demos[i]?.[1] || ''}</div></div></li>`;
    }).join('');
    const inner = `<p class="k-lead">${R.length} rules for setting type. Each says what to do, and what never happens.</p>
<div class="kt-rul"><i class="kt-ind kt-ind--1" aria-hidden="true"></i><i class="kt-ind kt-ind--2" aria-hidden="true"></i><ol class="kt-res ph-tight">${rows}</ol></div>`;
    return sheet(ctx, 'type-rules', inner, 'kt-pg-rules');
  },
};
