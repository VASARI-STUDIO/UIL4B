# UIL4B — Build connected UI systems

The operating workspace for UI system creation — build, organize, validate, and export interface foundations without tab-hopping. Create colour palettes, generate tint scales, check contrast, build gradients, pair fonts, design UI components, convert images, extract video frames, and export production-ready CSS, all in the browser.

The product is organised around three surfaces: **Create** (build), **Discover** (browse community + curated external resources), and **Learn** (understand). See [`docs/reference/positioning.md`](docs/reference/positioning.md) for the canonical story.

**Live:** [uil4b.com](https://www.uil4b.com)

## Tools

### Colour

- **Colour System** — Connected Palette, Semantic Colour, Tint, Gradient and Contrast tools with recovery paths, UI previews and production-ready exports

### Typography

- **Font Gallery** — Visual gallery to browse, preview, compare, and copy Google Fonts
- **Font Pair Finder** — Curated heading + body font pairings from Google Fonts
- **Type Scale** — Modular scale calculator with 6 ratio presets and CSS export

### Imagery

- **Icon Library** — Search and customise Iconify packs with copy, save and project workflows
- **Emoji Library** — Browse, filter and copy emojis by category from the same resilient library surface
- **Image Converter** — Convert, compress, and resize images locally (WebP, PNG, JPEG, AVIF)
- **Alt Text Generator** — Batch-generate accessible alt text for images using AI
- **Video to Frames** — Extract individual frames from video files with format, quality, and scale controls; batch download as ZIP

### UI Builder

- **Component Designer** — Design buttons, cards, inputs, badges, toggles, tables, and tabs with live previews, shared design tokens, guided step-by-step mode, and CSS export
- **Box Shadow Generator** — Layered CSS box shadows with live preview

### Documentation & Reference

- **Prompt Library** — Personal + community AI prompt library with Pro-gated community prompts, popular/new sorting, and contributor submissions (+25 AI generations for approved prompts)
- **Design Principles** — Visual hierarchy, cognitive load, micro interactions, and brand psychology
- **Social & Marketing** — Content pillars, posting cadence, caption templates, growth tactics
- **Discover** (External Resources + Community) — the emerging community & external-resource hub: curated external tools and inspiration sites alongside community-shared systems, each linking back to the relevant UIL4B tool. Replaces the old "Library" framing — see [`docs/reference/discover.md`](docs/reference/discover.md)

## Features

- **Product-led home** — Connected-system hero with an interactive Create preview, clear tool pathways and shared public calls to action
- **Projects** — Save palettes, fonts, and designs to named projects with archive/restore and type-to-confirm deletion; auto-created default project on first sign-in
- **Pro Subscription** — Stripe Embedded Checkout (monthly/yearly with 7-day trial), customer portal for billing management, cancellation retention flow with tailored offers
- **Command Palette** — `Cmd/Ctrl + K` to search and jump to any tool
- **Dark / Light Theme** — System-aware with manual toggle, CSS custom property theming
- **Internationalisation** — 10 locales with browser auto-detection: English (AU), English (US), Deutsch, Español, Français, Italiano, Português, 日本語, 中文, 한국어
- **Design System Export** — Export palette + tint scale + state colours as a styled HTML page, CSS custom properties file, or copy to clipboard; free exports include a watermark, Pro unlocks all formats
- **Accounts** — Firebase auth with Google One Tap, profile management, cross-device Firestore sync
- **Admin Dashboard** — Analytics, feedback triage, community prompt review with inline editing, design analytics (most copied fonts / picked colours), server-verified admin access
- **Admin Style Guide** — Internal design system reference at `/style-guide` (tokens, type scale, components, patterns)
- **Keyboard Accessible** — Global `:focus-visible` styles on all interactive elements

## Tech Stack

- **React 19** + **React Router** (BrowserRouter)
- **Vite** — dev server and production build
- **Vercel** — hosting + serverless API functions (`api/`)
- **CSS Custom Properties** — warm/dark theme system, no CSS-in-JS
- **Firebase** — Auth (Google One Tap + email), Firestore (projects, prompts, feedback, subscriptions)
- **Stripe** — Embedded Checkout + Billing Portal for Pro subscriptions
- **JSZip** — batch frame/image ZIP downloads
- **Iconify API** — icon search (no bundled icon data)
- **localStorage** — preferences, pinned tools, prompt library, palette history, local analytics

## Project Structure

```
api/                  Vercel serverless functions (Stripe, support, admin verification)
src/
├── components/       Sidebar, TopBar, Toast, CommandPalette, GoogleOneTap
├── contexts/         Auth, Theme, Appearance, I18n, Project, Workspace, Subscription, Export
├── data/             Tool and category definitions, community prompts
├── hooks/            useToast, useClipboard, useFirestoreSync
├── locales/          10 JSON locale files (en, en-US, de, es, fr, it, ja, ko, pt, zh)
├── pages/            All page components (Dashboard, ColorStudio, UIBuilder, etc.)
├── styles/           global.css (single stylesheet)
├── utils/            Colour math, Firebase config, analytics, Stripe client, constants
├── App.jsx           Route definitions
└── main.jsx          Provider tree and entry point
firestore.rules       Firestore security rules (deploy via Firebase CLI)
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

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
| `DEEPSEEK_API_KEY` | AI generation — primary backend (prompts, alt text, scan, etc.) |
| `GEMINI_API_KEY` | AI generation — fallback backend |
| `RESEND_API_KEY` / `SUPPORT_NOTIFY_EMAIL` | Feedback email notifications (optional) |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Feedback → Google Sheets sync (optional, see `docs/google-sheets-setup.md`) |

## Deploy

Deployed on Vercel — push to `main` and Vercel builds and deploys automatically. Firestore security rules live in `firestore.rules` and are deployed separately via the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Licence

MIT — UIL4B 2026.
