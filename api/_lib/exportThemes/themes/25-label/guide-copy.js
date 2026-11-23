// Theme 25, Label: the words the style guide sets that belong to a brand's idea, not to a template. Keyed by the brand's slug; a brand with no entry gets the sentence the page computes.
// Each value is a list of candidate sentences, longest first: the page takes the first that sets within its lines, so every one must be true of the brand's data.
// Label writes the way a wall label does: a short statement of fact, no promise. Kept beside the guide (not in the brand's data) so the other themes that draw the same brand are not changed.
const COPY = {
  margin: {
    ruler: ['Card holds 60%. Plum is held to 8%.','Card holds 60%.'],
    applied: ['The shop window sign, the card and the order email.', 'The brand in use.'],
    // the button word: the data's one call to action. message: the next action for the brand's own message
    verbs: { primary: 'Pre-order', message: 'Pre-order' },
    // the lines the type page and the cover set: each is one of the brand's own
    typeSpecimens: {
      display: ['Books with room to think.'],
      headline: ['Read slowly. We print slowly.'],
      title: ['Pre-orders ship the week the book is printed.'],
    },
  },
  'northern-current-r1': {
    ruler: ['Mostly white. Sunbelt is held to a small share.', 'Mostly white.'],
    applied: ['The hoarding and the email, hung on white.', 'The brand in use.'],
    verbs: { primary: 'Get your quote', message: 'Get your quote' },
    typeSpecimens: {
      display: ['Sun in, bills down.'],
      headline: ['No quotes yet'],
      title: ['Panels on the roof, power at the meter box.'],
    },
  },
  'kerbside-r1-27': {
    ruler: ['Half the page stays white, so Signal reads from the kerb.', 'Half the page stays white.'],
    applied: ['The poster, the card and the tracking email.', 'The brand in use.'],
    verbs: { primary: 'Book rider', message: 'Share tracking link' },
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
