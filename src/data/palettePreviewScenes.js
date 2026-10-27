// The previews the Palette Builder paints a palette onto, and the sample
// content the older ones share.
//
// Two kinds of scene live here. The examples (editorial, energy, product) are
// each their own made-up product, built around one drawn artefact that is
// painted with the palette; they are lazy chunks under
// src/components/palette/examples/. The two older scenes are one invoicing app,
// Fernway, seen as a table and as a form. Nothing here names a real person, a
// real place's Country or this site, and nothing claims proof;
// tests/unit/palette-preview-copy.test.js holds that line.
//
// This is content, not behaviour: no React, no hooks. The components that read
// it live in src/components/palette/PalettePreview.jsx.

export const PREVIEW_GROUPS = [
  { id: 'product', label: 'Product' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'states', label: 'States' },
]

// `free` is the whole Pro gate: a preview without it is blurred behind
// "Unlock preview" for an account that is not Pro. `example` marks the lazy
// chunks. The list is in group order, because the arrow keys walk it.
export const PREVIEW_SCENES = [
  { id: 'energy', name: 'Energy dashboard', group: 'product', free: true, example: true },
  { id: 'trail', name: 'Trail run app', group: 'product', free: true, example: true },
  { id: 'card', name: 'Spending card', group: 'product', free: false, example: true },
  { id: 'editorial', name: 'Editorial hero', group: 'marketing', free: true, example: true },
  { id: 'product', name: 'Product page', group: 'marketing', free: true, example: true },
  { id: 'studio', name: 'Architect portfolio', group: 'marketing', free: false, example: true },
  // The only scenes with form focus, error and disabled states.
  { id: 'invoices', name: 'Invoices', group: 'states', free: false },
  { id: 'settings', name: 'Settings', group: 'states', free: false },
]

export const DEFAULT_SCENE = 'editorial'

const sceneIs = (id) => (s) => s.id === id
export const sceneById = (id) => PREVIEW_SCENES.find(sceneIs(id)) || PREVIEW_SCENES.find(sceneIs(DEFAULT_SCENE))

// ── Sample content ───────────────────────────────────────────────────────────

export const FERNWAY = {
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
  settingsTabs: ['Profile', 'Business', 'Notifications', 'Billing'],
}
