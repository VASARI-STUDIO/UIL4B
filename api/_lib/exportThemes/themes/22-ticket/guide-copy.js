// Theme 22, Stub: the words the A4 style guide sets that belong to a brand's idea, not to a template. Keyed by the brand's slug; a brand with no entry
// gets the sentence the page computes. Each value is a list of candidate sentences, longest first: the page takes the first that sets within its lines,
// so every one must be true of the brand's data. The voice is the ticket's: short, printed, a number where there is one ("Admit one", "Valid on the day").
const COPY = {
  margin: {
    ruler: ['Card is the paper. Plum is the stamp, used once a page.', 'Card is the paper.'],
    applied: ['A window sign, a card and an order email, each printed to its own scale.', 'The brand in use.'],
    verbs: { primary: 'Pre-order', message: 'Pre-order' },
    typeSpecimens: {
      display: ['Books with room to think.'],
      headline: ['Read slowly. We print slowly.'],
      title: ['Pre-orders ship the week the book is printed.'],
    },
  },
  'northern-current-r1': {
    ruler: ['Mostly white paper. Sunbelt is the one punched hole.', 'Mostly white paper.'],
    applied: ['A hoarding and an email, each printed to its own scale.', 'The brand in use.'],
    verbs: { primary: 'Get your quote', message: 'Get your quote' },
    typeSpecimens: {
      display: ['Sun in, bills down.'],
      headline: ['No quotes yet'],
      title: ['Panels on the roof, power at the meter box.'],
    },
  },
  'kerbside-r1-27': {
    ruler: ['Half the page stays white, so Signal reads from the kerb.', 'Half the page stays white.'],
    applied: ['A poster, a card and a tracking email, each printed to its own scale.', 'The brand in use.'],
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
