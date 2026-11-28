// Theme 36, Doorlist: the showcase copy (Encore). In the showcase edition the pages print this copy so the book reads as finished; a real export is
// the slot edition and never sees this table: it keeps the user's words, or a neutral placeholder where a field is empty. Encore's own words (its venue, its acts, its night, its
// line) live ONLY here, never as a page fallback: Export's test fails on demo trade words. Venue and acts are invented: The Fallow Room, Mira Holt, Sable Coast, The Quiet Engines.
//
//   copy(ctx, 'page.cover.ver', fallback)   a line a page writes itself (keys start "page."): the showcase line in showcase, else `fallback` (neutral)
//   copy(ctx, 'voice.boilerplate25')        a brand path: the showcase line in showcase, else whatever ctx.brand holds (a placeholder sentinel in a slot)
// The result is plain text: pass it through ctx.esc() and never slice, split or match it. Pages 8 to 31 are added by the later slices.

export const SHOWCASE = {
  // brand paths (ctx.brand)
  'description': 'Encore is a live music night in Brunswick. Three acts every Saturday at The Fallow Room.',
  'lines.primary': "Doors at 8. You're on the list.",
  'voice.boilerplate25': "Encore is a live music night in Brunswick. Three acts every Saturday at The Fallow Room, doors at 8. Get your name on the list, or pay at the door if there's room.",
  'voice.writeThis.0.write': 'Doors at 8. First act 8.45.',
  'voice.writeThis.0.not': 'Get ready for an unforgettable night!',
  'voice.writeThis.1.write': "You're on the list.",
  'voice.writeThis.1.not': 'Your booking has been confirmed.',
  'voice.writeThis.2.write': "Sold out. Door sales from 10 pm if there's room.",
  'voice.writeThis.2.not': 'Sorry, this event is no longer available.',
  // list row
  'page.row.venue': 'Encore, Sat 12 Dec',
  // page 1 Cover
  'page.cover.a': 'Doors at 8.',
  'page.cover.b': "You're on the list.",
  'page.cover.title': 'Brand guidelines.',
  'page.cover.ver': 'Version 1.0, December 2026.',
  // page 2 Contents
  'page.contents.title': 'On the list',
  'page.contents.line': 'Saturday 12 December. The Fallow Room, Brunswick. Doors at 8.',
  // page 4 Who we are
  'page.who.body': "For people who go out to hear something they haven't heard yet.",
  // page 5 Voice
  'page.voice.0': 'Doors at 8.',
  'page.voice.1': 'Three acts.',
  'page.voice.2': 'One room.',
  'page.voice.rule.0': 'Lead with the time, then the room.',
  'page.voice.t': 'Mira Holt, with Sable Coast and The Quiet Engines. The Fallow Room, Brunswick.',
  'page.voice.rule.1': 'Name the acts in running order.',
  'page.voice.s': '18+. Bring photo ID. Names stay on the list until 10 pm.',
  'page.voice.rule.2': 'Say what happens, not what is forbidden.',
  // pages 8 to 16
  'page.mark.title': 'The tile and the name.',
  'page.mark.text': 'An E and the repeat sign, the one a musician reads as play it again. It goes on the poster, the ticket and the back of your hand.',
  'page.mark.cap': 'The stamp at the door, 10.40 pm.',
  'page.versions.text': 'Five tickets off one roll. Each is made for one ground; never put one on another.',
  'page.versions.0': 'Poster',
  'page.versions.1': 'Ticket',
  'page.versions.2': 'Wristband',
  'page.versions.3': 'Screen',
  'page.versions.4': 'Print',
  'page.space.text': 'Clear space: g on every side, where g is a quarter of the tile. Nothing enters the ring.',
  'page.pairs.line': "You're on the list.",
  // the opener serial, "No. 1212-03" (the night, 12 Dec)
  'page.serial': '1212',
  // pages 17 to 24
  'page.faces.text': 'Anybody, width 150, weight 800: names, headlines and the list. Work Sans 400: reading and small print. DM Mono: values only.',
  'page.faces.role.0': 'Names, headlines and the list',
  'page.faces.role.1': 'Reading and small print',
  'page.faces.role.2': 'Values only',
  'page.scale.0': 'Mira Holt',
  'page.scale.1': 'with Sable Coast',
  'page.scale.2': 'and The Quiet Engines',
  'page.scale.3': 'Doors 8 pm. First act 8.45.',
  'page.scale.4': '18+. Photo ID.',
  'page.scale.5': 'The Fallow Room, Brunswick.',
  'page.scale.note': 'The scale as a bill: the names loudest, the small print last. Each line is set at its own size.',
  'page.use.text': 'A poster is read from across a laneway. Two names big, one phrase lit in Door red, the rest kept small.',
  'page.use.poster.top': 'Encore. Sat 12 Dec.',
  'page.use.poster.l1': 'Mira',
  'page.use.poster.l2': 'Holt',
  'page.use.poster.l3': 'with Sable Coast',
  'page.use.poster.l4': 'and The Quiet Engines',
  'page.use.poster.phrase': 'Doors at 8.',
  'page.use.poster.foot': 'The Fallow Room, Brunswick.',
  'page.rules.text': 'One line, set three ways. Only the first is let in.',
  'page.rules.sample': "Doors at 8. You're on the list.",
  'page.rules.0': 'Set the line in the dark above the crowd.',
  'page.rules.1': 'Across faces.',
  'page.rules.2': 'Door red type under red light: the colour drops out.',
  'page.grid.text': 'Fifteen rows of 48, ruled like a list. Text sits on rows 2 to 13; photographs stop at row 14.',
  'page.grid.row': 'Row 15 is the list row. It sits on every page and nothing is set under it.',
  // pages 26 to 31
  'page.digital.text': "The hero says one thing: the time and the list. One button, in Door red, and the phone shows the pass the door scans.",
  'page.digital.head': "Doors at 8. You're on the list.",
  'page.digital.sub': 'Three acts every Saturday at The Fallow Room, Brunswick.',
  'page.digital.button': 'Get on the list',
  'page.digital.pass.title': 'Doors at 8.',
  'page.digital.pass.date': 'Sat 12 Dec. Doors 8 pm.',
  'page.digital.pass.admit': 'General admission x 2',
  'page.digital.pass.label': 'Name on the list',
  'page.digital.pass.name': 'Sam Ito',
  'page.print.text': 'A ticket is held in the hand and a wristband is read at the door. Set the date large, light one line in Door red, keep the rest small.',
  'page.print.ticket.date': 'Saturday 12 December 2026',
  'page.print.ticket.place': 'The Fallow Room, Brunswick',
  'page.print.ticket.doors': 'Doors 8 pm',
  'page.print.ticket.kind': 'General admission',
  'page.print.ticket.no': 'No. 1212-0418',
  'page.print.band.date': 'Sat 12 Dec',
  'page.print.band.place': 'The Fallow Room, Brunswick',
  'page.print.band.kind': 'General admission',
  'page.social.text': 'Two to four words, set big. Door red lights one post in six.',
  'page.social.story': "You're on it.",
  'page.social.post.0': 'Sat 12 Dec. Doors 8.',
  'page.social.post.1': 'Mira Holt',
  'page.social.post.2': 'Sold out. Door from 10.',
  'page.summary.line': "Doors at 8. You're on the list.",
  'page.summary.voice': 'Lead with the time, then the room.',
  'page.summary.rule.0': 'Used as drawn, in Door red, Stock or Night.',
  'page.summary.rule.1': 'Four colours. Door red lights one thing.',
  'page.summary.rule.2': 'Anybody for names, Work Sans for reading.',
  'page.summary.rule.3': 'Taken in the dark, from the back of the room.',
  'page.summary.rule.4': 'One line, the time first.',
  'page.summary.rule.5': 'Say what happens, not what is forbidden.',
  'page.contact.big.0': 'Last',
  'page.contact.big.1': 'call.',
  'page.contact.rule': 'Ask before you change the mark.',
  'page.contact.email': 'door@encore.example',
  'page.contact.version': 'Version 1.0, December 2026.',
  'page.contact.marquee': 'Same time Saturday.',
  'page.contact.marquee.sub': 'Doors at 8',
};

const PAGE = /^page\./;
const done = new WeakSet();

function put(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    if (node[k] == null || typeof node[k] !== 'object') node[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    node = node[k];
  }
  node[/^\d+$/.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1]] = value;
}

export const isShowcase = (ctx) => ctx.edition === 'showcase';

// Writes the table's brand paths into ctx.brand (showcase only, once per ctx).
export function applyShowcase(ctx) {
  if (!isShowcase(ctx) || done.has(ctx)) return ctx;
  done.add(ctx);
  for (const [k, v] of Object.entries(SHOWCASE)) if (!PAGE.test(k)) put(ctx.brand, k, v);
  return ctx;
}

export function copy(ctx, pathStr, fallback) {
  if (isShowcase(ctx) && Object.hasOwn(SHOWCASE, pathStr)) { applyShowcase(ctx); return SHOWCASE[pathStr]; }
  if (PAGE.test(pathStr)) return fallback;
  return pathStr.split('.').reduce((n, k) => (n == null ? n : n[k]), ctx.brand);
}
