# Constants & Config

> Reference doc for UIL4B. Linked from `CLAUDE.md`. Source-of-truth values —
> verify against the live files before relying on them.

## Identity & access

| Thing | Value | Source |
|---|---|---|
| **Admin emails** | `['dylanjacob1100@gmail.com']` | `src/utils/constants.js` (`ADMIN_EMAILS`) |
| **Admin code** | `'uil4b-dev-2026'` (session-only unlock) | `src/pages/Admin.jsx` (`ADMIN_CODE`) |
| **Onboarding skip** | `localStorage 'vs-onboarded'` → `'1'` after first login | `src/components/AuthGate.jsx`, `src/App.jsx` |

## Firebase

| Thing | Value |
|---|---|
| **Project** | `uil4b-357c5` |
| **Auth domain** | `uil4b-357c5.firebaseapp.com` |
| **Storage bucket** | `uil4b-357c5.firebasestorage.app` |
| **Firestore region** | `australia-southeast1` |

Config lives in `src/utils/firebase.js`, overridable via `VITE_FIREBASE_*` env
vars. The web `apiKey` here is **public by design** (see
`human-validation-zones.md`).

## Brand colour

| Theme | `--brand` |
|---|---|
| Dark | `#3B82F6` |
| Light | `#2563EB` |

`--accent` tracks `--brand` (dark `#3B82F6` / light `#2563EB`). Full token set
is in `css-conventions.md`.

## Dark contrast tokens (current values)

> ⚠️ These are the **live** values from `src/styles/global.css`. (The previous
> CLAUDE.md listed `#b0b0b0 / #909090 / #757575` — that was stale.)

| Token | Dark | Light |
|---|---|---|
| `--t0` | `#F2F3F5` | `#171717` |
| `--t1` | `#B6BAC2` | `#525252` |
| `--t2` | `#888D97` | `#737373` |
| `--t3` | `#5C616B` | `#a3a3a3` |

## Server env vars (non-`VITE_`, server-only)

- **AI**: `OPENROUTER_API_KEY` (+ optional `OPENROUTER_MODEL`, default
  `deepseek/deepseek-chat`), `GEMINI_API_KEY` / `GEMINI_KEY`,
  `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_FONTS_API_KEY`.
- **Stripe**: secret key + webhook signing secret (founder-gated).
- **Firebase Admin**: service-account credentials (the `private_key` is a hard
  BLOCK if leaked).

## Analytics keys (localStorage)

`vs-analytics`, `vs-sessions`, `vs-design-analytics` — see
`src/utils/analytics.js`, aggregated to the Firestore `analytics-daily` doc.
