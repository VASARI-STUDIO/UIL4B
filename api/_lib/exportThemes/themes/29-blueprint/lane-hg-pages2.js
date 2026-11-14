// Theme 29 (Blueprint), lane hg: the guide site's pages, part 2: Typography, Imagery, Layout, Applications and Close.
import { displayStem, specimen } from './measure.js';
import { cardArts, cardFront, cardBack, phoneArt, laptopArt, hoardingArt, letterArts, mmOf, isCourier, clipLetter, courierSign } from './lane-bk-arts.js';
import { A, pad2, WEIGHT, capOf, stemOf, listAnd, detail, tag, notes, label, dimH, dimV, sheet, wordCap, logoFilm, shot, surfAspect, r1, briefTile } from './lane-hg-parts.js';
import { arts, artDoc } from './scenes.js';

const PX = '<span class="hg-m">1:1</span>, sizes in px';
const PX_MM = 3.7795;
const SCENES = { stationery: 'bench-letterhead-reno', card: 'bench-cards-offcuts', social: 'room-kitchen-phone', email: 'bench-laptop-shoulder', signage: 'kerb-hoarding-footpath' };
const rules = (list, cls = '') => notes(list.map((r, i) => [i + 1, `<p class="hg-note"><span class="hg-note__h">Do.</span> ${A(r.do)}</p><p class="hg-note hg-q"><span class="hg-note__h">Don&rsquo;t.</span> ${A(r.dont)}</p>`]), `hg-notes--rules ${cls}`);
const ph = (ctx, s, pos) => ctx.photo(s.id, { cls: 'hg-photo', pos: pos || '50% 45%', slotNote: false });

// the faces in themselves, each with its role and the weights loaded
function faces(ctx) {
  const F = ctx.brand.fonts, W = ctx.weights;
  const face = (n, role, f, cls, style, what) => `<li class="hg-face">${tag(n)}<div><p class="${cls}" style="${style}">${A(f.family)}</p><p class="hg-note"><span class="hg-note__h">${role}, ${A(f.weights.map((w) => `${WEIGHT[w] || w} ${w}`).join(', '))}.</span> ${what}</p></div></li>`;
  return `<ol class="hg-faces">${face(1, 'Display', F.display, 'hg-face__d hg-disp', '', 'Headlines and the lines.')}
${face(2, 'Text', F.body, 'hg-face__b', `font-weight:${W.regular}`, 'Everything else: paragraphs, labels, captions.')}
${F.mono ? face(3, 'Values', F.mono, 'hg-face__m', `font-weight:${F.mono.weights[0]}`, 'Prices, times and figures that line up.') : ''}</ol>`;
}

export const pages2 = {
  // ---- Typography ----
  typefaces(ctx) {
    const F = ctx.brand.fonts, T = ctx.brand.type, stem = displayStem(ctx);
    const S = { s: 44, m: 72, l: 112 }, cap = (s) => String(Math.round(capOf(stem, s)));
    const head = `<figure class="hg-letter" aria-label="${A(F.display.family)} at ${S.l} px, cap height ${cap(S.l)} px"><p class="hg-letter__t hg-disp"><span class="hg-letter__cap">${dimV({ s: cap(S.s), m: cap(S.m), l: cap(S.l) })}</span>${A(specimen(ctx))}</p>
<figcaption class="hg-note">${A(F.display.family)} at <span class="hg-at-l"><span class="hg-m">${S.l} px</span></span><span class="hg-at-m"><span class="hg-m">${S.m} px</span></span><span class="hg-at-s"><span class="hg-m">${S.s} px</span></span>. The redline is the cap height.</figcaption></figure>`;
    const wts = `<ul class="hg-wts">${F.body.weights.map((w) => `<li style="font-weight:${w}">${WEIGHT[w] || w} <span class="hg-m">${w}</span></li>`).join('')}</ul>`;
    const fams = [F.display.family, F.body.family, F.mono && F.mono.family].filter((f, i, a) => f && a.indexOf(f) === i);
    const inner = `${head}${wts}<div class="hg-block">${label('The faces')}${faces(ctx)}<p class="hg-note hg-measure-t hg-faces__l">${A(listAnd(fams))} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen.</p></div>`;
    return sheet(ctx, 'typefaces', { drawing: 'Lettering', scale: PX }, inner);
  },
  hierarchy(ctx) {
    const T = ctx.brand.type, stem = displayStem(ctx);
    const scale = `<ol class="hg-scale${ctx.placeholders ? " ph-tight" : ""}">${T.scale.map((s) => {
      const disp = s.face === 'display', text = disp ? specimen(ctx) : T.sample.paragraph;
      const fs = wordCap(disp ? stem : stemOf(ctx, 'body', s.weight), text, s.size, 300);
      return `<li><div class="hg-scale__k"><h2 class="hg-scale__t">${A(ctx.cap(s.token))}</h2><p class="hg-q hg-small"><span class="hg-m">${s.size} / ${s.line}</span>, ${A(WEIGHT[s.weight] || s.weight)}. ${A(s.use)}</p></div><p class="hg-scale__s${disp ? ' hg-disp' : ''}" style="font-weight:${s.weight};line-height:${s.line};font-size:${fs}">${A(text)}</p></li>`;
    }).join('')}</ol>`;
    return sheet(ctx, 'hierarchy', { drawing: 'Type levels', scale: PX }, `<div class="hg-block">${label('The scale')}${scale}</div>`);
  },
  'type-in-use'(ctx) {
    const B = ctx.brand, T = B.type, F = B.fonts, lines = [B.lines.primary];
    void lines;
    const hdr = T.scale.find((s) => s.face === 'display') || T.scale[0], body = T.scale.find((s) => s.face !== 'display' && s.size >= 16) || T.scale[T.scale.length - 1], cap = T.scale.find((s) => /caption/i.test(s.token)) || T.scale[T.scale.length - 1];
    const stem = displayStem(ctx), hf = wordCap(stem, specimen(ctx), 56, 640);
    const inner = `<article class="hg-spec"><p class="hg-spec__h hg-disp" style="font-size:${hf}">${A(specimen(ctx))}</p>
<div class="hg-measure hg-measure--b">${dimH('560')}<p class="hg-body">${A(T.sample.paragraph)}</p></div>
<p class="hg-spec__c hg-q">${A(T.sample.caption)}</p></article>
<div class="hg-split"><div>${detail(1, 'Headline', { note: `${A(F.display.family)}, <span class="hg-m">${hdr.size} / ${hdr.line}</span>, sentence case, tracking minus 0.01 em.` })}</div>
<div>${detail(2, 'Paragraph', { note: `${A(F.body.family)}, <span class="hg-m">${body.size} / ${body.line}</span>, a line no wider than <span class="hg-m">560 px</span>.` })}${detail(3, 'Caption', { note: `${A(F.body.family)}, <span class="hg-m">${cap.size} / ${cap.line}</span>, in the quiet text colour.` })}</div></div>`;
    return sheet(ctx, 'type-in-use', { drawing: 'Type in use', scale: PX }, inner);
  },
  'type-rules'(ctx) {
    return sheet(ctx, 'type-rules', { drawing: 'Lettering rules', scale: PX }, `<div class="hg-block">${label('Rules')}${rules(ctx.brand.type.rules)}</div>`);
  },

  // ---- Imagery ----
  'photo-direction'(ctx) {
    const B = ctx.brand, D = B.imagery.direction, first = B.imagery.shots.find((s) => s.photo) || B.imagery.shots[0];
    const rows = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
    const inner = `<figure class="hg-ph">${first.photo ? ph(ctx, first) : briefTile(ctx, first)}<figcaption>${detail(1, first.photo ? A(first.caption || first.alt || first.slot || '') : `The lead shot, one of ${B.imagery.shots.length}. The frame is its brief.`)}</figcaption></figure>
<div class="hg-split"><div>${label('Subject')}<p class="hg-big">${A(D.subject)}</p></div><div>${label('General notes')}${notes(rows.map(([k, v], i) => [i + 1, `<p class="hg-note"><span class="hg-note__h">${k}.</span> ${A(v)}</p>`]))}</div></div>`;
    return sheet(ctx, 'photo-direction', { drawing: 'Photograph brief', scale: 'Not to scale' }, inner);
  },
  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots;
    const seenCr = new Set();   // a generated photograph carries no credit; a real photographer's prints once
    const fig = (s, i) => `<li class="hg-shotl"><figure>${ph(ctx, s, s.pos)}<figcaption>${tag(i + 1)}<div class="hg-shotl__t"><p class="hg-note">${A(s.photo ? (s.caption || s.alt || '') : s.slot)}</p>${s.photo && s.credit && !s.generated && !seenCr.has(s.credit) ? (seenCr.add(s.credit), `<p class="hg-note hg-q">Photo: ${A(s.credit)}</p>`) : ''}</div></figcaption></figure></li>`;
    const inner = `<div class="hg-block">${label('Photo schedule')}<p class="hg-note hg-measure-t">${shots.some((s) => s.photo) ? 'Each frame is one shot in the set, with its caption.' : 'No photographs yet. Each frame is the brief for one shot: who, where, the crop and the light.'}</p><ol class="hg-shots">${shots.map(fig).join('')}</ol></div>`;
    return sheet(ctx, 'shot-list', { drawing: 'Photograph schedule', scale: 'Not to scale' }, inner);
  },
  'imagery-rules'(ctx) {
    const sh = ctx.brand.imagery.shots, a = sh.find((s) => s.photo) || sh[0];
    const inner = `<figure class="hg-ph hg-ph--w">${ph(ctx, a)}</figure><div class="hg-block">${label('Rules')}${rules(ctx.brand.imagery.rules)}</div>`;
    return sheet(ctx, 'imagery-rules', { drawing: 'Typical details', scale: 'Not to scale' }, inner);
  },

  // ---- Layout ----
  grid(ctx) {
    const G = ctx.gridMeasures;
    const draw = (maxW, cls) => {
      const k = Math.max(1, Math.ceil(G.page.w / maxW)), w = G.page.w / k, h = G.page.h / k, m = G.margin / k, g = G.gutter / k, c = G.col / k;
      let cols = '';
      for (let i = 0; i < G.columns; i++) cols += `<rect x="${(m + i * (c + g)).toFixed(2)}" y="${m.toFixed(2)}" width="${c.toFixed(2)}" height="${(h - 2 * m).toFixed(2)}"/>`;
      const box = (x, wd, value, gap) => `<span class="hg-gd__d" style="left:${(x / w * 100).toFixed(3)}%;width:${(wd / w * 100).toFixed(3)}%">${dimH(value, { gap })}</span>`;
      const col = String(Math.round(G.col * 10) / 10);
      return `<figure class="hg-gd ${cls}" style="--w:${w.toFixed(1)}px;--ar:${G.page.w}/${G.page.h}" aria-label="The page grid at 1 to ${k}: ${G.columns} columns, ${G.margin} px margins and ${G.gutter} px gutters on a ${G.page.w} by ${G.page.h} px page">
<div class="hg-gd__dims">${box(0, m, String(G.margin), 6)}${box(m, c, col, 30)}${box(m + c, g, String(G.gutter), 54)}</div>
<div class="hg-gd__p"><svg viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="100%" aria-hidden="true" focusable="false"><rect class="hg-gd__pg" x="0.75" y="0.75" width="${(w - 1.5).toFixed(2)}" height="${(h - 1.5).toFixed(2)}"/><g class="hg-gd__c">${cols}</g></svg>${dimV(String(G.page.h))}</div>
<figcaption class="hg-note">Drawn at <span class="hg-m">1:${k}</span>. A <span class="hg-m">${G.page.w} × ${G.page.h}</span> page in ${G.columns} columns; the redlines print its true sizes.</figcaption></figure>`;
    };
    const meas = [['Margin', G.margin], ['Gutter', G.gutter], ['Column', String(Math.round(G.col * 10) / 10)], ['Base step', G.base]];
    const inner = `<div class="hg-lay">${draw(640, 'hg-gd--w')}${draw(240, 'hg-gd--n')}<dl class="hg-meas">${meas.map(([k, v]) => `<div><dt>${k}</dt><dd><span class="hg-meas__v">${v}</span> <span class="hg-m">px</span></dd></div>`).join('')}</dl></div>`;
    return sheet(ctx, 'grid', { drawing: 'Page grid', scale: 'As noted, sizes in px' }, inner);
  },
  layouts(ctx) {
    const G = ctx.gridMeasures, B = ctx.brand;
    const space = `<ol class="hg-space">${ctx.space.map((s) => `<li><span class="hg-space__b" style="width:${s.px}px;height:${s.px}px" aria-hidden="true"></span><span class="hg-m">${s.px}</span></li>`).join('')}</ol>`;
    const radii = ctx.radii.filter((r) => r.px < 9999);
    const inner = `<div class="hg-split"><div>${detail(1, 'Spacing', { note: `Every gap is a step of ${G.base} px. Space inside a group is smaller than the space between groups. Each square is drawn at its size.` })}${space}</div>
<div>${detail(2, 'Corners and edges', { note: `Edges are <span class="hg-m">${B.ui.border} px</span>. ${A(B.ui.elevationNote || '')}` })}<ul class="hg-radii">${radii.map((r) => `<li><span class="hg-radii__b" style="border-radius:${r.px}px" aria-hidden="true"></span><span class="hg-note">${A(r.use)}, <span class="hg-m">${r.px} px</span></span></li>`).join('')}</ul></div></div>
<div class="hg-block">${label('The page')}${notes([[1, `<p class="hg-note">Margins are <span class="hg-m">${G.margin} px</span> on a <span class="hg-m">${G.page.w} × ${G.page.h}</span> page.</p>`], [2, `<p class="hg-note">The page is ${G.columns} columns with <span class="hg-m">${G.gutter} px</span> gutters. Work to the columns.</p>`]])}</div>`;
    return sheet(ctx, 'layouts', { drawing: 'Spacing and edges', scale: 'Each drawn at size, in px' }, inner);
  },

  // ---- Applications ----
  'business-card'(ctx) {
    const B = ctx.brand, ap = B.applications, n = B.name, S = SCENES;
    // a courier's letter lies on the clipboard, and its card is drawn flat at true size: no joiner's bench stands for it
    const cr = isCourier(ctx);
    const la = cr ? null : letterArts(ctx, surfAspect(ctx, S.stationery, 'envelope'));
    const letter = cr
      ? `<figure class="hg-app hg-app--hero">${shot(ctx, 'clipboard', [clipLetter(ctx)], { ar: '3/2', alt: `${n}'s letter on a clipboard` })}<figcaption>${detail(1, 'Letter', { note: `A4, <span class="hg-m">210 × 297 mm</span>, with the horizontal logo at the head and the details set in ${A(B.fonts.body.family)}.` })}</figcaption></figure>`
      : `<figure class="hg-app hg-app--hero">${shot(ctx, S.stationery, [la.letterhead, la.envelope], { ar: '3/2', alt: `${n}'s letterhead and envelope on a stone bench` })}<figcaption>${detail(1, 'Letterhead and envelope', { note: `A4, <span class="hg-m">210 × 297 mm</span>, with the horizontal logo at the head and the details set in ${A(B.fonts.body.family)}.` })}</figcaption></figure>`;
    const ca = cr ? null : cardArts(ctx, surfAspect(ctx, S.card, 'card-front'));
    const cw = Math.round(90 * PX_MM), ch = Math.round(55 * PX_MM);
    const flat = (art, side) => `<div class="hg-card" style="width:${cw}px;height:${ch}px;background:${art.ground};color:${art.ink}" role="img" aria-label="Business card, ${side}, at true size">${art.inner}</div>`;
    ctx.pair(B.logo.colourways.reversed.name, B.logo.colourways.reversed.ground, { size: 13, what: 'guide card front' });
    const card = `<div class="hg-app hg-app--card${cr ? ' hg-app--flat' : ''}">${cr ? '' : `<figure>${shot(ctx, S.card, [ca['card-front'], ca['card-back']], { ar: '4/3', alt: `${n}'s business cards on a workbench among offcuts` })}</figure>`}
<div class="hg-app__flat">${detail(2, 'Business card', { note: 'Front and back at true size, <span class="hg-m">90 × 55 mm</span>.' })}<div class="hg-cards"><div class="hg-card__w">${dimH('90 mm')}${flat(cardFront(ctx, cw, ch), 'front')}${dimV('55 mm')}</div><div class="hg-card__w">${flat(cardBack(ctx, cw, ch), 'back')}</div></div></div></div>`;
    return sheet(ctx, 'business-card', { drawing: 'Stationery', scale: 'Card <span class="hg-m">1:1</span>, others not to scale' }, `${letter}${card}`);
  },
  social(ctx) {
    const B = ctx.brand, ap = B.applications, soc = isCourier(ctx) ? 'kerb-crossing-phone' : SCENES.social;
    const inner = `<figure class="hg-app hg-app--hero">${shot(ctx, soc, [phoneArt(ctx, surfAspect(ctx, soc, 'screen-phone'))], { ar: '4/5', alt: isCourier(ctx) ? `${B.name}'s post on a phone held at a city crossing` : `${B.name}'s post on a phone on a kitchen bench`, cls: 'hg-shot--p' })}</figure>
<div class="hg-split"><div>${detail(1, 'Social post', { note: 'One line to a post, in the display face on the reversed ground.' })}</div><div>${label('The lines')}<ul class="hg-lines hg-lines--s">${ap.social.map((t) => `<li class="hg-disp">${A(t)}</li>`).join('')}</ul></div></div>`;
    return sheet(ctx, 'social', { drawing: 'Social posts', scale: 'Not to scale' }, inner);
  },
  signage(ctx) {
    // a courier's city hoarding is the underpass billboard (2300 x 1000 mm is that surface's shape); the site fence stays with a builder
    const B = ctx.brand, ap = B.applications, mm = mmOf((ctx.real || String)(ap.signage)), cs = isCourier(ctx) ? courierSign(ctx) : null;
    const sid = cs ? cs.id : SCENES.signage, ha = surfAspect(ctx, sid, cs ? cs.surface : 'hoarding');
    const fits = mm && Math.abs(mm[0] / mm[1] / ha - 1) <= 0.05;
    const pic = fits ? `<figure class="hg-app hg-app--hero">${shot(ctx, sid, [hoardingArt(ctx, ha)], { ar: '3/2', alt: cs ? cs.alt : `${B.name}'s hoarding on a plywood site fence` })}</figure>` : '';
    const veh = ap.vehicle && !cs ? `<figure class="hg-app">${shot(ctx, 'ute-door', [artDoc(ctx, arts.doorSign(ctx))], { ar: '3/2', alt: `${B.name}'s magnetic sign on a ute door` })}<figcaption>${detail(2, 'Vehicle', { note: A(ap.vehicle) })}</figcaption></figure>` : '';
    const inner = `${pic}<div class="hg-split"><div>${detail(1, 'Sign face', { note: A(ap.signage) })}</div>${ap.vehicle && !veh ? `<div>${detail(2, 'Vehicle', { note: A(ap.vehicle) })}</div>` : ''}</div>${veh}`;
    return sheet(ctx, 'signage', { drawing: 'Sign face', scale: 'Not to scale' }, inner);
  },
  'email-signature'(ctx) {
    const B = ctx.brand, ap = B.applications;
    const inner = `<figure class="hg-app hg-app--hero">${shot(ctx, SCENES.email, [laptopArt(ctx, surfAspect(ctx, SCENES.email, 'screen-laptop'))], { ar: '3/2', alt: `${B.name}'s email open on a laptop on a workbench` })}</figure>
<div class="hg-split"><div>${detail(1, 'Email signature', { note: 'Name, role, contact and the horizontal logo.' })}</div>
<div class="hg-sig"><p class="hg-sig__n">${A(ap.email.person)}</p><p class="hg-note">${A(ap.email.role)}, ${A(B.name)}</p><p class="hg-note hg-q">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="hg-sig__l">${logoFilm(ctx, 'horizontal', 168)}</div></div></div>`;
    return sheet(ctx, 'email-signature', { drawing: 'Email signature', scale: 'Not to scale' }, inner);
  },
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, st = ctx.status.find((s) => s.label === S.status) || ctx.status[0], pct = typeof S.progress !== 'number' ? null : Math.round(S.progress * 100);
    const screen = `<div class="hg-scr ui" role="img" aria-label="${A(B.name)}'s product screen, ${A(B.ui.screen.title)}">
<div class="hg-scr__bar">${logoFilm(ctx, 'horizontal', 140)}</div>
<div class="hg-scr__b"><div class="hg-scr__c"><p class="hg-scr__k">${A(B.ui.screen.title)}</p>${ui.statusChip(st.id, { label: S.status })}<h2 class="hg-scr__eta ui-display">${A(S.eta)}</h2>
${pct === null ? '' : `<div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div>`}
<p class="hg-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></p><p class="hg-scr__p">${A(S.pickup)}</p></div>
<div class="hg-scr__r">${ui.deliveryRows(4)}</div></div></div>`;
    const keys = [['Status chip', `${A(S.status)}, in the kit&rsquo;s ${A(st.tone)} tone.`], ['Progress bar', `${pct === null ? '' : pct + '% along, '}${pct === null ? 'From' : 'from'} ${A(S.from)} to ${A(S.to)}.`], ['List rows', 'Each row with its status chip.']];
    const inner = `<figure class="hg-app">${screen}</figure><div class="hg-block">${label('Keynotes')}${notes(keys.map(([t, d], i) => [i + 1, `<p class="hg-note"><span class="hg-note__h">${t}.</span> ${d}</p>`]))}</div>`;
    return sheet(ctx, 'digital', { drawing: 'Product screen', scale: 'Not to scale' }, inner);
  },

  // ---- Close ----
  summary(ctx) {
    const B = ctx.brand, F = B.fonts, rl = B.guideB.rules;
    const sum = ctx.colours.reduce((a, c) => a + c.share, 0);
    const strip = `<div class="hg-fields hg-fields--s" role="list">${ctx.colours.map((c) => `<div class="hg-field hg-field--s" role="listitem" style="--w:${(c.share / sum * 100).toFixed(3)}%"><div class="hg-field__f hg-field__f--s" style="background:${c.hex}" title="${A(c.name)}"></div></div>`).join('')}</div>`;
    const inner = `<div class="hg-split"><div>${label('The logo')}<div class="hg-sumlg">${logoFilm(ctx, 'colour', 320)}</div><ul class="hg-lines hg-lines--m">${[B.lines.primary, ...B.lines.others].map((l) => `<li class="hg-disp">${A(l)}</li>`).join('')}</ul></div>
<div>${label(`${rl.length} rules`)}${notes(rl.map((r, i) => [i + 1, `<h2 class="hg-h3">${A(r.title)}</h2><p class="hg-note">${A(r.text)}</p>`]))}</div></div>
<div class="hg-block">${label('The faces')}${faces(ctx)}</div>
<div class="hg-block">${label('The palette')}${strip}<ul class="hg-key">${ctx.colours.map((c) => `<li><span class="hg-sw" style="background:${c.hex}" aria-hidden="true"></span>${A(c.name)} <span class="hg-m">${Math.round(c.share * 100)}%</span></li>`).join('')}</ul></div>`;
    void F;
    return sheet(ctx, 'summary', { drawing: 'The brand on one page', scale: 'Not to scale' }, inner);
  },
  'contact-scope'(ctx) {
    const B = ctx.brand, c = B.contact, d = new Date(B.version.date + 'T00:00:00Z'), date = `${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
    const set = ctx.sections.map((s) => `<li><span class="hg-m hg-set__n">${pad2(s.n)}</span><span class="hg-note">${A(s.title)}</span><span class="hg-note hg-q">Pages <span class="hg-m">${s.pages[0].no}</span>${s.pages.length > 1 ? ` to <span class="hg-m">${s.pages[s.pages.length - 1].no}</span>` : ''}</span></li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']];
    const inner = `<div class="hg-who"><p class="hg-lab">Who to ask</p><p class="hg-who__n hg-disp">${A(c.owner)}</p><p class="hg-who__e hg-m">${A(c.email)}</p><p class="hg-note">${A(c.owner)} owns these guidelines. Write for a logo file, a missing asset or an exception to a rule.</p></div>
<div class="hg-split"><div>${label('In this set')}<ol class="hg-set">${set}</ol></div><div>${label('Not in this set')}${notes(not.map(([a, b], i) => [i + 1, `<p class="hg-note">${a}. <span class="hg-q">${b}</span></p>`]))}</div></div>
<div class="hg-block">${label('Revisions')}<div class="hg-rec"><span class="hg-m">${A(B.version.number)}</span><span class="hg-note">${A(date)}</span><span class="hg-note">Issued for use</span><span class="hg-note">${A(c.owner)}</span></div></div>`;
    return sheet(ctx, 'contact-scope', { drawing: 'Contact and scope', scale: 'Not to scale' }, inner);
  },
};
void r1; void dimH; void dimV;
