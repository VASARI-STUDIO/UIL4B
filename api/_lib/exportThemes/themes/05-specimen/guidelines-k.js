// Guidelines pages for theme 05, Catalogue: cover, palette, colour-values, contrast. Styles are in css-k.js (classes start k-).
// The library card catalogue: a cabinet of drawer fronts, guide cards with tabs, printed cards at 5 : 3 with the call number
// top left, the rod hole bottom centre and the tracings at the foot. Cards appear only in the colour drawer; the other pages
// are open sheets with a call number and the rod hole as the motif. Every value comes from ctx; no brand name or hex is written here.
import { A, ratioText, nameOf } from './helpers.js';

export const LARGE = 24; // type at this size and over needs 3 : 1 (the contrast page says so)
export const same = (a, b) => a.toLowerCase() === b.toLowerCase();
export const rgbCss = (c) => `rgb(${c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, '$1 $2 $3')})`;

// the ink a card printed on bg carries: the brand's own text pair on that ground first, else the brand colour that reads best (4.5 : 1 or more)
export function inkOn(ctx, bg) {
  const p = ctx.pairs.filter((x) => same(x.bgHex, bg)).sort((a, b) => b.ratio - a.ratio)[0];
  if (p) return p.fgHex;
  const best = ctx.colours.map((c) => c.hex).filter((h) => !same(h, bg)).sort((a, b) => ctx.ratio(b, bg) - ctx.ratio(a, bg))[0];
  if (ctx.ratio(best, bg) < 4.5) throw new Error(`no brand colour reads at 4.5 : 1 on ${bg}`);
  return best;
}
// the step number on a ramp edge: Type or White, whichever holds the step better
export const stepInk = (ctx, hex) => { const t = ctx.roles.light.text, w = ctx.roles.light.raised; return ctx.ratio(t, hex) >= ctx.ratio(w, hex) ? t : w; };

// the punched rod hole: a 1.5 px Rod ring, the ground showing through
export const hole = (d, cls = '') => `<svg class="k-hole ${cls}" viewBox="0 0 ${d} ${d}" width="${d}" height="${d}" aria-hidden="true"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 - 1}" fill="var(--ground)" stroke="var(--rod)" stroke-width="1.5"/></svg>`;
// a cup pull, drawn in Rod line
export const pull = `<svg class="k-pull" viewBox="0 0 96 16" width="96" height="16" aria-hidden="true"><path d="M2 2h92M10 2v3c0 5 6 9 12 9h52c6 0 12-4 12-9V2" fill="none" stroke="var(--rod)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

// an open sheet: the call number and the title top left, the brand and the folio top right, the rod hole at the foot
export function sheet(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg k-sheet ${cls}" data-page="${id}">
<header class="k-hd"><div><span class="k-call k-mono">${A(p.ref || '')}</span><h1 class="k-ttl">${A(p.title)}</h1></div><p class="k-rh">${A(ctx.brand.name)} brand guidelines</p></header>
${inner}
<footer class="k-ft">${hole(16)}<span class="k-fo num">${ctx.pageNo(id)}</span></footer></section>`;
}

// the tracings for one colour: every used pair it is part of, numbered as on a catalogue card
export const tracings = (ctx, c) => ctx.pairs.filter((p) => p.fg === c.id || p.bg === c.id)
  .map((p, i) => `<span class="num">${i + 1}.</span> ${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))} <span class="num">${ratioText(p.ratioText)}</span>.`).join(' ');

export const guidelinesK = {
  // the cabinet front: one drawer per section, each with a label holder and a pull; the guide card stands up out of the top drawer
  cover(ctx) {
    const B = ctx.brand, d = B.fonts.display, b = B.fonts.body;
    const logo = ctx.logo.html('colour', { width: 150, label: 'Your logo goes here' });
    const range = (s) => { const a = s.pages[0].no, z = s.pages.at(-1).no; return a === z ? `page ${a}` : `pages ${a} to ${z}`; };
    const drawers = ctx.sections.map((s) => `<li class="k-dr"><span class="k-holder"><i class="k-screw"></i><span class="k-label"><b class="num">${s.n}</b> ${A(s.title)}<span class="k-range num">${range(s)}</span></span><i class="k-screw"></i></span>${pull}</li>`).join('');
    const card = `<div class="k-guide">
<span class="k-tab tab"><span class="k-tabname">${A(B.name)}</span></span>
<div class="k-face">
<p class="k-callno k-mono" aria-label="Version and date"><span>${A(B.version.number)}</span><span>${A(B.version.date)}</span></p>
<div class="k-entry"><div class="k-head">${logo}</div><p class="k-title"><span class="k-gt">Brand guidelines</span><span class="k-gl">${A(B.lines.primary)}</span></p><p class="k-coll num">${A(ctx.versionLine)}</p></div>
<p class="k-trace"><span class="num">1.</span> ${A(d.family)}. <span class="num">2.</span> ${A(b.family)}.</p>
${hole(24, 'k-hole--card')}
</div></div>`;
    return `<section class="pg k-cover" data-page="cover">${card}<div class="k-cab"><ol class="k-drawers" aria-label="Contents">${drawers}</ol><span class="k-plinth"></span></div></section>`;
  },

  // a drawer seen from above: one guide card per colour, largest share at the back, standing tallest. Each tab is in its colour,
  // as wide as the colour's share, and set across the drawer so the tabs together read left to right as the whole page
  palette(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), W = 652;
    const action = ctx.colours.find((c) => c.role === 'action') || cs.at(-1), ground = ctx.colours.find((c) => c.role === 'ground') || cs[0];
    let x = 0;
    const cards = cs.map((c, i) => {
      const w = Math.round(c.share * W), left = x; x += w;
      const ink = inkOn(ctx, c.hex), big = i === 0;
      const tabInk = ink;
      return `<li class="k-gc ${big ? 'k-gc--tall' : ''} ph-tight" style="--c:${c.hex};--i:${ink};z-index:${i + 1}">
<span class="k-gtab" style="left:${left}px;width:${w}px;color:${tabInk}"><span class="num">${Math.round(c.share * 100)}%</span></span>
<div class="k-gface"><p class="k-gname"><b class="k-disp">${A(c.name)}</b><span class="k-mono k-ghex">${A(c.hex)}</span></p><p class="k-glands">${A(c.lands)}</p></div></li>`;
    }).join('');
    const inner = `<p class="k-lead">${cs.length} colours, each named for where it lands. ${A(action.name)} is the colour people know ${A(ctx.brand.name)} by, and ${A(ground.name)} is the page. Each tab is as wide as the colour's share of a typical page.</p>
<div class="k-drawer k-drawer--pal"><ol class="k-gcs">${cards}</ol><span class="k-lip"></span></div>`;
    return sheet(ctx, 'palette', inner, 'k-pg-pal');
  },

  // per colour, a drawer: ten card edges stepping 50 to 900, each printed in its step, and the colour's own card lifted out beside it.
  // A colour that sits at step 50 has no tints, so it is shown as its card alone
  'colour-values'(ctx) {
    const face = (c) => {
      const ink = inkOn(ctx, c.hex);
      return `<article class="k-card ph-tight" style="background:${c.hex};color:${ink}" aria-label="${A(c.name)}">
<p class="k-callno k-mono"><span>${A(c.hex)}</span><span>${A(rgbCss(c))}</span><span>${A(c.oklch)}</span></p>
<div class="k-chead"><h2 class="k-disp k-cname">${A(c.name)}</h2><p class="k-subj">${A(c.roleText || c.role)}</p></div>
<p class="k-note">${A(c.lands)}</p>
<p class="k-trace">${tracings(ctx, c)}</p>
${hole(18, 'k-hole--card')}</article>`;
    };
    const drawer = (c) => {
      const steps = Object.entries(c.ramp).sort((x, y) => +x[0] - +y[0]).map(([k, hex]) => {
        const base = +k === c.rampBase;
        return `<li class="k-edge ${base ? 'k-edge--base' : ''}" style="background:${hex};color:${stepInk(ctx, hex)}" data-step="${A(k)}"><span class="k-sn num">${A(k)}</span>${base ? '<span class="k-lift">the colour, lifted out</span>' : ''}</li>`;
      }).join('');
      return `<li class="k-row">${face(c)}<div class="k-drawer k-drawer--ramp"><ol class="k-edges" role="group" aria-label="${A(c.name)} ramp, steps 50 to 900, the colour is step ${c.rampBase}">${steps}</ol></div></li>`;
    };
    const tinted = ctx.colours.filter((c) => c.rampBase !== 50), flat = ctx.colours.filter((c) => c.rampBase === 50);
    const names = (a) => (a.length > 1 ? `${a.slice(0, -1).map((c) => A(c.name)).join(', ')} and ${A(a.at(-1).name)}` : A(a[0].name));
    const flatRow = flat.length ? `<li class="k-row k-row--flat">${flat.map(face).join('')}</li>` : '';
    const action = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    const inner = `<p class="k-lead">Values for screens. Each drawer holds a colour's ramp, step 50 to step 900, and the card lifted out of it is the colour itself.</p>
<ol class="k-rows">${tinted.map(drawer).join('')}${flatRow}</ol>
<p class="k-small">${flat.length ? `${names(flat)} sit at step 50, the lightest step, so ${flat.length > 1 ? 'they have' : 'it has'} no tints. ` : ''}These values are for screens. ${A(ctx.brand.name)} prints on uncoated paper, which changes how a colour looks, so ask your printer for a proof before a run and match ${A(action.name)} to the proof.</p>`;
    return sheet(ctx, 'colour-values', inner, 'k-pg-val');
  },

  // the waterfall, card by card: each used pair is a card printed in its own colours, the name set at the brand's sizes, largest first,
  // down to the smallest it passes at. The cards stand in a drawer seen from above; the front card carries the unused pairs as tracings
  contrast(ctx) {
    const B = ctx.brand;
    // the brand's type sizes up to 44 px, largest first; a size within 10% of the one above is left out so the run fits the card
    const scale = [...new Set(B.type.scale.map((t) => t.size))].filter((s) => s <= 44).sort((a, b) => b - a).filter((s, i, a) => i === 0 || i === a.length - 1 || a[i - 1] / s >= 1.1);
    const floor = scale.at(-1);
    const stepsFor = (p) => (p.ratio >= 4.5 ? scale : scale.filter((s) => s >= LARGE));
    const word = A(B.name);
    const run = (sizes) => sizes.map((s, k) => `<span class="k-ws ${k === sizes.length - 1 ? 'k-ws--min' : ''}"><span class="k-w ${s >= LARGE ? 'k-disp' : ''}" style="font-size:${s}px">${word}</span><i class="num">${s} px</i></span>`).join('');
    const strip = (p, i) => `<li class="k-pc ph-tight" style="background:${p.bgHex};color:${p.fgHex};z-index:${i + 1}"><div class="k-pl"><b class="k-disp k-ratio num">${ratioText(p.ratioText)}</b><span class="k-pn">${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</span><span class="k-pu">${A(p.use)}${p.ratio >= 4.5 ? '' : '. Large type only'}</span></div><div class="k-run">${run(stepsFor(p))}</div></li>`;
    const nu = ctx.unusedPairs.map((p, i) => `<span class="num">${i + 1}.</span> ${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))} <span class="num">${ratioText(p.ratioText)}</span>.`).join(' ');
    const front = `<li class="k-pc k-pc--front ph-tight" style="z-index:${ctx.pairs.length + 1}"><h2 class="k-disp k-nuh">Not used for text</h2><p class="k-trace k-trace--nu">${nu}</p></li>`;
    const para = `Every text pair ${A(B.name)} uses, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. A pair below its mark is not used for text. Each pair is set at ${A(B.name)}'s own type sizes, from ${scale[0]} px down to ${floor} px, the smallest type the brand sets. The underlined size is the smallest each pair passes at.`;
    const inner = `<p class="k-lead k-lead--s">${para}</p><div class="k-drawer k-drawer--pairs"><ol class="k-pcs">${ctx.pairs.map(strip).join('')}${front}</ol><span class="k-lip"></span></div>`;
    return sheet(ctx, 'contrast', inner, 'k-pg-con');
  },
};
