// Guidelines pages for theme 02, Ticket: proportion, typefaces, hierarchy, type-in-use, type-rules. Styles are in css-p-type.js (classes start tt-).
// Every page stands on Stock in the gate's frame (page() from gate.js). One full ticket only, on the hierarchy page, where the hard ticket's
// own print carries the type scale at true size. Elsewhere the ticket's parts are edge devices on open pages: the perforation as a rule,
// serials as running numbers, fact fields label over value, the condensed stub face for small labels. No hex is written here.
import { A, ratioText } from './helpers.js';
import { page, perf, fields, serial, bySize, byRole, inkOn, holeOn, edgeOn } from './gate.js';
import { cssNum } from '../../engine/escape.js';

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const spec = (t) => `${t.size} px, line ${t.line}, weight ${t.weight}`;
const two = (n) => String(n).padStart(2, '0');
// an open-page perforation: holes in the ink, as a rule between a body and its stub column (v) or between rows (h)
const rule = (ctx, dir = 'v', cls = '') => perf(ctx.roles.light.text, { d: 3, p: 9, dir, cls: `tt-perf ${cls}` });

export const pType = {
  // the roll as the share: twenty consecutive tickets, each one twentieth of the use, run in colour order biggest first.
  // Each colour's run is its share in length, its serials the run (No. 01 to No. 08), its percentage under it at a size set by share.
  proportion(ctx) {
    const cs = bySize(ctx), total = cs.reduce((s, c) => s + c.share, 0), g = cs[0], action = byRole(ctx, 'action');
    const N = 20;
    // tickets per colour by largest remainder, so the run always adds to twenty
    const raw = cs.map((c) => (c.share / total) * N), n = raw.map(Math.floor);
    raw.map((r, i) => [r - n[i], i]).sort((a, b) => b[0] - a[0]).slice(0, N - n.reduce((s, x) => s + x, 0)).forEach(([, i]) => { n[i] += 1; });
    let from = 1;
    const runs = cs.map((c, i) => { const r = { c, n: n[i], from, to: from + n[i] - 1 }; from += n[i]; return r; });
    const pc = (c) => Math.round((c.share / total) * 100);
    const roll = runs.map((r, i) => {
      const fg = inkOn(ctx, r.c.hex), hole = holeOn(ctx, r.c.hex);
      const t = Array.from({ length: Math.max(1, r.n) }, (_, k) => `<div class="tt-rt">${i || k ? perf(hole, { d: 4, p: 10 }) : ''}${k === 0 ? `<span class="tk-sn">${serial(r.from, 2)}</span>` : ''}</div>`).join('');
      return `<div class="tt-run${edgeOn(ctx, r.c.hex)}" style="flex:${r.c.share} 1 0;background:${r.c.hex};color:${fg}">${t}</div>`;
    }).join('');
    const top = Math.max(...cs.map((c) => c.share));
    const bill = runs.map((r) => `<li style="flex:${r.c.share} 1 0"><span class="disp tt-pct num" style="font-size:${Math.round((r.c.share / top) * 132)}px">${pc(r.c)}%</span>
<p class="tt-pname">${A(r.c.name)}</p><p class="tk-sn tt-prun">${r.n > 1 ? `${serial(r.from, 2)} to ${serial(r.to, 2)}` : serial(r.from, 2)}</p></li>`).join('');
    // one page drawn by area: the biggest share a column, the second a row, the rest split the corner
    const [a, b, ...rest] = cs, col2 = 1 - a.share / total, bH = b.share / total / col2, restW = rest.reduce((s, c) => s + c.share, 0);
    const blk = (c) => `<i class="tt-pb${edgeOn(ctx, c.hex)}" style="background:${c.hex}"></i>`;
    const drawn = `<div class="tt-pg" style="grid-template-columns:${(a.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr">${blk(a)}<div class="tt-pgcol" style="grid-template-rows:${(bH * 100).toFixed(2)}fr ${((1 - bH) * 100).toFixed(2)}fr">${blk(b)}<div class="tt-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map(blk).join('')}</div></div></div>`;
    const fig = `<figure class="tt-pfig">${drawn}<figcaption class="tt-cap"><b>One page, drawn to scale</b>Each colour's area is its share of the page. ${A(g.name)} carries most of it, so ${A(action.name)} stays the loudest thing on it.</figcaption></figure>`;
    // the lead under the title, where the gate's palette page puts it; the drawn page tops out level with it, at the roll's right edge
    const lead = `<p class="tk-lead tt-lead">A roll of ${N} tickets is the use of colour on a page. Each colour takes its share of the roll, in order, biggest first.</p>`;
    return page(ctx, 'proportion', `<div class="tt-ptop">${lead}${fig}</div><div class="tt-roll">${roll}</div><ul class="tt-bill">${bill}</ul>`, 'tt--prop');
  },

  // the faces as a ticket's two halves on an open page: the display face is the body you keep, set large with its glyphs;
  // beyond a perforated rule the stub column carries the body face's weights and the mono face, small, as a stub does.
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale;
    const wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold' };
    const tokensOf = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    // a second line of the brand's, so the main line keeps its own pages (cover, voice, messaging)
    const L = ctx.brand.lines, sample = (L.others && (L.others[1] || L.others[0])) || L.primary;
    const facts = fields([['Weight', `<span class="num">${d.weights.join(', ')}</span>`], ['Width', `<span class="num">${cssNum(d.stretch || 100)}</span>`], ['Used for', A(tokensOf('display'))]], 'tt-ff');
    const lic = `<p class="tt-cap tt-lic">${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts.</p>`;
    const main = `<div class="tt-tfb"><p class="tk-sn">Display</p><h2 class="disp tt-fn">${A(d.family)}</h2>${facts}<div class="tt-glw"><p class="disp tt-gl">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p>${lic}</div></div>`;
    const rows = b.weights.map((w) => `<li style="font-weight:${w}"><span class="tt-wn">${wname[w] || w} <span class="num">${w}</span></span><span>${A(sample)}</span></li>`).join('');
    const stub = `<div class="tt-tfs"><div><p class="tk-sn">Body</p><h3 class="tt-fb">${A(b.family)}</h3><p class="tt-cap">Used for ${A(tokensOf('body'))}.</p><ul class="tt-wts">${rows}</ul></div>
${rule(ctx, 'h', 'tt-perf--row tt-perf--tf')}<div><p class="tk-sn">Mono</p><h3 class="tt-fm">${A(m.family)}</h3><p class="tk-mono tt-ms">${A(ctx.roles.dark.action)}</p><p class="tt-cap">Only for a hex, a token or a ${ctx.edition === 'slot' ? '' : 'ticket '}code.</p></div></div>`;
    return page(ctx, 'typefaces', `<div class="tt-tf">${main}<div class="tt-tfr">${rule(ctx)}</div>${stub}</div>`, 'tt--faces');
  },

  // one hard ticket at true proportion (2.75 : 1), every line on it a style of the scale at its true size, top to bottom;
  // its stub specs each style in the order it is printed. Reading text is the one style a ticket does not carry: it sits below.
  hierarchy(ctx) {
    const S = ctx.brand.type, B = ctx.brand, c = B.ui.screen.content, stage = byRole(ctx, 'panel', 2);
    const T = Object.fromEntries(S.scale.map((t) => [t.token, t]));
    // the slot's placeholder labels are 10 and 31 characters in the expanded face, far wider than "8:00": the display and headline slots take
    // the largest size that holds their label on one line, half and 0.6 of the true size, so the ticket still steps down display > headline > title
    const slot = ctx.edition === 'slot', slotK = { display: 0.5, headline: 0.6 };
    const st = (t) => `font-size:${slot && slotK[t.token] ? Math.round(t.size * slotK[t.token]) : t.size}px;line-height:${t.line};${t.face === 'display' ? '' : `font-weight:${t.weight};`}`;
    const W = 1168, bw = Math.round(W * 4 / 5.5), sw = W - bw, h = Math.round(W / 2.75);
    const hole = holeOn(ctx, stage.hex), ink = inkOn(ctx, stage.hex);
    const line = (k, txt, cls = '') => T[k] ? `<p class="tt-hl ${T[k].face === 'display' ? 'disp' : ''} ${cls}" style="${st(T[k])}">${txt}</p>` : '';
    const lab = T.label ? `font-size:${T.label.size}px;line-height:${T.label.line};font-weight:${T.label.weight}` : '';
    const val = T.body ? `font-size:${T.body.size}px;line-height:${T.body.line};font-weight:${T.body.weight}` : '';
    const ff = [[c.deliverToLabel, c.deliverTo], [c.form.size, c.form.sizes[1]], [c.paidLabel, c.paid]]
      .map(([k, v]) => `<div><dt style="${lab}">${A(k)}</dt><dd class="num" style="${val}">${A(v)}</dd></div>`).join('');
    // the display line is the doors time, the biggest print on a gig ticket, read out of the brand's line through ctx.real (the name if none).
    // The slot edition has no time of its own to print, so it falls back to the name slot rather than showing the sample brand's.
    const time = slot ? null : (ctx.real(c.eta).match(/\d{1,2}:\d{2}/) || [])[0];
    const body = `<div class="tt-hb" style="width:${bw}px">
${line('display', time ? A(time) : A(B.name))}${line('headline', A(c.rider))}${line('title', A(B.lines.primary))}
<div class="tt-hfoot"><dl class="tt-hff">${ff}</dl>${line('caption', A(S.sample.caption), 'tt-hcap')}</div></div>`;
    const specs = S.scale.map((t, i) => `<li><p class="tk-sn tt-hsn"><span class="num">${two(i + 1)}</span> ${A(ctx.cap(t.token))}</p><p class="tt-hsp num">${spec(t)}</p><p class="tt-hsu">${A(t.use)}</p></li>`).join('');
    const stub = `<div class="tt-hs" style="width:${sw}px">${perf(hole, { d: 6, p: 15 })}<span class="tk-sn">${serial(2, 4)}</span><ol class="tt-hspecs">${specs}</ol></div>`;
    // the slot's ticket grows with its boxes (min-height), so the caption box never meets the bottom edge
    const ticket = `<div class="tt-ht" style="${slot ? 'min-' : ''}height:${h}px;background:${stage.hex};color:${ink}">${body}${stub}</div>`;
    const below = `<div class="tt-hbot"><p class="tt-hbody" style="${T.body ? st(T.body) : ''}">${A(S.sample.paragraph)}</p><p class="tt-cap">Every line on the ticket is a style at its true size, in the order the stub lists it. ${T.body ? `${A(ctx.cap('body'))}, at ${spec(T.body)}, is the reading text at its left.` : ''}</p></div>`;
    return page(ctx, 'hierarchy', ticket + below, `tt--hier${slot ? ' tt--slot' : ''}`);
  },

  // a piece set the way the brand sets it: the door photo leads at 7 of 12 columns with its caption, the headline and its paragraph beside it,
  // and the three styles specced along a perforated foot rule, a run of serials. The lead sits under the title.
  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const fam = (t) => ctx.brand.fonts[t.face].family;
    // the headline is a second line of the brand's: the main line has its own pages (cover, voice, messaging)
    const L = ctx.brand.lines, hl = (L.others && L.others[0]) || S.sample.headline;
    // the slot edition sets its headline box (a long descriptor) at the title size of the scale, so the paragraph keeps its room
    const hs = ctx.edition === "slot" && tok(ctx, "title") ? Math.max(tok(ctx, "title").size, 48) : h.size;
    const text = `<div class="tt-ut"><h2 class="disp tt-uh" style="font-size:${hs}px;line-height:${h.line}">${A(hl)}</h2><p class="tt-up" style="font-size:${bd.size}px;line-height:${bd.line}">${A(S.sample.paragraph)}</p></div>`;
    const fig = `<figure class="tt-uf">${ctx.photo('door', { style: 'width:100%;flex:1;min-height:0' })}<figcaption class="tt-ucap" style="font-size:${cp.size}px;line-height:${cp.line}">${A(S.sample.caption)}</figcaption></figure>`;
    const specs = [['Headline', h], ['Paragraph', bd], ['Caption', cp]].map(([n, t], i) => `<div><span class="tk-sn">${serial(i + 1, 2)}</span><p class="tt-us"><b>${n}</b><span class="num">${t.size} px, line ${t.line}, ${A(fam(t))} ${t.weight}</span></p></div>`).join('');
    const lead = `<p class="tk-lead tt-lead">A headline, a paragraph and a caption, set the way ${A(ctx.brand.name)} sets them.</p>`;
    const foot = `<div class="tt-ufoot">${rule(ctx, 'h', 'tt-perf--row')}${specs}</div>`;
    return page(ctx, 'type-in-use', `${lead}<div class="tt-u${ctx.edition === 'slot' ? ' tt-u--slot' : ''}">${fig}${text}</div>${foot}`, 'tt--use');
  },

  // the rules as a run of serials in two columns under one perforated rule: each rule's do specimen set large over the do,
  // and its don't torn off below the body under a short perforation, a stub hanging from the ticket, never beside it.
  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, f = c.form, line = ctx.brand.lines.others[0];
    const ground = byRole(ctx, 'ground', 3).id;
    // the muted tone that passes on the ground, and the one that does not: the wrong version of "fade text" is a swatch, never faded text
    const ok = ctx.pairs.find((p) => p.bg === ground && ctx.tones.some((t) => t.id === p.fg));
    const fail = ctx.unusedPairs.find((p) => p.bg === ground && ctx.tones.some((t) => t.id === p.fg)) || ctx.unusedPairs.find((p) => p.bg === ground);
    const sw = (p, bad, big = '') => `<span class="tt-sw${big}"><i class="tt-sw__t" style="background:${p.bgHex}"><b style="background:${p.fgHex}"></b></i><span class="num">${ratioText(p.ratioText)}${bad ? ', fails' : ''}</span></span>`;
    // the do specimens are set large (the display ones at 32 px); the don't specimens sit small on the stub line after the don't
    const big = (txt) => `<span class="disp tt-d" style="font-size:32px;line-height:1.05">${A(txt)}</span>`;
    const demos = [
      [big(line), `<span class="disp tt-d" style="font-size:15px;line-height:1.3">${A(c.pickup)}</span>`],
      // the tracking rule shows the name, set right and then letter-spaced
      [big(ctx.brand.name), `<span class="disp tt-d" style="font-size:17px;line-height:1.1;letter-spacing:0.14em">${A(ctx.brand.name)}</span>`],
      [`<span class="tt-d" style="font-size:17px">${A(c.eta)}.</span>`, `<span class="tt-d" style="font-size:9px">${A(c.eta)}.</span>`],
      [ok ? sw(ok, false, ' tt-sw--big') : '', fail ? sw(fail, true) : ''],
      [`<span class="tk-mono tt-d" style="font-size:32px;line-height:1.05">${A(f.readyValue)}</span>`, `<span class="tk-mono tt-d">${A(f.book)}</span>`],
    ];
    const ic = (n) => ctx.ui.icon(n, 16);
    const rows = R.map((r, i) => `<li class="tt-rr"><span class="tk-sn tt-rn">${serial(i + 1, 2)}</span>
<div class="tt-rdo"><div class="tt-demo">${demos[i]?.[0] || ''}</div><p class="tt-rtx">${ic('check')}<span><b class="tt-rk">Do.</b> ${A(r.do)}</span></p></div>
<div class="tt-rno">${rule(ctx, 'h', 'tt-perf--row tt-perf--short')}<div class="tt-rnl"><p class="tt-rtx">${ic('x')}<span><b class="tt-rk">Don't.</b> ${A(r.dont)}</span></p>${demos[i]?.[1] ? `<div class="tt-demo">${demos[i][1]}</div>` : ''}</div></div></li>`);
    // the lead under the title; the serials count the rules, so no heading says how many there are
    const lead = `<p class="tk-lead tt-lead">Each rule says what to do. Torn off below it is what never happens.</p>`;
    // two stacks, one rule's width each, that end together at the foot: the left takes the first half (rounded up), the right takes the rest
    const cut = Math.ceil(R.length / 2), stack = (a, b) => `<ol class="tt-rcol">${rows.slice(a, b).join('')}</ol>`;
    const main = `${rule(ctx, 'h', 'tt-perf--row')}<div class="tt-rules">${stack(0, cut)}${stack(cut)}</div>`;
    return page(ctx, 'type-rules', lead + main, `tt--rules${ctx.edition === 'slot' ? ' tt--slot' : ''}`);
  },
};
