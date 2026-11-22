// Theme 22, Ticket: the one sample story the sites and the example page tell in the slot edition. A box office: six bookings, one of them the
// booking in hand. Every list, table, card, alert, dialog and product screen reads it, so the totals add up and a status says the same thing
// everywhere. Another edition keeps the brand's own product screen.
const cache = new WeakMap();

const BOOKINGS = [
  { to: 'The Glass Menagerie', when: 'Fri 12 Dec, 7:30 pm · 2 seats', cents: 9600, status: 'active' },
  { to: 'Swan Lake', when: 'Sat 13 Dec, 2:00 pm · 4 seats', cents: 28800, status: 'new' },
  { to: 'Late Night Jazz', when: 'Sat 13 Dec, 10:00 pm · 2 seats', cents: 7000, status: 'waiting' },
  { to: 'Open Air Cinema', when: 'Thu 4 Dec, 8:00 pm · 3 seats', cents: 6000, status: 'closed' },
  { to: 'Comedy Gala', when: 'Sun 14 Dec, 6:00 pm · 2 seats', cents: 8450, status: 'new' },
  { to: 'Hamlet', when: 'Wed 17 Dec, 7:30 pm · 2 seats', cents: 11000, status: 'active' },
];
export const money = (cents) => '$' + Math.floor(cents / 100).toLocaleString('en-AU') + '.' + String(cents % 100).padStart(2, '0');
/** the day's takings, in cents, added up from the rows themselves */
export const TOTAL_CENTS = BOOKINGS.reduce((a, b) => a + b.cents, 0);

export const SPECIMEN = {
  headline: 'Doors open at seven',
  paragraph: 'Tickets are held at the box office until fifteen minutes before curtain. After that they go back on sale, so please arrive in good time.',
  caption: 'Stalls, row F, seats 11 and 12.',
};
export const SCREEN_TITLE = 'Tonight at the box office';

export function story(ctx) {
  if (cache.has(ctx.status)) return cache.get(ctx.status);
  const label = (id) => (ctx.status.find((s) => s.id === id) || ctx.status[0]).label;
  const deliveries = BOOKINGS.map((b) => ({ to: b.to, when: b.when, price: money(b.cents), status: b.status, icon: 'calendar' }));
  const first = deliveries[0];
  const S = {
    time: '7:30', status: label(first.status), eta: 'Doors at 7:00 pm', pickup: 'Tickets are held at the box office until 15 minutes before curtain.',
    from: 'Doors', to: 'Curtain', progress: 0.6,
    rider: 'Maya Chen', initials: 'MC', riderNote: 'Party of 2, collecting at the door', call: 'Call us',
    deliverToLabel: 'Show', deliverTo: first.to, paidLabel: 'Paid', paid: first.price, share: 'Send tickets',
    deliveries,
    form: {
      title: 'Book seats', pickup: 'Show', pickupValue: first.to, lockedLabel: 'Booking number', lockedValue: '4021', dropoff: 'Name on the booking', dropoffValue: 'Maya Chen',
      ready: 'Seats', readyValue: '6', readyError: 'A booking holds up to 4 seats. Enter 4 or fewer.',
      size: 'Section', sizes: ['Stalls', 'Circle', 'Balcony'], notes: 'Note for the box office', notesHelp: 'Access needs, or a seat to sit beside.',
      book: 'Book seats', bookWhy: 'Pick a show and a section first.',
    },
    empty: { title: 'No bookings yet', body: 'Pick a show to hold your first seats.', cta: 'Browse shows' },
    dialog: { title: 'Release these seats?', body: 'The two seats go back on sale and the booking is cancelled.', confirm: 'Release seats', keep: 'Keep seats' },
    toast: 'Seats held for 10 minutes.',
    alert: 'Doors close fifteen minutes after curtain. Late guests wait for the interval.',
    inline: 'Tickets are sent to the email on the booking.',
    example: {
      secondary: 'Change seats', quiet: 'Skip', danger: 'Cancel booking', small: 'Add', account: 'Maya Chen',
      checks: ['Send me the tickets', 'Remind me the day before', 'Share with a guest'], switches: ['Hold seats', 'Interval drinks'], radios: ['Stalls', 'Circle'],
      statLabel: 'Taken today', crumbs: ['Box office', 'Tonight'], tabs: ['Tonight', 'This week', 'All shows'],
      links: [['Shows', 'map-pin'], ['Book', 'plus'], ['Tickets', 'clock']],
    },
  };
  cache.set(ctx.status, S);
  return S;
}

// engine hook: the product screen's content (meta.screenContent)
export const screenContent = (ctx) => (ctx.edition === 'slot' ? story(ctx) : ctx.brand.ui.screen.content);

// engine hook: the example page's words and total, from the same rows (meta.exampleDemo)
export function exampleDemo(ctx) {
  if (ctx.edition !== 'slot') return {};
  const S = story(ctx);
  return { cardMeta: 'Booking 4021 · ' + S.rider + ' · ' + S.status, noBadge: true, stat: [money(TOTAL_CENTS), 'Taken today'], account: 'Booking 4021, 2 seats' };
}
