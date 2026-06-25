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

## Contexts (`src/contexts/`)

All 8 providers — wrap order matters, check `App.jsx` before reordering:

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

## Pages (`src/pages/`)

Route-per-page. Current set (groups, not exhaustive of behaviour):

- **Tools**: ColorStudio, FontMatcher, FontGallery, TypeScale, RatioCalculator,
  BoxShadowGenerator, EmojiLibrary, IconLibrary, FileConverter, SeoInspector,
  AltTextGenerator, AiPromptGenerator, PromptLibrary, LandingPromptGenerator,
  UIBuilder, AutoBuilder, StyleGuide.
- **Hub / nav**: Landing, Dashboard, CategoryDashboard, Community,
  ExternalResources, InfoCentre, HelpCentre, Feedback, Settings, Projects,
  Onboarding, ComingSoon.
- **Docs**: DocsAI, DocsBrand, DocsDesign, DocsMarketing, DocsSEO, DocsSocial,
  DocsThemes.
- **Auth / billing**: Login, Checkout, CheckoutReturn.
- **Admin**: Admin (gated by `ADMIN_EMAILS` + session admin code).
- **Legal**: Privacy, Terms.

## Components (`src/components/`)

Shared UI: `Sidebar`, `TopBar`, `AppFooter`, `CommandPalette`, `Toast`,
`AuthGate` ⚠️, `GoogleOneTap` ⚠️, `FeedbackButton` / `FeedbackModal`,
`UIPreviewModal`, `UIKitGuide`, `CategoryMiniTool`, `DocsTOC`, plus `prompt/`
and `seo/` subfolders.

## API routes (`/api`) — 12-function limit

Vercel's plan caps serverless functions at **12**. Current routes:

```
alt-text.js         checkout-status.js   create-checkout.js   create-portal.js
fonts.js            generate-prompt.js   get-prices.js        scan-photo.js
setup-stripe.js     stripe-webhook.js    support.js           verify-admin.js
```

Shared server helpers (NOT counted as functions) live in `api/_lib/`:
`env.js`, `firebase-admin.js`, `plans.js`, `pricing.js`, `stripe.js`.

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
