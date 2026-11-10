// Guidelines pages for theme 02, Ticket: cover, palette, colour-values, contrast. Styles are in css-gate.js (classes start tk-).
// The subject is the thing Encore sells, printed: the hard ticket (2 x 5.5 in, a 1.5 in stub, so 2.75 : 1) and the roll ticket.
// Real conventions only: a perforation (a row of holes), serials that are real sequences, fact fields set label over value.
// Full tickets only on the cover and the colour pages; elsewhere the perforation is an edge device. No hex is written here.
import { A, ratioText, nameOf, fit } from './helpers.js';

// colours billed by share of use, biggest first
export const bySize = (ctx) => [...ctx.colours].sort((a, b) => b.share - a.share);
export const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
export const hexName = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
export const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
// the print ink that reads better on a stock: Night (the light text) or Stock (the light surface)
export const inkOn = (ctx, hex) => { const t = ctx.roles.light.text, g = ctx.roles.light.surface; return ctx.ratio(t, hex) >= ctx.ratio(g, hex) ? t : g; };
export const same = (a, b) => a.toLowerCase() === b.toLowerCase();
// a serial: the number in a run, zero-padded ("No. 004")
export const serial = (n, w = 3) => `No. ${String(n).padStart(w, '0')}`;

// the perforation: a row of round holes, d px across at a pitch of p px, drawn as a dotted SVG line (round caps on zero-length dashes)
// along the left edge of its ticket (or across the top with dir 'h'). The holes show the page behind, so they take the page ground.
export const perf = (colour, { d = 2, p = 6, dir = 'v', cls = '' } = {}) => dir === 'v'
  ? `<svg class="tk-perf ${cls}" aria-hidden="true" width="${d}" height="100%" style="--d:${d}px"><line x1="${d / 2}" y1="${p / 2}" x2="${d / 2}" y2="100%" stroke="${colour}" stroke-width="${d}" stroke-linecap="round" stroke-dasharray="0 ${p}"/></svg>`
  : `<svg class="tk-perf tk-perf--h ${cls}" aria-hidden="true" width="100%" height="${d}" style="--d:${d}px"><line x1="${p / 2}" y1="${d / 2}" x2="100%" y2="${d / 2}" stroke="${colour}" stroke-width="${d}" stroke-linecap="round" stroke-dasharray="0 ${p}"/></svg>`;

// a hole on a ticket the same colour as the page would vanish: there it takes the control edge instead
export const holeOn = (ctx, hex) => (same(hex, ctx.roles.light.surface) ? ctx.roles.light.border : ctx.roles.light.surface);
// a ticket the colour of the page gets a hairline so its edge reads
export const edgeOn = (ctx, hex) => (same(hex, ctx.roles.light.surface) ? ' tk-edge' : '');

// the page head: page name left, folio right, both in the condensed stub face, over a perforated edge
export function page(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<header class="tk-hd"><span>${A(p.title)}</span><span class="num">${ctx.pageNo(id)}</span></header>`;
  return `<section class="pg tk ${cls}" data-page="${id}">${head}${inner}</section>`;
}

// fact fields, label over value, as on a boarding pass
export const fields = (cols, cls = '') => `<dl class="tk-ff ${cls}">${cols.map(([k, v, vc = '']) => `<div><dt>${A(k)}</dt><dd class="${vc}">${v}</dd></div>`).join('')}</dl>`;

export const gate = {
  // one hard ticket on Stock, printed in Night on the Door red roll. The stub beyond the perforation is torn off and rests dropped and turned.
  cover(ctx) {
    const B = ctx.brand, slot = ctx.edition === 'slot', red = byRole(ctx, 'action'), ink = inkOn(ctx, red.hex), rev = B.logo.colourways.reversed;
    // the ticket at the page: 1156 px across body and stub (the tear takes 12 px), 4 : 1.5 between them, 2.75 : 1 overall
    const W = 1156, bw = Math.round(W * 4 / 5.5), sw = W - bw, h = Math.round(W / 2.75);
    // holes scale with the ticket: about 1 mm at a 2.5 mm pitch on a 5.5 in ticket drawn 1156 px wide
    const hole = { d: 8, p: 20 };
    const name = slot
      ? `<div class="tk-cv__slot">${ctx.logo.html('reversed', { width: 360, color: rev.name, label: 'Your logo goes here' })}</div><p class="disp tk-cv__name">${A(B.name)}</p>`
      : `<div class="tk-cv__logo">${ctx.logo.html('reversed', { width: fit(ctx, 'reversed', bw - 96, 176) })}</div>`;
    const body = `<div class="tk-cv__body" style="width:${bw}px;height:${h}px;background:${red.hex};color:${ink}">
<div class="tk-cv__top"><span class="tk-sn">${serial(1, 4)}</span><span class="tk-sn">Gig tickets, ${A(B.city)}</span></div>
<div class="tk-cv__mid">${name}<p class="tk-cv__line">${A(B.lines.primary)}</p></div>
${fields([['Document', 'Brand guidelines'], ['Version', A(B.version.number), 'num'], ['Date', A(ctx.date)], ['City', A(B.city)]], 'tk-ff--cover')}
${perf(ctx.roles.light.surface, { ...hole, cls: 'tk-perf--edge-r' })}</div>`;
    const stub = `<div class="tk-cv__stub" style="width:${sw}px;height:${h}px;background:${red.hex};color:${ink}">
${perf(ctx.roles.light.surface, { ...hole, cls: 'tk-perf--edge-l' })}
<span class="tk-sn">${serial(1, 4)}</span>
<p class="tk-cv__stubname">${A(B.name)}</p>
${fields([['Kept by', 'Example project'], ['Page', `<span class="num">${ctx.pageNo('cover')}</span>`]], 'tk-ff--stub')}</div>`;
    return `<section class="pg tk tk--cover" data-page="cover"><div class="tk-cv" style="height:${h}px">${body}${stub}</div></section>`;
  },

  // one roll per colour, biggest share first. The roll comes in off the left edge and unwinds across the page; its height is its share.
  // The first ticket carries the name, the role and where it lands; the second a line of the brand's copy; the rest only their serials.
  palette(ctx) {
    const cs = bySize(ctx), action = byRole(ctx, 'action'), V = ctx.brand.voice.principles, sample = ctx.brand.type.sample;
    const onAction = ctx.pairs.filter((p) => p.bgHex === action.hex && !p.large);
    const ink = onAction.length ? hexName(ctx, onAction[0].fgHex) : '';
    const lead = `${NUM[cs.length] || cs.length} colours, each named for where it lands. ${action.name} is the one people see us by${ink ? `, and ${ink} is the type on it` : ''}.`;
    const texts = [sample.headline, V[1].example, V[2].example, V[3].example];
    const total = cs.reduce((s, c) => s + c.share, 0);
    const AVAIL = 470; // px of roll height at the 1280 page, after the head, the lead and the gaps between rolls
    // the slot edition's copy tickets hold descriptor boxes, taller than the brand's one-line copy: there each roll is as tall as its
    // tickets need and the page's spare height goes to the rolls by share, so the order by share holds and no box leaves its roll
    const slot = ctx.edition === 'slot';
    const roll = (c, i) => {
      // every roll is at least 52 px (two lines of its lands line); the rest of the height goes by share
      const h = Math.round(52 + (c.share / total) * (AVAIL - 52 * cs.length)), big = h >= 120, fg = inkOn(ctx, c.hex);
      const fs = Math.max(30, Math.min(96, Math.round(h * 0.46)));
      const w0 = big ? 660 : 820; // the face ticket on a big roll, px (a small roll's face is sized to its words)
      // tickets after the face: on a big roll at about the roll's own pitch; on a small roll one copy ticket and one blank
      const n = big ? Math.max(1, Math.round((1168 - w0) / (h * 1.6))) : 2;
      const hole = holeOn(ctx, c.hex);
      const face = `<div class="tk-pt tk-pt--face" style="flex:0 0 ${w0 + 56}px"><b class="disp tk-pn" style="font-size:${fs}px">${A(c.name)}</b><p class="tk-pl"><span class="tk-pr">${A(ctx.cap(c.role))}.</span> ${A(c.lands)}</p><span class="tk-sn tk-pt__sn">${serial(1)}</span></div>`;
      const rest = Array.from({ length: n }, (_, k) => `<div class="tk-pt${k === 0 ? ' tk-pt--text' : ''}">${perf(hole)}${k === 0 ? `<p class="tk-ps">${A(texts[i % texts.length])}</p>` : ''}<span class="tk-sn tk-pt__sn">${serial(k + 2)}</span></div>`).join('');
      const size = slot ? `flex:${(c.share / total).toFixed(3)} 0 auto` : `height:${h}px`;
      return `<div class="tk-roll ${big ? 'tk-roll--big' : 'tk-roll--sm'}${edgeOn(ctx, c.hex)}" style="${size};background:${c.hex};color:${fg}">${face}${rest}</div>`;
    };
    return page(ctx, 'palette', `<p class="tk-lead">${A(lead)}</p><div class="tk-rolls${slot ? ' tk-rolls--slot' : ''}">${cs.map(roll).join('')}</div>`, 'tk--palette');
  },

  // per colour, its ramp as a run of ten consecutive tickets on that colour's roll, each printed in its step, the serial the step.
  // The base step is the wide ticket at its place in the run, carrying the name and HEX, RGB and OKLCH as fact fields.
  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp), cs = bySize(ctx);
    const run = (c) => {
      if (c.rampBase === 50) return `<div class="tk-run tk-run--flat${edgeOn(ctx, c.hex)}" style="background:${c.hex};color:${inkOn(ctx, c.hex)}"><b class="disp tk-vn">${A(c.name)}</b><p>The ground. No tints.</p></div>`;
      const t = steps.map((k, i) => {
        const hex = c.ramp[k], fg = inkOn(ctx, hex), base = +k === c.rampBase, hole = holeOn(ctx, hex);
        // the tear line between two tickets on the roll: holes at 4 px on a 9 px pitch, so the run reads as a roll and not a table row
        const p = i ? perf(hole, { d: 4, p: 9 }) : '';
        if (!base) return `<div class="tk-vt${edgeOn(ctx, hex)}" style="background:${hex};color:${fg}">${p}<span class="tk-vt__k num">${serial(k)}</span></div>`;
        const vals = [['HEX', A(c.hex)], ['RGB', A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))], ['OKLCH', A(c.oklch)]].map(([a, b]) => [a, b, 'tk-mono']);
        return `<div class="tk-vt tk-vt--base${edgeOn(ctx, hex)}" style="background:${hex};color:${fg}">${p}<div class="tk-vt__hd"><b class="disp tk-vn">${A(c.name)}</b><span class="tk-sn">${serial(k)}</span></div>${fields(vals, 'tk-ff--vals')}</div>`;
      }).join('');
      return `<div class="tk-run">${t}</div>`;
    };
    const tones = ctx.tones.map((t) => `<li><i class="tk-sw${edgeOn(ctx, t.hex)}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="tk-mono">${A(t.hex)}</span></span></li>`).join('');
    const note = `Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(byRole(ctx, 'action').name)} to the proof. Every ramp step is in the palette files in the brand kit. The wide ticket on each run is the colour itself.`;
    return page(ctx, 'colour-values', `<div class="tk-runs">${cs.map(run).join('')}</div><div class="tk-vbot"><div><h3 class="tk-h3">Tones</h3><ul class="tk-tones">${tones}</ul></div><p class="tk-lead">${note}</p></div>`, 'tk--values');
  },

  // one ticket per used pair, printed in its own colours: the use on the body, the ratio as the price field, the pair named on the stub.
  // Scale varies on purpose: the pair the brand is read in is the headliner at true ticket proportion, the rest step down in three runs.
  contrast(ctx) {
    const pairs = ctx.pairs, first = pairs[0];
    const rows = [[0, 3, 156], [3, 7, 124], [7, pairs.length, 116]]; // [from, to, height px] at the 1280 page
    const ticket = (p, i, h, w) => {
      // a large-only pair prints its ratio in its own colours (24 px and over); the small lines take the ink that reads on the stock
      const sm = p.large ? inkOn(ctx, p.bgHex) : p.fgHex, sw = Math.round(w * 1.5 / 5.5), bw = w - sw;
      const chars = ratioText(p.ratioText).length;
      const fs = Math.max(26, Math.min(i === 0 ? 72 : 44, Math.floor((bw - 40) / (chars * 0.86)), Math.round(h * 0.4)));
      const hole = holeOn(ctx, p.bgHex);
      return `<div class="tk-ct${edgeOn(ctx, p.bgHex)}${i === 0 ? ' tk-ct--lead' : ''}" style="flex:0 0 ${w}px;height:${h}px;background:${p.bgHex};color:${sm}">
<div class="tk-ct__body"><p class="tk-ct__use">${A(p.use)}</p><dl class="tk-price"><dt>Ratio</dt><dd class="disp num" style="font-size:${fs}px;color:${p.fgHex}">${ratioText(p.ratioText)}</dd></dl></div>
<div class="tk-ct__stub" style="flex:0 0 ${sw}px">${perf(hole)}<span class="tk-sn" style="color:${p.fgHex}">${serial(i + 1, 2)}</span><p class="tk-ct__names" style="color:${p.fgHex}">${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</p></div></div>`;
    };
    const GAP = 12;
    const strip = ([a, b, h], r) => {
      const n = b - a; if (n <= 0) return '';
      // the headliner is a true hard ticket (2.75 : 1); the others share what is left of the run
      const lead = r === 0 ? Math.round(h * 2.75) : 0;
      const each = Math.floor((1168 - lead - GAP * (n - 1)) / (r === 0 ? n - 1 : n));
      return `<div class="tk-cts">${pairs.slice(a, b).map((p, k) => ticket(p, a + k, h, r === 0 && k === 0 ? lead : each)).join('')}</div>`;
    };
    const para = `${A(nameOf(ctx, first.fg))} on ${A(nameOf(ctx, first.bg))} reads at ${ratioText(first.ratioText)}. Below is every text pair ${A(ctx.brand.name)} uses, with its ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. A pair below its mark is not used for text.`;
    const nu = ctx.unusedPairs.map((p) => `<li><span class="tk-sw" style="background:${p.bgHex}"><i style="background:${p.fgHex}"></i></span><span><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b> <span class="num">${ratioText(p.ratioText)}</span>, not for text</span></li>`).join('');
    const unused = ctx.unusedPairs.length ? `<div class="tk-nu"><h3 class="tk-h3">Not used</h3><ul>${nu}</ul></div>` : '';
    return page(ctx, 'contrast', `<div class="tk-ctrows">${rows.map(strip).join('')}</div><div class="tk-cbot"><p class="tk-lead">${para}</p>${unused}</div>`, 'tk--contrast');
  },
};
