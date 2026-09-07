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
| Dark | `#6FA8FF` |
| Light | `#0F6FFF` |

`--accent` tracks `--brand` (dark `#6FA8FF` / light `#0F6FFF`). This is the
founder-selected blue recorded in `design-language-v2.md`; the design file's
default violet is not used anywhere. Full token set is in `css-conventions.md`.

Design Language V2 also added `--hi` (`#E9FF64`) with `--hi-fg`, deliberately
identical in both themes — the accent lightens in dark, the highlight does not.

> Corrected 2026-08-20. This table read `#3B82F6` / `#2563EB` — the pre-V2
> accent — for four days after V2 shipped. Values verified by reading
> `src/styles/global.css`, not by trusting the previous entry.
>
> **Re-verified 2026-09-06** against `[data-theme="dark"]` and
> `[data-theme="light"]` in `src/styles/global.css`: `--brand`, `--accent` and
> `--hi` all still hold the values above. The text-ramp table that used to sit
> below this one did not survive the same check — see the section that replaced
> it.

## Text contrast tokens — read them from the stylesheet

**This table used to live here and every one of its eight values was wrong.**
It carried a cool grey ramp (`#F2F3F5 / #B6BAC2 / #888D97 / #5C616B` dark,
`#171717 / #525252 / #737373 / #a3a3a3` light); the shipped ramp is warm and has
been since Design Language V2. It was recorded as "verified against source" in
`doc-authority-map.md` and had drifted anyway, which is the whole argument for
not keeping a second copy of a value.

Read them instead — one command, and it cannot go stale:

```bash
grep -nE '^\[data-theme="(dark|light)"\]' src/styles/global.css
```

`--t0`…`--t3` are defined once per theme, in the `[data-theme="dark"]` and
`[data-theme="light"]` blocks near the top of the file. `@media
(prefers-contrast: more)` overrides them further down; that block is part of the
answer and a table here would never have shown it.

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
