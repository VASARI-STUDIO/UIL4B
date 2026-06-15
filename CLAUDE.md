# UIL4B — Web Design Toolkit

## Project Overview

React 19 SPA (Vite + Vercel) providing design tools: Color Studio, Font Pair Finder, AI generators, and community hub. Firebase Auth + Firestore, Stripe subscriptions, DeepSeek/Gemini AI backends.

## Tech Stack

- **Frontend**: React 19, Vite, BrowserRouter
- **Styling**: CSS custom properties (dark/light theme), no CSS-in-JS
- **Auth**: Firebase Auth (Google One Tap + email/password)
- **Database**: Firestore (region: australia-southeast1)
- **AI**: DeepSeek API (primary), Gemini API (fallback)
- **Payments**: Stripe (embedded checkout, customer portal)
- **Deploy**: Vercel (serverless functions in `/api`)

## Key Architecture

- **Pages**: `src/pages/` — each route is a standalone component
- **Contexts**: AuthContext, SubscriptionContext, ProjectContext, WorkspaceContext
- **API routes**: `/api/*.js` — Vercel serverless functions (no VITE_ prefix for secrets)
- **Styles**: Single `src/styles/global.css` — all CSS in one file, class-based
- **Analytics**: Client-side localStorage (`vs-analytics`, `vs-sessions`, `vs-design-analytics`)

## Build & Verify

```bash
npx vite build          # Must pass before any commit
npx vite --port 5173    # Dev server
```

## Verify-First Workflow

Before starting any implementation:
1. **State how you will verify** the change works (build, visual check, specific test)
2. **After finishing**, run that verification and report results
3. **Never claim success** without evidence — build pass + visual confirmation minimum

## Human Validation Zones

These areas require explicit user approval before ANY code changes. Explain the blast radius (what could break, who is affected, is it reversible) before proceeding:

### Payments / Stripe
- `api/stripe-webhook.js` — processes subscription events, touches billing state
- `api/setup-stripe.js` — creates/modifies Stripe prices
- `api/create-checkout.js` — initiates payment sessions
- `api/create-portal.js` — customer billing portal
- `src/contexts/SubscriptionContext.jsx` — plan resolution, checkout flow
- `api/_lib/stripe.js`, `api/_lib/pricing.js`, `api/_lib/plans.js`

### Auth / Login
- `src/contexts/AuthContext.jsx` — login/signup/profile, session management
- `src/components/AuthGate.jsx` — inline auth gates on AI tools
- `src/components/GoogleOneTap.jsx` — automatic sign-in
- `api/verify-admin.js` — admin privilege verification
- `src/utils/firebase.js` — Firebase config and auth instance

**Rule**: Never modify these files without asking first. A bug here locks users out or breaks billing.

## Murphy's Law Checklist

Before shipping any feature, consider:
- What happens if the network is offline?
- What happens on a 320px screen? On a 4K screen?
- What happens if the user double-clicks?
- What happens if the data is empty? If it has 1000+ items?
- What happens if localStorage is full or disabled?
- What happens if the user navigates away mid-action?
- What happens if Firebase/Stripe/AI API is down?

## Constants & Config

- **Admin emails**: `src/utils/constants.js` — `ADMIN_EMAILS = ['dylanjacob1100@gmail.com']`
- **Admin code**: `'uil4b-dev-2026'` (session-only unlock)
- **Firebase project**: `uil4b-357c5`
- **Brand color**: `--brand: #3B82F6` (dark) / `#2563EB` (light)
- **Dark contrast tokens**: `--t1:#b0b0b0`, `--t2:#909090`, `--t3:#757575`
- **Onboarding skip**: `localStorage 'vs-onboarded'` — set to `'1'` after first login

## CSS Conventions

- Use existing CSS custom properties (`--accent`, `--t0`–`--t3`, `--bg-0`–`--bg-4`, `--border`, `--radius-*`)
- Class naming: kebab-case with component prefix (`cs-` Color Studio, `adm-` Admin, `aipg-` AI Prompt)
- No inline styles in new code — add classes to global.css
- Mobile breakpoints: 768px (tablet), 480px (phone), 380px (tiny)

## Git Workflow

- **Branch**: Always work on the designated feature branch
- **Merge to main**: Via PR only (direct push returns 503)
- **Commit style**: Descriptive, component-prefixed messages
- **Never force-push** without explicit permission
