// Brand book markup for theme 05, Catalogue: the library card catalogue as a web page. The engine's section index is drawn as the
// cabinet front (css-book.js); each section is an open sheet with a guide card's tab standing on its top edge (the tabs step across in
// thirds, as a run of guide cards does), the call number top left, the rod hole and a See also reference at the foot. Catalogue
// cards (5 : 3, printed on the colour's own stock) appear only in the colour drawer and the business card; everywhere else the
// card's anatomy is the structure: the heading at the first indention, notes at the second, numbered tracings.
// One moment: the first colour card lifts out of its drawer as the drawer scrolls into view (500 ms, once, at rest under reduced motion).
// Brand copy is read only through A(); a string that has to be parsed goes through ctx.real() first. Classes start kb-; bk-sec,
// bk-btn__t, bk-for-light/dark and data-copy / data-tester-* are the engine's hooks. Every value comes from ctx; no hex is written here.
import { A, fit } from './helpers.js';
import { inkOn, tracings } from './guidelines-k.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

// the punched rod hole, drawn in Rod line with the ground showing through
const hole = (d = 16) => `<svg class="kb-hole" viewBox="0 0 ${d} ${d}" width="${d}" height="${d}" aria-hidden="true"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 - 1}" fill="var(--kb-hole)" stroke="var(--kb-rod)" stroke-width="1.5"/></svg>`;
// a cup pull, drawn in Rod line
const pull = `<svg class="kb-pull" viewBox="0 0 96 16" width="72" height="12" aria-hidden="true"><path d="M2 2h92M10 2v3c0 5 6 9 12 9h52c6 0 12-4 12-9V2" fill="none" stroke="var(--kb-rod)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

const copyBtn = (text, value, what) => `<button type="button" class="kb-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const dl = (f, label) => (f ? `<a class="kb-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');

const SECS = ['overview', 'voice', 'logo', 'colour', 'typography', 'imagery', 'layout', 'applications', 'downloads'];
const SEC_T = { overview: 'Overview', voice: 'Voice', logo: 'Logo', colour: 'Colour', typography: 'Typography', imagery: 'Imagery', layout: 'Layout', applications: 'Applications', downloads: 'Downloads' };
// guide cards are cut in thirds: the tab stands left, centre or right, stepping across as the sections run
const CUT = [0, 0.5, 1];

// a section: the call number and the running head, the guide tab on the sheet's top edge, the body, then the rod hole and a See also
function sec(ctx, id, lead, inner, see) {
  const n = SECS.indexOf(id), cut = CUT[(n - 1) % 3];
  const head = `<header class="kb-hd"><span class="kb-call kb-mono">${n + 1}</span><span class="kb-rh">${A(ctx.brand.name)} brand book</span></header>
<div class="kb-guide" style="--cut:${cut}"><h2 class="kb-tab" id="h-${id}">${SEC_T[id]}</h2></div>
${lead ? `<p class="kb-lead">${lead}</p>` : ''}`;
  const foot = `<footer class="kb-ft">${see ? `<p class="kb-see"><b>See also</b> <a href="#${see[0]}">${SEC_T[see[0]]}</a>: ${see[1]}.</p>` : ''}${hole(16)}</footer>`;
  return `<section class="bk-sec kb-sec kb-sec--${id}" id="${id}" aria-labelledby="h-${id}">${head}${inner}${foot}</section>`;
}
// a sub-entry inside a section: its own heading at the first indention
const sub = (title, note, inner, cls = '') => `<div class="kb-sub ${cls}"><h3 class="kb-subh">${title}</h3>${note ? `<p class="kb-subn">${note}</p>` : ''}${inner}</div>`;

// ---- 1 overview: the main entry. The call number (version and date) in the margin, the line as the heading, the collation line,
// the notes at the second indention, and the personality as the tracings, set large
function overview(ctx) {
  const B = ctx.brand;
  const trace = B.personality.map((p, i) => `<span class="kb-ti"><span class="num">${i + 1}.</span> ${A(p.trait)}.</span>`).join(' ');
  const means = B.personality.map((p, i) => `<li><span class="kb-n num">${i + 1}.</span><p><b>${A(p.trait)}.</b> ${A(p.means)}</p></li>`).join('');
  const note = (k, v, cls = '') => `<p class="kb-note ${cls}"><b>${k}.</b> ${v}</p>`;
  return `<section class="bk-sec kb-sec kb-sec--overview" id="overview" aria-labelledby="h-overview">
<div class="kb-main">
<p class="kb-callno kb-mono" aria-label="Version and date"><span>${A(B.version.number)}</span><span>${A(B.version.date)}</span></p>
<div class="kb-entry"><h1 class="kb-mainh" id="h-overview">${A(B.lines.primary)}</h1>
<p class="kb-coll">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p>
<div class="kb-notes">${note('Who we are', A(B.description), 'kb-note--lead')}${note('What it does', A(B.product))}${note('Who it serves', A(B.audience))}</div></div></div>
<div class="kb-traces"><h2 class="kb-subh">Personality</h2><p class="kb-bigtrace">${trace}</p><ol class="kb-means">${means}</ol></div>
<footer class="kb-ft"><p class="kb-see"><b>See also</b> <a href="#voice">Voice</a>: how the personality is written.</p>${hole(16)}</footer>
</section>`;
}

// ---- 2 voice: each "Write this" is an entry; the line it replaces is filed as a See reference that sends the reader on to it
function voice(ctx) {
  const B = ctx.brand, V = B.voice, lines = [B.lines.primary, ...B.lines.others];
  const sizes = [64, 48, 36, 30, 26];
  const wtn = V.writeThis.map((r, i) => `<li class="kb-wt${i ? '' : ' kb-wt--first'}"><span class="kb-n num">${i + 1}</span><div><p class="kb-wt__w">${A(r.write)}</p><p class="kb-wt__b">${A(r.because)}</p><p class="kb-wt__x"><span class="kb-wt__n">${A(r.not)}</span> <b>See</b> ${A(r.write)}</p></div></li>`).join('');
  const lead = `${NUM[V.principles.length] || V.principles.length} rules for how ${A(B.name)} writes, each with a line from the brand. Each line it replaces is filed as a See reference, which sends the reader on to the line to write.`;
  const prin = V.principles.map((p, i) => `<li><span class="kb-n num">${i + 1}</span><h4 class="kb-pr__t">${A(p.title)}</h4><p class="kb-pr__e">${A(p.example)}</p></li>`).join('');
  const bp = (n, text) => `<div class="kb-bp"><h4 class="kb-bp__h">In ${n} words</h4><p class="kb-body">${A(text)}</p>${copyBtn('Copy text', text, `${n}-word boilerplate`)}</div>`;
  return sec(ctx, 'voice', lead, `
${sub('Write this, not that', `${V.writeThis.length} pairs, and why`, `<ol class="kb-wtn">${wtn}</ol>`)}
${sub('Lines in use', `As ${A(B.name)} sets them`, `<ul class="kb-lines">${lines.map((l, i) => `<li style="--s:${sizes[Math.min(i, sizes.length - 1)]}px">${A(l)}</li>`).join('')}</ul>`, 'kb-sub--lines')}
${sub('The rules', '', `<ol class="kb-prin">${prin}</ol>`)}
${sub('Boilerplate', 'Copy either one as it stands', `<div class="kb-bps">${bp(25, V.boilerplate25)}${bp(50, V.boilerplate50)}</div>`)}
${sub('Writing the name', '', `<p class="kb-body kb-in2">${A(V.nameRules)}</p>`)}`, ['applications', 'the lines at work']);
}

// ---- 3 logo: the wordmark as the main entry, set from full size down to its smallest; the versions as added copies (c. 1, c. 2 ...)
function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot', ms = L.minSize;
  const links = (id) => {
    if (slot) return '';
    const files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    return `<span class="kb-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
  };
  const full = 420, steps = [full, 300, 210, 150, 110].filter((w) => w > ms.screenPx + 16).concat(ms.screenPx);
  const fall = steps.map((w, i) => `<li${i === steps.length - 1 ? ' class="is-min"' : ''}><span class="kb-wf__k num">${w} px</span><div class="kb-wf__m">${L.html('colour', { width: w })}</div></li>`).join('');
  const stop = slot ? 'Set the smallest size once the logo is in place.' : `Smallest size: ${ms.screenPx} px wide on screen, ${ms.printMm} mm wide in print.`;
  const main = `<div class="kb-lmain"><div class="kb-lmain__t"><h3 class="kb-subh">${A(L.labels.colour)}</h3><p class="kb-subn">${A(B.logo.when.colour)}</p>${links('colour')}</div>
<ul class="kb-wfall">${fall}</ul><p class="kb-stop"><b>Stop.</b> ${A(stop)}</p></div>`;
  const others = [['mono-dark', [300, 110]], ['mono-light', [300, 110]], ['reversed', [300, 110]], ['horizontal', [380, 90]], ['stacked', [170, 140]], ['symbol', [84, 96]]];
  const copy = ([id, box], i) => {
    const w = cw[L.colourwayOf(id)], lw = fit(ctx, id, ...box);
    return `<li class="kb-copy"><div class="kb-ground${same(w.ground, ctx.roles.light.surface) ? ' is-hair' : ''}" style="background:${w.ground}">${L.html(id, { width: lw, color: w.name, label: L.labels[id] })}</div>
<p class="kb-copy__c"><span class="kb-copy__no num">c. ${i + 1}</span> <b>${A(L.labels[id])}</b></p><p class="kb-copy__w">${A(B.logo.when[id])}</p>${links(id)}</li>`;
  };
  const g = L.geo, pad = Math.round((360 * g.height / g.width) * L.clearShare / 100);
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  return sec(ctx, 'logo', A(B.logo.idea), `
${slot ? `<p class="kb-body kb-in2 kb-slotnote">This book has no logo files yet. The frames hold the place and the proportion.</p>` : ''}
${main}
${sub('Added copies', `${others.length} versions, each on the ground it is made for`, `<ol class="kb-copies">${others.map(copy).join('')}</ol>`)}
<div class="kb-two kb-two--logo">
${sub('Clear space', `Keep ${L.clearShare}% of the logo's height clear on every side.`, `<div class="kb-clear"><div class="kb-clear__z" style="padding:${pad}px"><div class="kb-clear__l">${L.html('colour', { width: 360 })}</div></div></div>`)}
${sub('Never', '', `<ol class="kb-never">${misuse.map((m, i) => `<li><span class="kb-n num">${i + 1}.</span>${A(m)}</li>`).join('')}</ol>`)}
</div>`, ['downloads', 'every version as SVG, PDF and PNG']);
}

// ---- 4 colour: the colour drawer. Each colour is a catalogue card printed on its own stock (the values as call number lines, the
// role as the subject, where it lands as the note, its text pairs as the tracings), lifted out beside a drawer of its ten ramp steps
function colour(ctx) {
  const B = ctx.brand;
  const card = (c, i, opts) => {
    const ink = inkOn(ctx, c.hex), rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    ctx.pair(ink, c.hex, { size: 12, what: `book card ink on ${c.name}` });
    const val = (k, v) => `<button type="button" class="kb-val" data-copy="${A(v)}" data-copy-label="${A(c.name)} ${k} ${A(v)}" aria-label="Copy ${k} ${A(v)}, ${A(c.name)}">${A(v)}</button>`;
    const share = c.share != null ? `, <span class="num">${Math.round(c.share * 100)}%</span> of a page` : '';
    const trace = opts.trace ? tracings(ctx, c) : '';
    return `<article class="kb-card${i === 0 ? ' kb-lift' : ''}" style="background:${c.hex};color:${ink}" aria-label="${A(c.name)}">
<p class="kb-card__no kb-mono">${val('HEX', c.hex)}${val('RGB', rgb)}${val('OKLCH', ok)}</p>
<div class="kb-card__h"><h3><button type="button" class="kb-cname" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}">${A(c.name)}</button></h3><p class="kb-card__s">${A(c.roleText || c.role)}${share}</p></div>
<p class="kb-card__n">${A(c.lands)}</p>
${trace ? `<p class="kb-card__t">${trace}</p>` : ''}
${hole(18)}</article>`;
  };
  const drawer = (c) => {
    const steps = Object.entries(c.ramp).sort((x, y) => +x[0] - +y[0]).map(([k, hx]) => {
      const base = +k === c.rampBase;
      return `<li class="kb-edge${base ? ' is-base' : ''}" style="background:${hx}"><span class="kb-sn num">${A(k)}</span>${base ? '<span class="kb-sn kb-sn--w">the colour, lifted out</span>' : ''}</li>`;
    }).join('');
    return `<div class="kb-drawer"><ol class="kb-edges" aria-label="${A(c.name)} ramp, steps 50 to 900, the colour is step ${c.rampBase}">${steps}</ol></div>`;
  };
  const tinted = ctx.colours.filter((c) => c.ramp && c.rampBase !== 50), flat = ctx.colours.filter((c) => !c.ramp || c.rampBase === 50);
  const rows = tinted.map((c) => `<li class="kb-crow">${card(c, ctx.colours.indexOf(c), { trace: true })}${drawer(c)}</li>`).join('');
  const flatRow = flat.length ? `<li class="kb-crow kb-crow--flat">${flat.map((c) => card(c, ctx.colours.indexOf(c), { trace: true })).join('')}<p class="kb-flat">${flat.map((c) => A(c.name)).join(' and ')} ${flat.length > 1 ? 'sit' : 'sits'} at step 50, the lightest step, so ${flat.length > 1 ? 'they have' : 'it has'} no tints.</p></li>` : '';
  const toneRow = ctx.tones.length ? sub('Text tones', 'Not fills', `<ol class="kb-crows">${ctx.tones.map((c, i) => `<li class="kb-crow kb-crow--flat">${card(c, i + 1, { trace: false })}</li>`).join('')}</ol>`) : '';

  // contrast: each pair a card stood edge-on in a drawer, printed in its own two colours, the brand's name set at a run of sizes
  // down to the smallest the pair passes at
  const BASE = [48, 32, 24, 16, 12];
  const strip = (p) => {
    const min = p.minSize || (p.ratio >= 4.5 ? 12 : 24), sizes = [...BASE.filter((s) => s > min), min];
    const run = sizes.map((s, k) => `<span class="kb-ws${k === sizes.length - 1 ? ' kb-ws--min' : ''}"><span class="kb-w${s >= 24 ? ' kb-w--d' : ''}" style="font-size:${s}px">${A(B.name)}</span><i class="num">${s} px</i></span>`).join('');
    const note = min >= 24 ? `Large text only. Passes from ${min} px.` : `Passes down to ${min} px.`;
    return `<li class="kb-pc" style="background:${p.bgHex};color:${p.fgHex}"><div class="kb-pl"><b class="kb-ratio num">${A(p.ratioText)} : 1</b><span class="kb-pu">${A(p.use)}</span><span class="kb-pu">${A(note)}</span></div><div class="kb-run">${run}</div></li>`;
  };
  const keys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const tones = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => `<ul class="kb-roles bk-for-${mode}">${[...keys.map(([k, n]) => [n, ctx.roles[mode][k]]), ...tones.map(([k, n]) => [n, ctx.roles[mode][k].fg])].map(([n, hx]) => `<li><button type="button" class="kb-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="kb-role__sw" style="background:${hx}" aria-hidden="true"></span><span class="kb-role__n">${A(n)}</span><span class="kb-role__h kb-mono">${hx}</span></button></li>`).join('')}</ul>`;
  return sec(ctx, 'colour', 'Each colour is a card printed on its own stock, lifted out of the drawer that holds its ramp. Click a value or a name to copy it.', `
<ol class="kb-crows">${rows}${flatRow}</ol>
${toneRow}
${sub('Contrast', 'WCAG, pair by pair', `<p class="kb-body kb-in2">Every text pair ${A(B.name)} uses, set at a run of sizes. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1. Each run stops at the smallest size its pair passes at, underlined.</p><div class="kb-pdrawer"><ol class="kb-pcs">${ctx.pairs.map(strip).join('')}</ol></div>`, 'kb-sub--pairs')}
${sub('Interface roles', 'Light and dark', `<p class="kb-body kb-in2">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}`)}`, ['downloads', 'the palette for Adobe, CSS and JSON']);
}

// ---- 5 typography: each face as a specimen, then the type scale as a catalogue entry: each part of the entry set in its own size,
// indented where a card sets it, with its spec as the note beneath
function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, L = ctx.logo, line = B.lines.primary;
  const alpha = [['Capitals', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['Lower case', 'abcdefghijklmnopqrstuvwxyz'], ['Figures', '0123456789']];
  const wf = (d, sizes) => `<ul class="kb-tfall${d ? ' kb-d' : ''}">${sizes.map((s) => `<li style="--s:${s}px"><span class="kb-wf__k num">${s} px</span><p>${A(line)}</p></li>`).join('')}</ul>`;
  const chars = (d) => `<div class="kb-chars${d ? ' kb-d' : ''}" role="img" aria-label="${A(alpha.map((a) => a[1]).join(' '))}">${alpha.map(([, s]) => `<ul aria-hidden="true">${[...s].map((ch) => `<li>${ch}</li>`).join('')}</ul>`).join('')}</div>`;
  const face = (d, f, note, sizes) => {
    const n = ctx.real(f.family).length, wts = f.weights;
    return `<div class="kb-face${d ? ' kb-face--d' : ''}"><p class="kb-face__n${d ? ' kb-d' : ''}" style="--n:${n}">${A(f.family)}</p>
<p class="kb-subn kb-in1">${note} ${wts.length > 1 ? `Weights <span class="num">${wts.join(', ')}</span>.` : `One weight, <span class="num">${wts[0]}</span>.`}</p>
<div class="kb-face__b">${sub('Size waterfall', `<span class="num">${sizes[0]}</span> px down to <span class="num">${sizes[sizes.length - 1]}</span> px`, wf(d, sizes))}
${wts.length > 1 ? sub('Weights', `${wts.length} in the family`, `<ul class="kb-weights">${wts.map((w) => `<li style="font-weight:${w}"><span class="kb-wf__k num">${w}</span><p>${A(f.family)}</p></li>`).join('')}</ul>`) : ''}
${sub('Characters', 'Capitals, lower case, figures', chars(d))}</div></div>`;
  };
  // the sample for each step of the scale: the logo for the wordmark (never retyped), the brand's lines for the display steps,
  // and the brand's own copy for the reading steps
  const shown = [B.lines.primary, ...B.lines.others];
  let di = 0;
  const sample = (s) => {
    if (s.token === 'wordmark') return `<span class="kb-sc__logo">${L.html('colour', { width: fit(ctx, 'colour', 600, s.size), label: 'Logo' })}</span>`;
    if (s.face === 'display') return A(shown[di++ % shown.length]);
    return A(s.size >= 20 ? B.lines.others[B.lines.others.length - 1] : s.size >= 16 ? T.sample.paragraph : s.size >= 13 ? B.voice.writeThis[0].write : T.sample.caption);
  };
  const ind = (s) => (s.face === 'display' ? (s.size >= 40 ? 'kb-sc--i0' : 'kb-sc--i1') : 'kb-sc--i2');
  const scale = T.scale.map((s) => `<li class="kb-sc ${ind(s)}"><p class="kb-sc__s" style="font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.weight};line-height:${s.line};--size:${s.size}px">${sample(s)}</p><p class="kb-sc__k"><b>${A(ctx.cap(s.token))}</b>, <span class="num">${s.size}</span> px, line <span class="num">${s.line}</span>, weight <span class="num">${s.weight}</span>. ${A(s.use)}.</p></li>`).join('');
  const rules = T.rules.map((r, i) => `<li><span class="kb-n num">${i + 1}</span><p class="kb-do"><b>Do.</b> ${A(r.do)}</p><p class="kb-dont"><b>Don't.</b> ${A(r.dont)}</p></li>`).join('');
  return sec(ctx, 'typography', `${A(F.display.family)} for the big line, ${A(F.body.family)} for everything you read.`, `
${face(true, F.display, 'Headlines and the wordmark, 24 px and over.', [56, 44, 32, 24])}
${face(false, F.body, 'Reading text, labels and captions.', [64, 44, 32, 24, 17, 14, 12])}
${sub(A(F.mono.family), 'And the licence', `<p class="kb-body kb-in2">${A(F.mono.family)} is for a hex, a token or a code string only. All faces are open licence (SIL OFL 1.1), free for commercial use.</p>`)}
${sub('Scale', `As ${A(B.name)} sets it: each step where it falls on an entry`, `<ol class="kb-scale">${scale}</ol>`, 'kb-sub--scale')}
${sub('Try it', 'Set your own line', `<div class="kb-tester" data-tester>
<div class="kb-tester__c"><div class="kb-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="kb-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="24" max="120" step="1" value="64" data-tester-size></div></div>
<p class="kb-tester__d" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p><p class="kb-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p></div>`)}
<div class="kb-two">
${sub('In use', 'A composed piece', `<div class="kb-use"><p class="kb-use__h">${A(T.sample.headline)}</p><p class="kb-use__p">${A(T.sample.paragraph)}</p><p class="kb-use__c">${A(T.sample.caption)}</p></div>`)}
${sub('Rules', 'Do and do not', `<ol class="kb-rules">${rules}</ol>`)}
</div>`, ['downloads', 'the type specimen and the licence']);
}

// ---- 6 imagery: the direction as the entry's notes, then the shelf list: every shot in shelf order, each on its shelf
function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const fig = (s, i) => {
    const f = s.photo ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    return `<li class="kb-shot kb-shot--${i}"><div class="kb-shot__f">${ctx.photo(s.id, { cls: 'kb-ph', pos: '50% 50%' })}</div><p class="kb-shot__c"><span class="kb-n num">${i + 1}</span><span>${s.photo ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : 'Art-directed slot: the shot, the crop and the light.'}</span>${f ? `<span class="kb-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</p></li>`;
  };
  const notes = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].map(([k, v]) => `<p class="kb-note"><b>${k}.</b> ${A(v)}</p>`).join('');
  const rules = B.imagery.rules.map((r, i) => `<li><span class="kb-n num">${i + 1}</span><p class="kb-do"><b>Do.</b> ${A(r.do)}</p><p class="kb-dont"><b>Don't.</b> ${A(r.dont)}</p></li>`).join('');
  return sec(ctx, 'imagery', A(D.subject), `
<div class="kb-notes kb-notes--two">${notes}</div>
${sub('The shelf list', `${shots.length} shots, in shelf order`, `<ol class="kb-shelf">${shots.map(fig).join('')}</ol>`, 'kb-sub--shelf')}
${sub('Rules', 'Do and do not', `<ol class="kb-rules kb-rules--two">${rules}</ol>`)}`, ['downloads', 'the direction and the photos']);
}

// ---- 7 layout: the page grid drawn large, its measures, the spacing steps as a rule at true widths, the corners and edges
function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand, m = (G.margin / G.page.w) * 100, gap = (G.gutter / (G.page.w - 2 * G.margin)) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const meas = [['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Column', `${Math.round(G.col * 10) / 10} px`], ['Base', `${G.base} px`]];
  return sec(ctx, 'layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`, `
<div class="kb-grid"><div class="kb-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="kb-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div>${hole(14)}</div>
<dl class="kb-meas">${meas.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join('')}</dl></div>
<div class="kb-two">
${sub('Spacing', 'Steps in px, at their true width', `<ul class="kb-space">${ctx.space.map((s) => `<li><span class="kb-wf__k num">${s.px} px</span><i style="width:${s.px}px"></i></li>`).join('')}</ul>`)}
${sub('Corners and edges', '', `<div class="kb-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="kb-cap">${A(r.use)}, <span class="num">${r.px}</span> px</span></div>`).join('')}</div><p class="kb-body">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p>`)}
</div>`, ['applications', 'the grid at work']);
}

// ---- 8 applications: each object at size, its spec as the note under it
function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed, ml = cw['mono-light'], R = ctx.roles.light;
  const dn = A(B.fonts.display.family), bn = A(B.fonts.body.family);
  const spec = (title, lines) => `<figcaption class="kb-spec"><b>${title}</b>${lines.map((l) => `<span>${l}</span>`).join('')}</figcaption>`;
  const front = `<div class="kb-bc kb-bc--front"><div class="kb-bc__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="kb-bc__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="kb-bc kb-bc--back"><div class="kb-bc__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="kb-bc__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div>${hole(12)}</div>`;
  const posts = `<div class="kb-posts"><div class="kb-post kb-post--sq" style="background:${R.action};color:${R.actionLabel}"><p>${A(ap.social[0])}</p><span class="kb-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="kb-post kb-post--pt is-hair" style="background:${R.surface};color:${R.text}"><p>${A(ap.social[1])}</p><span class="kb-post__lg">${L.html('colour', { width: 96, label: 'Logo' })}</span></div>
<div class="kb-post kb-post--st" style="background:${ml.ground};color:${ml.name}"><p>${A(ap.social[2])}</p><span class="kb-post__lg">${L.html('mono-light', { width: 80, color: ml.name, label: 'Logo' })}</span></div></div>`;
  // the sign's proportion and line are read off the sample text; the line shown is the brand line it names, so the slot edition keeps its placeholder
  const real = ctx.real(ap.signage), [sw, sh] = (real.match(/(\d+) x (\d+)/) || [0, 594, 841]).slice(1).map(Number);
  const said = real.slice(real.indexOf(': ') + 2), lines = [B.lines.primary, ...B.lines.others], signLine = lines.find((l) => ctx.real(l) === said) || B.lines.others[0];
  const sign = `<figure class="kb-fig kb-fig--sign"><div class="kb-poster" style="aspect-ratio:${sw}/${sh}"><p>${A(signLine)}</p><span class="kb-poster__lg">${L.html('colour', { width: 150, label: 'Logo' })}</span></div>${spec('Shop window sign', [A(ap.signage), `${dn} 40 px for the line`])}</figure>`;
  const email = `<figure class="kb-fig"><div class="kb-email"><p class="kb-email__n">${A(ap.email.person)}</p><p class="kb-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="kb-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="kb-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>${spec('Email signature', [`${bn} 17 px for the name`, `${bn} 15 px for the rest`])}</figure>`;
  const screen = `<figure class="kb-fig kb-fig--screen"><div class="kb-device"><div class="ui kb-screen" role="img" aria-label="${A(B.name)} product screen: ${A(S.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="kb-scr__top"><span class="ui-num kb-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('pre-order')}</div>
<p class="ui-display kb-scr__eta">${A(S.eta)}</p><p class="kb-scr__note">${A(S.pickup)}</p>
<ul class="ui-list">${S.deliveries.slice(0, 3).map((d) => ctx.ui.row({ lead: ctx.ui.icon('book-open', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul></div></div>${spec('Product screen', ['390 px wide', `${dn} 32 px on the screen`, `${bn} 14 px for its notes`])}</figure>`;
  return sec(ctx, 'applications', 'The brand at work: a card, a feed, a shop window, an inbox and the product itself.', `
<figure class="kb-fig kb-fig--cards"><div class="kb-bcs">${front}${back}</div>${spec('Business card', ['90 by 55 mm', `${dn} 24 px for the name`, `${bn} 13 px for the rest`])}</figure>
<figure class="kb-fig kb-fig--posts">${posts}${spec('Social', ['Square, portrait, story', `${dn} 30, 26 and 24 px`, 'A line from the voice'])}</figure>
<div class="kb-objs">${sign}${screen}${email}</div>`, ['logo', 'which version goes on which ground']);
}

// ---- 9 downloads: the cabinet. Each folder is a drawer, its label in the holder; pulled out, its files run as call numbers
// (the file name), each with its collation line (format and size) and the link
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const file = (f) => `<li class="kb-file"><span class="kb-file__n kb-mono">${A(f.name)}</span><span class="kb-file__c num">${A(f.ext)}, ${A(f.sizeText)}</span><a class="kb-get" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const list = (fs) => `<ul class="kb-files">${fs.map(file).join('')}</ul>`;
  const logoRows = slot ? list(D.logoFiles) : `<ul class="kb-files">${L.versions.map((id) => {
    const f = D.logo(id), sizes = f.png.map((p) => `<a class="kb-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join('');
    return `<li class="kb-file kb-file--logo"><span class="kb-file__n">${A(L.labels[id])}</span><span class="kb-file__c num">SVG, ${A(f.svg.sizeText)}</span><span class="kb-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="kb-pngs" role="group" aria-label="PNG widths in pixels"><span class="kb-cap">PNG</span>${sizes}</span></span></li>`;
  }).join('')}</ul>`;
  const icons = `<ul class="kb-icons">${D.icons.map((f) => `<li><a class="kb-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span class="kb-icon__n">${A(f.name.replace('.svg', ''))}</span><span class="kb-cap num">${A(f.sizeText)}</span></a></li>`).join('')}</ul>${list([D.iconsLicence])}`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const drw = (n, name, desc, inner) => `<section class="kb-drw" aria-labelledby="fam-${n}"><div class="kb-drw__f"><span class="kb-holder"><i class="kb-screw"></i><h3 class="kb-label" id="fam-${n}"><b class="num">${n}</b> ${A(name)} <span class="kb-range">${A(desc)}</span></h3><i class="kb-screw"></i></span>${pull}</div><div class="kb-drw__in">${inner}</div></section>`;
  return sec(ctx, 'downloads', 'Everything in the brand kit, drawer by drawer. The zip holds all of it.', `
<div class="kb-zip"><div><p class="kb-zip__n kb-mono">${A(D.zip.name)}</p><p class="kb-cap">Every drawer below. <span class="num">${A(D.zip.sizeText)}</span>.</p></div><a class="kb-btn kb-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
<div class="kb-cab">
${drw(1, 'Read me', 'Start here', list([D.readmePdf, D.readme].filter(Boolean)))}
${drw(2, 'Logo', slot ? 'The slot frame' : 'SVG, PDF and PNG', logoRows)}
${drw(3, 'Colour', 'Adobe, CSS, JSON', list(D.colour))}
${drw(4, 'Type', 'Specimen and licence', list(D.type))}
${drw(5, 'Icons', `${D.icons.length} icons`, icons)}
${drw(6, 'Imagery', 'Direction and photos', list([...pdfs, ...photos]))}
<span class="kb-plinth"></span></div>`, null);
}

// the one moment: the first colour card sits in its drawer until the drawer scrolls into view, then lifts out 16 px, once.
// Without script, or under reduced motion, it is simply shown lifted.
const MOMENT = `<script>(function(){var c=document.querySelector('.kb-lift');if(!c||!('IntersectionObserver' in window)||!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(c.getBoundingClientRect().top<window.innerHeight)return;c.classList.add('is-set');var io=new IntersectionObserver(function(e){if(!e[0].isIntersecting)return;io.disconnect();window.requestAnimationFrame(function(){c.classList.remove('is-set');});},{threshold:0.6});io.observe(c);})();</script>`;

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n') + MOMENT;
}
