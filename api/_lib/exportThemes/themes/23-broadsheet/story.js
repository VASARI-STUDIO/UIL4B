// Theme 23, Broadsheet: the one sample story the sites and the example page tell in the slot edition. A weekly's notices desk: six notices set for
// Thursday's edition, one of them the notice in hand. Every list, table, card, alert, dialog and product screen reads it, so the totals add up and
// a status says the same thing everywhere. Another edition keeps the brand's own product screen.
const cache = new WeakMap();

const NOTICES = [
  { to: 'Council budget hearing', when: 'Thu 11 Dec · 2 runs', cents: 9600, status: 'active' },
  { to: 'Harbour pontoon tender', when: 'Thu 11 Dec · 3 runs', cents: 28800, status: 'new' },
  { to: 'Lost: grey cat, Elm Street', when: 'Thu 11 Dec · 1 run', cents: 1800, status: 'waiting' },
  { to: 'Garage sale, Saturday', when: 'Thu 4 Dec · 1 run', cents: 1200, status: 'closed' },
  { to: 'Planning application, Quay Road', when: 'Thu 11 Dec · 2 runs', cents: 8450, status: 'new' },
  { to: 'Annual meeting of the choir', when: 'Thu 18 Dec · 1 run', cents: 4400, status: 'active' },
];
export const money = (cents) => '$' + Math.floor(cents / 100).toLocaleString('en-AU') + '.' + String(cents % 100).padStart(2, '0');
/** the week's billing, in cents, added up from the rows themselves */
export const TOTAL_CENTS = NOTICES.reduce((a, b) => a + b.cents, 0);

export const SPECIMEN = {
  headline: 'Copy closes on Wednesday',
  paragraph: 'Notices are set on Wednesday evening and printed in Thursday’s edition. Anything that arrives after five o’clock runs the week after, so please send it in good time.',
  caption: 'Set in the notices column, page 12.',
};
export const SCREEN_TITLE = 'This week’s notices';

export function story(ctx) {
  if (cache.has(ctx.status)) return cache.get(ctx.status);
  const label = (id) => (ctx.status.find((s) => s.id === id) || ctx.status[0]).label;
  const deliveries = NOTICES.map((b) => ({ to: b.to, when: b.when, price: money(b.cents), status: b.status, icon: 'calendar' }));
  const first = deliveries[0];
  const S = {
    time: '9:41', status: label(first.status), eta: 'Goes to press Wednesday, 5:00 pm', pickup: 'Notices are set on Wednesday evening and printed in Thursday’s edition.',
    from: 'Filed', to: 'Printed', progress: 0.6,
    rider: 'Maya Chen', initials: 'MC', riderNote: 'Placed online, proof approved', call: 'Ring the desk',
    deliverToLabel: 'Notice', deliverTo: first.to, paidLabel: 'Paid', paid: first.price, share: 'Send proof',
    deliveries,
    form: {
      title: 'Place a notice', pickup: 'Notice', pickupValue: first.to, lockedLabel: 'Notice number', lockedValue: '4021', dropoff: 'Name on the notice', dropoffValue: 'Maya Chen',
      ready: 'Runs', readyValue: '6', readyError: 'A notice runs for up to 4 weeks. Enter 4 or fewer.',
      size: 'Section', sizes: ['Public notices', 'Classifieds', 'Tenders'], notes: 'Note for the desk', notesHelp: 'A deadline, or a heading to run under.',
      book: 'Place notice', bookWhy: 'Write the notice and pick a section first.',
    },
    empty: { title: 'No notices yet', body: 'Write your first notice and it will run in the next edition.', cta: 'Place a notice' },
    dialog: { title: 'Withdraw this notice?', body: 'It comes out of Thursday’s edition and the order is cancelled.', confirm: 'Withdraw notice', keep: 'Keep notice' },
    toast: 'Notice filed for Thursday’s edition.',
    alert: 'Copy for Thursday closes on Wednesday at 5 pm. Later notices run the week after.',
    inline: 'The proof is sent to the email on the notice.',
    example: {
      secondary: 'Change copy', quiet: 'Skip', danger: 'Withdraw notice', small: 'Add', account: 'Maya Chen',
      checks: ['Send me the proof', 'Remind me before it runs', 'Copy a colleague'], switches: ['Run online too', 'Bold heading'], radios: ['Public notices', 'Classifieds'],
      statLabel: 'Billed this week', crumbs: ['Notices desk', 'This week'], tabs: ['This week', 'Next week', 'All notices'],
      links: [['Notices', 'calendar'], ['Place', 'plus'], ['Proofs', 'search']],
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
  return { cardMeta: 'Notice 4021 · ' + S.rider + ' · ' + S.status, noBadge: true, stat: [money(TOTAL_CENTS), 'Billed this week'], account: 'Notice 4021, 2 runs' };
}
