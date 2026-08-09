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

## Text contrast tokens (effective values)

> ⚠️ **`global.css` declares the light theme TWICE.** The base
> `[data-theme="light"]` block near the top is overridden by the **Foundry light
> values** block (`global.css:4248`) — same specificity, later in the file, so it
> wins. Read the *later* block. Grepping for the first `--t0:` you find will give
> you the wrong answer, which is how this table has now drifted twice.
>
> Verified against `src/styles/global.css` on 2026-08-09.

| Token | Dark | Light (effective) |
|---|---|---|
| `--t0` | `#F2F3F5` | `#0A0A0B` |
| `--t1` | `#B6BAC2` | `#50505A` |
| `--t2` | `#888D97` | `#6C6C76` |
| `--t3` | `#767C86` | `#858590` |

Light backgrounds are also overridden by the same block: `--bg-0:#FAFAFA`,
`--bg-1:#FFFFFF`, `--bg-2:#F4F4F5`, `--bg-3:#E9E9EB`, `--bg-4:#D9D9DE` — not the
`#fff / #FCFCFD / #f7f7f7 / #ebebeb / #d4d4d4` of the base block. State colours
likewise: light `--ok:#15803D`, `--warn:#A16207`, `--err:#DC2626`.

**Any contrast ratio computed from the base light block is wrong.** Compute
against the effective values above.

<details>
<summary>Drift history — why this warning exists</summary>

This table has been corrected twice. `CLAUDE.md` once carried
`#b0b0b0 / #909090 / #757575`; this file then carried dark `--t3:#5C616B` and the
base-block light values `#171717 / #525252 / #737373 / #a3a3a3`. Five of eight
values were wrong at the point of the 2026-08-09 audit. The cause is structural —
two same-specificity theme blocks ~4,200 lines apart — so re-verify at the
override block, not the first match.

</details>

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
