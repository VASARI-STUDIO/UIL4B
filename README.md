# UIL4B — Build connected UI systems

The operating workspace for UI system creation — build, organize, validate, and export interface foundations without tab-hopping. Create colour palettes, generate tint scales, check contrast, build gradients, pair fonts, design UI components, convert images, extract video frames, and export production-ready CSS, all in the browser.

The product is organised around three surfaces: **Create** (build), **Discover** (browse community + curated external resources), and **Learn** (understand). The canonical story is `docs/reference/positioning.md`, which is local-only (see below); `src/data/positioning.js` carries the same lines as code.

Current direction lives in `CLAUDE.md` (Direction). Active work, blockers and
known-unfixed bugs live in `src/data/pipeline.js`; founder-only console and
credential work lives in `docs/OWNER-ACTIONS.md`; shipped history and the
founder decisions behind it live in `CHANGELOG.md`. All four are local-only
(see below). Do not use historical commits or closed audit prose as a parallel
backlog.

> **Some of those files are deliberately not in this repository.** It went public
> on 2026-09-16, and on the same day the founder decided that what had been
> written for an internal audience should stay on his machine — three cuts, each
> recorded in `.gitignore` with its reason: the engineering boards
> (`src/data/pipeline.js`, `src/data/moduleBoard.js`); his own documents
> (`docs/OWNER-ACTIONS.md`, `docs/PROPOSALS.md`, `docs/MARKETING.md`,
> `docs/qa/defect-register-2026-08.md`); and then the working notes, the agent
> tooling and the release record (`CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`,
> `CHANGELOG.md`, `.claude/`, `docs/reference/`, the Markdown under
> `docs/design/`, `docs/research/`, `docs/build-plan/`, `brand/email/`). The
> application source is open; how the business is run, and the method behind
> it, is his. Source comments still cite those documents by path — they are
> citations of files on his machine, not links you can follow here. The project
> builds, lints and tests green without any of them.

**Live:** [uil4b.com](https://uil4b.com)

## Tools

The canonical structure, routes and Soon-vs-live status live in
`src/data/toolTree.js`; the written tool tree, `docs/build-plan/tool-tree.md`,
is local-only. This is the short public summary.

### Colour

- **Colour System** — connected Palette, Semantic Colour, Tint, Gradient and Contrast tools at `/create/*`, with recovery paths, UI previews and production-ready exports
- **UI System Mode** — perceptual 100–900 Brand, Success, Warning, Error, Information and Neutral scales from one brand seed, with WCAG evidence and CSS / DTCG / Tailwind export. **Unwired while it is finished** — it is not on sale, and it is reachable by nobody, admins included. Both entry points were removed from the Palette Builder on 2026-09-05 (founder instruction) and nothing imports `components/UiSystemBuilder.jsx`, so it is in no chunk of any build. This line said "admin-only" until 2026-09-07, which sent agents looking for an auth gate that does not exist

### Typography

- **Font Gallery** — browse, preview, compare and copy Google Fonts
- **Font Pair Finder** — curated heading + body pairings from Google Fonts
- **Type Scale** — modular scale calculator with ratio presets and CSS export

### Imagery

- **Icon Library** — search and customise Iconify packs with copy, save and project workflows
- **Emoji Library** — browse, filter and copy emojis from the same library surface
- **File Converter** — convert, compress and resize images locally, and extract frames from video with batch ZIP download. The former separate `/imgconvert` and `/video-frames` tools are merged here and now redirect to it
- **Alt Text Generator** — batch-generate accessible alt text for images using AI
- **Aspect & Resolution Calculator** — canonical ratio names with device and screen presets

### UI Builder

The whole group carries `soon: true` in `src/data/toolTree.js`: it is badged
"Soon" in the nav and its routes resolve to the honest workshop state.

- **Component Designer** — Soon. Buttons, cards, inputs, badges, toggles, tables and tabs with live previews, shared Styles, guided step-by-step mode and CSS export
- **Box Shadow Generator** — Soon. Layered CSS box shadows with live preview
- **UI Auto-Builder** — Soon

### Discover & Learn

- **Prompt Library** — personal + community AI prompt library with Pro-gated community prompts, popular/new sorting, and contributor submissions (+25 AI generations for approved prompts)
- **Discover** — the community & external-resource hub. Six of its eight groups are live (Palette Library, Gradient Library, Font Gallery, Icon Library, Prompt Library, Curated Resources); Inspiration and Collections are still Soon. Replaces the old "Library" framing (`docs/reference/discover.md`, local-only)
- **Learn** — live, with five published reference guides at `/learn/<slug>`: colour contrast and the WCAG thresholds, modular type scales, colour spaces for interface work, dark and light themes, and choosing a brand colour. Neutral and factual by founder decision, not how-to guides for our own tools. Two of the eight roadmap topics are delivered; the old `/docs-*` URLs redirect to `/learn`. The live list is `src/data/learnIndex.js` — read it rather than this sentence

## Features

- **Product-led home** — Connected-system hero with an interactive Create preview, clear tool pathways and shared public calls to action
- **User Home** — `/projects` is where a signed-in visitor lands. Saved palettes, fonts and designs in named projects with archive/restore and type-to-confirm deletion, an auto-created default project on first sign-in, and a per-project progress read (which of colour, type, scale and icons a project actually has). Signed-out visitors still get the sales page
- **Pro Subscription** — Stripe Embedded Checkout (monthly/yearly with 7-day trial), customer portal for billing management, cancellation retention flow with tailored offers. One-off ("lifetime") billing support is built and degrades honestly until the founder creates the live Stripe price; the retention coupon and portal cancellation flow are still owner configuration
- **Command Palette** — `Cmd/Ctrl + K` to search and jump to any tool
- **Dark / Light Theme** — System-aware with manual toggle, CSS custom property theming
- **Internationalisation** — 10 locales with browser auto-detection: English (AU), English (US), Deutsch, Español, Français, Italiano, Português, 日本語, 中文, 한국어
- **Design System Export** — Export palette + tint scale + state colours as a styled HTML page, CSS custom properties file, or copy to clipboard; HTML, Markdown, PNG and JPEG are available on the free tier with a visible footer credit, and Pro removes it; the design system book and the brand guidelines are Pro

  > ⚠️ **This sentence and the code disagree, and the disagreement is the
  > founder's to settle — flagged 2026-09-10, not decided here.** It is
  > accurate for HTML, Markdown, PNG and JPEG. But `src/config/exportFormats.js`
  > marks the **design system book** and the **brand guidelines** `pro: true`,
  > `proOnlyFormats()` returns both, and `/plans` and the homepage price panel
  > both print them as what Pro adds. The claim here was founder-approved on
  > 2026-08-20 (see `docs/reference/positioning.md`, local-only); the two Pro documents
  > shipped afterwards. Three live surfaces now describe the entitlement one
  > way and two documents the other. `docs/OWNER-ACTIONS.md` §2.3 — that file is
  > local-only, so the question as it was put to the founder is on his machine;
  > what you can check here is the contradiction itself, in the code named above.
- **Accounts** — Firebase auth with Google One Tap, profile management, cross-device Firestore sync
- **Admin Dashboard** — Analytics, feedback triage, community prompt review with inline editing, design analytics (most copied fonts / picked colours), server-verified admin access
- **Admin Style Guide** — Internal design system reference at `/style-guide` (tokens, type scale, components, patterns). Admin-only: it was behind sign-in alone, so every account on the site could read it
- **Keyboard Accessible** — Global `:focus-visible` styles on all interactive elements

## Tech Stack

- **React 19** + **React Router** (BrowserRouter)
- **Vite** — dev server and production build
- **Vercel** — hosting + serverless API functions (`api/`) + Web Analytics
- **CSS Custom Properties** — warm/dark theme system, no CSS-in-JS
- **Firebase** — Auth (Google One Tap + email), Firestore (projects, prompts, feedback, subscriptions)
- **Stripe** — Embedded Checkout + Billing Portal for Pro subscriptions
- **JSZip** — batch frame/image ZIP downloads
- **Iconify API** — icon search (no bundled icon data)
- **localStorage** — preferences, pinned tools, prompt library, palette history, local analytics

## Project Structure

Canonical detail (pages, contexts, the `/api` function budget) is in
`docs/reference/architecture.md`, which is local-only; the tree below and
`src/App.jsx` are what a clone has.

```
api/                  Vercel serverless functions (Stripe, support, admin verification)
api/_lib/             Shared server helpers — not counted against the function limit
src/
├── components/       PillNav, AppFooter, Toast, CommandPalette, GoogleOneTap,
│                     ExportPanel, plus admin/ discover/ library/ prompt/ seo/
│                     userhome/ subfolders
├── contexts/         Auth, Theme, Appearance, I18n, Project, Workspace, Subscription, Export
├── data/             Tool and category definitions, community prompts
├── hooks/            useToast, useClipboard, useFirestoreSync
├── locales/          10 JSON locale files (en, en-US, de, es, fr, it, ja, ko, pt, zh)
├── pages/            All page components (Home, ColorStudio, CreateTool,
│                     LearnArticle, Projects, Admin, etc.)
├── styles/           global.css (single stylesheet)
├── utils/            Colour math, Firebase config, analytics, Stripe client, constants
├── App.jsx           Route definitions
└── main.jsx          Provider tree and entry point
tests/
├── unit/             Pure-logic tests (node --test)
├── rules/            Firestore security-rules tests (needs the emulator + JDK 21)
└── user-sim/         Playwright user-simulation acceptance suite
firestore.rules       Firestore security rules (published from the Firebase console)
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

### Verify

```bash
npx eslint .       # must report 0 errors
npm run build      # vite build + prerender — NOT bare `npx vite build`
npm run test:unit
npm run test:users # Playwright acceptance suite (builds first)
```

Use `npm run build`, not bare `npx vite build`: several unit tests in
`not-found.test.js` and `redirects.test.js` read the prerendered shells and skip
*silently* without them, so the bare Vite build gives a green run with a quietly
smaller test count. (This line used to say "four". It is six, and counting them
here just means the number goes stale again — the files are the answer.)

What each gate must satisfy: lint **0 errors**; build passes **and prints its
prerender line** (`prerender: wrote N route shells + a noindex 404 shell`);
unit **0 failures, 0 skipped**; rules and acceptance **0 failures**. The gate is
stated as a **property** rather than an expected test count; #312 removed the
counts after they drifted four times. The full gate document,
`docs/reference/build-and-verify.md`, is local-only.

### Environment Variables

Client-side (Vite, `VITE_` prefix):

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key (public identifier) |
| `VITE_GOOGLE_CLIENT_ID` | Google One Tap client ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

Server-side (Vercel, no prefix):

| Variable | Purpose |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK service account JSON |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Stripe price IDs |
| `OPENROUTER_API_KEY` | AI generation — primary provider |
| `OPENROUTER_MODEL` | Optional OpenRouter model override (default `deepseek/deepseek-chat`) |
| `GEMINI_API_KEY` | AI generation — fallback backend |
| `RESEND_API_KEY` / `SUPPORT_NOTIFY_EMAIL` | Feedback email notifications (optional) |
| `GOOGLE_SHEETS_WEBHOOK_URL` / `GOOGLE_SHEETS_WEBHOOK_SECRET` | Optional legacy feedback mirror to an owner-managed Apps Script endpoint |

## Deploy

Deployed on Vercel — merges to `main` deploy automatically. Firestore security
rules live in `firestore.rules` and are published separately from the web
deployment. The founder has confirmed the current hardened rules are published.
Future rule changes still require `npm run test:rules` and an explicit publish:

```bash
firebase deploy --only firestore:rules
```

## Licence

**Proprietary, source-available.** The code here is published so it can be
read; it is not open source and no licence to use it is granted. See
[LICENSE](LICENSE) for what that does and does not allow.

This repository was MIT-licensed until 2026-09-22. That grant cannot be
withdrawn from anyone who took a copy while it was in effect.

Third-party components keep their own licences and are **not** covered by the
notice above — the icon packs in `public/icons-data.js`, the SIL OFL fonts in
`public/fonts/`, and every dependency in `package.json`.
