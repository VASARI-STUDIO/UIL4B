// Brand kit PDFs for theme 10, In use: the 2-page read-me, the palette sheet, the type specimen and the photography sheets.
// Pages are 794 x 1123 .pg sheets in the guidelines frame (running head with "n of N", a title, the work). The brand's own idea
// carries through: numbered circles sit on the thing and beside its note. Styles are in css-bookkit.js, classes start k-. Every value comes from ctx.
import { A, mk, phoneToday } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const onColour = (ctx, hex) => { const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface; ctx.pair(pick, hex, { size: 13, what: `kit swatch ${hex}` }); return pick; };
const hair = (ctx, hex) => (hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '');
const firstSentence = (s) => (s.match(/^.*?[.!?](?=\s|$)/) || [s])[0];
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

// a kit page: running head with "n of N", a title, then the work
function page(ctx, id, { title, lead = '', inner, no, of, cls = '', big = false }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand kit</span><span class="fo">${no} of ${of}</span></div>`;
  const ttl = big ? `<h1 class="disp k-big">${A(title)}</h1>` : `<h1 class="ttl">${A(title)}</h1>`;
  return `<section class="pg pg--std pg--k ${cls}" data-page="${id}">${head}${ttl}${lead ? `<p class="k-lead">${A(lead)}</p>` : ''}${inner}</section>`;
}

// the Today screen from helpers.js, with the lesson notes, two rows and the one Lane button added so the whole phone is in use
function screen(ctx) {
  const S = ctx.brand.ui.screen.content;
  const extra = `<p class="k-ph__p">${A(S.pickup)}</p><div class="k-ph__r"><span>${A(S.deliverToLabel)}</span><span>${A(S.deliverTo)}</span></div><div class="k-ph__r"><span>${A(S.paidLabel)}</span><span class="num">${A(S.paid)}</span></div>`;
  const foot = `<div class="k-ph__foot"><span class="k-ph__btn">${A(S.share)}</span></div>`;
  return phoneToday(ctx, 'left:0;top:0').replace(/<\/div><\/div>$/, `${extra}</div>${foot}</div>`);
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', f = B.fonts, S = B.ui.screen.content;
  const folders = [
    ['Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.'],
  ];
  const p1 = page(ctx, 'read-me-1', {
    title: `${B.name} brand kit`, big: true, no: 1, of: 2, cls: 'k-1',
    lead: `${B.description} ${ctx.versionLine}.`,
    inner: `<i class="k-stripe"></i>
<section class="k-sec"><h2 class="h3">What is here</h2><ul class="k-folders">${folders.map(([n, t], i) => `<li>${mk(i + 1)}<b class="k-fn">${A(n)}</b><span class="k-fd">${A(t)}</span></li>`).join('')}</ul></section>
<section class="k-sec"><h2 class="h3">How to use it</h2><ol class="k-how">${how.map(([a, t], i) => `<li>${mk(i + 1)}<p><b>${A(a)}</b>${A(t)}</p></li>`).join('')}</ol></section>
<p class="k-contact">Questions about the kit: ${A(B.contact.owner)}, <span class="k-mono">${A(B.contact.email)}</span>.</p>`,
  });

  const float = ctx.colours.find((c) => c.role === 'highlight');
  const pins = [
    ['k-pin--1', `Status`, `${ctx.status[0].label} is plain words in one colour, one word for the lesson.`],
    ['k-pin--2', S.eta, `The screen's one line, set in ${f.display.family} ${cssNum(f.display.weights[f.display.weights.length - 1])}.`],
    ['k-pin--3', 'Float', float.lands],
    ['k-pin--4', S.rider, `${S.riderNote}.`],
    ['k-pin--5', S.share, ctx.colours.find((c) => c.role === 'action').lands],
  ];
  const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${Math.max(c.share, 0.12)} 1 0"><i style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="cap"><b>${A(c.name)}</b><span class="k-mono">${A(c.hex)}</span></p></li>`).join('');
  const rev = B.logo.colourways.reversed;
  const p2 = page(ctx, 'read-me-2', {
    title: 'The brand on one page', no: 2, of: 2, cls: 'k-2',
    inner: `<div class="k-one"><div class="k-screen">${screen(ctx)}${pins.map((p, i) => mk(i + 1, '').replace('class="mk"', `class="mk k-pin ${p[0]}"`)).join('')}</div>
<div class="k-side"><div class="k-logos"><div class="k-tile">${ctx.logo.html('colour', { width: 112, label: 'Your logo goes here' })}</div><div class="k-tile" style="background:${rev.ground};color:${rev.name}">${ctx.logo.html('reversed', { width: 112, label: 'Your logo goes here' })}</div></div>
<div class="k-line"><p class="disp k-line__p">${A(B.lines.primary)}</p>${B.lines.others.map((l) => `<p class="k-line__o">${A(l)}</p>`).join('')}</div>
<ol class="k-notes">${pins.map((p, i) => `<li>${mk(i + 1)}<p><b>${A(p[1])}</b>${A(p[2])}</p></li>`).join('')}</ol>
<ul class="k-faces"><li><span class="k-aa disp" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.display.family)}</b>Display, ${f.display.weights.join(', ')}</span></li><li><span class="k-aa k-aa--body" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.body.family)}</b>Body, ${f.body.weights.join(', ')}</span></li></ul></div></div>
<ul class="k-strip">${strip}</ul>`,
  });
  return [p1, p2];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction, S = B.ui.screen.content;

  // palette: a share bar, then a numbered row per colour with its three values, then the tones
  const bar = ctx.colours.map((c) => `<li style="flex:${c.share} 1 0;background:${c.hex};color:${onColour(ctx, c.hex)}${hair(ctx, c.hex)}"><span>${A(c.name)}</span><span class="num">${Math.round(c.share * 100)}%</span></li>`).join('');
  const row = (c, i) => {
    const ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li>${mk(i + 1)}<i class="k-sw" style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="k-sw__n"><b>${A(c.name)}</b>${A(ctx.cap(c.role))}<span class="k-sw__l">${A(c.lands)}</span></p><p class="k-sw__v"><span>${A(c.hex)}</span><span>${A(rgbOf(ctx, c.hex))}</span><span>${A(ok)}</span></p></li>`;
  };
  const tone = (t) => `<li><i class="k-sw k-sw--s" style="background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></i><p class="k-sw__n"><b>${A(t.name)}</b>${A(ctx.cap(t.role))}<span class="k-sw__l">${A(t.lands)}</span></p><p class="k-sw__v"><span>${A(t.hex)}</span></p></li>`;
  const palette = page(ctx, 'palette', {
    title: `${B.name} palette`, no: 1, of: 1,
    lead: `${NUM[ctx.colours.length]} colours, in proportion to their share of a page.`,
    inner: `<ul class="k-share">${bar}</ul><ul class="k-rows">${ctx.colours.map(row).join('')}</ul><h2 class="h3">Text tones</h2><ul class="k-rows k-rows--t">${B.tones.map(tone).join('')}</ul><p class="cap">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p>`,
  });

  // type specimen: two faces, then the scale set at its real sizes
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const dispW = cssNum(f.display.weights[f.display.weights.length - 1]);
  const face = (cls, fam, role, w, style) => `<div class="k-face"><p class="k-face__aa ${cls}" style="${style}" aria-hidden="true">Aa</p><div><p class="k-face__n">${A(fam)}</p><p class="cap">${role}. Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__al" style="${style}">${alpha}</p></div></div>`;
  const sampleOf = { display: B.name, headline: 'Tuesdays at 4:15', title: B.ui.screen.title, body: firstSentence(T.sample.paragraph), label: S.form.notes, caption: T.sample.caption };
  const scale = T.scale.map((s, i) => `<li>${mk(i + 1)}<p class="cap"><b>${A(s.token)}</b><span class="num">${s.size} px, ${s.line}, ${s.weight}</span></p><p class="k-sc__s" style="font-family:var(--${s.face});font-size:${s.size}px;line-height:${s.line};font-weight:${s.weight}${s.face === 'display' ? ';letter-spacing:-0.01em' : ''}">${A(sampleOf[s.token] || T.sample.headline)}</p></li>`).join('');
  const typefaces = page(ctx, 'typefaces', {
    title: 'Typefaces', no: 1, of: 1,
    lead: `${f.display.family} sets the name and the one big line. ${f.body.family} carries everything a parent reads and taps.`,
    inner: `<div class="k-faces2">${face('disp', f.display.family, 'Display, for headlines and the status line', f.display.weights, `font-family:var(--display);font-weight:${dispW}`)}${face('', f.body.family, 'Body, for reading text, labels and captions', f.body.weights, 'font-family:var(--body);font-weight:500')}</div>
<ul class="k-scale">${scale}</ul><p class="cap">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p>`,
  });

  // photography: the direction and the do and don't, then the shot list
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const photo1 = page(ctx, 'photography-1', {
    title: 'Photography direction', no: 1, of: 2,
    lead: 'Five calls decide whether a picture belongs. Check a photo against each one before it is used.',
    inner: `<dl class="k-dir">${rows.map(([k, v], i) => `<div>${mk(i + 1)}<dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="k-dd"><h2 class="h3">Do and don't</h2><ul class="k-dd__l">${B.imagery.rules.map((r) => `<li><p><b>Do</b>${A(r.do)}</p><p><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul></div>`,
  });
  const shots = B.imagery.shots.map((s, i) => `<figure class="k-shot">${ctx.photo(s.id, { cls: 'k-shot__f' })}<figcaption>${mk(i + 1)}<span class="cap"><b>${A(s.slot.split(':')[0])}</b>${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</span></figcaption></figure>`).join('');
  const photo2 = page(ctx, 'photography-2', {
    title: 'Shot list', no: 2, of: 2,
    lead: `${NUM[B.imagery.shots.length]} frames. Each slot says what to shoot, how to crop it and the light to shoot it in.`,
    inner: `<div class="k-shots">${shots}</div>`,
  });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
