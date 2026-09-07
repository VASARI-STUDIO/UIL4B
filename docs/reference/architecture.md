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
├── components/        # shared UI (PillNav, modals, gates…)
├── utils/             # firebase, analytics, colors, fonts, stripe client…
├── hooks/             # custom hooks
├── data/              # static data
├── locales/           # i18n strings
└── styles/global.css  # ALL css (class-based)
api/
├── *.js               # serverless functions (12-function limit)
└── _lib/              # shared server helpers (env, firebase-admin, stripe, pricing, plans)
```

## Product surfaces (Create / Discover / Learn)

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
  IconEmojiLibrary, FileConverter, SeoInspector, AltTextGenerator,
  AiPromptGenerator, BrandStarter, PromptLibrary, StyleGuide.

  > **Four names came off this list on 2026-09-06** — `BoxShadowGenerator`,
  > `LandingPromptGenerator`, `UIBuilder` and `AutoBuilder`. The first three
  > were deleted by the dead-source sweep: a `--sourcemap` build put them in no
  > chunk, nothing imported them, and no route reached them. `AutoBuilder` was
  > already gone before that sweep ran and this line had not noticed — which is
  > the cost this list keeps paying, and the reason the sweep is a build
  > measurement rather than a read of this file.
  >
  > **`AiPromptGenerator.jsx` is still unrouted and was deliberately kept.** It
  > is the only caller of the OpenRouter path, and `docs/OWNER-ACTIONS.md §4.5`
  > asks the founder to choose between wiring it up and cancelling OpenRouter.
  > Deleting it would have made that decision by default.

> **`IconLibrary.jsx` and `EmojiLibrary.jsx` are unrouted.** Both files still
> exist and neither is imported anywhere. `CreateTool.jsx` maps **both**
> `/create/icons` and `/create/emoji` to `IconEmojiLibrary`, so every line in
> the other two files is dead on every shipped route. #306 lost a pass to
> exactly this: it was sent to a hero in `IconLibrary.jsx`, changed it, and the
> change rendered nowhere. **Grep for the import before editing a page file** —
> a page component existing is not evidence that a route reaches it.
- **Shells / hub**: Home, CreateTool (the honest workshop state for
  unbuilt routes), SurfaceLanding (Discover + Learn), LearnArticle, SiteMap,
  Community, GradientGallery, PaletteGallery, CuratedResources, InfoCentre,
  HelpCentre, Feedback, Settings, Projects, Onboarding. *(Community, the two
  galleries and CuratedResources are the live part of the **Discover** surface —
  see `discover.md`.)*

  > **`Landing.jsx` was in this list and is deleted** (#396). It was dead code:
  > nothing imported it, and no built bundle contained a line of it. `Home.jsx`
  > is the sales page. Do not re-add it from this list's history.

  > **`Projects.jsx` is now the User Home** (#385). It still sits at
  > `/projects`, but a signed-in visitor lands there rather than on the sales
  > page, and it renders the `src/components/userhome/` set — daily band,
  > starter row, project cards with per-project progress. The name is the route,
  > not the page's job.
- **Docs (deleted 2026-09-06)**: `DocsAI`, `DocsBrand`, `DocsDesign`,
  `DocsMarketing`, `DocsSEO`, `DocsSocial` and `DocsThemes` — the seven
  pre-Learn drafts — **are gone**, with the `DocsTOC` component only they used.
  No route ever reached them: every `/docs-*` URL is a 301 to `/learn`, which is
  the real surface (`src/data/learn/`, indexed by `learnIndex.js` and rendered
  by `LearnArticle.jsx`). The redirects are unchanged and still land on `/learn`
  — deleting a component does not touch a redirect table. Do not re-add these
  from this list's history; `/learn` is where guides live.
- **Billing**: Plans, Checkout, CheckoutReturn.
- **Admin**: Admin (gated by `ADMIN_EMAILS` + session admin code).
- **Legal**: Privacy, Terms.

There **is** a branded 404: `src/pages/NotFound.jsx` sits behind
`<Route path="*">` in `App.jsx`, and `scripts/prerender.mjs` emits a matching
`noindex` 404 shell. `tests/unit/not-found.test.js` holds it.

> **Corrected 2026-09-03.** This paragraph read *"There is no branded 404: the
> wildcard route redirects to `/`"* and pointed at `global-failure-states` as an
> open gap. That shipped in **#235** — the redirect it describes is what
> `NotFound.jsx` replaced, and the queue entry has read `done` since. An agent
> trusting the old text would have set out to build a 404 that already exists,
> found the wildcard route occupied, and had to work out which of the two
> sources was lying. That round trip is the whole cost of a stale instruction.

## Components (`src/components/`)

Shared UI: `PillNav`, `AppFooter`, `CommandPalette`,
`Toast`, `AuthGate` ⚠️, `GoogleOneTap` ⚠️, `LoginPopup`, `ProUpgradeModal`,
`FeedbackButton` / `FeedbackModal`, `UIKitGuide`,
`HomeWorkbench`, `SnapSlider`, `ColorPickerPop`, `ExportPanel`, `FontPicker`,
`SystemCTA`, `ShuffleIcon`, the `UiSystem*` builder set, plus `discover/`,
`prompt/` and `seo/` subfolders. (`CategoryMiniTool` was deleted in #196; `Sidebar`, `TopBar` and
`UIPreviewModal` were deleted in 2026-09 — all three were unreachable once
App.jsx moved to PillNav, and no built bundle contained a line of them.
`DocsTOC` and `discover/DiscoverCard` went the same way on 2026-09-06: the
first was imported only by the seven deleted Docs drafts, the second by
nothing at all — `CuratedResources.jsx` renders its own card and says in a
comment why it does not use a generic one.)

## API routes (`/api`) — 12-function limit

Vercel's plan caps serverless functions at **12**. We are at **exactly 12 of 12
— the budget is FULL, with no slot spare.** `delete-account.js` took the last
one. The next endpoint has to replace an existing one or fold into `api/_lib/`;
`tests/unit/account-deletion.test.js` fails the build if the count goes over, so
this is enforced rather than merely documented.

```
ai.js               share.js             checkout-status.js   create-checkout.js
create-portal.js    fonts.js             get-prices.js        setup-stripe.js
stripe-webhook.js   support.js           verify-admin.js      delete-account.js
```

`ai.js` is a task dispatcher — POST `{ task: 'alt-text' | 'scan-photo' |
'generate-prompt', ...taskBody }` — that consolidated the former `alt-text.js`,
`scan-photo.js`, and `generate-prompt.js` routes. `share.js` serves social/OG
previews (+ palette-card PNG) for `/p/:code` short links (vercel.json rewrite).

Shared server helpers (NOT counted as functions) live in `api/_lib/`:
`accountDeletion.js`, `admin.js`, `billing.js`, `env.js`, `firebase-admin.js`,
`geminiFinish.js`, `http.js`, `moderators.js`, `origins.js`, `plans.js`,
`pricing.js`, `rateLimit.js`, `stripe.js`. Read the directory rather than this
list — helpers are uncapped, so they get added without anything forcing a doc
update, and `moderators.js` is the proof: it arrived in #390 and this line did
not notice for a week.

**Before adding an API route:** you are likely at or near the cap. Prefer
extending an existing route (e.g. action-switch on `req.body`) or moving logic
into `api/_lib/` over adding a 13th function. Flag the trade-off to the Director.

⚠️ Stripe routes (`create-checkout`, `create-portal`, `checkout-status`,
`get-prices`, `setup-stripe`, `stripe-webhook`) and `verify-admin` are
**Human Validation Zones** — see `human-validation-zones.md`.

## Analytics layer

Client-side localStorage keys: `vs-analytics`, `vs-sessions`,
`vs-design-analytics` (see `src/utils/analytics.js`), aggregated into a
Firestore `analytics-daily` doc and surfaced in the Admin dashboard.
