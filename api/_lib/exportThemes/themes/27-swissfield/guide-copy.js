// Theme 27, Swiss Field: the words the style guide sets that belong to a brand's idea, not to a template. Keyed by the brand's slug; a brand with no entry gets the sentence the page computes.
// Each value is a list of candidate sentences, longest first: the page takes the first that sets within its lines under the title, so every one must be true of the brand's data.
// Kept beside the guide (not in the brand's data) so the other themes that draw the same brand are not changed.
// A line the brand sets is spent once on a page and once across the guide where it can be: the cover has the primary line, the type specimens, the panel and the quote cover each have another.
const COPY = {
  'northern-current-r1': {
    ruler: ['Mostly white, with Sunbelt held to a small share.', 'Mostly white, the rest cut by share.'],
    applied: ['The hoarding and the email, set on white, and the shots to take.', 'The hoarding and the email, set on white.', 'The brand in use.'],
    // the button word: the data's one call to action. message: the next action for the brand's own message (the install-day email), set on the card and the email
    verbs: { primary: 'Get your quote', message: 'Get your quote' },
    markRules: [1],
    // the card on the Usage page: the brand's empty state as one piece (ui.screen.content.empty: title, body and call to action), not the install-day email's words
    card: { empty: true },
    // the line the panel mockup sets
    panel: '6.6 kW, 15 panels.',
    type: ['Two faces on one scale.'],
    // the type page: a whole sentence for a step, tried in this order; each is one of the brand's own lines (lines.others and applications.social), and the body and caption are the sample's own
    typeSpecimens: {
      display: ['Sun in, bills down.'],
      headline: ['No quotes yet'],
      title: ['Panels on the roof, power at the meter box.'],
    },
    // the photographs the brand commissions (the data holds briefs, no files): the shots the Applied page lists, by the shot's id; both are wide crops
    shotsShown: ['ridge', 'array', 'meter', 'street', 'kitchen', 'handover'],
  },
  'kerbside-r1-27': {
    ruler: ['Half the page stays white, so Signal reads from the kerb.', 'Half the page stays white.'],
    applied: ['The riders, and the poster at the stop.', 'The brand in use.'],
    // the slot edition holds no photograph, so its poster is what it describes
    appliedSlot: ['The poster set flat, and the briefs for its photographs.', 'The poster, set flat.'],
    // the shots whose briefs the slot edition shows in its photo frames, by the shot's id
    slotPhotos: ['handover', 'route', 'bag'],
    // the data's own button words: the book call to action, and the tracking message's
    verbs: { primary: 'Book rider', message: 'Share tracking link' },
    // what each photograph shows of the brand colour, by the shot's id
    photos: { riders: "Signal on the front rider's jacket and bag.", evening: 'Signal on the jacket.' },
    // where each crop is centred, so the rider the caption names is in it
    photoPos: { evening: '12% 50%', riders: '90% 50%' },
    panel: 'There at 11:40.',
    typeSpecimens: {
      display: ['Kerbside'],
      headline: ['Bikes, not vans.'],
      title: ['Pickup booked for 10:45'],
    },
  },
};

// the brand's own candidate sentences for a page key, or the fallback list
export function copyOf(ctx, key, fallback) {
  const c = COPY[ctx.brand.slug] && COPY[ctx.brand.slug][key];
  return c ? (Array.isArray(c) ? c : [c]) : fallback;
}
// a brand's own value for a key as it is written (an object or a list), or the fallback
export const copyRaw = (ctx, key, fallback) => ((COPY[ctx.brand.slug] || {})[key] ?? fallback);
