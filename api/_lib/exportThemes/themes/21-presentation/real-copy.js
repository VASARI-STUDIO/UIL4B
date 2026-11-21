// Which words theme 21 prints for real in the slot edition (meta.realCopy, read by engine/placeholders.js).
// What the project itself gave (its name, its colours and what each is for) and the generic sample copy a component needs to read as a
// component (a button label, a form field, a type specimen) stay as words. A dashed placeholder is left only for what the user still
// has to write: the voice, the imagery, the logo's use, the contact lines. Returning undefined leaves the placeholder.

const SENTENCE = (s) => { const t = String(s).trim(); return t ? t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.') : t; };

// Pangram specimens for the type pages: they show the faces, and nobody mistakes them for the brand's own copy.
const SPECIMEN = {
  headline: 'Pack my box with five dozen liquor jugs',
  paragraph: 'How vexingly quick daft zebras jump. The job requires extra pluck and zeal from every young wage earner, and the five boxing wizards jump quickly.',
  caption: 'Figure 1. Sphinx of black quartz, judge my vow.',
};

// The product's sample copy: one set of orders (an order screen) that the kit's lists, table, cards, dialog and product screens and the
// guide's mock-ups all read, so every page tells the same story. Round totals and round times would read as filler, so there are none:
// six orders, mixed times, one late, one closed. Each row is [customer, line under the name, total].
const ORDERS = [
  ['Maya Chen', 'Order 1042, due 11:40 am', '$84.35'],
  ['Tom Nguyen', 'Order 1041, due 12:20 pm', '$126.80'],
  ['Ruth Okafor', 'Order 1040, 12 min late', '$47.95'],
  ['Sam Peters', 'Order 1039, sent 8:42 am', '$212.10'],
  ['Lena Fischer', 'Order 1043, due 1:30 pm', '$58.20'],
  ['Dev Patel', 'Order 1044, due 2:15 pm', '$93.65'],
];
// Each order's status id (the brand's status list: new, active, waiting, closed), in the order of ORDERS. once.js applies it to the rows, so the
// chip on a row, the card, the tabs' counts and the pages' copy all read one status: 1042 and 1041 are being packed, 1040 is late, 1039 is
// closed, 1043 and 1044 are new.
export const ORDER_STATUS = ['active', 'active', 'waiting', 'closed', 'new', 'new'];
// which tab an order sits under: a late order is only under Late, a closed one only under Closed, every other is Open
const TAB_OF = { new: 'Open', active: 'Open', waiting: 'Late', closed: 'Closed' };
const TABS = ['Open', 'Late', 'Closed'].map((t) => `${t} ${ORDER_STATUS.filter((s) => TAB_OF[s] === t).length}`);
const UI_SAMPLE = {
  'ui.screen.title': 'Orders',
  'ui.screen.content.status': 'Packing',
  'ui.screen.content.eta': 'Due 11:40 am',
  'ui.screen.content.pickup': 'Packing started at 10:32 am. Ready to hand over by 11:40 am.',
  'ui.screen.content.from': 'Packed',
  'ui.screen.content.to': 'Sent',
  'ui.screen.content.rider': 'Jo Hartley',
  'ui.screen.content.initials': 'JH',
  'ui.screen.content.riderNote': '3 of 5 items packed',
  'ui.screen.content.deliverToLabel': 'Customer',
  'ui.screen.content.deliverTo': 'Maya Chen',
  'ui.screen.content.paidLabel': 'Total',
  'ui.screen.content.paid': '$84.35',
  'ui.screen.content.share': 'Share tracking link',
  'ui.screen.content.form.title': 'Place an order',
  'ui.screen.content.form.pickup': 'Customer',
  'ui.screen.content.form.pickupValue': 'Maya Chen',
  'ui.screen.content.form.dropoff': 'Email',
  'ui.screen.content.form.dropoffValue': 'maya.chen@example.com',
  'ui.screen.content.form.ready': 'Quantity',
  'ui.screen.content.form.readyValue': '61',
  'ui.screen.content.form.readyError': 'Enter a quantity from 1 to 50.',
  'ui.screen.content.form.size': 'Delivery',
  'ui.screen.content.form.notes': 'Order notes',
  'ui.screen.content.form.notesHelp': 'Gate code, level, who to ask for.',
  'ui.screen.content.form.book': 'Place order',
  'ui.screen.content.form.bookWhy': 'Add a customer to place the order.',
  'ui.screen.content.empty.title': 'No orders yet',
  'ui.screen.content.empty.body': 'New orders show up here with the time they are due.',
  'ui.screen.content.empty.cta': 'Place order',
  'ui.screen.content.dialog.title': 'Cancel order 1042?',
  'ui.screen.content.dialog.body': "Maya Chen won't be charged, and she is told straight away. This can't be undone.",
  'ui.screen.content.dialog.confirm': 'Cancel order',
  'ui.screen.content.dialog.keep': 'Keep order',
  'ui.screen.content.toast': 'Order 1042 placed. Due at 11:40 am.',
  'ui.screen.content.alert': 'Order 1040 is 12 minutes late. Ruth Okafor has been told.',
  'ui.screen.content.inline': 'Add a gate code if the address has one.',
  'ui.screen.content.example.secondary': 'Track order',
  'ui.screen.content.example.quiet': 'Not now',
  'ui.screen.content.example.danger': 'Cancel order',
  'ui.screen.content.example.small': 'Add note',
  'ui.screen.content.example.statLabel': 'Orders today',
  // the account field is disabled and names who is signed in (the value is the person packing)
  'ui.screen.content.example.account': 'Packed by',
};
const UI_LIST = {
  'ui.screen.content.form.sizes': ['Standard', 'Express', 'Pick up'],
  'ui.screen.content.example.checks': ['Leave at the door', 'Signature needed', 'Fragile'],
  'ui.screen.content.example.switches': ['Text me when it is packed', 'Email receipts'],
  'ui.screen.content.example.radios': ['Standard', 'Express'],
  'ui.screen.content.example.crumbs': ['Orders', 'Order 1042'],
  'ui.screen.content.example.tabs': TABS,
};
const LINKS = ['Orders', 'Customers', 'Shop'];
// the icon of each link: a list for the orders, people for customers, a storefront for the shop
export const LINK_ICONS = ['clipboard-list', 'users', 'store'];
const STATUS = ['New order', 'Packing', 'Late', 'Closed'];
const ORDER_FIELD = { to: 0, when: 1, price: 2 };

export function realCopy(path, value) {
  if (path === 'name' || path === 'logo.showcase.wordmark') return value === 'Your brand' ? undefined : value;  // no project name: the user still has to write it
  let m;
  if ((m = /^colours\.\d+\.(name|lands|roleText)$/.exec(path))) return m[1] === 'lands' ? SENTENCE(value) : value;
  if (/^pairs\.\d+\.use$/.test(path)) return value;
  if ((m = /^type\.sample\.(headline|paragraph|caption)$/.exec(path))) return SPECIMEN[m[1]];
  if (!path.startsWith('ui.')) return undefined;
  if ((m = /^ui[.]status[.](\d)[.]label$/.exec(path))) return STATUS[Number(m[1])] ?? value;
  if (path in UI_SAMPLE) return UI_SAMPLE[path];
  if ((m = /^(.*)\.(\d+)$/.exec(path)) && UI_LIST[m[1]]) return UI_LIST[m[1]][Number(m[2])] ?? value;
  if ((m = /^ui\.screen\.content\.example\.links\.(\d+)\.0$/.exec(path))) return LINKS[Number(m[1])] ?? value;
  if ((m = /^ui\.screen\.content\.deliveries\.(\d+)\.(to|when|price)$/.exec(path))) { const o = ORDERS[Number(m[1])]; return o ? o[ORDER_FIELD[m[2]]] : value; }
  return value;
}
