// The previews the Palette Builder paints a palette onto, and the sample
// content the older ones share.
//
// Two kinds of scene live here. The examples (editorial, energy, product) are
// each their own made-up product, built around one drawn artefact that is
// painted with the palette; they are lazy chunks under
// src/components/palette/examples/. The older scenes are one invoicing app,
// Fernway, seen from several sides. Nothing here names a real person, a real
// place's Country or this site, and nothing claims proof;
// tests/unit/palette-preview-copy.test.js holds that line.
//
// This is content, not behaviour: no React, no hooks. The components that read
// it live in src/components/palette/PalettePreview.jsx.

export const PREVIEW_GROUPS = [
  { id: 'product', label: 'Product' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'graphic', label: 'Graphic' },
  { id: 'states', label: 'States' },
]

// `free` is the whole Pro gate: a preview without it is blurred behind
// "Unlock preview" for an account that is not Pro. `example` marks the lazy
// chunks. The list is in group order, because the arrow keys walk it.
export const PREVIEW_SCENES = [
  { id: 'energy', name: 'Energy dashboard', group: 'product', free: true, example: true },
  { id: 'dashboard', name: 'Dashboard', group: 'product', free: true },
  { id: 'phone', name: 'Phone app', group: 'product', free: true },
  { id: 'editorial', name: 'Editorial hero', group: 'marketing', free: true, example: true },
  { id: 'product', name: 'Product page', group: 'marketing', free: true, example: true },
  { id: 'landing', name: 'Landing page', group: 'marketing', free: true },
  { id: 'receipt', name: 'Email receipt', group: 'marketing', free: false },
  { id: 'poster', name: 'Poster', group: 'graphic', free: false },
  { id: 'social', name: 'Social tile', group: 'graphic', free: false },
  // The only scenes with form focus, error and disabled states.
  { id: 'invoices', name: 'Invoices', group: 'states', free: false },
  { id: 'settings', name: 'Settings', group: 'states', free: false },
]

export const DEFAULT_SCENE = 'editorial'

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
