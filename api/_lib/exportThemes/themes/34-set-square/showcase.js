// Theme 34, Set Square: the showcase copy (Plumbline, from 02_spec.md). In the showcase edition the pages print this copy so the book reads as finished; a real export
// is the slot edition and never sees this table: it keeps the user's words, or the placeholder where a field is empty.
//
//   copy(ctx, 'voice.boilerplate25')                  a brand path: the showcase line in showcase, else whatever ctx.brand holds (a placeholder sentinel in a slot)
//   copy(ctx, 'page.cover.line', fallback)            a line a page writes itself (keys start "page."): the showcase line in showcase, else `fallback`
// The result is plain text: pass it through ctx.esc() and never slice, split or match it. Brand paths are also written into ctx.brand the first time a showcase ctx
// is read, so a page that reads ctx.brand.voice.boilerplate25 directly gets the same line. Nothing here is invented beyond the spec.

export const SHOWCASE = {
  // brand paths (ctx.brand)
  'description': 'Plumbline renovates kitchens, bathrooms and living rooms in Ballarat and the towns around it.',
  'product': 'We measure on site, draw the room, and give one fixed price with a start date. The price only moves if you change the job.',
  'audience': 'Owners of older Ballarat houses who want the work done once, on the date they were told.',
  'lines.primary': 'Measured twice. Quoted once.',
  'personality.0.trait': 'Measured',
  'personality.0.means': 'We measure the room before we price it, and every number goes in writing.',
  'personality.1.trait': 'Plain',
  'personality.1.means': 'We say what the job costs and when it starts, in the first email.',
  'personality.2.trait': 'Tidy',
  'personality.2.means': 'We sweep the site every afternoon. It\'s still your home while we work in it.',
  'voice.boilerplate25': 'Plumbline is a renovation builder in Ballarat. We measure every room ourselves, give one fixed price, and build to the date we quote.',
  'voice.writeThis.0.write': 'Fixed price: $38,460.',
  'voice.writeThis.0.not': 'Prices from just $30k!',
  'voice.writeThis.1.write': 'Starts Tuesday 10 November, 8 am.',
  'voice.writeThis.1.not': 'We\'ll be in touch to book a start.',
  'voice.writeThis.2.write': 'Measured twice. Quoted once.',
  'voice.writeThis.2.not': 'Your dream kitchen awaits.',
  'logo.idea': 'A plumb line hangs from the l. It is the one line we never draw crooked.',
  'type.sample.headline': 'Measured twice. Quoted once.',
  'type.sample.paragraph': 'One fixed price for your kitchen, bathroom or living room, with a start date in writing.',
  'type.rules.0.do': 'Set the headline on the plain wall, never across the bench.',
  'type.rules.1.do': 'Hang type from the top margin, like the plumb line.',
  'type.rules.2.do': 'One headline size per photo.',
  'applications.social.0': 'Measure-up Tuesday.',
  'applications.social.1': 'Square, level, plumb.',
  'applications.social.2': 'Handed over Friday.',
  'applications.card.person': 'Jo Kearney',
  'applications.card.role': 'Estimator',
  'applications.card.contact': 'jo@plumbline.example',
  'contact.email': 'brand@plumbline.example',
  // lines a page writes itself (read with a fallback)
  'page.cover.title': 'Brand guidelines.',
  'page.cover.line': 'Measured twice. Quoted once.',
  'page.mark.idea': 'A plumb line hangs from the l. It is the one line we never draw crooked.',
  'page.versions.0': 'Bluestone on Plaster: quotes, letters, site signs.',
  'page.versions.1': 'Plaster on Brick: hoardings and vans.',
  'page.versions.2': 'Plaster on Bluestone: screens.',
  'page.versions.3': 'Bluestone on Timber: timber signage.',
  'page.space.smallest': 'Smallest: 24 mm wide in print, 96 px on screen. Clear space: one bob height, b, on every side.',
  'page.mark.text': 'A plumb line hangs from the l. It is the one line we never draw crooked.',
  'page.mark.dims': 'Width, height and the line through the x-height, drawn in Brick.',
  'page.values.on': 'On Plaster',
  'page.values.on.a4': 'Plaster',
  'page.faces.note': 'Two faces, set one glyph to a module. The l hangs its plumb line.',
  'page.hoarding.tab': 'Type on a hoarding',
  'page.hoarding.rule': 'Brick rule',
  'page.print.ref': 'Quote number',
  'page.print.doc': 'Quote',
  'page.print.label.0': 'Job',
  'page.print.label.1': 'Price',
  'page.print.label.2': 'Start',
  'page.misuse.0': 'Plumb line removed.',
  'page.misuse.1': 'Line at an angle.',
  'page.misuse.2': 'Mark stretched.',
  'page.misuse.3': 'Brick mark on Timber.',
  'page.misuse.4': 'Outline added.',
  'page.misuse.5': 'Mark in a box.',
  'page.palette.caption': 'Plaster is the wall. Brick marks the measurements.',
  'page.values.use.0': 'Every page',
  'page.values.use.1': 'Paper',
  'page.values.use.2': 'Text',
  'page.values.use.3': 'Dimensions',
  'page.values.use.4': 'Timber signage',
  'page.scale.tread': 'Measured twice.',
  'page.hoarding.headline': 'Your kitchen, on the date we said.',
  'page.hoarding.line': 'Plumbline. Renovations in Ballarat. plumbline.example',
  'page.web.hero': 'Measured twice. Quoted once.',
  'page.web.body': 'One fixed price for your kitchen, bathroom or living room, with a start date in writing.',
  'page.web.button': 'Book a measure-up',
  'page.print.card': 'Jo Kearney, Estimator, jo@plumbline.example',
  'page.print.quote': 'Quote Q-0412. Kitchen, 14 Doveton Street North, Ballarat. Fixed price: $38,460. Start: Tuesday 10 November, 8 am.',
  'page.print.quote.0': 'Quote Q-0412',
  'page.print.quote.1': 'Kitchen, 14 Doveton Street North, Ballarat.',
  'page.print.quote.2': 'Fixed price: $38,460.',
  'page.print.quote.3': 'Start: Tuesday 10 November, 8 am.',
  'page.web.nav.0': 'Kitchens',
  'page.web.nav.1': 'Bathrooms',
  'page.web.nav.2': 'Living rooms',
  'page.grid.note': 'Every page is drawn on one of two grids. Page 4 sits ghosted inside each.',
  'page.compositions.0': 'The wordmark runs 896 wide on the grid and its plumb line drops 192. Nothing else on the cover is larger.',
  'page.compositions.1': 'The headline hangs from the top margin of the plain board, one size, with the Brick bar under it.',
  'page.compositions.2': 'The quote carries one price and one date. The card gives a name, a role and an email, and nothing more.',
  'page.compositions.scale': 'Each sheet is 1280 by 720 px.',
  'page.print.note': 'The mark sits at the top left. A quote carries one price and one start date, and nothing else.',
  'page.print.url': 'plumbline.example',
  'page.print.tag.card': 'Business card',
  'page.print.tag.quote': 'Quote, A4',
  'page.social.tag': 'Story, 1080 x 1920 px',
  'page.web.services': 'Kitchens, bathrooms and living rooms in Ballarat.',
  'page.summary.note': 'Mark, palette, type and two photographs, stood on the stair at 30 degrees.',
  'page.summary.0': 'The mark',
  'page.summary.1': 'The palette',
  'page.summary.2': 'The type',
  'page.summary.3': 'The brand in the field',
  'page.summary.4': 'The finished room',
  'page.contact.headline': 'Check the drawing before you build on it.',
  'page.contact.body': 'Questions about the mark: brand@plumbline.example',
  'page.contact.rev': 'Rev 1.0, November 2026.',
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
