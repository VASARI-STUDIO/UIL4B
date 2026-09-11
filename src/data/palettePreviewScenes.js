// The eighteen preview scenes the Palette Builder paints a palette onto —
// six product screens, six brand pages and six graphic pieces.
//
// LIFTED OUT OF src/pages/PaletteBuilder.jsx ON 2026-09-11, UNCHANGED. It is
// content, not behaviour: every entry is a name and three strings, nothing
// here imports React, and the components that read it live in
// src/components/palette/PalettePreview.jsx. Keeping the two apart is also
// what keeps that file clear of `react-refresh/only-export-components` — a
// module exporting both a component and a constant earns that warning, and
// the lint ceiling has no room in it.

// ── The three preview scenes. Each maps the palette (via derivePreviewRoles →
// --pv-* custom props) onto a distinct, high-fidelity mock of a real design
// context, so "will this actually ship?" gets answered for UI, brand and
// graphic work — not just a dashboard. ──

export const PREVIEW_SCENES = {
  ui: [
    { name: 'Analytics dashboard', head: 'Weekly overview', sub: 'Live product metrics and a primary action' },
    { name: 'Commerce checkout', head: 'Review your order', sub: 'Summary, totals and payment hierarchy' },
    { name: 'Project workspace', head: 'Launch checklist', sub: 'Tasks, progress and team activity' },
    { name: 'Account settings', head: 'Profile settings', sub: 'Forms, helper copy and saved state' },
    { name: 'Support inbox', head: 'Customer inbox', sub: 'Conversation list and response actions' },
    { name: 'Finance overview', head: 'Account balance', sub: 'Transactions, status and transfer action' },
  ],
  brand: [
    { name: 'Product launch', kicker: 'Introducing', head: 'Design that\nfeels inevitable', sub: 'A focused product launch with primary and secondary actions.' },
    { name: 'Architecture studio', kicker: 'Selected practice', head: 'Built for\nlasting use', sub: 'An editorial studio page with confident colour restraint.' },
    { name: 'Creative portfolio', kicker: 'New collection', head: 'Work with\na clear point', sub: 'A portfolio introduction supported by a compact project index.' },
    { name: 'Conference', kicker: 'Brisbane · October', head: 'Systems in\npractice', sub: 'An event page balancing schedule, venue and registration.' },
    { name: 'Independent journal', kicker: 'Issue sixteen', head: 'Ideas worth\nkeeping', sub: 'An editorial cover with a clear reading path and subscription action.' },
    { name: 'Hospitality', kicker: 'Open this season', head: 'Stay close\nto the coast', sub: 'A destination page using the palette for calm orientation.' },
  ],
  graphic: [
    { name: 'Editorial poster', kicker: 'Vol. 04 — Colour', head: 'FORM\n& HUE', sub: 'Type, shape and colour working as one composed system.' },
    { name: 'Album cover', kicker: 'Recorded live', head: 'NIGHT\nSIGNAL', sub: 'A compact cover system with a legible release hierarchy.' },
    { name: 'Campaign', kicker: 'City series 02', head: 'MOVE\nWITH IT', sub: 'A public campaign balancing impact with readable details.' },
    { name: 'Packaging', kicker: 'Batch No. 18', head: 'FIELD\nNOTES', sub: 'A packaging face with product, variant and provenance cues.' },
    { name: 'Magazine cover', kicker: 'Spring edition', head: 'NEW\nGROUND', sub: 'A cover composition built for title, feature and issue data.' },
    { name: 'Social launch', kicker: 'Available Friday', head: 'MAKE\nSPACE', sub: 'A campaign tile that preserves the message at small sizes.' },
  ],
}
