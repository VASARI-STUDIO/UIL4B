// The eight previews the Palette Builder paints a palette onto, and the sample
// content they share.
//
// Every preview belongs to one made-up product, Fernway (invoicing and time
// tracking for freelancers, in AUD), so the set reads as one small product
// seen from eight sides rather than eight unrelated mock-ups. Nothing here
// names a real person, a real place's Country or this site, and nothing claims
// proof; tests/unit/palette-preview-copy.test.js holds that line.
//
// This is content, not behaviour: no React, no hooks. The components that read
// it live in src/components/palette/PalettePreview.jsx.

export const PREVIEW_GROUPS = [
  { id: 'product', label: 'Product' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'graphic', label: 'Graphic' },
]

// `free` is the whole Pro gate: a preview without it is blurred behind
// "Unlock preview" for an account that is not Pro.
export const PREVIEW_SCENES = [
  { id: 'dashboard', name: 'Dashboard', group: 'product', free: true },
  { id: 'invoices', name: 'Invoices', group: 'product', free: true },
  { id: 'settings', name: 'Settings', group: 'product', free: false },
  { id: 'phone', name: 'Phone app', group: 'product', free: true },
  { id: 'landing', name: 'Landing page', group: 'marketing', free: true },
  { id: 'receipt', name: 'Email receipt', group: 'marketing', free: false },
  { id: 'poster', name: 'Poster', group: 'graphic', free: false },
  { id: 'social', name: 'Social tile', group: 'graphic', free: false },
]

export const DEFAULT_SCENE = 'dashboard'

export const sceneById = (id) => PREVIEW_SCENES.find((s) => s.id === id) || PREVIEW_SCENES[0]

// ── Sample content ───────────────────────────────────────────────────────────

export const FERNWAY = {
  nav: ['Overview', 'Invoices', 'Clients', 'Time', 'Reports', 'Settings'],
  // Monthly paid totals as a share of the tallest bar, November to October.
  months: [38, 52, 41, 64, 58, 72, 49, 66, 61, 78, 70, 100],
  week: [
    { day: 'M', state: 'logged' },
    { day: 'T', state: 'logged' },
    { day: 'W', state: 'logged' },
    { day: 'T', state: 'today' },
    { day: 'F', state: 'empty' },
    { day: 'S', state: 'empty' },
    { day: 'S', state: 'empty' },
  ],
  tabs: ['All', 'Drafts', 'Sent', 'Paid'],
  status: {
    paid: { label: 'Paid', shape: 'circle', role: 'success' },
    overdue: { label: 'Overdue', shape: 'triangle', role: 'error' },
    due: { label: 'Due in 3 days', shape: 'square', role: 'warning' },
    sent: { label: 'Sent', shape: 'diamond', role: 'info' },
    draft: { label: 'Draft', shape: 'ring', role: 'neutral' },
  },
  invoices: [
    { client: 'Kiri Walker', no: 'FW-0142', issued: '2 Oct', due: '16 Oct', status: 'paid', amount: '$1,250.00' },
    { client: 'Harbour Physio', no: 'FW-0143', issued: '6 Oct', due: '20 Oct', status: 'overdue', amount: '$880.00' },
    { client: 'Lena Ostrowski', no: 'FW-0144', issued: '9 Oct', due: '23 Oct', status: 'due', amount: '$2,060.00' },
    { client: 'Marlo & Finch', no: 'FW-0145', issued: '12 Oct', due: '26 Oct', status: 'sent', amount: '$640.00' },
    { client: 'Tom Nguyen', no: 'FW-0146', issued: '', due: '', status: 'draft', amount: '$1,400.00' },
  ],
  entries: [
    { client: 'Harbour Physio', task: 'Brand refresh', time: '2h 14m', role: 'accent' },
    { client: 'Lena Ostrowski', task: 'Menu design', time: '1h 30m', role: 'secondary' },
    { client: 'Marlo & Finch', task: 'Site updates', time: '45m', role: 'deep' },
  ],
  plans: [
    { id: 'free', name: 'Free', price: '$0', note: '3 clients, invoices with Fernway branding' },
    { id: 'solo', name: 'Solo', price: '$12', per: '/month', note: 'Unlimited clients, your logo, card payments', pick: true },
    { id: 'studio', name: 'Studio', price: '$29', per: '/month', note: 'Up to 5 people, shared clients, reports' },
  ],
  receipt: [
    ['Invoice', 'FW-0142'],
    ['Paid', '16 Oct by card'],
    ['Fee', '$21.25'],
    ['To your account', '$1,228.75'],
  ],
  settingsTabs: ['Profile', 'Business', 'Notifications', 'Billing'],
}
