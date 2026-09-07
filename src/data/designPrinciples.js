// What UIL4B holds to when it builds an interface system, and — for every one
// of them — the screen where the product applies it.
//
// ── Why each rule carries a route ──────────────────────────────────────────
//
// Mobbin was searched for the shape this page usually takes, and the corpus is
// unusually consistent about it: Grain, Sprig, Qatalog and ElevenLabs all ship
// the same section — a heading, then three to six equally weighted cards, each
// an icon above a two-word abstraction ("Never settle", "First principles",
// "Keep things simple") with a sentence of explanation under it. Nothing on any
// of those pages is falsifiable, and nothing points at the product.
//
//   https://mobbin.com/sites/sections/1ecd0b68-c732-417b-ab87-093e9779aaa9  Grain
//   https://mobbin.com/sites/sections/8879fc48-b65b-4f6d-82fb-5cefe888ae06  Sprig
//   https://mobbin.com/sites/sections/2b7f8c1d-4ecd-4279-a6e9-df856575d1a1  Qatalog
//   https://mobbin.com/sites/sections/ec9b8c3a-50bc-498a-80d5-5be114faadda  ElevenLabs
//
// That is the exact construction `anti-slop-quality-bar.md` names twice over —
// "every idea is enclosed in an equally weighted rounded card", "icons or
// abstract shapes fill space without strengthening recognition" — so the
// corpus here is a warning rather than a reference, and the page is built the
// other way: a rule is only allowed on it if a screen already enforces it, and
// the proof beside each rule is COMPUTED by the same function that tool runs.
//
// The one Mobbin result worth copying is Hashnode's editor section, which puts
// the real product surface ABOVE the claim so the claim reads as a caption on
// evidence rather than as an assertion:
//   https://mobbin.com/sites/sections/ce305258-5218-49f8-8cf0-cc49059d10e4
//
// ── What this file may and may not say ─────────────────────────────────────
//
// These are the PRODUCT's rules about interface systems, said in public. The
// internal design references (.claude/skills/uil4b-brand-design/references/)
// are a different document for a different reader — they are about how agents
// working on this repository should judge a surface, and their vocabulary
// ("slop", "under-authored", "operative not performative") is a review
// vocabulary, not a product position. None of it is quoted here.
//
// Plain JS, no JSX: the guard test imports this in bare Node, and the proof
// components live beside the page that renders them.
export const DESIGN_PRINCIPLES = Object.freeze([
  Object.freeze({
    id: 'measured',
    rule: 'Contrast is a measurement, not an opinion.',
    body: 'A pair either clears the threshold or it does not. The checker states the ratio, names the level it reaches, and when a pair fails it offers the nearest colour that passes.',
    to: '/create/contrast',
    linkLabel: 'Open the contrast checker',
  }),
  Object.freeze({
    id: 'two-values',
    rule: 'One name. Two values.',
    body: 'A theme is not an inversion of the other theme. Every colour role holds its own value per ground, picked so the role clears the same floor on both.',
    to: '/learn/theme-systems',
    linkLabel: 'Read how themes are built',
  }),
  Object.freeze({
    id: 'arithmetic',
    rule: 'A type scale is arithmetic.',
    body: 'Sizes are not chosen one at a time. A base and a ratio generate the ladder, which is why a scale can be handed over as two numbers instead of a list.',
    to: '/create/type-scale',
    linkLabel: 'Open the type scale',
  }),
  Object.freeze({
    id: 'leaves',
    rule: 'A system is not finished until it is a file.',
    body: 'Every format the export panel lists is built. One that is not built shows Soon and its button stays disabled — for everyone, on every plan, so no plan can sell a file the product cannot make.',
    to: '/plans',
    linkLabel: 'See what each plan exports',
  }),
  Object.freeze({
    id: 'unbuilt',
    rule: 'Unbuilt is a state the interface shows.',
    body: 'The navigation, the site map and this page all read the same registry, so a tool cannot be advertised on one screen and missing on another. What is not ready says Soon and does not open.',
    to: '/sitemap',
    linkLabel: 'See every page',
  }),
])

/** Routes this surface promises. The guard test resolves every one of them. */
export const PRINCIPLE_ROUTES = Object.freeze(DESIGN_PRINCIPLES.map((p) => p.to))
