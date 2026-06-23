# Human Validation Zones (Founder-Gated) ⚠️

> Reference doc for UIL4B. Linked from `CLAUDE.md`. **Read this before touching
> anything auth- or payment-related.** A bug here locks users out or breaks
> billing.

## The rule

These files are **founder-gated**: never modify them without explicit user
approval. Every agent **flags** rather than touches them. Before proposing a
change, explain the **blast radius**:

- **What could break?**
- **Who is affected?** (all users, paying users, admins?)
- **Is it reversible?**

Only proceed once the user (Dylan) approves.

## Payments / Stripe

| File | Why it's gated |
|---|---|
| `api/stripe-webhook.js` | Processes subscription events; touches billing state. |
| `api/setup-stripe.js` | Creates/modifies Stripe prices. |
| `api/create-checkout.js` | Initiates payment sessions. |
| `api/create-portal.js` | Customer billing portal. |
| `api/checkout-status.js` | Reads checkout/session status. |
| `api/get-prices.js` | Serves live pricing. |
| `src/contexts/SubscriptionContext.jsx` | Plan resolution + checkout flow. |
| `src/utils/stripeClient.js` | Client-side Stripe wiring. |
| `api/_lib/stripe.js`, `api/_lib/pricing.js`, `api/_lib/plans.js` | Pricing/plan source of truth. |

## Auth / Login

| File | Why it's gated |
|---|---|
| `src/contexts/AuthContext.jsx` | Login/signup/profile, session management. |
| `src/components/AuthGate.jsx` | Inline auth gates on AI tools. |
| `src/components/GoogleOneTap.jsx` | Automatic sign-in. |
| `api/verify-admin.js` | Admin privilege verification. |
| `src/utils/firebase.js` | Firebase config + auth instance. |

## Public-by-design is NOT a leak

Do not treat these as secrets — they ship in the bundle on purpose, secured by
Firebase rules + authorised domains:

- Firebase web `apiKey`
- Stripe **publishable** key
- Google **client ID**

Real secrets are **server-only `process.env`**, never `VITE_`-prefixed
(Stripe secret key, DeepSeek/Gemini keys, Firebase service-account
`private_key`). A leaked service-account `private_key` is a hard BLOCK.

## If a task requires changing a gated file

1. Stop and describe the blast radius (above).
2. Propose the minimal change.
3. Ask the user to approve **before** editing.
4. After approval, make the change and verify with extra care (auth round-trip
   or a Stripe test-mode flow, plus the build).
