// Theme 33, Flyleaf: the showcase copy. In the showcase edition (E.makeCtx(T, 'showcase', ...), what render.mjs --showcase draws) the pages print the Margin copy from
// the circular pass spec, so the showcase reads like a finished book. A real export is the slot edition and never sees this table: it keeps the user's own words, or
// the placeholder where a field is empty.
//
//   copy(ctx, 'voice.boilerplate25')                  a brand path: the showcase line in showcase, else whatever ctx.brand holds (a placeholder sentinel in a real export)
//   copy(ctx, 'page.contact.headline', fallback)      a line a page writes itself (keys start "page."): the showcase line in showcase, else `fallback` (the page's own words or ctx.ph(...))
//
// The result is plain text: pass it through ctx.esc() like any brand string, and never slice, split or match it (a slot sentinel cut in half fails the build).
// Brand paths are also written into ctx.brand the first time a showcase ctx is read, so a page that reads ctx.brand.voice.boilerplate25 directly gets the same line.
// Margin copy is from 06_circular_pass_spec.md; nothing here is invented beyond it (the spec gives one type rule and one palette caption as examples, so those are all there is).

export const SHOWCASE = {
  // brand paths (ctx.brand)
  'description': 'Margin publishes short fiction and essays in pocket editions, edited line by line and printed on uncoated paper.',
  'product': 'We find new writers, work through every draft with them, and keep each book small enough for a coat pocket.',
  'audience': 'Readers who finish a book on the train and want the next one to be as good.',
  'lines.primary': 'Leave room for the reader.',
  'personality.0.trait': 'Patient',
  'personality.0.means': 'We take the time a sentence needs. We never rush a reader to the end.',
  'personality.1.trait': 'Plain',
  'personality.1.means': 'We say what the book is about in one line. No blurbs that shout.',
  'personality.2.trait': 'Generous',
  'personality.2.means': 'We print the first chapter free and credit everyone who touched the book.',
  'voice.boilerplate25': 'Margin publishes short fiction and essays in pocket editions. Every book is edited line by line, printed on uncoated paper and kept in print.',
  'voice.writeThis.0.write': 'Out Thursday.',
  'voice.writeThis.0.not': 'Coming soon to a store near you!',
  'voice.writeThis.1.write': 'Edited by hand.',
  'voice.writeThis.1.not': 'Curated with passion.',
  'voice.writeThis.2.write': 'Read the first chapter free.',
  'voice.writeThis.2.not': 'Unlock exclusive content.',
  'logo.idea': 'The mark is the wordmark set tight, the way a title sits on a spine.',
  'type.sample.headline': 'Leave room for the reader.',
  'type.sample.paragraph': 'New pocket editions every season. Read the first chapter free at margin.press.',
  'type.rules.0.do': 'Set type on the quiet half of a photo.',
  'type.rules.1.do': 'Set type on the empty linen, clear of the books.',
  'type.rules.2.do': 'Keep the hands and the pencil clear of the type.',
  'type.rules.3.do': 'Break the headline into short lines that stay in the quiet half.',
  'type.rules.4.do': 'Ink type on the light photographs, Oatmeal on the dark ones.',
  'type.rules.5.do': 'Say less when the photograph says more.',
  'applications.social.0': 'Out Thursday.',
  'applications.social.1': 'Read slowly.',
  'applications.social.2': 'Edited by hand.',
  'applications.social.3': 'First chapter free.',
  'applications.card.person': 'Ellen Ward',
  'applications.card.role': 'Editor',
  'applications.card.contact': 'ellen@margin.example',
  'contact.email': 'design@margin.example',
  // lines a page writes itself (read with a fallback)
  'page.cover.line': 'Brand guidelines. Version 1.0, November 2026.',
  'page.mark.idea': 'The mark is the wordmark set tight, the way a title sits on a spine.',
  'page.versions.caption': 'On Oatmeal: covers and letters',
  'page.space.smallest': 'Smallest: 24 mm in print, 96 px on screen.',
  'page.scale.text': 'Leave room for the reader',
  'page.type.pairing': 'Goudy for titles, Newsreader for reading.',
  'page.web.hero': 'Leave room for the reader.',
  'page.web.button': 'Read the first chapter',
  'page.contact.headline': 'Ask before you change the mark.',
  'page.contact.body': 'Send the file and where it will run to design@margin.example. Version 1.0, November 2026.',
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
