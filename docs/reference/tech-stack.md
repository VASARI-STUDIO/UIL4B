# Tech Stack

> Reference doc for UIL4B. Linked from `CLAUDE.md`. Read before adding dependencies,
> wiring a new integration, or changing the build.

## Overview

UIL4B is a **React 19 single-page app** built with **Vite**, deployed on **Vercel**.
The frontend is a pure SPA (`BrowserRouter`); all server work runs in Vercel
serverless functions under `/api`.

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React 19 (`react` / `react-dom` ^19.2) | Function components + hooks only. |
| **Routing** | `react-router-dom` ^7.9 | `BrowserRouter`, route-per-page in `src/pages/`. |
| **Build** | Vite ^8 (`@vitejs/plugin-react` ^6) | `npx vite build` is the verify gate. |
| **Styling** | CSS custom properties, single `src/styles/global.css` | No CSS-in-JS, no component stylesheets. |
| **Auth** | Firebase Auth ^11.9 | Google One Tap + email/password. |
| **Database** | Firestore (region `australia-southeast1`) | Project `uil4b-357c5`. |
| **Server SDK** | `firebase-admin` ^13 | Server-only, in `/api` + `api/_lib/firebase-admin.js`. |
| **AI** | DeepSeek (primary), Gemini (fallback) | Server-side only; keys are non-`VITE_` env vars. |
| **Payments** | Stripe (`stripe` ^22 server, `@stripe/stripe-js` / `@stripe/react-stripe-js` client) | Embedded checkout + customer portal. |
| **Zip/Export** | `jszip` ^3.10 | Used by the export/handoff builders. |
| **Lint** | ESLint ^9 (flat config `eslint.config.js`) | `react-hooks` + `react-refresh` plugins. |

## NPM scripts

```bash
npm run dev          # vite dev server
npm run build        # vite build  (== npx vite build — the verify gate)
npm run lint         # eslint .
npm run preview      # vite preview
npm run setup:stripe # node scripts/setup-stripe.js  (founder-gated, see human-validation-zones.md)
```

## Client vs server boundary

- **Client bundle** (`src/`): may read `import.meta.env.VITE_*` only. Anything
  `VITE_`-prefixed ships to the browser — treat it as public.
- **Server** (`/api/*.js`): reads real secrets from `process.env` (no `VITE_`
  prefix). DeepSeek/Gemini/Stripe secret keys and the Firebase service account
  live here only.
- **Public-by-design values are NOT secrets**: the Firebase web `apiKey`, the
  Stripe publishable key, and the Google client ID are meant to ship in the
  bundle (secured by Firebase rules + authorised domains).

## AI backends

- **DeepSeek** is the primary generator; **Gemini** is the fallback.
- Server env keys in use across `/api`: `DEEPSEEK_API_KEY` / `DEEPSEEK_KEY`,
  `GEMINI_API_KEY` / `GEMINI_KEY`, `GOOGLE_API_KEY`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, and `GOOGLE_FONTS_API_KEY` (fonts).
- Always assume an AI provider can be down — degrade gracefully (see
  `murphys-law.md`).

## Deploy

- Vercel. Serverless functions live in `/api` and are subject to the
  **12-function limit** on the current plan — see `architecture.md` before
  adding a new route.
- Merge to `main` happens via PR only (direct push to `main` returns 503).
