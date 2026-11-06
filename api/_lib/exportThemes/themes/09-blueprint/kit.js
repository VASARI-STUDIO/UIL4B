// Brand kit PDFs for theme 09, Blueprint: the 2-page read-me, the palette sheet, the type specimen and the photography sheets.
// Pages are 794 x 1123 drawing sheets on the guidelines frame: running head with "n of N", a title, the work, a ruled title block at the foot.
// Redlines print the length they draw (px at 1x). Styles are in css-bookkit.js, classes start k-. Every value comes from ctx.
import { A, fit, vline } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// a swatch that sits on the Plaster page or a White card needs its edge drawn
const hair = (ctx, hex) => { const L = ctx.roles.light, h = hex.toLowerCase(); return h === L.raised.toLowerCase() || h === L.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : ''; };
const firstSentence = (s) => (s.match(/^.*?[.!?](?=\s|$)/) || [s])[0];
const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

// a kit sheet: running head, title (and lead), the work, the title block
function page(ctx, id, { title, lead = '', drawing, inner, no, of, big = false }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand kit, blueprint</span><span class="num">${no} of ${of}</span></div>`;
  const tb = `<div class="k-tb">${[['Drawing', drawing || title], ['Sheet', `${no} of ${of}`], ['Issue', ctx.versionLine]].map(([k, v]) => `<div class="k-c"><span class="k">${k}</span>${A(v)}</div>`).join('')}</div>`;
  return `<section class="pg pg--std pg--k" data-page="${id}">${head}<h1 class="ttl${big ? ' k-big disp' : ''}">${A(title)}</h1>${lead ? `<p class="lead">${A(lead)}</p>` : ''}<div class="k-bd">${inner}</div>${tb}</section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', f = B.fonts;
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
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Both faces are SIL OFL 1.1, free for commercial use.'],
  ];
  const p1 = page(ctx, 'read-me-1', {
    title: `${B.name} brand kit`, big: true, drawing: 'Read me', no: 1, of: 2,
    lead: `${B.description} ${ctx.versionLine}.`,
    inner: `<section class="k-sec"><h2 class="h2">What is here</h2><ul class="k-folders">${folders.map(([n, t], i) => `<li><span class="num k-no">0${i + 1}</span><b class="k-fn">${A(n)}</b><span class="k-fd">${A(t)}</span></li>`).join('')}</ul></section>
<section class="k-sec"><h2 class="h2">How to use it</h2><ol class="k-how">${how.map(([a, t], i) => `<li><span class="num k-no">${i + 1}</span><p><b>${A(a)}</b> ${A(t)}</p></li>`).join('')}</ol></section>
<p class="k-contact">Questions about the kit: ${A(B.contact.owner)}, <span class="k-mono">${A(B.contact.email)}</span>.</p>`,
  });

  // read-me 2: the logo drawn with its height, the lines, the traits, the faces, the share strip
  const LW = 260, g = ctx.logo.geos.colour, LH = Math.round((LW * g.h) / g.w);
  const byShare = ctx.colours.slice().sort((x, y) => y.share - x.share);
  const strip = `<ul class="k-strip">${byShare.map((c) => `<li style="flex:${c.share} 1 0;background:${c.hex}${hair(ctx, c.hex)}"></li>`).join('')}</ul><ul class="k-keys">${byShare.map((c) => `<li class="cap"><b>${A(c.name)}</b><span class="k-mono">${A(c.hex)}</span></li>`).join('')}</ul>`;
  const p2 = page(ctx, 'read-me-2', {
    title: 'The brand on one page', drawing: 'The brand on one page', no: 2, of: 2, lead: B.product,
    inner: `<div class="k-tiles"><div class="k-tile"><div class="k-mark" style="width:${LW}px;height:${LH}px">${ctx.logo.html('colour', { width: LW, label: 'Your logo goes here' })}${vline(-24, 0, LH, LH, { dx: -30 })}</div></div><div class="k-tile k-tile--ink">${ctx.logo.html('reversed', { width: fit(ctx, 'reversed', 260, 90), colourway: 'reversed', label: 'Your logo goes here', color: B.logo.colourways.reversed.name })}</div></div>
<div class="k-line"><p class="k-line__p disp">${A(B.lines.primary)}</p>${B.lines.others.map((l) => `<p class="k-line__o">${A(l)}</p>`).join('')}</div>
<ul class="k-traits">${B.personality.map((x) => `<li><h2 class="k-h3">${A(x.trait)}</h2><p>${A(x.means)}</p></li>`).join('')}</ul>
<ul class="k-faces"><li><span class="k-aa disp" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.display.family)}</b>Display, ${f.display.weights.join(', ')}</span></li><li><span class="k-aa k-aa--body" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.body.family)}</b>Body, ${f.body.weights.join(', ')}</span></li></ul>
${strip}`,
  });
  return [p1, p2];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;

  // palette: a share strip, a row per colour with its three values, then the text tones
  const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${c.share} 1 0;background:${c.hex}${hair(ctx, c.hex)}"></li>`).join('');
  const row = (c) => {
    const ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li><i class="k-sw" style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="k-sw__n"><b>${A(c.name)}</b>${A(ctx.cap(c.role))}, <span class="num">${Math.round(c.share * 100)}%</span> of a page</p><p class="k-sw__l">${A(c.lands)}</p><p class="k-sw__v"><span>${A(c.hex)}</span><span>${A(rgbOf(ctx, c.hex))}</span><span>${A(ok)}</span></p></li>`;
  };
  const tone = (t) => `<li><i class="k-sw k-sw--s" style="background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></i><p class="k-sw__n"><b>${A(t.name)}</b>${A(ctx.cap(t.role))}</p><p class="k-sw__l">${A(t.lands)}</p><p class="k-sw__v"><span>${A(t.hex)}</span></p></li>`;
  const palette = page(ctx, 'palette', {
    title: `${B.name} palette`, drawing: 'Colour', no: 1, of: 1,
    lead: `${words[ctx.colours.length]} colours, each in proportion to its share of a page. Two tones carry the quiet text and the rules.`,
    inner: `<ul class="k-share">${strip}</ul><ul class="k-rows">${ctx.colours.map(row).join('')}</ul><h2 class="k-h3">Text tones and rules</h2><ul class="k-rows k-rows--t">${B.tones.map(tone).join('')}</ul><p class="cap">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p>`,
  });

  // type specimen: two faces, each Aa drawn with its size, then the scale set at its real sizes
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const dispW = f.display.weights[f.display.weights.length - 1], AA = 128;
  const face = (cls, fam, role, w, style) => `<div class="k-face"><div class="k-face__aa"><p class="${cls}" style="${style};font-size:${AA}px;line-height:1" aria-hidden="true">Aa</p>${vline(-24, 0, AA, AA, { dx: -30 })}</div><p class="k-face__n">${A(fam)}</p><p class="cap">${role}. Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__al" style="${style}">${alpha}</p></div>`;
  const sampleOf = { display: B.name, headline: firstSentence(B.lines.primary), title: '$38,460', lead: B.lines.others[0], label: B.voice.writeThis[2].write, body: firstSentence(T.sample.paragraph), caption: T.sample.caption };
  const scale = T.scale.map((s) => `<li><p class="cap"><b>${A(s.token)}</b><span class="num">${s.size} px, ${s.line}, ${s.weight}</span></p><p class="k-sc__s" style="font-family:var(--${s.face});font-size:${s.size}px;line-height:${s.line};font-weight:${s.weight}">${A(sampleOf[s.token] || T.sample.headline)}</p></li>`).join('');
  const typefaces = page(ctx, 'typefaces', {
    title: 'Typefaces', drawing: 'Type', no: 1, of: 1,
    lead: `${f.display.family} sets the line and the dollars. It also carries everything you read and tap, in three lighter weights.`,
    inner: `<div class="k-faces2">${face('disp', f.display.family, 'Display, for headlines and totals', f.display.weights, `font-family:var(--display);font-weight:${dispW}`)}${face('', f.body.family, 'Body, for reading text, labels and captions', f.body.weights, 'font-family:var(--body);font-weight:500')}</div>
<ul class="k-scale">${scale}</ul><p class="cap">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p>`,
  });

  // photography: the direction and the do and don't, then the shot list
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const photo1 = page(ctx, 'photography-1', {
    title: 'Photography direction', drawing: 'Photography', no: 1, of: 2,
    lead: 'Five calls decide whether a picture belongs. Check a photo against each one before it is used.',
    inner: `<dl class="k-dir">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>
<div class="k-dd"><h2 class="k-h3">Do and don't</h2><ul class="k-dd__l">${B.imagery.rules.map((r) => `<li><p><b>Do</b>${A(r.do)}</p><p><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul></div>`,
  });
  const shots = B.imagery.shots.map((s) => `<figure class="k-shot">${ctx.photo(s.id, { cls: 'k-shot__f' })}<figcaption class="cap"><b>${A(s.slot.split(':')[0])}</b>${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</figcaption></figure>`).join('');
  const photo2 = page(ctx, 'photography-2', {
    title: 'Shot list', drawing: 'Shot list', no: 2, of: 2,
    lead: 'Six frames cover a job from the measure-up to the finished room. Each slot says what to shoot, how to crop it and the light to shoot it in.',
    inner: `<div class="k-shots">${shots}</div>`,
  });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
