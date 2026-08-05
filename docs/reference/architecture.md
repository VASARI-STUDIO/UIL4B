# Architecture

> Reference doc for UIL4B. Linked from `CLAUDE.md`. Read before adding a page,
> context, component, or API route.

## Shape

A route-per-page SPA. `src/App.jsx` wires the routes; each page in `src/pages/`
is a standalone component. Cross-cutting state lives in React contexts. Server
work is in Vercel serverless functions under `/api`.

```
src/
├── App.jsx            # route table + top-level providers
├── main.jsx           # React root
├── pages/             # one component per route
├── contexts/          # cross-cutting state (providers)
├── components/        # shared UI (Sidebar, TopBar, modals, gates…)
├── utils/             # firebase, analytics, colors, fonts, stripe client…
├── hooks/             # custom hooks
├── data/              # static data
├── locales/           # i18n strings
└── styles/global.css  # ALL css (class-based)
api/
├── *.js               # serverless functions (12-function limit)
└── _lib/              # shared server helpers (env, firebase-admin, stripe, pricing, plans)
```

## Product surfaces (Workspace / Discover / Learn)

The code is still organised route-per-page, but the **product story** groups
every page under one of three surfaces (see `positioning.md`):

- **Create** — build/validate/export UI foundations (the Tools).
- **Discover** — browse: community + curated external resources (replaces the
  old "Library" framing — see `discover.md`).
- **Learn** — understand: docs, principles, guides.

The three surfaces are driven by `src/data/toolTree.js` and made real by the
rebuilt mega-menu nav (Create/Discover/Learn, shipped). Pages still live
route-per-page in `src/pages/` — this is a *naming and IA* lens, not a folder
move. (The context is still named `WorkspaceContext`; only the surface label
changed Workspace→Create.)

## Contexts (`src/contexts/`)

Ten providers in two tiers — wrap order matters, so check both files before
reordering.

**Eight in `main.jsx`**, outermost first: `ThemeProvider` → `AppearanceProvider`
→ `I18nProvider` → `AuthProvider` → `SubscriptionProvider` → `ProjectProvider`
→ `WorkspaceProvider` → `ExportProvider`.

| Context | Responsibility |
|---|---|
| **AuthContext** | Login/signup/profile, session. ⚠️ **Human Validation Zone.** |
| **SubscriptionContext** | Plan resolution + checkout flow. ⚠️ **Human Validation Zone.** |
| **ProjectContext** | The user's projects / saved work. |
| **WorkspaceContext** | Active workspace state. |
| **AppearanceContext** | Appearance prefs (reduced motion, etc.). |
| **ThemeContext** | Dark/light theme (`data-theme` on `<html>`). |
| **I18nContext** | Localisation (`src/locales/`). |
| **ExportContext** | Export / handoff state (top-bar export button). |

**Two in `App.jsx`**, inside `AuthProvider` because they depend on it:

| Context | Responsibility |
|---|---|
| **LoginPromptContext** | The login popup rendered over the current page. |
| **ProModalContext** | The canonical Pro-upgrade modal. |

## Pages (`src/pages/`)

Route-per-page. Current set (groups, not exhaustive of behaviour). #196 deleted
the unrouted pages — `Dashboard`, `CategoryDashboard`, `ExternalResources`,
`ComingSoon` and `Login` are gone, and their old URLs now redirect.

- **Colour**: ColorLanding, ColorStudio, PaletteBuilder, TintTool,
  GradientGenerator, ContrastChecker.
- **Other tools**: FontGallery, FontMatcher, TypeScale, RatioCalculator,
  BoxShadowGenerator, IconLibrary, EmojiLibrary, IconEmojiLibrary,
  FileConverter, SeoInspector, AltTextGenerator, AiPromptGenerator,
  LandingPromptGenerator, PromptLibrary, UIBuilder, AutoBuilder, StyleGuide.
- **Shells / hub**: Home, Landing, CreateTool (the honest workshop state for
  unbuilt routes), SurfaceLanding (Discover + Learn), SiteMap, Community,
  GradientGallery, InfoCentre, HelpCentre, Feedback, Settings, Projects,
  Onboarding. *(Community + GradientGallery are the live part of the **Discover**
  surface — see `discover.md`; Projects stays Workspace-private.)*
- **Docs (dormant)**: DocsAI, DocsBrand, DocsDesign, DocsMarketing, DocsSEO,
  DocsSocial, DocsThemes. The components exist but the `/docs-*` routes redirect
  to `/learn` until the Learn content library ships.
- **Billing**: Plans, Checkout, CheckoutReturn.
- **Admin**: Admin (gated by `ADMIN_EMAILS` + session admin code).
- **Legal**: Privacy, Terms.

There is **no branded 404**: the wildcard route redirects to `/`. That is a known
gap, tracked as `global-failure-states` in `src/data/pipeline.js`.

## Components (`src/components/`)

Shared UI: `PillNav`, `Sidebar`, `TopBar`, `AppFooter`, `CommandPalette`,
`Toast`, `AuthGate` ⚠️, `GoogleOneTap` ⚠️, `LoginPopup`, `ProUpgradeModal`,
`FeedbackButton` / `FeedbackModal`, `UIPreviewModal`, `UIKitGuide`, `DocsTOC`,
`HomeWorkbench`, `SnapSlider`, `ColorPickerPop`, `ExportPanel`, `FontPicker`,
`SystemCTA`, `ShuffleIcon`, the `UiSystem*` builder set, plus `discover/`,
`prompt/` and `seo/` subfolders. (`CategoryMiniTool` was deleted in #196.)

## API routes (`/api`) — 12-function limit

Vercel's plan caps serverless functions at **12**. Current routes (11 of 12 —
one slot spare):

```
ai.js               share.js             checkout-status.js   create-checkout.js
create-portal.js    fonts.js             get-prices.js        setup-stripe.js
stripe-webhook.js   support.js           verify-admin.js
```

`ai.js` is a task dispatcher — POST `{ task: 'alt-text' | 'scan-photo' |
'generate-prompt', ...taskBody }` — that consolidated the former `alt-text.js`,
`scan-photo.js`, and `generate-prompt.js` routes. `share.js` serves social/OG
previews (+ palette-card PNG) for `/p/:code` short links (vercel.json rewrite).

Shared server helpers (NOT counted as functions) live in `api/_lib/`:
`billing.js`, `env.js`, `firebase-admin.js`, `http.js`, `origins.js`, `plans.js`,
`pricing.js`, `stripe.js`.

**Before adding an API route:** you are likely at or near the cap. Prefer
extending an existing route (e.g. action-switch on `req.body`) or moving logic
into `api/_lib/` over adding a 13th function. Flag the trade-off to the PM.

⚠️ Stripe routes (`create-checkout`, `create-portal`, `checkout-status`,
`get-prices`, `setup-stripe`, `stripe-webhook`) and `verify-admin` are
**Human Validation Zones** — see `human-validation-zones.md`.

## Analytics layer

Client-side localStorage keys: `vs-analytics`, `vs-sessions`,
`vs-design-analytics` (see `src/utils/analytics.js`), aggregated into a
Firestore `analytics-daily` doc and surfaced in the Admin dashboard.
