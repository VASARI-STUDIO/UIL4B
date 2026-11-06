// Brand book markup for theme 09 (Blueprint): nine sheets of a drawing set. Each sheet is ruled and framed, opens on one big
// Commissioner line with a Brick redline that prints its size, and closes on a title block. Colour is a finishes schedule keyed
// to a drawn house front, type is a lettering sheet on drawn guides, the logo is a sheet of lettered details, downloads are a
// drawing register. Brick is for redlines, key tags and the one action.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour.
// Copy, the type tester and the downloads read data attributes the engine script understands: data-copy, data-tester-*.
import { A, fit } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the readable text colour on a brand colour: the better of the light-mode text and surface colours, checked
const onColour = (ctx, hex) => {
  const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface;
  ctx.pair(pick, hex, { size: 13, what: `book swatch ${hex}` }); return pick;
};
// a colour that matches the page ground or a card needs an edge
const hairlineOn = (ctx, hex) => [ctx.roles.light.surface, ctx.roles.light.raised].some((x) => x.toLowerCase() === hex.toLowerCase());

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
// a key bubble, as on a drawing: a Brick ring with a tag in it
const bub = (t) => `<span class="bk-bub">${A(t)}</span>`;
// the section opener: the one big line with a redline that prints its size (the size is set in css-book.js)
const head = (id, title, lead) => `<div class="bk-head"><div class="bk-ht"><i class="bk-rl" aria-hidden="true"><b></b></i><h2 class="disp" id="h-${id}">${A(title)}</h2></div>${lead ? `<p class="bk-lead">${lead}</p>` : ''}</div>`;
const sub = (t) => `<h3 class="bk-h3">${A(t)}</h3>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
const rulesList = (rules, two = false) => `<ul class="bk-rules${two ? ' bk-rules--2' : ''}">${rules.map((r) => `<li><p class="bk-do"><b>Do</b>${A(r.do)}</p><p class="bk-dont"><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul>`;
// every sheet after the cover closes on a title block: project, sheet, number, scale, issue
const tbk = (ctx, title, n) => `<div class="bk-tbk" role="group" aria-label="Title block"><div><span class="bk-k">Project</span>${A(ctx.brand.name)} brand book</div><div><span class="bk-k">Sheet</span>${A(title)}</div><div><span class="bk-k">Number</span><span class="num">${n} of 9</span></div><div><span class="bk-k">Scale</span>1×</div><div><span class="bk-k">Issue</span>${A(ctx.versionLine)}</div></div>`;
const sec = (ctx, id, cls, inner, n, title) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}${n > 1 ? tbk(ctx, title, n) : ''}</section>`;
// a dimension line: the label names the length the line draws
const dimH = (label, cls = '', style = '') => `<div class="bk-dim bk-dim--h ${cls}" style="${style}"><span>${A(label)}</span></div>`;
const dimV = (label, cls = '', style = '') => `<div class="bk-dim bk-dim--v ${cls}" style="${style}"><span>${A(label)}</span></div>`;
// a framed detail: the drawing, then a ruled strip with its bubble, title and note
const fig = (tag, title, body, note = '', cls = '') => `<figure class="bk-fig ${cls}"><div class="bk-fig__d">${body}</div><figcaption class="bk-fig__tb">${bub(tag)}<h3 class="bk-h3">${A(title)}</h3>${note ? `<span class="bk-cap">${note}</span>` : ''}</figcaption></figure>`;
const px1 = (n) => String(Math.round(n * 10) / 10);

const SHEETS = ['Overview', 'Voice', 'Logo', 'Colour', 'Typography', 'Imagery', 'Layout', 'Applications', 'Downloads'];

function overview(ctx) {
  const B = ctx.brand;
  const [l1, l2] = B.lines.primary.split(/(?<=\.)\s+/);
  return sec(ctx, 'overview', 'bk-sec--overview', `
<div class="bk-hero">
<h1 class="disp" id="h-overview"><span class="bk-hl"><i class="bk-rl" aria-hidden="true"><b></b></i>${A(l1)}</span><span class="bk-hl"><i class="bk-rl" aria-hidden="true"><b></b></i>${A(l2 || '')}</span></h1>
<p class="bk-hero__lead">${A(B.lines.others[0] || '')}</p>
</div>
<div class="bk-tb">
<div class="bk-tb__l">
<div class="bk-cell"><span class="bk-k">Drawing</span><span class="bk-big">Brand book</span></div>
<div class="bk-cell"><span class="bk-k">Project</span>${A(B.name)}, renovation builders, ${A(B.city)}</div>
<div class="bk-cell"><span class="bk-k">Scale</span>1×. Every redline prints the size as drawn.</div>
<div class="bk-cell"><span class="bk-k">Issue</span>${A(ctx.versionLine)}</div>
</div>
<div class="bk-tb__r"><span class="bk-k">Sheets</span><ol class="bk-sheets">${SHEETS.map((s, i) => `<li><a href="#${s.toLowerCase()}"><span class="num">${i + 1}</span>${A(s)}</a></li>`).join('')}</ol></div>
</div>
<div class="bk-two">
<p class="bk-lead">${A(B.description)}</p>
<div class="bk-stack"><div>${sub('What it does')}<p class="bk-body">${A(B.product)}</p></div><div>${sub('Who it serves')}<p class="bk-body">${A(B.audience)}</p></div></div>
</div>
<ol class="bk-traits">${B.personality.map((p, i) => `<li>${bub(String(i + 1))}<div><p class="bk-trait">${A(p.trait)}</p><p class="bk-body">${A(p.means)}</p></div></li>`).join('')}</ol>`, 1, 'Overview');
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const lines = [B.lines.primary, ...B.lines.others];
  return sec(ctx, 'voice', 'bk-sec--voice', `
${head('voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
<ol class="bk-principles">${V.principles.map((p, i) => `<li>${bub(String(i + 1))}<div><p class="bk-pt">${A(p.title)}</p><p class="bk-pe">${A(p.example)}</p></div></li>`).join('')}</ol>
<div class="bk-block">${sub('Lines in use')}<ul class="bk-lines">${lines.map((l) => `<li>${A(l)}</li>`).join('')}</ul></div>
<div class="bk-block">${sub('Write this, not that')}
<div class="bk-wtn" role="table" aria-label="Write this, not that">
<div class="bk-wtn__h" role="row"><span role="columnheader">Rev</span><span role="columnheader">Not that</span><span role="columnheader">Write this</span><span role="columnheader">Because</span></div>
${V.writeThis.map((r, i) => `<div class="bk-wtn__r" role="row"><span role="cell" class="r">${bub('R' + (i + 1))}</span><p role="cell" class="n">${A(r.not)}</p><p role="cell" class="w">${A(r.write)}</p><p role="cell" class="b">${A(r.because)}</p></div>`).join('')}
</div></div>
<div class="bk-block bk-two bk-two--even bk-notes">
<div>${sub('The brand in 25 words')}<p class="bk-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>
<div>${sub('The brand in 50 words')}<p class="bk-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>
</div>
<div class="bk-block">${sub('Writing the name')}<p class="bk-body bk-measure">${A(V.nameRules)}</p></div>`, 2, 'Voice');
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const cells = [['colour', [240, 120]], ['mono-dark', [190, 80]], ['mono-light', [190, 80]], ['reversed', [190, 80]], ['symbol', [60, 120]], ['horizontal', [270, 70]], ['stacked', [150, 120]]];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
  const tile = ([id, box], i) => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    return `<figure class="bk-tile bk-tile--${id}"><div class="bk-ground${hairlineOn(ctx, w.ground) ? ' is-hair' : ''}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div><figcaption class="bk-capt">${bub(letters[i])}<span><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</span>${links}</figcaption></figure>`;
  };
  // clear space: x is the cap height, drawn at 180 px wide so the printed number is the padding as built
  const W = 180, g = L.geo, x = Math.round((W * g.cap) / g.width), ms = L.minSize;
  const clear = `<figure class="bk-tile bk-tile--clear"><div class="bk-ground bk-ground--draw"><div class="bk-cs"><div class="bk-cs__box">${dimH('x', '', `width:${x}px`)}${dimV('x', '', `height:${x}px`)}<div class="bk-clear" style="padding:${x}px">${L.html('colour', { width: W })}</div></div></div></div><figcaption class="bk-capt">${bub(letters[7])}<span><b>Clear space</b>x is the cap height of the name, ${x} px at this size. Keep x clear on every side.</span></figcaption></figure>`;
  const min = `<figure class="bk-tile bk-tile--min"><div class="bk-ground bk-ground--draw">${slot
    ? ''
    : `<div class="bk-min__box"><div class="bk-min__logo">${L.html('colour', { width: ms.screenPx })}</div>${dimH(`${ms.screenPx} px`, 'bk-min__d', `width:${ms.screenPx}px`)}</div>`}</div><figcaption class="bk-capt">${bub(letters[8])}<span><b>Smallest size</b>${slot ? 'Set the smallest size once the logo is in place. Below that size the plumb line and the name stop reading as one mark.' : `${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.`}</span></figcaption></figure>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not tilt it. The line is plumb.', 'Do not draw the plumb line without the name.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const dlSlot = slot ? `<p class="bk-body bk-measure bk-slotnote">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  return sec(ctx, 'logo', 'bk-sec--logo', `
${head('logo', 'Logo', A(B.logo.idea))}
<div class="bk-zone">${cells.map(tile).join('')}${clear}${min}</div>${dlSlot}
<div class="bk-block">${sub('Never')}<ul class="bk-never">${misuse.map((m) => `<li>${A(m)}</li>`).join('')}</ul></div>`, 3, 'Logo');
}

// the finishes elevation: a house front in line, each finish tagged where it would go. Strokes use the fixed Bluestone and
// the drawing ground stays Plaster in dark mode, so the line work reads in both. Tags are HTML bubbles over the drawing so they
// stay a readable size when the drawing scales down; leaders and the drawing are SVG.
function elevation(ctx) {
  const col = (id, i) => ctx.byId[id] || ctx.colours[i];
  const plaster = col('plaster', 0), white = col('white', 1), stone = col('bluestone', 2), brick = col('brick', 3), timber = col('timber', 4);
  const tag = (c) => `C${ctx.colours.findIndex((x) => x.id === c.id) + 1}`;
  const lines = []; for (let y = 184; y < 322; y += 12) lines.push(`M130 ${y}H830`);
  const brickLines = []; for (let y = 74; y < 130; y += 8) brickLines.push(`M640 ${y}H696`);
  // [colour, bubble x, bubble y, point x, point y] in drawing units (960 x 400)
  const pts = [[plaster, 60, 252, 146, 252], [stone, 60, 336, 150, 337], [stone, 170, 70, 300, 132], [brick, 800, 56, 668, 84], [timber, 480, 384, 480, 290], [white, 900, 200, 756, 250]];
  const leaders = pts.map(([, bx, by, px, py]) => `<path class="bk-lead-l" d="M${bx} ${by}L${px} ${py}"/><circle class="bk-lead-d" cx="${px}" cy="${py}" r="3.5"/>`).join('');
  const bubbles = pts.map(([c, bx, by]) => `<span class="bk-bub bk-bub--abs" style="left:${(bx / 9.6).toFixed(2)}%;top:${(by / 4).toFixed(2)}%">${tag(c)}</span>`).join('');
  const svg = `<svg viewBox="0 0 960 400" role="img" aria-label="A house front in line, tagged by finish: ${ctx.colours.map((c, i) => `C${i + 1} ${c.name}`).join(', ')}." preserveAspectRatio="xMidYMid meet">
<path class="bk-el-hair" d="M40 350H920M60 358L52 366M110 358L102 366M160 358L152 366M210 358L202 366M260 358L252 366M310 358L302 366M360 358L352 366M410 358L402 366M460 358L452 366M510 358L502 366M560 358L552 366M610 358L602 366M660 358L652 366M710 358L702 366M760 358L752 366M810 358L802 366M860 358L852 366M910 358L902 366"/>
<rect class="bk-el" x="640" y="62" width="56" height="86" fill="${brick.hex}"/><path class="bk-el-m" d="${brickLines.join('')}"/>
<rect class="bk-el" x="634" y="56" width="68" height="10" fill="${brick.hex}"/>
<rect class="bk-el" x="130" y="170" width="700" height="152" fill="${plaster.hex}"/><path class="bk-el-hair" d="${lines.join('')}"/>
<polygon class="bk-el" points="100,172 480,50 860,172" fill="${stone.hex}"/>
<rect class="bk-el" x="120" y="322" width="720" height="28" fill="${stone.hex}"/>
<rect class="bk-el" x="190" y="214" width="130" height="76" fill="${white.hex}"/><path class="bk-el-m" d="M255 214V290M190 252H320"/>
<rect class="bk-el" x="640" y="214" width="130" height="76" fill="${white.hex}"/><path class="bk-el-m" d="M705 214V290M640 252H770"/>
<rect class="bk-el" x="450" y="96" width="60" height="46" fill="${white.hex}"/><path class="bk-el-m" d="M480 96V142"/>
<rect class="bk-el" x="440" y="224" width="80" height="98" fill="${timber.hex}"/><path class="bk-el-m" d="M450 236H510V270H450ZM450 282H510V312H450Z"/><circle class="bk-el-d" cx="508" cy="274" r="3"/>
<rect class="bk-el" x="424" y="322" width="112" height="10" fill="${stone.hex}"/>
${leaders}</svg>`;
  return `<div class="bk-elev">${svg}${bubbles}</div>`;
}

function colour(ctx) {
  const B = ctx.brand;
  const steps = (c) => Object.keys(c.ramp);
  const ramp = (c) => `<div class="bk-ramp"><span class="bk-cap">Ramp</span><span class="bk-ramp__s" role="img" aria-label="${A(c.name)} ramp, ${steps(c).length} steps from ${steps(c)[0]} to ${steps(c).slice(-1)[0]}, base ${A(String(c.rampBase))}">${steps(c).map((k) => `<i class="${String(k) === String(c.rampBase) ? 'is-base ' : ''}${hairlineOn(ctx, c.ramp[k]) ? 'is-hair' : ''}" style="background:${c.ramp[k]}"></i>`).join('')}</span><span class="bk-cap num">${steps(c)[0]} to ${steps(c).slice(-1)[0]}, base ${A(String(c.rampBase))}</span></div>`;
  const row = (c, key, withSw, withRamp) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    const fg = withSw ? onColour(ctx, c.hex) : '';
    const sw = withSw
      ? `<button type="button" class="bk-sw${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex};color:${fg}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="bk-sw__share">${Math.round(c.share * 100)}%</span></button>`
      : `<span class="bk-chip${hairlineOn(ctx, c.hex) ? ' is-hair' : ''}" style="background:${c.hex}" aria-hidden="true"></span>`;
    return `<li class="bk-crow"><span class="bk-key">${bub(key)}</span>${sw}<div class="bk-cinfo"><p class="bk-cname">${A(c.name)}</p><p class="bk-clands">${A(c.lands)}</p></div><dl class="bk-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><div class="bk-copies">${copyBtn('Copy', c.hex, `${c.name} HEX`)}${copyBtn('Copy', rgb, `${c.name} RGB`)}${copyBtn('Copy', ok, `${c.name} OKLCH`)}</div>${withRamp ? ramp(c) : ''}</li>`;
  };
  const sched = (cols, head1) => `<div class="bk-sched"><div class="bk-sched__h" aria-hidden="true"><span>Key</span><span>Swatch</span><span>Finish and use</span><span>Value</span></div><ul class="bk-clist">${cols}</ul></div>`;
  const pair = (p, i) => `<li class="bk-pairc"><div class="bk-dim bk-dim--h"><span class="num">${A(p.ratioText)} : 1</span></div><div class="bk-pair${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}${p.large ? ' is-large' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><span class="bk-pair__u">${A(p.use)}</span>${p.large ? '' : '<span class="bk-pair__n">Any size</span>'}</div></li>`;
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode];
    const items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${items.map(([n, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  return sec(ctx, 'colour', 'bk-sec--colour', `
${head('colour', 'Colour', 'A finishes schedule. Each key tag on the drawing is a row below it. Click a swatch to copy its HEX, and the percentage on it is its share of a page.')}
${fig('1', 'Finishes elevation', elevation(ctx), 'Drawn as a house front so every finish has a place. Where the colour lands in the brand is in the schedule.', 'bk-fig--elev')}
<div class="bk-block">${sub('Finishes schedule')}${sched(ctx.colours.map((c, i) => row(c, `C${i + 1}`, true, true)).join(''))}</div>
<div class="bk-block">${sub('Text tones')}${sched(ctx.tones.map((c, i) => row(c, `T${i + 1}`, false, false)).join(''))}</div>
<div class="bk-block">${sub('Contrast, pair by pair')}<p class="bk-body bk-measure">Every text pair ${A(B.name)} uses, redlined with its WCAG ratio. Text needs 4.5 : 1. Type at 24&nbsp;px and over needs 3&nbsp;:&nbsp;1.</p><ul class="bk-pairs">${ctx.pairs.map(pair).join('')}</ul></div>
<div class="bk-block">${sub('Interface roles')}<p class="bk-body bk-measure">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>`, 4, 'Colour');
}

// vertical metrics of a face in em, read from the font file: the lettering guides sit where the type really sits
const metrics = (ctx, role, weight) => {
  const f = ctx.faces.find((x) => x.role === role && x.weight === weight && x.style !== 'italic') || ctx.faces.find((x) => x.role === role);
  const font = ctx.loadFont(f.stem), u = font.unitsPerEm, h = font.tables.hhea, o = font.tables.os2;
  return { asc: h.ascender / u, desc: -h.descender / u, cap: o.sCapHeight / u, xh: o.sxHeight / u };
};
// a lettering frame: a line box of the given leading with the cap line, x line and baseline drawn, and redline dimensions
// (cap height, x-height, and the line) whose printed numbers are px at the size set. Guides are in em so they scale with the type.
function lettering(m, { size, lh, text, style, lab = false, big = false }) {
  const base = (lh - (m.asc + m.desc)) / 2 + m.asc, capY = base - m.cap, xY = base - m.xh;
  const capPx = px1(size * m.cap), xPx = px1(size * m.xh), lhPx = px1(size * lh);
  const label = (v, side) => (lab ? `<b class="bk-vl bk-vl--${side}">${v}</b>` : '');
  return `<div class="bk-lf${big ? ' bk-lf--big' : ''}" style="--fs:${size}px">
${big ? `<i class="bk-g bk-g--c" style="top:${capY.toFixed(4)}em"></i><i class="bk-g bk-g--x" style="top:${xY.toFixed(4)}em"></i><i class="bk-g bk-g--b" style="top:${base.toFixed(4)}em"></i>` : ""}
<i class="bk-vd bk-vd--c" style="top:${capY.toFixed(4)}em;height:${m.cap.toFixed(4)}em">${label(capPx, 'l')}</i><i class="bk-vd bk-vd--x" style="top:${xY.toFixed(4)}em;height:${m.xh.toFixed(4)}em">${label(xPx, 'l')}</i>
${big ? '' : `<i class="bk-vd bk-vd--l" style="top:0;height:${lh}em"></i>`}
<p class="bk-lf__t" style="${style};line-height:${lh}${big ? "" : `;--cy:${capY.toFixed(4)};--xy:${xY.toFixed(4)};--by:${base.toFixed(4)};--lh:${lh}${size <= 24 ? ";--gc:var(--bk-hair)" : ""}`}" ${big ? 'aria-hidden="true"' : ''}>${text}</p></div>`;
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  const dm = metrics(ctx, 'display', F.display.weights[F.display.weights.length - 1]), bm = metrics(ctx, 'body', 500);
  const face = (cls, f, m, weight, note, style) => `<div class="bk-face"><div class="bk-face__fr">${lettering(m, { size: 168, lh: 1, text: 'Aa', style: `font-family:${cls ? 'var(--display)' : 'var(--body)'};font-weight:${weight}${cls ? ';letter-spacing:-0.01em' : ''}`, lab: true, big: true })}</div><p class="bk-face__n">${A(f.family)}</p><p class="bk-cap">${note} Weights ${wlist(f)}.</p><p class="bk-face__al" style="${style}">${alpha}</p></div>`;
  const scaleRows = T.scale.map((s) => {
    const d = s.face === 'display', m = d ? dm : bm;
    const fam = d ? 'var(--display)' : 'var(--body)';
    const dims = `<p class="bk-cap num"><span class="bk-rv">${px1(s.size * m.cap)}</span> px cap height</p><p class="bk-cap num"><span class="bk-rv">${px1(s.size * m.xh)}</span> px x-height</p><p class="bk-cap num"><span class="bk-rv">${px1(s.size * s.line)}</span> px line</p>`;
    return `<li class="bk-scale"><div class="bk-scale__m"><p class="bk-scale__t">${A(ctx.cap(s.token))}</p><p class="bk-cap num">${s.size} px, line ${s.line}, weight ${s.weight}</p><p class="bk-cap">${A(s.use)}</p><div class="bk-scale__d">${dims}</div></div>${lettering(m, { size: s.size, lh: s.line, text: A(T.sample.headline), style: `font-family:${fam};font-weight:${s.weight};letter-spacing:${d ? '-0.01em' : '0'}` })}</li>`;
  }).join('');
  return sec(ctx, 'typography', 'bk-sec--type', `
${head('typography', 'Typography', 'One face, two jobs: weight 800 for the big line, 400 and 500 for everything you read.')}
<div class="bk-faces">${face('disp', F.display, dm, 800, 'For headlines, prices and the wordmark.', 'font-family:var(--display);font-weight:800;letter-spacing:-0.01em')}${face('', F.body, bm, 500, 'For reading text, labels and captions.', 'font-family:var(--body)')}</div>
<p class="bk-cap bk-measure">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p>
<div class="bk-block">${sub('Scale')}<p class="bk-cap bk-legend">Lettering guides run under every line: solid is the baseline, dashed are the x-height and cap height. Redlines mark the first line and print its true size in px.</p><ul class="bk-scales">${scaleRows}</ul></div>
<div class="bk-block bk-tester" data-tester>
${sub('Try it')}
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>
<div class="bk-block">${sub('In use')}<div class="bk-inuse"><p class="bk-use__h disp">${A(T.sample.headline)}</p><div><p class="bk-use__p">${A(T.sample.paragraph)}</p><p class="bk-cap">${A(T.sample.caption)}</p></div></div></div>
<div class="bk-block">${sub('Rules')}${rulesList(T.rules, true)}</div>`, 5, 'Typography');
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dirRows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const figs = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : `Shot ${i + 1}, ${['3 : 2', '3 : 4', '1 : 1', '3 : 2', '4 : 3', '4 : 3'][i] || ''}. Art-directed slot.`;
    return `<figure class="bk-shot bk-shot--${i}"><div class="bk-shot__f">${ctx.photo(s.id, { cls: 'bk-ph', pos: '50% 50%' })}</div><figcaption class="bk-capt">${bub(String(i + 1))}<span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  return sec(ctx, 'imagery', 'bk-sec--imagery', `
${head('imagery', 'Imagery', A(D.subject))}
<dl class="bk-dir">${dirRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="bk-shots">${shots.map(figs).join('')}</div>
<div class="bk-block">${sub('Rules')}${rulesList(B.imagery.rules)}</div>`, 6, 'Imagery');
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const pc = (n) => ((n / G.page.w) * 100).toFixed(3);
  // three redlines above the page, one row each, at the page's own proportion: margin, one column, one gutter
  const seg = (row, left, w, label) => `<div class="bk-gd" style="top:${row * 30}px;left:${left}%;width:${w}%"><div class="bk-dim bk-dim--h"><span class="num">${label}</span></div></div>`;
  const gdims = `<div class="bk-gdims" style="height:90px" role="img" aria-label="Redlines: margin ${G.margin} pixels, column ${col} pixels, gutter ${G.gutter} pixels">${seg(0, 0, pc(G.margin), G.margin)}${seg(1, pc(G.margin), pc(G.col), col)}${seg(2, pc(G.margin + G.col), pc(G.gutter), G.gutter)}</div>`;
  return sec(ctx, 'layout', 'bk-sec--layout', `
${head('layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
<div class="bk-gridfig"><div class="bk-gridfig__d">${gdims}<div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></div></div>
<div class="bk-gridfig__r"><dl class="bk-meas"><div><dt>Margin</dt><dd class="num">${G.margin} px</dd></div><div><dt>Gutter</dt><dd class="num">${G.gutter} px</dd></div><div><dt>Column</dt><dd class="num">${col} px</dd></div><div><dt>Base</dt><dd class="num">${G.base} px</dd></div></dl>
<div class="bk-details">
<div>${bub('A')}${sub('Spacing')}<ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul></div>
<div>${bub('B')}${sub('Corners and edges')}<div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}</div><p class="bk-body">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p></div>
</div></div></div>`, 7, 'Layout');
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, S = B.ui.screen.content, cw = B.logo.colourways, rev = cw.reversed, tim = cw['on-timber'], pl = cw.colour;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 28, 56), label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const cards = `<div class="bk-cards"><div class="bk-cardfig">${dimH('90 mm')}${front}</div><div class="bk-cardfig bk-cardfig--v"><div>${dimH('90 mm')}${back}</div>${dimV('55 mm')}</div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq is-hair" style="background:${pl.ground};color:${pl.name}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('colour', { width: 96, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st" style="background:${tim.ground};color:${tim.name}"><p class="bk-post__fig">${A(ap.social[2])}</p><span class="bk-post__lg">${L.html('colour', { colourway: 'on-timber', width: 96, color: tim.name, label: 'Logo' })}</span></div>
</div>`;
  const [signSize, signLine] = ap.signage.split(': ');
  const sign = `<div class="bk-sign"><div class="bk-sign__row"><div class="bk-sign__main">${dimH('2400 mm')}<div class="bk-hoard" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(signLine || B.lines.others[0])}</p><div class="bk-hoard__logo">${L.html('reversed', { width: 220, color: rev.name, label: 'Logo' })}</div></div></div>${dimV('1200 mm', 'bk-sign__v')}</div></div>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const rows = S.deliveries.slice(0, 3);
  const screen = `<div class="bk-device"><div class="ui bk-screen" role="img" aria-label="${A(B.name)} product screen: ${A(B.ui.screen.title)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="bk-scr__top"><span class="ui-num bk-scr__time">${A(S.time)}</span>${ctx.ui.statusChip('booked')}</div>
<p class="ui-display bk-scr__eta">${A(S.eta)}</p><p class="bk-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="bk-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon('ruler', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  return sec(ctx, 'applications', 'bk-sec--apps', `
${head('applications', 'Applications', 'The brand at work: a card, a feed, a site hoarding, an inbox and the product itself.')}
<div class="bk-drawings">
${fig('A', 'Business card', cards, 'Front and back, as printed.', 'bk-fig--wide')}
${fig('B', 'Social', social, '', 'bk-fig--wide')}
${fig('C', 'Site hoarding', sign, `${A(signSize.replace(/ x /g, ' × '))}. Bluestone ground, Plaster name, Timber plumb line.`, 'bk-fig--c')}
${fig('D', 'Email signature', email, '', 'bk-fig--d')}
${fig('E', 'Product screen', screen, '', 'bk-fig--e')}
</div>`, 8, 'Applications');
}

function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  // the register: one block per folder (a sheet), one row per file (a sheet item). The revision is the kit's issue.
  const fileRow = (no, f, note = '') => `<li class="bk-file"><span class="bk-no num">${no}</span><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) : ''}</span><span class="bk-cap num">${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  const group = (code, title, what, exts, inner) => `<section class="bk-fgroup" aria-label="${A(title)}"><div class="bk-fgroup__h"><span class="bk-no num">${code}</span><div>${sub(title)}<p class="bk-cap">${A(what)}</p></div><span class="bk-cap">${A(ctx.versionLine)}</span><span class="bk-cap">${A([...new Set(exts)].join(', '))}</span><span></span></div>${inner}</section>`;
  const list = (code, files, notes = []) => `<ul class="bk-files">${files.map((f, i) => fileRow(`${code}.${i + 1}`, f, notes[i] || '')).join('')}</ul>`;
  const logoRows = slot
    ? list('D-2', D.logoFiles)
    : `<ul class="bk-files">${L.versions.map((id, i) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-no num">D-2.${i + 1}</span><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files">${fileRow('D-5.1', D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  const readme = [D.readmePdf, D.readme].filter(Boolean), imagery = [...pdfs, ...photos];
  const logoExts = slot ? D.logoFiles.map((f) => f.ext) : ['SVG', 'PDF', 'PNG'];
  return sec(ctx, 'downloads', 'bk-sec--down', `
${head('downloads', 'Downloads', 'Everything in the brand kit, folder by folder. The zip holds all of it.')}
<div class="bk-zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
<div class="bk-reg">
<div class="bk-reg__h" aria-hidden="true"><span>Sheet</span><span>Title</span><span>Revision</span><span>Format</span><span></span></div>
${group('D-1', 'Read me', 'Start here: what is in the kit and how to use it.', readme.map((f) => f.ext), list('D-1', readme))}
${group('D-2', 'Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoExts, logoRows)}
${group('D-3', 'Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', D.colour.map((f) => f.ext), list('D-3', D.colour))}
${group('D-4', 'Type', 'The specimen sheet, and the faces with their links and licence.', D.type.map((f) => f.ext), list('D-4', D.type))}
${group('D-5', 'Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, ['SVG'], `<div>${icons}</div>`)}
${group('D-6', 'Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', imagery.map((f) => f.ext), list('D-6', imagery))}
</div>`, 9, 'Downloads');
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
