// The facts behind the style guide (`guide` format), worked out once from the brand so the themes' pages and the markdown file can never disagree.
// A theme draws these; it does not recompute them. Nothing here depends on a theme.

// WCAG 2.2 1.4.3 grade for a contrast ratio (the same four grades the app's style guide uses)
export const grade = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail');

const remText = (px) => `${(px / 16).toFixed(4).replace(/\.?0+$/, '')}rem`;

// A face by the name it is set in: a face drawn at a width other than the normal one carries the width's name ("Archivo Expanded"), so a rebuild picks the same width.
const WIDTHS = { 75: 'Condensed', 87.5: 'Semi Condensed', 112.5: 'Semi Expanded', 125: 'Expanded', 150: 'Extra Expanded' };
export const fontName = (f) => (f.stretch && f.stretch !== 100 && WIDTHS[f.stretch] ? `${f.family} ${WIDTHS[f.stretch]}` : f.family);
export const WEIGHT_NAMES = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

// Every colour of the brand, biggest share first, with the brand colour that reads best on it and how well.
export function colourFacts(ctx) {
  const all = [...ctx.colours];
  return all.sort((a, b) => b.share - a.share).map((c) => {
    const best = all.filter((o) => o.id !== c.id).reduce((a, b) => (ctx.ratio(b.hex, c.hex) > ctx.ratio(a.hex, c.hex) ? b : a));
    const r = ctx.ratio(best.hex, c.hex);
    return {
      id: c.id, name: c.name, role: c.role, hex: c.hex.toUpperCase(), share: c.share, rgb: ctx.C.hexToRgb(c.hex), cmyk: c.cmyk || null,
      ink: { id: best.id, name: best.name, hex: best.hex.toUpperCase(), ratio: r, ratioText: ctx.fmt(r), grade: grade(r) },
    };
  });
}

// The role a colour goes by on the pages and in the markdown: the brand colour that is never the button is "Brand" (the action role is the brand's, and the button is another colour),
// and the text colour that is the button says so.
export function roleLabel(ctx, c) {
  const act = (ctx.roles.light.action || '').toLowerCase(), hex = c.hex.toLowerCase(), cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  if (c.role === 'action' && act && hex !== act) return 'Brand';
  if (c.role === 'text' && hex === act) return 'Text, the button';
  return cap(c.role);
}

// The brand colour that carries the brand: the one with the action role, else the biggest colour that is not the ground.
export function primaryColour(ctx) {
  const cs = ctx.colours;
  return cs.find((c) => c.role === 'action') || [...cs].filter((c) => c.role !== 'ground').sort((a, b) => b.share - a.share)[0] || cs[0];
}

// The type ladder, biggest first, with rem against a 16 px root.
// A brand whose wordmark is cut heavier than its cover lines says so once, in these words, on the page and in the markdown.
export function displayWeightNote(ctx) {
  const d = ctx.brand.fonts.display, W = ctx.weights;
  return W.logo !== W.heading ? `${fontName(d)} ${WEIGHT_NAMES[W.logo]} ${W.logo} is for the wordmark; ${WEIGHT_NAMES[W.heading]} ${W.heading} sets cover lines and headlines.` : null;
}
export function typeLadder(ctx) {
  return [...ctx.brand.type.scale].sort((a, b) => b.size - a.size).map((t) => ({
    token: t.token, name: ctx.cap(t.token), size: t.size, line: Math.round(t.size * t.line), lineRatio: t.line, weight: t.weight, face: t.face,
    family: t.face === 'display' ? fontName(ctx.brand.fonts.display) : ctx.brand.fonts.body.family, use: t.use, rem: remText(t.size),
  }));
}

// The pairs the brand sets text in, with grade; and how many other pairs fail and are never used for text. A tone (a colour the brand names that is not on the colour page) is
// called by its own name and listed on the colour page. One value per role: tones that share a role (a quiet grey for each ground) are one tone, the one that reads best on every
// ground its role is set on, named by the role. Each pair also says how it is drawn: `sample` is the type step of its role, at that step's smallest size.
// a display step is drawn in the face's heading weight, as the type page draws it
const drawnWeight = (ctx, t) => (t.face === 'display' ? ctx.weights.heading : t.weight);
const roleName = (r) => r.charAt(0).toUpperCase() + r.slice(1);
function sampleOf(ctx, p, ladder) {
  const display = ladder.filter((t) => t.face === 'display'), body = ladder.filter((t) => t.face !== 'display');
  const smallest = (l) => l.reduce((a, b) => (b.size < a.size ? b : a));
  const step = (t, size = t.size) => ({ token: t.token, name: t.name, face: t.face, size, weight: drawnWeight(ctx, t), line: t.lineRatio });
  if (p.minSize) return step(smallest(display), p.minSize);
// eslint-disable-next-line no-control-regex
  if (/large/i.test(p.use)) return step(smallest(display));
  const named = ladder.filter((t) => new RegExp(`\\b${t.token}s?\\b`, 'i').test(p.use));
  if (named.length) return step(smallest(named));
// eslint-disable-next-line no-control-regex
  if (/buttons?/i.test(p.use)) { const b = ladder.find((t) => /buttons?/i.test(t.use)); if (b) return step(b); }
  return step(ladder.find((t) => t.token === 'body') || smallest(body));
}
export function contrastFacts(ctx) {
  const tone = (id) => (ctx.colours.some((c) => c.id === id) ? null : ctx.byId[id]);
  const ladder = typeLadder(ctx), merged = {};
  for (const role of new Set(ctx.pairs.map((p) => tone(p.fg)).filter(Boolean).map((t) => t.role))) {
    const ps = ctx.pairs.filter((p) => tone(p.fg) && tone(p.fg).role === role), ids = [...new Set(ps.map((p) => p.fg))];
    if (ids.length < 2) continue;
    const worst = (id) => Math.min(...ps.map((p) => ctx.ratio(ctx.byId[id].hex, p.bgHex)));
    merged[role] = ids.reduce((a, b) => (worst(b) > worst(a) ? b : a));
  }
  const seen = new Map();
  const note = (id, name) => { const t = tone(id); if (t && !seen.has(id)) seen.set(id, { id, name, hex: t.hex.toUpperCase(), role: t.role }); return name; };
  const pairs = ctx.pairs.map((p) => {
    const tf = tone(p.fg), joined = tf && merged[tf.role], fg = joined || p.fg, fgHex = ctx.byId[fg].hex, ratio = ctx.ratio(fgHex, p.bgHex);
    const fgName = note(fg, joined ? roleName(tf.role) : ctx.byId[fg].name), bgName = note(p.bg, ctx.byId[p.bg].name);
    // a tone named for its ground ("Quiet on White") is not told the ground twice
    const label = fgName.toLowerCase().endsWith(` on ${bgName.toLowerCase()}`) ? fgName : `${fgName} on ${bgName}`;
    return {
      fg, bg: p.bg, fgHex, bgHex: p.bgHex, fgName, bgName, label, ratio, ratioText: ctx.fmt(ratio), grade: grade(ratio),
      use: p.use, large: !!p.large, minSize: p.minSize || null, sample: sampleOf(ctx, p, ladder),
    };
  });
  // contrast is the same either way round, so a failing pair is counted once (the pages and the markdown say one number)
  const failKeys = new Set(ctx.unusedPairs.map((p) => [p.fgHex, p.bgHex].map((x) => x.toLowerCase()).sort().join('|')));
  // the colours the interface itself sets that are on neither the colour list nor a contrast pair: quiet text, hover, rules, the disabled pair. A brand's own name for a grey is kept.
  const L = ctx.roles.light, onList = new Set([...ctx.colours.map((c) => c.hex.toLowerCase()), ...[...seen.values()].map((t) => t.hex.toLowerCase())]);
  const brandTone = (hex) => (ctx.brand.tones || []).find((o) => o.hex.toLowerCase() === hex.toLowerCase());
  const interfaceTones = [];
  for (const [hex, name, role] of [[L.quiet, 'Quiet text', 'captions and labels'], [L.actionHover, 'Action hover', 'hover'], [L.actionPressed, 'Action pressed', 'pressed'], [L.divider, 'Hairline', 'rules'], [L.disabledBg, 'Disabled fill', 'disabled'], [L.disabledText, 'Disabled text', 'disabled']]) {
    if (hex && !onList.has(hex.toLowerCase())) { onList.add(hex.toLowerCase()); interfaceTones.push({ name: (brandTone(hex) || {}).name || name, hex: hex.toUpperCase(), role }); }
  }
  return { pairs, tones: [...seen.values()], interfaceTones, failing: failKeys.size, largeOnly: pairs.some((p) => p.minSize) };
}

// The colours of a button's states, each by a palette name (a colour or tone of the brand; else the name of the ui token that holds it; else the action colour's name with the state) with the contrast
// of its label on it. A hover that is the same fill as the action has no row. `nameFor(hex)` lets a theme name a state colour its own way. The pages and the markdown both read this.
export function stateFacts(ctx, nameFor = () => null) {
  const L = ctx.roles.light, tones = contrastFacts(ctx).tones, same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const uiName = (hex) => { const k = Object.keys(L).find((q) => typeof L[q] === 'string' && same(L[q], hex) && /^(raised|sunken)$/.test(q)); return k ? k.charAt(0).toUpperCase() + k.slice(1) : null; };
  const known = (hex) => { const c = [...ctx.colours, ...tones].find((x) => same(x.hex, hex)); return c ? c.name : nameFor(hex) || uiName(hex); };
  const act = ctx.colours.find((c) => same(c.hex, L.action)) || primaryColour(ctx);
  const one = (cap, hex, name, label, labelName) => {
    const ratio = ctx.ratio(label, hex);
    return { cap, hex: hex.toUpperCase(), name, label, labelName, ratio, ratioText: ctx.fmt(ratio), grade: grade(ratio) };
  };
  const fillName = known(L.disabledBg) || 'Disabled fill';
  const hover = same(L.actionHover, L.action) ? null : one('Hover', L.actionHover, known(L.actionHover) || `${act.name} hover`, L.actionLabel, known(L.actionLabel) || 'Label');
  const list = [hover, one('Pressed', L.actionPressed, known(L.actionPressed) || `${act.name} pressed`, L.actionLabel, known(L.actionLabel) || 'Label'), one('Disabled', L.disabledBg, fillName, L.disabledText, known(L.disabledText) || 'Label')].filter(Boolean);
  // a label colour that is neither on the palette nor one of the contrast tones is listed as a tone, so no page names a colour that is not listed
  const labelTones = list.filter((q) => !ctx.colours.some((c) => same(c.hex, q.label)) && !tones.some((t) => same(t.hex, q.label)) && !list.some((o) => same(o.hex, q.label)))
    .filter((q, i, all) => all.findIndex((o) => same(o.label, q.label)) === i).map((q) => ({ name: q.labelName, hex: q.label.toUpperCase(), role: 'label', use: `${q.cap} label` }));
  // the outlined button's hover fill (the usage page names it): listed as a tone too when it is neither on the palette nor already a tone
  const ofill = L.raised;
  if (ofill && !ctx.colours.some((c) => same(c.hex, ofill)) && !tones.some((t) => same(t.hex, ofill)) && !list.some((o) => same(o.hex, ofill)) && !labelTones.some((t) => same(t.hex, ofill))) labelTones.push({ name: known(ofill) || ofill.toUpperCase(), hex: ofill.toUpperCase(), role: 'hover', use: 'Outlined button hover' });
  return { hover, plainHover: !hover, list, labelTones };
}
// the tones the colour page lists under its colours: the contrast tones that are not a state colour (those sit with the states), and the label and hover colours off the palette
export function listedTones(ctx, nameFor) {
  const SF = stateFacts(ctx, nameFor);
  return [...contrastFacts(ctx).tones.filter((t) => !SF.list.some((q) => q.hex.toLowerCase() === t.hex.toLowerCase())), ...SF.labelTones];
}

// The logo: each colourway on the ground it is drawn for, the clear-space unit, and the smallest size.
const capWords = (k) => { const t = k.replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
export function logoFacts(ctx) {
  const L = ctx.logo, cws = ctx.brand.logo.colourways;
  const named = (hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name || hex.toUpperCase();
  const grounds = Object.entries(cws).map(([key, cw]) => ({ key, label: L.labels[key] || capWords(key), ground: named(cw.ground), groundHex: cw.ground, cw }));
  // the clear space as a fraction of the name's cap height: the one measure the slot and showcase editions share (the logo's own height differs between them)
  const unitCap = Math.round((L.geo.unit / L.geo.cap) * 100) / 100;
  return { grounds, clearShare: L.clearShare, unitCap, unitText: unitCap === 1 ? 'one cap height' : `${unitCap} of a cap height`, min: L.minSize };
}

// Tokens that share a value are one row: radius-control and radius-card at 0 px are one square, not two.
const merge = (list) => {
  const out = [];
  for (const t of list) {
    const f = out.find((o) => o.px === t.px);
    if (f) { f.tokens.push(t.token); if (!f.uses.includes(t.use)) f.uses.push(t.use); } else out.push({ px: t.px, tokens: [t.token], uses: [t.use] });
  }
  return out;
};
export const tokenGroups = (ctx) => ({ space: ctx.space, radii: merge(ctx.radii), borders: merge(ctx.borders) });

// How a button, a card and a link are built from the brand's tokens: the values the usage page draws and the markdown lists. Type is always a step of the type page (its own name and
// size), and a colour is always a palette colour by name.
export function usageFacts(ctx) {
  const B = ctx.brand, L = ctx.roles.light, ladder = typeLadder(ctx).map((t) => ({ ...t, weight: drawnWeight(ctx, t) }));
  const named = (hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name || hex.toUpperCase();
  const spaceTok = (px) => ctx.space.reduce((a, b) => (Math.abs(b.px - px) <= Math.abs(a.px - px) ? b : a));
  const radius = (tk) => ctx.radii.find((r) => r.token === tk) || ctx.radii[0];
  const near = (list, px) => list.reduce((a, b) => (Math.abs(b.size - px) < Math.abs(a.size - px) ? b : a));
  // the brand's own screen scale (brand.json ui.type) where it has one: a control, a link and a card's text are set from it, in the weight it gives, and the pages and the markdown say its step
  const uiStep = (token) => {
    const u = Array.isArray(B.ui.type) && B.ui.type.find((t) => t.token === token);
    return u ? { token: u.token, name: ctx.cap(u.token), size: u.size, line: u.line, lineRatio: u.line / u.size, weight: drawnWeight(ctx, u), face: u.face, family: u.face === 'display' ? fontName(B.fonts.display) : B.fonts.body.family, use: u.use, rem: remText(u.size) } : null;
  };
  const bodyFace = ladder.filter((t) => t.face !== 'display');
  const body = uiStep('body') || ladder.find((t) => t.token === 'body') || near(bodyFace, 16);
  const control = uiStep('control') || ladder.find((t) => /\bbuttons?\b/i.test(t.use)) || near(bodyFace, 16), title = ladder.find((t) => t.token === 'title') || near(ladder, 20);
  // the card is on a palette colour: the raised surface when the palette has it, else the palette's panel colour
  const raised = ctx.colours.find((c) => c.hex.toLowerCase() === L.raised.toLowerCase()) || ctx.colours.find((c) => c.role === 'panel') || ctx.colours.find((c) => c.role === 'ground') || ctx.colours[0];
  const ex = (B.ui.screen && B.ui.screen.content && B.ui.screen.content.example) || {}, S = B.type.sample;
  // a brand with no shadows lifts a card with its control edge in the text colour (its elevation note says so); any other card sits on the hairline
  const flat = (B.ui || {}).shadows === 'none', cardEdge = ctx.borders.find((b) => b.token === (flat ? 'border-control' : 'border-hairline')), cardEdgeName = flat ? named(L.text) : named(L.divider);
  const padY = spaceTok(Math.round((44 - control.line) / 2)), padX = spaceTok(24), pad = spaceTok(24);
  return {
    button: {
      fill: L.action, fillName: named(L.action), label: L.actionLabel, labelName: named(L.actionLabel), edge: L.actionEdge || null, radius: radius('radius-button'),
      type: control, padY, padX, border: ctx.borders.find((b) => b.token === 'border-control'), borderColour: L.border, ink: L.text,
      primary: ex.small || 'Continue', secondary: ex.secondary || 'Back',
    },
    card: { fill: raised.hex, fillName: raised.name, edgeColour: flat ? L.text : L.divider, radius: radius('radius-card'), pad, border: ctx.borders.find((b) => b.token === 'border-hairline'), edge: cardEdge, edgeName: cardEdgeName, title, body, titleText: S.headline, bodyText: S.paragraph },
    link: { type: body, text: (ex.links && ex.links[0] && ex.links[0][0]) || 'Read more', border: ctx.borders.find((b) => b.token === 'border-control') },
  };
}

// n rows share `total` px by weight: a row is as tall as its share of what is left, and never under `min`. A row that would be under `min` is held at `min` and the rest share what
// is left in proportion, so every row that is not held is in proportion to its share. Whole px, the last row ending on the foot.
export function shareByWeight(total, shares, min, gap) {
  const n = shares.length, avail = total - gap * (n - 1);
  if (n * min > avail) throw new Error(`${n} rows of at least ${min} px do not fit in ${total} px`);
  const held = new Set();
  let raw;
  for (;;) {
    const free = avail - held.size * min, sum = shares.reduce((t, v, i) => (held.has(i) ? t : t + v), 0);
    raw = shares.map((v, i) => (held.has(i) ? min : (free * v) / sum));
    const low = raw.findIndex((r, i) => !held.has(i) && r < min);
    if (low < 0) break;
    held.add(low);
  }
  const out = raw.map(Math.floor);
  let left = avail - out.reduce((x, y) => x + y, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).filter(([, i]) => !held.has(i)).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
  return out;
}

// ---- the page frame every themed guide shares (A4 portrait, 794 x 1123): one grid, and the rule that content fills the page ----
// Three columns 216 wide with 25 between, from x 48 to 746. The content hangs from `top` and runs down to a gap above the note, and the note (which hugs its text, as wide as
// the measure) is pinned to the foot at `bottom`, so no page stops half way down. A theme draws inside this; it does not choose its own measures.
export const GUIDE_FRAME = { x: 48, w: 698, cols: [48, 289, 530], colW: 216, top: 168, bottom: 1035, gap: 24, band: 32 };

// the room the content has on a page whose label card is `cardH` tall
export const guideRoom = (cardH) => ({ top: GUIDE_FRAME.top, bottom: GUIDE_FRAME.bottom - cardH - GUIDE_FRAME.gap, h: GUIDE_FRAME.bottom - cardH - GUIDE_FRAME.gap - GUIDE_FRAME.top });

// n equal rows share `total` px with `gap` between them: whole px, the left-over px going to the first rows, so the last row ends exactly at the bottom.
// `max` stops a few rows being stretched into slabs; the rows are then shorter than the room and the caller sees it in the sum.
export function shareRows(total, n, gap, max = Infinity) {
  const free = total - gap * (n - 1), base = Math.min(max, Math.floor(free / n)), rest = base === max ? 0 : free - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export const GRADE_NOTE = 'Ratios follow WCAG 2.2 1.4.3. AA needs 4.5:1 for normal text and 3:1 for large text (24 px, or 19 px bold); AAA needs 7:1.';

// ---- the markdown file, for Notion and Google Docs: the same content in the same order as the pages ----
// A theme whose pages say something the facts above do not (its own tone list, its lockups, the words of its button) sets `ctx.mdHooks` while it draws its pages, so the file says what the pages say.
// Every hook is optional; a theme that sets none (theme 25) gets the file the facts give.
//   tones [{name, hex, use}]: the tones list   lockups [[name, when]]: a Lockups table under the colourways   supply [[item, text]]: a "What you supply" table (the slot edition)
//   states {Pressed: name}: a state's fill by another name   contrast [[pair, ratio, grade, use]]: the contrast rows as the page draws them   borders [[tokens, value]]: the border rows
//   usage {button, card, link}: the words for a part   displayNote (a string, or null for none)   logoIntro: the Logo section's first sentence
//   sections [{after: 'Logo'|'Colour'|'Typography'|'Contrast'|'Tokens'|'Usage', title, lines}]: a section the theme's pages have and the facts do not (the sections are numbered after they are placed)
export function styleGuideMarkdown(ctx) {
  const H = ctx.mdHooks || {};
  const B = ctx.brand, pc = primaryColour(ctx), cs = colourFacts(ctx), ladder = typeLadder(ctx), ct = contrastFacts(ctx), lg = logoFacts(ctx), tg = tokenGroups(ctx), us = usageFacts(ctx), sf = stateFacts(ctx), tones = H.tones || listedTones(ctx);
  // a cell never breaks the table: a pipe in a brand's own words is escaped, a line break becomes a space
  const cell = (c) => String(c).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const row = (...c) => `| ${c.map(cell).join(' | ')} |`;
  const dnote = 'displayNote' in H ? H.displayNote : displayWeightNote(ctx);
  const table = (head, rows) => [row(...head), row(...head.map(() => '---')), ...rows.map((r) => row(...r)), ''];
  // each section is its own list of lines, so a theme's own can go in after the one it follows; the heading numbers are put on last
  const S = {};
  S.head = [
    `# ${B.name}: Style Guide`, '',
    `Version ${B.version.number}, ${ctx.date}`, '',
    row('', ''), row('---', '---'),
    row('Primary', pc.name), row('Colours', cs.length), row('Headings', fontName(B.fonts.display)), row('Body', B.fonts.body.family),
    row('Scale', `${ladder.length} steps, ${ladder[ladder.length - 1].size} to ${ladder[0].size} px`), '',
  ];
  S.Logo = [
    '## Logo', '',
    H.logoIntro || `The logo in each colourway, on the ground it is drawn for. The clear space is ${lg.unitText} on every side; the cap height is the height of the first letter of the name. The smallest it goes is ${lg.min.screenPx} px wide on screen and ${lg.min.printMm} mm wide in print.`, '',
    row('Colourway', 'Ground'), row('---', '---'),
    // the colourways the Logo page draws, under the names it gives them (a theme that draws fewer sets ctx.logoShown, so the md never lists a colourway the page lacks)
    ...(ctx.logoShown ? lg.grounds.filter((g) => ctx.logoShown.some((t) => t.key === g.key)).map((g) => row(ctx.logoShown.find((t) => t.key === g.key).label, `${g.ground} \`${g.groundHex.toUpperCase()}\``)) : lg.grounds.map((g) => row(g.label, `${g.ground} \`${g.groundHex.toUpperCase()}\``))), '',
    ...(H.lockups ? ['The lockups, and where each is used:', '', ...table(['Lockup', 'Use'], H.lockups)] : []),
    ...(H.supply ? ['What you supply:', '', ...table(['Item', 'What it is'], H.supply)] : []),
  ];
  S.Colour = [
    '## Colour', '',
    'Each colour with the brand colour that reads best on it, and the contrast ratio between them.', '',
    row('Colour', 'Role', 'Hex', 'RGB', 'Text on it', 'Ratio', 'Grade'), row('---', '---', '---', '---', '---', '---', '---'),
    ...cs.map((c) => row(c.name, roleLabel(ctx, c), `\`${c.hex}\``, c.rgb.join(' '), c.ink.name, `${c.ink.ratioText}:1`, c.ink.grade)), '',
    ...(tones.length ? ['Tones the guide uses, which are not on the colour list:', '', row('Tone', 'Role', 'Hex'), row('---', '---', '---'), ...tones.map((t) => row(t.name, t.use || t.role, '`' + t.hex + '`')), ''] : []),
    'The states of the button, each with the contrast of its label on it:', '',
    row('State', 'Fill', 'Hex', 'Label', 'Ratio', 'Grade'), row('---', '---', '---', '---', '---', '---'),
    ...sf.list.map((q) => row(q.cap, (H.states || {})[q.cap] || q.name, '`' + q.hex + '`', q.labelName, `${q.ratioText}:1`, q.grade)), '',
    `> ${GRADE_NOTE}`, '',
  ];
  S.Typography = [
    '## Typography', '',
    `Headings in ${fontName(B.fonts.display)}, body in ${B.fonts.body.family}${B.fonts.mono ? `, values in ${B.fonts.mono.family}` : ''}. Sizes in px against a 16 px root.`, '',
    row('Step', 'Face', 'Size', 'rem', 'Line', 'Weight', 'Use'), row('---', '---', '---', '---', '---', '---', '---'),
    ...ladder.map((t) => row(t.name, t.family, `${t.size} px`, t.rem, `${t.line} px`, drawnWeight(ctx, t), t.use)), '',
    ...(dnote ? [dnote, ''] : []),
  ];
  S.Contrast = [
    '## Contrast', '',
    `${ct.pairs.length} pairs carry text in the brand.`, '',
    row('Pair', 'Ratio', 'Grade', 'Used for'), row('---', '---', '---', '---'),
    ...(H.contrast ? H.contrast.map((r) => row(...r)) : ct.pairs.map((p) => row(p.label, `${p.ratioText}:1`, p.grade, p.minSize && !p.use.includes(`${p.minSize} px`) ? `${p.use} (from ${p.minSize} px)` : p.use))), '',
  ];
  S.Tokens = [
    '## Tokens', '',
    row('Token', 'Value'), row('---', '---'),
    ...tg.space.map((s) => row(`\`${s.token}\``, `${s.px} px`)),
    ...tg.radii.filter((r) => r.px < 9999 || (B.ui.radius || {}).round !== undefined).map((r) => row(r.tokens.map((t) => `\`${t}\``).join(', '), r.px >= 9999 ? 'full' : `${r.px} px`)),
    ...(H.borders ? H.borders.map((r) => row(...r)) : tg.borders.map((b) => row(b.tokens.map((t) => `\`${t}\``).join(', '), `${b.px} px`))), '',
  ];
  S.Usage = [
    '## Usage', '',
    'A button, a card and a link, built from the tokens above.', '',
    row('Part', 'Built from'), row('---', '---'),
    row('Button', (H.usage || {}).button || `${us.button.fillName} fill, ${us.button.labelName} label, \`${us.button.radius.token}\` ${us.button.radius.px} px, ${us.button.type.name} ${us.button.type.size}/${us.button.type.line} px at ${us.button.type.weight}, \`${us.button.padY.token}\` over and \`${us.button.padX.token}\` across`),
    row('Card', (H.usage || {}).card || `${us.card.fillName} fill, \`${us.card.radius.token}\` ${us.card.radius.px} px, \`${us.card.edge.token}\` ${us.card.edge.px} px ${us.card.edgeName} edge, padding \`${us.card.pad.token}\`, ${us.card.title.name} ${us.card.title.size}/${us.card.title.line} px for the title and ${us.card.body.name} ${us.card.body.size}/${us.card.body.line} px for the text`),
    row('Link', (H.usage || {}).link || `${us.link.type.name} ${us.link.type.size}/${us.link.type.line} px at ${us.link.type.weight}, underlined at \`${us.link.border.token}\` ${us.link.border.px} px`), '',
  ];
  const lines = [...S.head];
  let n = 0;
  const put = (sec) => { n += 1; lines.push(sec[0].replace('## ', `## ${String(n).padStart(2, '0')} · `), ...sec.slice(1)); };
  // a themed guide sets ctx.pagesDrawn: a section whose page was left out is left out of the file too
  const PAGE = { Logo: 'logo', Colour: 'colour', Typography: 'type', Contrast: 'contrast', Tokens: 'tokens', Usage: 'usage' };
  const drawn = (k) => !Array.isArray(ctx.pagesDrawn) || ctx.pagesDrawn.includes(PAGE[k]);
  for (const k of ['Logo', 'Colour', 'Typography', 'Contrast', 'Tokens', 'Usage']) {
    if (drawn(k)) put(S[k]);
    for (const x of (H.sections || []).filter((s) => s.after === k)) put([`## ${x.title}`, '', ...x.lines, '']);
  }
  return lines.join('\n');
}
