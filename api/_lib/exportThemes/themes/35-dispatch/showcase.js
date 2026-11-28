// Theme 35, Dispatch: the showcase copy (Kerbside). In the showcase edition the pages print this copy so the book reads as finished; a real export is
// the slot edition and never sees this table: it keeps the user's words, or a neutral placeholder where a field is empty. Kerbside's own words (its trade, street names, times of
// day, the line) live ONLY here, never as a page fallback: the theme's test fails on demo trade words.
//
//   copy(ctx, 'page.cover.title', fallback)   a line a page writes itself (keys start "page."): the showcase line in showcase, else `fallback` (neutral)
//   copy(ctx, 'voice.boilerplate25')          a brand path: the showcase line in showcase, else whatever ctx.brand holds (a placeholder sentinel in a slot)
// The result is plain text: pass it through ctx.esc() and never slice, split or match it.

export const SHOWCASE = {
  // brand paths (ctx.brand); the engine's Kerbside brand already holds most of them, these are the spec's own lines
  'description': 'Kerbside is a bike courier in Melbourne.',
  'product': 'Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.',
  'how': 'One rider carries your parcel from pickup to door, and you see each time as it happens.',
  'audience': 'Shops and studios in inner Melbourne that promised someone something today.',
  'lines.primary': 'Booked by ten. There by twelve.',
  'voice.boilerplate25': 'Kerbside is a bike courier in Melbourne. Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.',
  'voice.writeThis.0.write': 'There at 11:40.',
  'voice.writeThis.0.not': 'Arriving soon!',
  'voice.writeThis.1.write': 'Picked up from 88 Brunswick Street.',
  'voice.writeThis.1.not': 'Your order is on its way.',
  'voice.writeThis.2.write': 'Booked by ten. There by twelve.',
  'voice.writeThis.2.not': 'Lightning-fast delivery, every time!',
  // page 1 Cover
  'page.code': 'KBS0412',
  'page.cover.title': 'Brand guidelines.',
  'page.cover.a': 'Booked by ten.',
  'page.cover.b': 'There by twelve.',
  // page 4 Who we are
  'page.who.caption': 'Proof of delivery. 11:40, Swan Street, Richmond.',
  'page.who.what': 'What we do',
  'page.who.howl': 'How',
  'page.who.for': 'Who for',
  // page 5 Voice
  'page.voice.message': 'Picked up at 10:52 from 88 Brunswick Street. There at 11:40.',
  'page.voice.note.0': 'Give the minute, not the morning. Never "shortly".',
  'page.voice.note.1': 'Name the street. Melbourne knows its streets.',
  'page.voice.note.2': 'One line per update. The rider is busy, and so is the reader.',
  'page.voice.span.0': '10:52',
  'page.voice.span.1': '88 Brunswick Street',
  'page.voice.span.2': '11:40',
  'page.voice.q.0': 'Exact',
  'page.voice.q.1': 'Local',
  'page.voice.q.2': 'Brief',
  // page 6 Words
  // page 8 The mark
  'page.mark.title': 'Direction of travel.',
  'page.mark.text': 'The name sits on a kerb that runs its length, then steps down to the road. The mark always points the way the parcel is going: right, towards the drop.',
  // page 9 Versions
  'page.versions.0': 'Depot window decal',
  'page.versions.1': 'Rider bag panel',
  'page.versions.2': 'Thermal label',
  'page.versions.3': 'Seal sticker',
  // page 10 Space and size
  'page.space.text': 'Quiet zone: c on every side, where c is the height of a capital letter in the name.',
  // page 11 Misuse
  'page.misuse.0': 'Reversed: points back to the depot.',
  'page.misuse.1': 'Stretched.',
  'page.misuse.2': 'Rotated off the line of travel.',
  'page.misuse.3': 'Kerb recoloured.',
  'page.misuse.4': 'Outline only.',
  'page.misuse.5': 'On the busy side of a photo.',
  // page 18 Typefaces
  'page.faces.0': 'Archivo, width 125, weight 800: headings and times.',
  'page.faces.1': 'IBM Plex Sans: reading.',
  'page.faces.2': 'IBM Plex Mono: times, codes and values.',
  'page.faces.sample': 'Booked by ten.',
  // page 19 Scale: one event per step, with its time
  'page.scale.0': 'There.',
  'page.scale.1': 'At the door.',
  'page.scale.2': 'Crossing Hoddle Street.',
  'page.scale.3': 'Picked up at 88 Brunswick Street.',
  'page.scale.4': 'Rider 7 is on the way.',
  'page.scale.5': 'Booked.',
  'page.scale.t.0': '12:00',
  'page.scale.t.1': '11:40',
  'page.scale.t.2': '11:12',
  'page.scale.t.3': '10:52',
  'page.scale.t.4': '10:31',
  'page.scale.t.5': '10:00',
  // page 20 In use
  'page.use.panel': 'There by twelve.',
  'page.use.line': 'Booked by ten.',
  'page.use.body': 'Bike couriers across Melbourne. Book at kerbside.example.',
  // page 21 Type rules
  'page.rules.sample': 'Booked by ten.',
  'page.rules.0': 'Set the line in open sky or road, never across the rider.',
  'page.rules.1': 'Across the rider.',
  'page.rules.2': 'Signal type on a photo drops below 3:1 on light patches.',
  // page 26 Digital
  'page.digital.phone.title': 'There at 11:40',
  'page.digital.phone.body': 'Picked up at 10:52 from 88 Brunswick Street.',
  'page.digital.t.0': '10:00',
  'page.digital.t.1': '10:52',
  'page.digital.t.2': '11:40',
  'page.digital.ev.0': 'Booked',
  'page.digital.ev.1': 'Picked up',
  'page.digital.ev.2': 'There',
  'page.digital.body': 'Bike couriers across Melbourne. Book a pickup before 10 am and we deliver by noon.',
  'page.digital.btn': 'Book a pickup',
  'page.digital.nav.0': 'Prices',
  'page.digital.nav.1': 'Track',
  'page.digital.nav.2': 'Riders',
  'page.digital.nav.cta': 'Sign in',
  // page 27 Print
  'page.print.code': 'KBS-0412-031',
  'page.print.from': '88 Brunswick Street, Fitzroy VIC 3065',
  'page.print.to': '212 Swan Street, Richmond VIC 3121',
  'page.print.booked': '09:47',
  'page.print.due': '12:00',
  'page.print.rider': '7',
  // page 28 Social
  'page.social.t.0': '10:00',
  'page.social.t.1': '10:52',
  'page.social.t.2': '11:40',
  'page.social.line.0': 'Booked.',
  'page.social.line.1': 'Picked up.',
  'page.social.line.2': 'There.',
  // page 30 On one page
  'page.summary.line': 'There by twelve.',
  // page 31 Contact
  'page.contact.status': 'Delivered.',
  'page.contact.headline': 'Ask before you change the mark.',
  'page.contact.body': 'Write to the owner with the file and where it will run.',
  'contact.email': 'brand@kerbside.example',
  // page 15 Pairs
  'page.pairs.sample': 'There.',
  'page.words.boiler': 'Kerbside is a bike courier in Melbourne. Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.',
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
