// Guidelines pages for theme 05, Catalogue: logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse. Styles are in css-p-logo.js (classes start kl-).
// Open sheets from the gate's sheet() (call number top left, rod hole at the foot), carrying the catalogue's furniture: the ruled card's
// first and second indention, guide-card tabs, a drawer front with its label holder, See and See also references and the tracings.
// The wordmark is the main entry, the versions are its copies (c. 1, c. 2 ...), and the clear space is the gap between the two indentions.
// Every value comes from ctx; the logo is always ctx.logo.html (the slot frame in the slot edition), never redrawn.
import { A, fit } from './helpers.js';
import { sheet, same } from './guidelines-k.js';

const colourOf = (ctx, hex) => ctx.colours.find((c) => same(c.hex, hex)) || ctx.tones.find((c) => same(c.hex, hex));
// the brand's own name for a hex (a palette colour or a tone), else the hex
const hexName = (ctx, hex) => colourOf(ctx, hex)?.name || hex;
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0]);
// a ground too close to the page to show its own edge gets a Rod line
const pale = (ctx, hex) => ctx.ratio(hex, ctx.roles.light.surface) < 1.4;

// the versions in the order the versions page files them: the copy number is the place in this list
const ORDER = ['colour', 'mono-dark', 'mono-light', 'reversed', 'horizontal', 'stacked', 'symbol'];
const copyNo = (id) => ORDER.indexOf(id) + 1;
// a cross-reference to another page of this document, by its title and page number
const seePage = (ctx, id) => `${A(ctx.pages.find((p) => p.id === id).title)}, page <span class="num">${ctx.pageNo(id)}</span>`;
const seeCopy = (ctx, id) => `<span class="num">c. ${copyNo(id)}</span>, ${A(ctx.logo.labels[id])}`;

// the ruled card's furniture drawn on the sheet: the top line and the first indention line, Rod hairlines
// (the second indention is drawn by css-p-logo.js as the left edge of the entry's body)
const ruling = (top, first) => `<i class="kl-hr" style="top:${top}px" aria-hidden="true"></i><i class="kl-ind" style="left:${first}px;top:${top}px" aria-hidden="true"></i>`;
// the document's two indentions from the page edge, margin + 40 and margin + 80, as every Catalogue lane sets them (review 05, X1)
const FIRST = 96;

export const pLogo = {
  // the main entry: the wordmark at the first indention, large; the idea as the title paragraph at the second indention, then the
  // same wordmark stepping down to the minimum. The rule and the name are its tracings; the logo pages that follow are See also
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, min = L.minSize.screenPx;
    const big = fit(ctx, 'colour', 600, 290);
    const run = [180, 140, 110, min];
    // each copy captioned with its width only, so every caption is one line and the copies share one foot line
    const step = (w, i) => {
      const last = i === run.length - 1;
      return `<li class="kl-step ${last ? 'kl-step--min' : ''}">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}<p class="kl-cap"><span class="num">${w} px</span>${last ? ', minimum' : ''}</p></li>`;
    };
    // the tracings: the rule belongs to the showcase's own logo; the slot edition's logo is a frame, so its tracings hold for any logo
    const tr = ctx.edition === 'slot'
      ? `<span class="num">1.</span> The logo. The supplied artwork, scaled evenly and never redrawn. <span class="num">2.</span> The name. ${A(B.name)}, as the supplied files set it, never retyped.`
      : `<span class="num">1.</span> The rule. A ${A(hexName(ctx, cw.rule))} hairline. It always travels with the name. <span class="num">2.</span> The name. ${A(B.name)} in ${A(B.fonts.display.family)}, outlined from the face and never retyped.`;
    // the first indention line runs the sheet; the second starts under the main entry, as the body of the entry hangs from it
    const inner = `${ruling(128, FIRST)}
<div class="kl-main">${L.html('colour', { width: big, color: cw.name, label: 'Your logo goes here' })}<p class="kl-cap"><span class="num">${big} px</span> Full size</p></div>
<div class="kl-body"><p class="kl-idea">${A(B.logo.idea)}</p>
<ol class="kl-run">${run.map(step).join('')}</ol>
<p class="kl-cap kl-runcap">Scaled evenly. It stops at the minimum.</p>
<div class="kl-foot"><p class="kl-tr">${tr}</p>
<p class="kl-see"><i>See also</i> ${['logo-versions', 'clear-space', 'min-size'].map((id) => seePage(ctx, id)).join('. ')}.</p></div></div>`;
    return sheet(ctx, 'logo', inner, 'kl-pg kl-pg-logo');
  },

  // the copies: each version is a guide card with its copy number on the tab, the tabs cut in staggered positions as a
  // real guide set is. The card is the version's own ground, set at three sizes; full colour and its one-colour copies end at the minimum
  'logo-versions'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways;
    const min = L.minSize.screenPx, pw = L.geos.colour.w;
    // the brand sets one minimum, for full colour; the one-colour versions are the same artwork, so they share it.
    // Other shapes step down in proportion with no minimum marked. The first copy is set larger, as the main entry
    // A shape with no minimum is sized by height (tall at most), so a stacked or symbol copy stays as low as the others
    const steps = (id, avail, main) => {
      const g = L.geos[id], named = g === L.geos.colour;
      const slot = ctx.edition === 'slot'; // a slot frame is taller than the artwork, so the slot edition sets the copies smaller to keep clear of the rod hole
      const full = named ? min * (main ? (slot ? 1.5 : 2) : 1.25) : Math.min((g.w * (id === 'horizontal' ? 30 : 56) * (slot ? 0.8 : 1)) / g.h, avail);
      const s = named ? [full, Math.sqrt(full * min), min] : [full, full * 0.8, full * 0.64];
      const two = [s[0], s[2]], tot = (a) => a.reduce((x, y) => x + y, 0) + 16 * (a.length - 1);
      const use = named && tot(s) > avail ? two : s;
      // a slot frame narrower than 48 px can't hold its own label, so the slot edition files no copy below that
      // and the copies stop at the first one that floors, so no size is filed twice
      const sized = use.map((w) => Math.round(ctx.edition === 'slot' ? Math.max(w, 48) : w));
      return { named, list: sized.filter((w, k) => sized.indexOf(w) === k) };
    };
    const card = (id) => {
      const i = ORDER.indexOf(id), w = cw[L.colourwayOf(id)], main = i === 0, st = steps(id, main ? 600 : 360, main);
      const items = st.list.map((width, k) => {
        const last = k === st.list.length - 1 && st.named;
        return `<span class="kl-vs">${L.html(id, { width, color: w.name, label: 'Logo' })}<i class="num ${last ? 'kl-vmin' : ''}">${width} px${last ? ', minimum' : ''}</i></span>`;
      }).join('');
      return `<li class="kl-gd ${main ? 'kl-gd--main' : ''} ${pale(ctx, w.ground) ? 'kl-gd--pale' : ''}" style="--g:${w.ground};--n:${w.name}">
<span class="kl-gtab" style="left:${main ? 0 : i < 4 ? (i - 1) * 33.3 : ((i - 4) % 2) * 50}%"><b class="num">c. ${copyNo(id)}</b> ${A(L.labels[id])}</span>
<div class="kl-gbody"><div class="kl-vrun">${items}</div><p class="kl-when">${A(ctx.brand.logo.when[id])}</p></div></li>`;
    };
    const inner = `<p class="k-lead k-lead--s kl-vlead">Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it. Each is set at three sizes; full colour and its one-colour versions end at the minimum.</p>
<ol class="kl-gds">${card('colour')}</ol>
<div class="kl-drw"><ol class="kl-gds">${ORDER.slice(1, 4).map(card).join('')}</ol><ol class="kl-gds kl-gds--shape">${ORDER.slice(4).map(card).join('')}</ol></div>`;
    return sheet(ctx, 'logo-versions', inner, 'kl-pg kl-pg-ver');
  },

  // clear space as the card's two indentions: the zone's left edge is the first indention, the logo starts at the second, so the
  // gap between the two lines is x. The zone at full size is the large thing; the smaller two follow on the same first indention
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, cw = B.logo.colourways.colour, min = L.minSize.screenPx;
    const share = L.clearShare, r = (n) => n.toFixed(1), unit = L.geo.gap || L.geo.unit;
    const xOf = (lw) => (unit * lw) / g.w;
    // the full-size logo, so that its zone runs from the first indention to the right margin (the card's indentions scale with it)
    const room = 794 - ctx.brand.layout.margin - FIRST;
    const bigW = Math.floor(room / (1 + (2 * unit) / g.w));
    // the x ticks span each band of the zone; where the band is too thin to hold them (the minimum), they sit 4 px outside the zone
    const zoneAt = (lw, label) => {
      const X = xOf(lw), lh = (g.h * lw) / g.w, zw = lw + 2 * X, zh = lh + 2 * X, dims = X >= 18, out = lw <= min;
      const dim = (cls, st) => `<i class="kl-dim ${cls}" style="${st}">${dims ? '<b>x</b>' : ''}</i>`;
      const ticks = out
        ? `${dim('kl-dim--v kl-dim--out', `left:-6px;top:0;height:${r(X)}px`)}${dim('kl-dim--v kl-dim--out', `right:-6px;bottom:0;height:${r(X)}px`)}${dim('kl-dim--h kl-dim--out', `top:-6px;left:0;width:${r(X)}px`)}${dim('kl-dim--h kl-dim--out', `bottom:-6px;right:0;width:${r(X)}px`)}`
        : `${dim('kl-dim--v', `left:50%;top:0;height:${r(X)}px`)}${dim('kl-dim--v', `left:50%;bottom:0;height:${r(X)}px`)}${dim('kl-dim--h', `top:50%;left:0;width:${r(X)}px`)}${dim('kl-dim--h', `top:50%;right:0;width:${r(X)}px`)}`;
      return `<div class="kl-zone" style="width:${r(zw)}px;height:${r(zh)}px">${ticks}
<div class="kl-zin" style="left:${r(X)}px;top:${r(X)}px;width:${lw}px">${L.html('colour', { width: lw, color: cw.name, label })}</div></div>`;
    };
    const what = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is the space between the rule and the name, ${share}% of the logo's height.`;
    // on the full-size zone, the two indention lines run the card-width field, each ending at its top on a labelled tick
    const lines = (w) => `<span class="kl-field" aria-hidden="true"></span><i class="kl-ind kl-ind--z" style="left:0" aria-hidden="true"><b class="num">1</b></i><i class="kl-ind kl-ind--z" style="left:${r(xOf(w))}px" aria-hidden="true"><b class="num">2</b></i>`;
    const fig = (w, label, t, n, cls) => `<figure class="kl-cz ${cls}">${cls ? lines(w) : ''}${zoneAt(w, label)}<figcaption class="kl-cap"><span class="num">${w} px</span> ${t}. ${n}.</figcaption></figure>`;
    const from = ctx.edition === 'slot' ? `The logo's outer edges, on all four sides.` : 'The ends of the rule at the top and bottom, the outer edge of the rule on the left, and the last letter of the name on the right.';
    const inner = `<p class="k-lead kl-clead">Keep a clear zone around the logo, x on every side. ${A(what)}</p>
${fig(bigW, 'Your logo goes here', 'Full size', 'x on every side, the gap between the first indention (1) and the second (2)', 'kl-cz--big')}
<div class="kl-czs">${fig(200, 'Logo', 'Smaller', 'x shrinks with the logo', '')}${fig(min, 'Logo', 'The minimum', 'x is the same share', '')}</div>
<p class="kl-tr kl-tr--cs"><span class="num">1.</span> Measured from. ${A(from)} <span class="num">2.</span> Nothing enters. No type, no photo edges, no other logos, and no rules of another colour inside the zone.</p>`;
    return sheet(ctx, 'clear-space', inner, 'kl-pg kl-pg-cs');
  },

  // the smallest label it goes on: a two-drawer cabinet front, each drawer's label holder carrying the logo at its minimum, drawn at
  // actual size (on screen at 1 px to the pixel, in print at true millimetres), the width ruled beneath it
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour;
    const mmPx = (mm) => (mm * 96) / 25.4;
    const drawer = (title, w, wText, hText, note) => {
      const lw = Math.round(w * 10) / 10;
      return `<li class="kl-dr"><div class="kl-front"><span class="kl-holder"><i class="kl-screw"></i><span class="kl-label" style="width:${lw}px">${L.html('colour', { width: lw, color: cw.name, label: 'Logo' })}</span><i class="kl-screw"></i></span>
<span class="kl-ruler" style="width:${lw.toFixed(1)}px" aria-hidden="true"></span><svg class="kl-pull" viewBox="0 0 96 16" width="96" height="16" aria-hidden="true"><path d="M2 2h92M10 2v3c0 5 6 9 12 9h52c6 0 12-4 12-9V2" fill="none" stroke="var(--rod)" stroke-width="1.5" stroke-linejoin="round"/></svg></div>
<div class="kl-drtext"><h2 class="k-disp kl-drh">${title}</h2><p class="kl-drn">${note}</p><p class="kl-dims num">${wText} wide${ctx.edition === 'slot' ? '' : `, ${hText} high`}</p></div></li>`;
    };
    const inner = `<h2 class="k-disp kl-never">Never smaller than <span class="num">${m.screenPx}</span> px on screen, or <span class="num">${m.printMm}</span> mm in print.</h2>
<p class="k-lead kl-mlead">Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.</p>
<div class="kl-cab"><ol class="kl-drs">${drawer('Screen', m.screenPx, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a page or screen.')}${drawer('Print', mmPx(m.printMm), `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on uncoated paper or any other.')}</ol><span class="kl-plinth"></span></div>`;
    return sheet(ctx, 'min-size', inner, 'kl-pg kl-pg-min');
  },

  // the photograph large on the left; down the right, each colour ground filed as an added copy, the ground as its guide card with the
  // tab cut left and right in turn (as on versions), and a See reference to the copy it takes
  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, slot = ctx.edition === 'slot';
    const items = [['colour', 'colour'], ['on-white', 'colour'], ['reversed', 'reversed'], ['mono-light', 'mono-light']].filter(([k]) => cw[k]);
    // the showcase names the colourway by its parts; the slot logo is a frame, so there the version's own copy describes it
    const entry = ([key, id], i) => {
      const c = cw[key], one = same(c.name, c.rule || c.name);
      const desc = slot ? 'The logo as filed' : one ? `${hexName(ctx, c.name)} name and rule` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.rule)} rule`;
      return `<li class="kl-ge ${pale(ctx, c.ground) ? 'kl-ge--pale' : ''}" style="--g:${c.ground};--n:${c.name}"><h2 class="kl-getab kl-getab--${i % 2 ? 'r' : 'l'}">On ${A(hexName(ctx, c.ground))}</h2><div class="kl-gp">${L.html(id, { width: 150, colourway: key, color: c.name, label: 'Logo' })}</div>
<p class="kl-ged">${A(desc)}. <i>See</i> ${seeCopy(ctx, id)}.</p></li>`;
    };
    const ml = cw['mono-light'];
    const photo = `<figure class="kl-ph"><div class="kl-phf">${ctx.photo('desk', { cls: 'kl-fill', pos: '50% 50%' })}<span class="kl-onphoto">${L.html('mono-light', { width: 200, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span></div>
<figcaption><h2 class="k-disp kl-geh">On a photograph</h2><p class="kl-ged">Mono light, on a quiet dark part of the picture. Keep the ${slot ? 'logo' : 'rule'} clear of busy detail. <i>See</i> ${seeCopy(ctx, 'mono-light')}.</p></figcaption></figure>`;
    const inner = `<p class="k-lead kl-glead">The logo sits on ${A(list(items.map(([k]) => hexName(ctx, cw[k].ground))))}, and on a photograph. Use the colourway shown on each.</p>
<div class="kl-gr">${photo}<ol class="kl-ges">${items.map(entry).join('')}</ol></div>`;
    return sheet(ctx, 'logo-grounds', inner, 'kl-pg kl-pg-gr');
  },

  // each misuse drawn with the real logo, its left edge on the margin, the fault as the heading and the reason beside it; the busy ground leads,
  // drawn as the subject's own shelf of spines in the brand's colours. Where the right way is on another page, a See reference points to it
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 150;
    const off = ctx.C.toOklch(byRole(ctx, 'action').hex);
    const wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    const ink = ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',');
    const spines = [['--plum', 22], ['--ink', 14], ['--rod', 30], ['--plum', 18], ['--ink', 12], ['--rod', 16], ['--plum', 24], ['--ink', 20], ['--rod', 26], ['--plum', 14], ['--ink', 30], ['--rod', 18], ['--plum', 12], ['--ink', 22]];
    const shelf = `<div class="kl-shelf" aria-hidden="true">${[...spines, ...spines, ...spines].map(([c, wd], i) => `<i style="background:var(${c});width:${wd}px;margin-top:${(i * 7) % 28}px"></i>`).join('')}</div>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.3,0.72);transform-origin:0 50%">${L.forMisuse(w)}</div>`, ''],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong }), seePage(ctx, 'logo-versions')],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-12deg);transform-origin:0 50%">${L.forMisuse(w)}</div>`, ''],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ink},0.55))">${L.forMisuse(w)}</div>`, ''],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="kl-boxed">${L.forMisuse(w - 36)}</div>`, ''],
    ];
    const see = (s) => (s ? ` <i>See</i> ${s}.` : '');
    const busy = `<li class="kl-mi kl-mi--big"><div class="kl-md kl-md--busy">${shelf}<span class="kl-onbusy">${L.forMisuse(ctx.edition === 'slot' ? 200 : 260)}</span></div>
<h2 class="k-disp kl-mh">Busy ground</h2><p class="kl-mr">Never on a busy picture. Use mono light on a quiet part of one.${see(seePage(ctx, 'logo-grounds'))}</p></li>`;
    const row = ([t, cap, html, s]) => `<li class="kl-mi"><div class="kl-md">${html}</div><div><h2 class="k-disp kl-mh">${A(t)}</h2><p class="kl-mr">${A(cap)}${see(s)}</p></div></li>`;
    const inner = `<p class="k-lead kl-mslead">Six ways the logo goes wrong. Use the supplied files as they are, and none of these.</p><ol class="kl-mis">${busy}${items.map(row).join('')}</ol>`;
    return sheet(ctx, 'logo-misuse', inner, 'kl-pg kl-pg-mis');
  },
};
