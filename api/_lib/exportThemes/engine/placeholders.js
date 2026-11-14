// Slot edition text placeholders: the brand's own words become descriptor boxes (what to write, how long, an example).
//
// How it works (read this before touching a theme):
//   1. applyPlaceholders(ctx) runs at the end of makeCtx for the slot edition. It walks ctx.brand and replaces every string
//      the brand wrote (see DESCRIPTORS) with a sentinel: U+E000, the descriptor's number in private-use digits, U+E001.
//      The sentinel survives esc(), toUpperCase(), template strings and concatenation, so themes, the book and the
//      rest read ctx.brand exactly as before and never know.
//   2. finishText(text, name) is called on every text file at the output boundary. A string that holds a sentinel is swapped
//      for markup (html), a bracketed note (md, txt) or a plain label (attributes, <title>, svg text, css, json). The
//      builders call it, so any file made from a slot ctx is finished (doc.js pageDoc and finishFiles, the book, the kit).
//   3. A sentinel that is cut in half (slice, charAt, regex) stays in the output; finishText throws and names the file.
// Showcase ctxs never hold a sentinel, so finishText returns their text as it is.
// The registry of placeholders belongs to one ctx (made in applyPlaceholders), so two documents built in sequence never share one.
const extname = (name) => { const m = /\.[^./\\]*$/.exec(String(name)); return m ? m[0] : ''; };

const OPEN = '', CLOSE = '', DIG = 0xE010;
const SENT = /([-]+)/g;
const encodeId = (n) => [...String(n)].map((d) => String.fromCharCode(DIG + Number(d))).join('');
const decodeId = (s) => Number([...s].map((c) => c.charCodeAt(0) - DIG).join(''));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- descriptors, keyed by brand data path ("*" is an array index; {n} in a label is that index plus one) ----
// d(label, what, length, example, opts): form 'block' (dashed frame, label / what / length and example) or 'compact' (label and length on one line);
// opts.real: the "what to write" line is shown at the real size of the copy it replaces (type samples).
// opts.sample: a short stand-in shown as it is (initials, a clock), for slots too small for a label.
const d = (label, what, length, example, opts = {}) => ({ label, what, length, example, form: 'block', ...opts });
const c = (label, what, length, example, opts = {}) => d(label, what, length, example, { form: 'compact', ...opts });

// The made-up brand behind the examples is a Hobart bakery, "Bellbird Bakery": none of the ten sample brands.
export const DESCRIPTORS = {
  name: c('Brand name', 'The name as you write it, in full.', '1 to 3 words', 'Bellbird Bakery', { bare: true }),
  city: c('City', 'The town or city the brand works from.', '1 to 2 words', 'Hobart', { bare: true }),
  description: d('Description', 'What the brand does and who it does it for, in plain words.', '2 to 3 sentences', 'Bellbird Bakery bakes bread and pastries for Hobart homes and cafes. You order by 4 pm and it arrives warm before six the next morning.'),
  product: d('What it does', 'The main thing a customer does with the brand.', '1 sentence', 'Order bread by 4 pm and have it at your door before six.'),
  audience: d('Who it serves', 'The people the brand is for, and what they want.', '1 sentence', 'Hobart households and cafes that want fresh bread without the trip.'),
  'lines.primary': d('Main line', 'The one promise the brand makes, as a short line.', '3 to 7 words', 'Warm by six, every day.'),
  'lines.others.*': d('Other line {n}', 'A second line for smaller spaces.', '3 to 6 words', 'Flour in, bread out.'),
  'personality.*.trait': d('Personality trait {n}', 'One word for a quality that shapes how the brand behaves.', '1 word', 'Plain'),
  'personality.*.means': d('Personality trait {n}, in practice', 'How that quality shows up in what the brand does and writes.', '2 sentences', 'We say what is in the loaf and when it was baked. We never claim more than the label.'),
  'voice.principles.*.title': d('Writing rule {n}', 'A short rule for how the brand writes.', '2 to 4 words', 'Name the flour'),
  'voice.principles.*.example': d('Writing rule {n}, example', 'One line that follows the rule.', '4 to 8 words', 'Spelt flour, milled in Tasmania.'),
  'voice.writeThis.*.write': d('Write this {n}', 'A line the brand would write.', '3 to 8 words', 'Baked at 4 am, at your door by 6'),
  'voice.writeThis.*.not': d('Not this {n}', 'The weaker line it replaces.', '3 to 8 words', 'Our artisan bread, made with love'),
  'voice.writeThis.*.because': d('Because {n}', 'The reason, in one short sentence.', '1 sentence', 'A time is something a customer can hold you to.'),
  'voice.boilerplate25': d('25-word boilerplate', 'The brand in about 25 words, for press and bios.', 'About 25 words', 'Bellbird Bakery bakes bread and pastries in Hobart. Order by 4 pm and it arrives warm before six the next morning, for homes and cafes.'),
  'voice.boilerplate50': d('50-word boilerplate', 'The brand in about 50 words, for longer bios and listings.', 'About 50 words', 'Bellbird Bakery bakes bread and pastries in Hobart for homes and cafes. You order by 4 pm, we bake overnight, and the bread arrives warm before six the next morning. We say what is in every loaf, use Tasmanian flour, and give the baking time on the bag.'),
  'voice.nameRules': d('Writing the name', 'How the name is written: capitals, spacing, and what never to do.', '2 to 3 sentences', 'Write Bellbird Bakery in full, both words capitalised. Never shorten it to Bellbird, and never put it in all capitals.'),
  'type.sample.headline': d('Sample headline', 'A headline the brand might run, set in its headline type.', '5 to 8 words', 'Fresh bread, warm by six', { real: true }),
  'type.sample.paragraph': d('Sample paragraph', 'Two or three sentences of ordinary copy in the brand voice.', '2 to 3 sentences', 'Your order was baked at 4 am and leaves the bakehouse at 5:30. It reaches 12 Elm Street by 6 am, still warm.', { real: true }),
  'type.sample.caption': d('Sample caption', 'A caption with one or two facts in it.', '6 to 10 words', 'Sourdough, 800 g. 12 Elm Street, Sandy Bay.', { real: true }),
  'type.rules.*.do': d('Type rule {n}, do', 'A type habit to keep.', '1 sentence', 'Set headlines in 700 at 24 px and up.'),
  'type.rules.*.dont': d('Type rule {n}, do not', 'The mistake the rule prevents.', '1 sentence', 'Set a headline in the light weight.'),
  'logo.idea': d('Logo idea', 'The idea behind the logo, in plain words.', '2 sentences', 'The name sits on a line like a bench, with a small bell at its end. The line is always as wide as the name.'),
  'logo.showcase.symbolNote': d('Symbol note', 'What the symbol is and how it relates to the name.', '1 sentence', 'The symbol is the first letter on its own length of bench, with the bell at its end.'),
  'logo.showcase.wordmark': c('Wordmark', 'The name as it is set in the logo.', '1 to 3 words', 'Bellbird Bakery', { bare: true }),
  'logo.when.colour': d('Use full colour when', 'Where the main version of the logo goes.', '1 sentence', 'The default. On white and on light photos.'),
  'logo.when.mono-dark': d('Use mono dark when', 'Where the one-colour dark version goes.', '1 sentence', 'One colour printing, stamps and light grounds.'),
  'logo.when.mono-light': d('Use mono light when', 'Where the one-colour light version goes.', '1 sentence', 'On photos and dark grounds.'),
  'logo.when.reversed': d('Use reversed when', 'Where the reversed version goes.', '1 sentence', 'On the darkest brand colour.'),
  'logo.when.horizontal': d('Use horizontal when', 'Where the wide, short version goes.', '1 sentence', 'Headers, email signatures and wide, short spaces.'),
  'logo.when.stacked': d('Use stacked when', 'Where the squarer version goes.', '1 sentence', 'Profile images, van doors and shopfront signs.'),
  'logo.when.symbol': d('Use the symbol when', 'Where the symbol can stand alone.', '1 sentence', 'Where the name is already nearby: app icon, favicon, stamp.'),
  'imagery.direction.subject': d('Photo subject', 'What the photos show, and what they never show.', '2 sentences', 'Bread being made and carried: the oven, the tray, the van at the kerb. The bread is the subject, not the people.'),
  'imagery.direction.light': d('Photo light', 'The light the photos are taken in.', '1 sentence', 'Early morning window light. No flash, no studio.'),
  'imagery.direction.crop': d('Photo crop', 'How close the photos are, and where there is room for a line of text.', '1 to 2 sentences', 'Close and honest, with the whole tray in frame. Leave a clear patch of bench for one line.'),
  'imagery.direction.colour': d('Photo colour', 'How colour is handled in the photos.', '1 sentence', 'Natural colour, never filtered or boosted.'),
  'imagery.direction.people': d('Photo people', 'Who is in the photos and how they are shot.', '1 sentence', 'Our bakers, by name, shot as they work.'),
  'imagery.shots.*.slot': d('Shot {n}', 'A brief for the photo: who, where, what is happening, the crop and the light.', '2 to 3 sentences', 'The pass: Mia lifting the first tray of sourdough out of the oven. Wide crop, the bench behind. Early morning light from the window.'),
  'imagery.shots.*.alt': c('Shot {n}, description', 'What the photo shows, for a screen reader.', '1 sentence', 'Mia lifting a tray of sourdough from the oven.'),
  'imagery.shots.*.caption': c('Shot {n}, caption', 'A short caption for the photo.', '4 to 8 words', 'First tray out, 4:40 am.'),
  'imagery.shots.*.credit': c('Shot {n}, credit', 'Who took the photo.', '2 to 3 words', 'Photo: Sam Lee'),
  'imagery.rules.*.do': d('Photo rule {n}, do', 'A habit to keep in photos.', '1 sentence', 'Show the bread being made, with the bench around it.'),
  'imagery.rules.*.dont': d('Photo rule {n}, do not', 'The mistake the rule prevents.', '1 sentence', 'Pose people holding a loaf and smiling at the camera.'),
  'applications.card.person': c('Person', 'A name for the business card.', '2 words', 'Mia Tran'),
  'applications.card.role': c('Job title', 'The title under the name.', '1 to 3 words', 'Head baker'),
  'applications.card.contact': c('Contact line', 'An email address for the card.', '1 address', 'mia@bellbird.example'),
  'applications.social.*': d('Social post {n}', 'A line for a social post or its image.', '4 to 10 words', 'Baked at 4 am. At your door by 6.'),
  // virtual: no brand data string of their own; a page asks for them with ctx.ph(path)
  'applications.signage.line': d('Signage line', 'The line printed on the board.', '3 to 7 words', 'Fresh bread, warm by six', { virtual: true }),
  'applications.signage': d('Signage', 'Where the sign goes, how big, and what it says.', '1 sentence', 'Shopfront board, 600 x 900 mm: Fresh bread, warm by six.'),
  'applications.email.person': c('Sender', 'The name that signs the email.', '2 words', 'Mia Tran'),
  'applications.email.role': c('Sender title', 'The sender\'s title.', '1 to 3 words', 'Head baker'),
  'applications.site.url': c('Web address', 'The site address, no https.', '1 address', 'bellbird.example'),
  'contact.owner': c('Brand owner', 'The team or person who answers questions about the brand.', '1 to 3 words', 'Brand team'),
  'contact.email': c('Contact email', 'Where questions about the brand go.', '1 address', 'brand@bellbird.example'),
  'guideB.rules.*': d('Brand rule {n}', 'One rule anyone using the brand can follow.', '1 sentence', 'Give the time in the line, such as 6 am.'),
  'guideB.email.to': c('Email recipient', 'A customer\'s name.', '2 words', 'Sam Fenwick'),
  'guideB.email.subject': c('Email subject', 'The subject line of a customer email.', '4 to 8 words', 'Your order, baked for 6 am'),
  'guideB.email.time': c('Email time', 'When the email was sent.', 'A day and time', 'Mon 10 Nov, 4:12 pm'),
  'guideB.email.greeting': c('Email greeting', 'How the email opens.', '2 words', 'Hi Sam,'),
  'guideB.email.body': d('Email body', 'What the email says, in the brand voice.', '2 sentences', 'Your sourdough is in the oven now and leaves the bakehouse at 5:30. It reaches you by 6 am.'),
  'colours.*.name': c('Colour {n}', 'The name of a brand colour, as people say it.', '1 to 2 words', 'Crust', { bare: true }),
  'colours.*.lands': d('Colour {n}, where it lands', 'Where this colour is used, and where it never is.', '1 sentence', 'Buttons and the delivery time. A fill only, never text.'),
  'colours.*.roleText': c('role', 'What the colour is for, in a word or two.', '1 to 2 words', 'action', { bare: true, virtual: true }),
  'tones.*.name': c('Tone {n}', 'The name of a measured tone of a brand colour.', '2 to 3 words', 'Soft Crust', { bare: true }),
  'tones.*.lands': d('Tone {n}, where it lands', 'Where this tone is used, and its contrast figure.', '1 sentence', 'A button under the pointer. Dark label, 10 : 1.'),
  'tones.*.roleText': c('role', 'What the tone is for, in a word or two.', '1 to 2 words', 'hover', { bare: true, virtual: true }),
  'pairs.*.use': c('Colour pair {n}, use', 'What this text and ground pair is used for.', '2 to 5 words', 'Body text, headlines'),
  'guideB.studioSlot': d('Studio photo to avoid', 'A photo the brand would never use, in a sentence.', '1 to 2 sentences', 'A baker posed in front of a plain white wall. Flat light, no bench.'),
  'guideB.notIn': d('Not in the photos', 'What never appears in the brand\'s photos.', '1 sentence', 'Stock bakers, studio backdrops, flat flash.'),
  'guideB.notIn.*': d('Not in the photos {n}', 'One thing that never appears in the photos.', '1 sentence', 'Stock bakers, studio backdrops, flat flash.'),
  'guideB.examples.*': d('Example {n}', 'One example of the rules at work.', '1 sentence', 'Spelt in from Tasmania, baked at 4 am.'),
  'guideB.rules.*.title': c('Brand rule {n}, title', 'A short title for the rule.', '2 to 4 words', 'Name the time'),
  'guideB.rules.*.text': d('Brand rule {n}', 'One rule anyone using the brand can follow.', '1 to 2 sentences', 'Give the time in the line, such as 6 am.'),
  'guideB.rules.*.body': d('Brand rule {n}', 'One rule anyone using the brand can follow.', '1 to 2 sentences', 'Give the time in the line, such as 6 am.'),
  'guideB.email.body.*': d('Email body {n}', 'A line or paragraph of the email, in the brand voice.', '1 to 2 sentences', 'Your sourdough is in the oven now and reaches you by 6 am.'),
  // virtual: copy that theme 07 hard-codes in its UI kit and guidelines, asked for with ctx.ph(path, realWords)
  'uikit.noResults.title': c('No-results title', 'The title when a search or filter finds nothing.', '2 to 4 words', 'No loaves match', { virtual: true }),
  'uikit.noResults.text': d('No-results text', 'What to try next, in one sentence.', '1 sentence', 'Try a different suburb, or clear the filter to see every order.', { virtual: true }),
  'uikit.noResults.action': c('No-results action', 'The label on the button that clears the filter.', '2 words', 'Clear filter', { virtual: true }),
  'uikit.error.title': c('Error title', 'The title when a list fails to load.', '3 to 5 words', 'Orders did not load', { virtual: true }),
  'uikit.error.text': d('Error text', 'What happened and what is safe, in one sentence.', '1 sentence', 'Check your connection, then try again. Your orders are safe.', { virtual: true }),
  'uikit.error.action': c('Error action', 'The label on the button that tries again.', '2 words', 'Try again', { virtual: true }),
  'applications.signage.fixed': c('Where the sign is fixed', 'Where the sign goes.', '3 to 5 words', 'To the shopfront', { virtual: true }),
  'ui.screen.title': c('Screen title', 'The name of the product screen.', '1 to 3 words', 'Your order'),
  'ui.screen.content.status': c('Status', 'What state the live item is in.', '1 to 2 words', 'Baking'),
  'ui.screen.content.eta': c('Time promise', 'When the live item will be done.', '3 to 5 words', 'Warm by 6 am'),
  'ui.screen.content.pickup': d('Live update', 'A sentence about what has just happened.', '1 sentence', 'Mia loaded the van at 5:30 am at the bakehouse on Elm Street.'),
  'ui.screen.content.from': c('Route start', 'Where the item starts.', '1 to 2 words', 'Bakehouse'),
  'ui.screen.content.to': c('Route end', 'Where the item ends.', '1 to 2 words', 'Your door'),
  'ui.screen.content.rider': c('Person on the job', 'Who is doing the work.', '2 to 4 words', 'Mia, delivery'),
  'ui.screen.content.initials': c('Initials', 'The person\'s initials.', '2 letters', 'MT', { sample: 'AB' }),
  'ui.screen.content.riderNote': c('Progress note', 'How far along the work is.', '3 to 5 words', '9 of 12 loaves out'),
  'ui.screen.content.call': c('Call button', 'The label on the call button.', '1 word', 'Call'),
  'ui.screen.content.deliverToLabel': c('Address label', 'The label for the address.', '1 to 2 words', 'Deliver to'),
  'ui.screen.content.deliverTo': c('Address', 'A street address.', '3 to 5 words', '12 Elm Street, Sandy Bay'),
  'ui.screen.content.paidLabel': c('Total label', 'The label for the total.', '1 word', 'Total'),
  'ui.screen.content.paid': c('Total', 'A price or quantity.', '1 to 2 words', '$24.50'),
  'ui.screen.content.share': c('Share button', 'The label on the share button.', '2 to 4 words', 'Share order link'),
  'ui.screen.content.time': c('Clock', 'A time of day.', 'A time', '9:41', { sample: '9:41' }),
  'ui.screen.content.deliveries.*.to': c('Item {n}, address', 'A street address.', '3 to 5 words', '12 Elm Street, Sandy Bay'),
  'ui.screen.content.deliveries.*.when': c('Item {n}, when', 'When it happens or happened.', '3 to 5 words', 'Delivery Thu 13 Nov'),
  'ui.screen.content.deliveries.*.price': c('Item {n}, value', 'A price or quantity.', '1 to 2 words', '$24.50'),
  'ui.screen.content.form.title': c('Form title', 'The title of the main form.', '2 to 4 words', 'Place an order'),
  'ui.screen.content.form.pickup': c('Field 1 label', 'The label of the first field.', '1 to 3 words', 'Address'),
  'ui.screen.content.form.pickupValue': c('Field 1 value', 'A filled-in example for the first field.', '3 to 5 words', '12 Elm Street, Sandy Bay'),
  'ui.screen.content.form.dropoff': c('Field 2 label', 'The label of the second field.', '1 to 3 words', 'Delivery day'),
  'ui.screen.content.form.dropoffValue': c('Field 2 value', 'A filled-in example for the second field.', '2 to 3 words', 'Thursday 13 November'),
  'ui.screen.content.form.ready': c('Field 3 label', 'The label of the third field.', '2 to 4 words', 'Standing order amount'),
  'ui.screen.content.form.readyValue': c('Field 3 wrong value', 'An entry the field would reject.', '1 to 2 words', 'two dozen'),
  'ui.screen.content.form.readyError': c('Field 3 error', 'The message when the entry is wrong: say how to fix it.', '1 sentence', 'Enter a number of loaves, such as 12.'),
  'ui.screen.content.form.size': c('Select label', 'The label of the dropdown.', '1 to 2 words', 'Loaf'),
  'ui.screen.content.form.sizes.*': c('Option {n}', 'One choice in the dropdown.', '1 word', 'Sourdough'),
  'ui.screen.content.form.notes': c('Notes label', 'The label of the free text box.', '2 to 4 words', 'Anything we should know'),
  'ui.screen.content.form.notesHelp': c('Notes help', 'The hint under the free text box.', '1 sentence', 'Gate code, dogs, where to leave it.'),
  'ui.screen.content.form.book': c('Main action', 'The label on the main action.', '2 to 3 words', 'Place order'),
  'ui.screen.content.form.bookWhy': c('Disabled reason', 'Why the action is off, and what to do.', '1 sentence', 'Add your address to place an order.'),
  'ui.screen.content.empty.title': c('Empty state title', 'The title when there is nothing yet.', '2 to 4 words', 'No orders yet'),
  'ui.screen.content.empty.body': d('Empty state text', 'What to do next, in one or two sentences.', '1 to 2 sentences', 'Place an order and it shows up here, with the time it will arrive.'),
  'ui.screen.content.empty.cta': c('Empty state action', 'The label on the action.', '2 to 3 words', 'Place order'),
  'ui.screen.content.dialog.title': c('Dialog title', 'The question the dialog asks.', '3 to 6 words', 'Move your delivery?'),
  'ui.screen.content.dialog.body': d('Dialog text', 'What happens if the person says yes.', '1 to 2 sentences', 'Mia is booked for Thursday 13 November. Moving it is free until Tuesday 11 November.'),
  'ui.screen.content.dialog.confirm': c('Dialog confirm', 'The label on the yes button.', '2 to 3 words', 'Move delivery'),
  'ui.screen.content.dialog.keep': c('Dialog cancel', 'The label on the no button.', '2 to 3 words', 'Keep Thursday'),
  'ui.screen.content.toast': c('Success message', 'What the person just did, confirmed.', '1 sentence', 'Delivery booked for Thursday 13 November.'),
  'ui.screen.content.alert': c('Alert', 'A notice about the live item.', '1 sentence', 'Warm by 6 am. Mia is on her way.'),
  'ui.screen.content.inline': c('Inline hint', 'A hint shown inline in the page.', '1 sentence', 'Add a gate code if the house has one.'),
  'ui.screen.content.example.secondary': c('Secondary', 'The label on a secondary button.', '1 word', 'Back'),
  'ui.screen.content.example.quiet': c('Quiet', 'The label on a quiet button.', '1 word', 'Skip'),
  'ui.screen.content.example.danger': c('Danger', 'The label on a button that cancels something.', '2 words', 'Cancel order'),
  'ui.screen.content.example.small': c('Small', 'The label on a small button.', '1 word', 'Add'),
  'ui.screen.content.example.account': c('Account', 'The label for the account.', '1 word', 'Account'),
  'ui.screen.content.example.checks.*': c('Checkbox {n}', 'The label of a checkbox.', '2 to 4 words', 'Leave at the gate'),
  'ui.screen.content.example.switches.*': c('Switch {n}', 'The label of an on and off switch.', '3 to 6 words', 'Text me when the van is close'),
  'ui.screen.content.example.radios.*': c('Radio option {n}', 'The label of one choice.', '1 to 3 words', 'Sourdough'),
  'ui.screen.content.example.statLabel': c('Stat label', 'What the big number counts.', '2 to 3 words', 'Baked today'),
  'ui.screen.content.example.crumbs.*': c('Breadcrumb {n}', 'One step in the path to this page.', '1 to 2 words', 'Orders'),
  'ui.screen.content.example.tabs.*': c('Tab {n}', 'The label of a tab.', '1 word', 'Orders'),
  'ui.screen.content.example.links.*.0': c('Link {n}', 'The label of a link in the menu.', '1 word', 'Orders'),
  'ui.status.*.label': c('Status {n}', 'The label of a status chip.', '1 to 3 words', 'Out for delivery'),
};

// ---- registry: one id per brand data path and the text behind it. It belongs to one ctx (made in applyPlaceholders), so a brand never reads another's text ----
// `cur` is the registry in use while a ctx's own functions run (ctx.placeholders.run); the code is synchronous, so it is never shared between calls.
let cur = null;
function register(pathStr, desc, n, real) {
  const { entries, idByPath } = cur;
  const key = pathStr + '\n' + real;
  if (idByPath.has(key)) return idByPath.get(key);
  const fill = (s) => s.replace('{n}', String(n));
  const e = { path: pathStr, ...desc, label: fill(desc.label), what: fill(desc.what), real, realSize: !!desc.real, first: !/{n}/.test(desc.label) || n === 1 };  // real: the sample text behind it; realSize: show the "what" line at the copy's own size; first: only the first item of a list shows the example
  entries.push(e); idByPath.set(key, entries.length - 1);
  return entries.length - 1;
}
const sentinel = (id) => OPEN + encodeId(id) + CLOSE;

// Replace the string leaves a pattern names. n is the first "*" index plus one (null until a "*" is met).
function walk(node, parts, i, trail, desc, n) {
  if (node == null || typeof node !== 'object') return;
  const key = parts[i], last = i === parts.length - 1;
  const keys = key === '*' ? (Array.isArray(node) ? node.map((_, k) => k) : []) : [Array.isArray(node) ? Number(key) : key];
  for (const k of keys) {
    const nn = key === '*' && n == null ? k + 1 : n;
    if (last) { if (typeof node[k] === 'string') node[k] = sentinel(register([...trail, k].join('.'), desc, nn ?? 1, node[k])); }
    else walk(node[k], parts, i + 1, [...trail, k], desc, nn);
  }
}

// the plain-text forms of a descriptor
const labelOf = (e) => e.label;
const compactOf = (e) => (e.bare ? e.label : `${e.label}, ${e.length}`);
const fullOf = (e) => `${e.label}: ${e.what} ${e.length}. e.g. "${e.example}"`;

export function applyPlaceholders(ctx) {
  const B = ctx.brand;
  const reg = { entries: [], idByPath: new Map() };
  // run fn with this ctx's registry in use, then put back whatever was in use
  const run = (fn) => { const prev = cur; cur = reg; try { return fn(); } finally { cur = prev; } };
  run(() => {
  for (const [pattern, desc] of Object.entries(DESCRIPTORS)) if (!desc.virtual) walk(B, pattern.split('.'), 0, [], desc, null);
  // a colour's role drives code (role === 'action'), so it stays as it is; roleText is the same word as a placeholder, for the line that prints it
  for (const list of ['colours', 'tones']) (B[list] || []).forEach((k, i) => { k.roleText = sentinel(register(`${list}.${i}.roleText`, DESCRIPTORS[`${list}.*.roleText`], i + 1, k.role)); });
  // ctx.colours and ctx.pairs are copies made before the swap: give them the same placeholder strings
  (ctx.colours || []).forEach((k, i) => Object.assign(k, { name: B.colours[i].name, lands: B.colours[i].lands, roleText: B.colours[i].roleText }));
  (ctx.pairs || []).forEach((p, i) => { p.use = B.pairs[i].use; });
  });
  ctx.real = (str) => run(() => String(str).replace(SENT, (m, g) => { const e = reg.entries[decodeId(g)]; if (!e) throw new Error('placeholders: a placeholder from another document'); return e.real; }));
  // ctx.ph(path, real): a placeholder for copy a theme hard-codes; real is the words showcase prints
  ctx.ph = (p, real = '') => { const desc = DESCRIPTORS[p]; if (!desc) throw new Error('no placeholder descriptor ' + p); return run(() => sentinel(register(p, desc, 1, real))); };
  // the registry itself stays private; finishText reaches it through run
  // label(str): str with each placeholder written as its short label, for a theme that measures what a control will print
  const label = (str) => run(() => String(str).replace(SENT, (m, g) => { const e = reg.entries[decodeId(g)]; return e ? e.label : m; }));
  // entries: a read-only view of what a placeholder prints (label, length, form, bare), without the real words, for a theme that measures slot copy
  let view = [];
  // eslint-disable-next-line no-unused-vars -- real is taken out so the view never holds the real words
  const entries = () => { if (view.length !== reg.entries.length) view = reg.entries.map(({ real, ...rest }) => Object.freeze(rest)); return view; };
  ctx.placeholders = { descriptors: DESCRIPTORS, run, label, get entries() { return entries(); }, get count() { return reg.entries.length; } };
  return ctx;
}

// ---- finishing a written file ----
// .ph-b is inline-block (not block) so a struck or underlined cell does not draw its line through the placeholder
export const PH_CSS = `.ph-b,.ph-b *,.ph-c{text-decoration:none}
.ph-b{display:inline-block;width:100%;vertical-align:top;box-sizing:border-box;max-width:100%;border:1.5px dashed currentColor;padding:.4em .7em .5em;text-align:left;text-transform:none;letter-spacing:normal;font-style:normal;font-variant:normal;white-space:normal}
.ph-b>span{display:block}
.ph-l{font:500 11px/1.25 var(--chrome,var(--ff-body,sans-serif));letter-spacing:normal;text-transform:none}
.ph-w{font-size:min(1em,18px);line-height:1.25;margin:.2em 0 .3em;text-wrap:balance}
.ph-b--real .ph-w{font-size:1em}
.ph-m{font:400 11px/1.3 var(--chrome,var(--ff-body,sans-serif));letter-spacing:normal;text-transform:none}
.ph-c--ui{font-family:var(--chrome,var(--ff-body,sans-serif))}
.ui-card__title .ph-c{font-size:min(1em,15px);white-space:normal!important;overflow-wrap:anywhere}
.ph-n{white-space:nowrap!important}
.ph-c{display:inline;box-decoration-break:clone;-webkit-box-decoration-break:clone;border:1px dashed currentColor;padding:0 .3em;text-transform:none;letter-spacing:normal;font-style:normal;font-variant:normal;font-size:min(1em,20px);white-space:normal}`;
// The placeholder CSS as a string, for a builder that writes its own stylesheet. Not needed for text that goes through finishText:
// a finished html file that holds a placeholder gets this css in its head automatically.
export const placeholderCss = () => PH_CSS;
const STYLE_TAG = `<style id="ph-css">${PH_CSS}</style>`;

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// ancestors that make a slot tight: the compact form is used inside them
const TIGHT_TAG = new Set(['a', 'button', 'th', 'option', 'label', 'summary', 'figcaption', 'caption', 'dt', 'legend']);
const TIGHT_CLASS = /(^|[\s_-])(chip|badge|tab|tabs|crumb|crumbs|btn|button|tag|key|folio|hd|rh|run|runhead|foot|meta|stat)([\s_-]|$)/i;
// small fixed frames (scaled compositions, colour swatches, posts, boards): a block would not fit, so the compact form is used
const TIGHT_BOX = /(^|\s)(ph-tight|b-sc__in|a-ex|bk-post|bk-board|bk-card|bk-email|bk-sign|b-sig|b-pf|bk-sm|bk-smp|a-ch)(\s|$)/i;
// controls: the compact form is the label alone, without the length
const CTRL_TAG = new Set(['a', 'button', 'summary', 'option', 'label']);
const CTRL_CLASS = /(^|[\s_-])(chip|badge|tab|tabs|crumb|crumbs|btn|button|tag)([\s_-]|$)/i;
// inside a drawn product screen (the .ui components, phone and window frames) the compact form is the label alone too
const UI_CLASS = /(^|\s)(ui|ui-[\w-]+|kphn|b-win|bk-screen|bk-device)(\s|$)/i;

const plainWith = (s, fn) => s.replace(SENT, (m, g) => fn(cur.entries[decodeId(g)]));

function blockHtml(e) {
  return `<span class="ph-b${e.realSize ? ' ph-b--real' : ''}" data-ph="${esc(e.path)}"><span class="ph-l">${esc(e.label)}</span><span class="ph-w">${esc(e.what)}</span><span class="ph-m">${esc(e.length)}.${e.first ? ` e.g. &quot;${esc(e.example)}&quot;` : ''}</span></span>`;
}
const compactHtml = (e, ui, ctrl) => (e.sample ? esc(e.sample) : `<span class="ph-c${ui ? ' ph-c--ui' : ''}${(ctrl ? labelOf(e) : compactOf(e)).length <= 20 ? ' ph-n' : ''}" data-ph="${esc(e.path)}">${esc(ctrl ? labelOf(e) : compactOf(e))}</span>`);

function finishHtml(html) {
  const parts = html.split(/(<!--[\s\S]*?-->|<(script|style|title|textarea|option)\b[^>]*>[\s\S]*?<\/\2\s*>|<[^>]+>)/gi);
  // split with two capture groups: [text, tag, name, text, tag, name, ...]
  const toks = [];
  for (let k = 0; k < parts.length; k += 3) { toks.push({ text: parts[k], t: 'text' }); if (k + 1 < parts.length) toks.push({ text: parts[k + 1], t: 'tag', raw: parts[k + 2] }); }
  const stack = []; let any = false;
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === 'tag') {
      const s = tk.text;
      if (!s.includes(OPEN)) { // still track structure
        const m = /^<(\/?)([a-z][a-z0-9-]*)/i.exec(s);
        if (m && !s.startsWith('<!')) { const nm = m[2].toLowerCase(); if (m[1]) { let j = stack.length - 1; while (j >= 0 && stack[j].n !== nm) j--; if (j >= 0) stack.length = j; } else if (!VOID.has(nm) && !/\/>$/.test(s)) stack.push({ n: nm, cls: (/class="([^"]*)"/i.exec(s) || [])[1] || '' }); }
        continue;
      }
      any = true;
      if (tk.raw) { // script, style, title, textarea, option: plain label inside; attributes plain too
        tk.text = plainWith(tk.text, (e) => esc(labelOf(e)).replace(/&quot;/g, '"'));
        continue;
      }
      const m = /^<(\/?)([a-z][a-z0-9-]*)/i.exec(s); const nm = m ? m[2].toLowerCase() : '';
      tk.text = s.replace(/([a-z:_-]+)="([^"]*)"/gi, (full, an, av) => {
        if (!av.includes(OPEN)) return full;
        const lan = an.toLowerCase();
        const fn = lan === 'data-copy' ? fullOf : /^(value|data-default|placeholder)$/.test(lan) ? (e) => e.what : labelOf;
        return `${an}="${plainWith(av, (e) => esc(fn(e)))}"`;
      });
      if (m && !m[1] && !VOID.has(nm) && !/\/>$/.test(s)) stack.push({ n: nm, cls: (/class="([^"]*)"/i.exec(s) || [])[1] || '' });
      continue;
    }
    if (!tk.text.includes(OPEN)) continue;
    any = true;
    const inPlain = stack.some((a) => a.n === 'svg' || a.n === 'pre');
    if (inPlain) { tk.text = plainWith(tk.text, (e) => esc(labelOf(e))); continue; }
    const tight = stack.some((a) => TIGHT_TAG.has(a.n) || TIGHT_CLASS.test(a.cls) || TIGHT_BOX.test(a.cls));
    const ctrl = stack.some((a) => CTRL_TAG.has(a.n) || CTRL_CLASS.test(a.cls) || UI_CLASS.test(a.cls));
    const monoCtx = stack.some((a) => /(^|\s)(m|num|mono|code)(\s|$)/.test(a.cls) || a.n === 'code');  // a placeholder is words, not a literal value: not set in mono
    const prev = toks[k - 1], next = toks[k + 1];
    const alone = tk.text.trim().replace(SENT, '') === '' && (tk.text.match(SENT) || []).length === 1
      && prev && prev.t === 'tag' && /^<[a-z]/i.test(prev.text) && !/\/>$/.test(prev.text) && next && next.t === 'tag' && /^<\//.test(next.text);
    tk.text = tk.text.replace(SENT, (mm, g) => { const e = cur.entries[decodeId(g)]; return alone && !tight && e.form === 'block' ? blockHtml(e) : compactHtml(e, monoCtx, ctrl); });
  }
  let out = toks.map((t) => t.text).join('');
  if (any) out = /<\/helmet>/i.test(out) ? out.replace(/<\/helmet>/i, STYLE_TAG + '</helmet>') : /<\/head>/i.test(out) ? out.replace(/<\/head>/i, STYLE_TAG + '</head>') : STYLE_TAG + out;
  return out;
}

// ctx is the ctx the text was made from: its registry decodes the placeholders. Text with no placeholder needs no ctx.
export function finishText(text, file = '', ctx = null) {
  if (!text.includes(OPEN)) return text;
  if (!ctx || !ctx.placeholders) throw new Error(`placeholders: ${file} holds a placeholder but no ctx was given to finish it`);
  return ctx.placeholders.run(() => finishWith(text, file));
}

function finishWith(text, file) {
  const ext = extname(file).toLowerCase();
  let out;
  if (ext === '.html' || ext === '.htm') out = finishHtml(text);
  else if (ext === '.md' || ext === '.txt') out = text.replace(SENT, (m, g) => { const e = cur.entries[decodeId(g)]; return `[${e.form === 'block' ? fullOf(e) : e.label}]`; });
  else if (ext === '.svg' || ext === '.xml') out = text.replace(SENT, (m, g) => esc(labelOf(cur.entries[decodeId(g)])));
  else out = text.replace(SENT, (m, g) => `[${labelOf(cur.entries[decodeId(g)])}]`);
  if (/[-]/.test(out)) {
    const at = out.search(/[-]/);
    throw new Error(`placeholders: a brand copy string was cut or changed in code, so its placeholder could not be swapped, in ${file}\n  near: ${JSON.stringify(out.slice(Math.max(0, at - 80), at + 40))}`);
  }
  return out;
}
