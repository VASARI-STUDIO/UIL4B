// Order email: a timber yard's dispatch email, as it lands in an inbox. The
// masthead is the deep, the rule and the order link are the secondary, the table
// header is the subtle, the delivery track carries the success and the primary,
// and the button is the primary. Everything else is neutral.
//
// Plain data, no React. The line items and the total live together so the table
// can never add up to something other than what it prints.

export const ROLES = ['primary', 'secondary', 'subtle', 'deep', 'success', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'headline, table body, step names', ink: 'text', ground: 'surface' },
  { el: 'preheader, order count, footer', ink: 'muted', ground: 'canvas' },
  { el: 'masthead', ink: 'fieldInks:--fi-deep-ink', ground: 'deep' },
  { el: 'table header', ink: 'fieldInks:--fi-sub-ink', ground: 'subtle' },
  { el: 'track button', ink: 'fieldInks:--fi-ink', ground: 'primary' },
  { el: 'order and unsubscribe links', ink: 'brandAsText:secondary', ground: 'surface' },
]

export const COPY = {
  preheader: 'From Offcut Timber Co. · Your order is on its way',
  brand: 'Offcut Timber Co.',
  heading: 'Your boards leave the yard today',
  order: 'Order 20418',
  count: ', 3 items',
  tableLabel: 'Order 20418',
  columns: ['Item', 'Length', 'Qty', 'Price'],
  cta: 'Track delivery',
  address: 'Offcut Timber Co., 12 Offcut Lane, Lantern Bay',
  unsubscribe: 'Unsubscribe',
  progressLabel: 'Delivery progress',
}

// Three lines and a total: 24 x $49.20, 1 x $64.00 and $95.00 delivery.
export const LINES = [
  { item: 'Spotted gum decking, 86 x 19', length: '5.4 m', qty: '24', price: 1180.8 },
  { item: 'Stainless screws, 500', length: '', qty: '1', price: 64 },
  { item: 'Delivery, Marrickville', length: '', qty: '', price: 95 },
]

export const money = (n) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const TOTAL = money(LINES.reduce((sum, l) => sum + l.price, 0))

// The delivery track: one step done, one current, two to come.
export const STEPS = [
  { name: 'Packed', done: true, current: false, role: 'success', line: 'success' },
  { name: 'Left the yard', done: false, current: true, role: 'primary', line: 'neutral' },
  { name: 'Out for delivery', done: false, current: false, role: 'neutral', line: 'neutral' },
  { name: 'Delivered', done: false, current: false, role: 'neutral', line: null },
]
