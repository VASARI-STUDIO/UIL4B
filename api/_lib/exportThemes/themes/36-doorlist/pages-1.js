// Theme 36, Doorlist: pages 1 to 7 (cover, contents, the Brand opener, who we are, voice, words, the Logo opener).
// Encore's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note.
import { SECTIONS, fullFolio, pad, groundsOf, tones, onTone, mix, at, hr, fill, svgAt, field, measure, word, baseTop, ghost, ghostRule, isGhost, hl, PHOTO_NOTE, nameOf, page } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';

const sec = (open) => SECTIONS.find((s) => s.open === open);
const logoHtml = (ctx, id, opts) => { try { return ctx.logo.html(id, opts); } catch (e) { const { colourway, ...rest } = opts; return ctx.logo.html(id, rest); } };
// a slot line with no mono note of its own
const gl = (ctx, line) => ghostRule(ctx, line, '');
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;

// ---- the opener, family WB "Wristband" ----
// a band y 192 to 480 across the page in the section's band colour; a die cut at x 1072 sets off the tab (the mark and a serial); the section name fitted to 992 and capped at 176,
// baseline y 408; the section's pages under the band, one to a column, each with its entry number.
function opener(ctx, open) {
  const s = sec(open), n = fullFolio(open), G = groundsOf(ctx), M = measure(ctx), E = ctx.esc;
  const ground = G[s.ground], band = G[s.band], tb = tones(ctx, band), nameInk = onTone(ctx, G[s.ink], band, 3);
  const size = Math.min(176, M.fit(s.name, 992, 176));
  const cw = s.band === 'red' ? 'reversed' : 'colour';
  const serial = `No. ${copy(ctx, 'page.serial', '0000')}-${pad(n)}`;
  let out = fill(0, 192, 1280, 288, band) + fill(1072, 192, 2, 288, ground)
    + at(48, 214, 992, 16, `<span class="lb" style="color:${tb.ink}">${E(nameOf(ctx))}. Section ${s.n} of ${SECTIONS.length}. Not transferable.</span>`)
    + word(M, 48, 408, E(s.name), size, { style: `color:${nameInk}` })
    + at(1141, 262, 72, 72, logoHtml(ctx, 'symbol', { width: 72, colourway: cw }))
    + at(1074, 352, 206, 16, `<span class="m" style="color:${tb.ink}">${E(serial)}</span>`, { style: 'text-align:center' });
  s.pages.forEach(([id, name], i) => {
    const x = 48 + i * 300;
    out += hr(x, 520, 284, 'var(--hair)') + at(x, 530, 284, 18, `<span class="m q">${pad(fullFolio(id))}</span>`)
      + word(M, x, 574, E(name), 22);
  });
  return page(ctx, open, ground, out);
}

// ---- 1 Cover, family HS "Hand stamp" ----
function cover(ctx) {
  const G = groundsOf(ctx), t = tones(ctx, G.night), M = measure(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const cx = 1008, cy = 200, R = 280, disc = slot ? mix(G.night, G.stock, 0.14) : G.red, groove = mix(disc, G.night, slot ? 0.4 : 0.28);
  let rings = '';
  for (let k = 0; k < 48; k++) rings += `<circle cx="${cx}" cy="${cy}" r="${70 + k * 4}" fill="none" stroke="${groove}" stroke-width="1"/>`;
  const stamp = svgAt(0, 0, 1280, 672, `<g transform="rotate(-8 ${cx} ${cy})"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${disc}"/>${rings}`
    + `<circle cx="${cx}" cy="${cy}" r="58" fill="${G.night}"/><circle cx="${cx}" cy="${cy}" r="6" fill="${disc}"/><rect x="${cx - 3}" y="${cy - 58}" width="6" height="14" fill="${disc}"/></g>`);
  const nm = nameOf(ctx) || 'Your name', size = M.fit(nm, 1184, 300);
  const mark = word(M, 48, 432, E(nm), size, {}) + (slot ? at(48, 448, 700, 16, nt(ctx, 'Your logo, SVG, replaces the name.')) : '');
  const red = onTone(ctx, G.red, G.night, 4.5);
  let line;
  if (slot) line = ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary', 'Your line, one sentence.', { what: false, example: false });
  else line = `${E(copy(ctx, 'page.cover.a', ''))} <span style="color:${red}">${E(copy(ctx, 'page.cover.b', ''))}</span>`;
  const ver = copy(ctx, 'page.cover.ver', String(ctx.versionLine || 'Version 1.0'));
  const lead = word(M, 48, 528, line, 44, { style: slot ? 'white-space:normal;width:1000px' : '' });
  const title = at(48, 572, 900, 24, `<span class="b">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))} ${E(ver)}</span>`, { style: 'color:var(--quiet)' });
  return page(ctx, 'cover', G.night, stamp + mark + lead + title);
}

// ---- 2 Contents, family CL "Clipboard list" ----
// the whole list in three columns of 384, rows of 32 from y 160: seven heads (the section, its opener's number and a chip of the band colour) and every other page by name.
function contents(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const row = (x, y, num, inner, head) => at(x, y, 384, 40, `<span class="mono13 ${head ? '' : 'q'}" style="position:absolute;left:0;top:11px">${num}</span>${inner}`) + hr(x, y + 39, 384, 'var(--hair)');
  const items = [
    { id: 'cover', t: 'You' }, { id: 'contents', t: 'Contents' },
    ...SECTIONS.flatMap((s) => [{ head: s }, ...s.pages.map(([id, t]) => ({ id, t }))]),
  ];
  const cols = [items.slice(0, 11), items.slice(11, 21), items.slice(21)];
  let out = '';
  cols.forEach((col, ci) => {
    const x = 48 + ci * 400;
    col.forEach((it, ri) => {
      const y = 160 + ri * 40;
      if (it.head) {
        const s = it.head;
        out += row(x, y, pad(fullFolio(s.open)), `<span style="position:absolute;left:56px;top:12px;width:16px;height:16px;background:${G[s.band]};border:1px solid ${G.night}"></span><span class="lb" style="position:absolute;left:84px;top:12px">${E(s.name)}</span>`, true);
      } else {
        const label = it.id === 'cover' ? hl(ctx, E(it.t)) : E(it.t);
        out += row(x, y, pad(fullFolio(it.id)), `<span style="position:absolute;left:56px;top:0;line-height:40px;white-space:nowrap">${label}</span>`);
      }
    });
  });
  const title = word(M, 48, 112, E(copy(ctx, 'page.contents.title', 'Contents')), 44);
  const line = slot ? gl(ctx, 'Your event or company, one line.') : E(copy(ctx, 'page.contents.line', ''));
  return page(ctx, 'contents', G.stock, title + at(48, 120, 900, 28, `<span class="b q" style="color:var(--quiet)">${line}</span>`) + hr(48, 160, 1184, 'var(--ink)', 2) + out);
}

// ---- 4 Who we are, family BR "Back of the room" ----
function who(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const desc = copy(ctx, 'description'), ghosted = slot && isGhost(ctx, desc);
  const h1 = ghosted ? ghostRule(ctx, 'What the brand is, in one sentence.', '15 to 25 words.') : E(desc);
  let pic, note = '';
  if (!slot) pic = at(0, 0, 1280, 672, photo(ctx, 'IMG-01', { w: 1280, h: 672, fx: 0.5, fy: 0.62 }));
  else {
    const r = 403, c = mix(G.stage, G.stock, 0.1);
    pic = field(ctx, 0, 0, 1280, 672, G.stage, svgAt(0, 0, 1280, 672, `<circle cx="1120" cy="336" r="${r}" fill="${c}"/>`));
    note = at(704, 616, 528, 40, nt(ctx, PHOTO_NOTE));
  }
  const head = at(48, 291, 592, 280, `<h1 class="h1" style="color:${tones(ctx, slot ? G.stage : G.night).ink}">${h1}</h1>`, { style: 'display:flex;align-items:flex-end' });
  const bodyTxt = slot ? gl(ctx, 'One line on who it is for.') : E(copy(ctx, 'page.who.body', ''));
  const body = at(48, baseTop(608, 16, 24), 592, 24, `<div class="b" style="color:${tones(ctx, slot ? G.stage : G.night).ink}">${bodyTxt}</div>`);
  return page(ctx, 'who', slot ? G.stage : G.night, pic + head + body + note);
}

// ---- 5 Voice, family VL "Volumes" ----
// three registers at three volumes, ruled: labels in x 48 to 332, lines from x 348
function voice(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const reg = (y, label, k) => at(48, y, 284, 80, `<div class="lb">${label}</div>` + (slot ? '' : `<div class="b" style="margin-top:8px;color:var(--quiet)">${E(copy(ctx, `page.voice.rule.${k}`, ''))}</div>`));
  const poster = slot ? gl(ctx, 'A line for a poster') : [0, 1, 2].map((i) => E(copy(ctx, `page.voice.${i}`, ''))).join('<br>');
  const ticket = slot ? gl(ctx, 'A line for a ticket, with names and a place') : E(copy(ctx, 'page.voice.t', ''));
  const small = slot ? gl(ctx, 'A line of small print') : E(copy(ctx, 'page.voice.s', ''));
  const out = reg(64, 'Poster', 0) + at(348, 64, 884, 259, `<div class="big" style="font-size:84px;line-height:.9;text-wrap:wrap">${poster}</div>`)
    + hr(48, 336, 1184, 'var(--hair)')
    + reg(352, 'Ticket', 1) + at(348, 352, 884, 96, `<div class="big" style="font-size:24px;line-height:1.25;text-wrap:pretty">${ticket}</div>`)
    + hr(48, 480, 1184, 'var(--hair)')
    + reg(528, 'Small print', 2) + at(348, 528, 640, 56, `<div class="b">${small}</div>`)
    + (slot ? at(348, 604, 700, 32, nt(ctx, 'One line for each register, set at the size it is set.')) : '');
  return page(ctx, 'voice', G.night, out);
}

// ---- 6 Words, family HL "Highlighted list" ----
// the boilerplate, then one list of six rows: lines the brand says are highlighted; lines it turns away are set at 64 percent
function words(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const boiler = ghost(ctx, copy(ctx, 'voice.boilerplate25'), 'voice.boilerplate25', 'The brand in about 30 words.');
  let out = at(48, 64, 892, 150, `<p class="big" style="font-size:28px;line-height:36px">${boiler}</p>`) + hr(48, 256, 1184, 'var(--ink)', 2);
  const lines = [];
  for (let i = 0; i < 3; i++) lines.push([copy(ctx, `voice.writeThis.${i}.write`), `voice.writeThis.${i}.write`, true]);
  for (let i = 0; i < 3; i++) lines.push([copy(ctx, `voice.writeThis.${i}.not`), `voice.writeThis.${i}.not`, false]);
  lines.forEach(([v, path, keep], i) => {
    const y = 258 + i * 63.5, txt = slot && isGhost(ctx, v) ? gl(ctx, keep ? 'A line you say' : 'A line you don\'t') : E(v);
    out += at(48, y + 20, 48, 20, `<span class="mono13 q">${pad(i + 1)}</span>`)
      + at(104, y + 10, 940, 44, `<div class="h2" style="line-height:44px;${keep ? '' : 'color:var(--quiet)'}">${keep ? (slot && isGhost(ctx, v) ? `<span class="hl" style="display:inline-block;--quiet:${tones(ctx, G.red).ink};--soft:${tones(ctx, G.red).ink}">${txt}</span>` : hl(ctx, txt)) : txt}</div>`)
      + at(1098, y + 22, 134, 16, `<span class="lb ${keep ? '' : 'q'}">${keep ? 'In' : 'Turned away'}</span>`)
      + hr(48, y + 62.5, 1184, 'var(--hair)');
  });
  if (slot) out += at(104, 648, 900, 16, nt(ctx, 'Three lines you say, three you do not, in your own voice.'));
  return page(ctx, 'words', G.stock, out);
}

export const guidelines = {
  cover,
  contents,
  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  who,
  voice,
  words,
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  'open-type': (ctx) => opener(ctx, 'open-type'),
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  'open-use': (ctx) => opener(ctx, 'open-use'),
  'open-close': (ctx) => opener(ctx, 'open-close'),
};
