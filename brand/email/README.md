# `brand/email/` — assets for admin@uil4b.com

Built 2026-09-14, when the founder set the mailbox up. Everything here is a
file to paste or send; nothing in this folder is wired into the app yet.

| File | What it is | Where it goes |
|---|---|---|
| `avatar-512.png` | 512×512 email avatar, real Manrope on `#0F6FFF` | Google account photo for admin@uil4b.com |
| `avatar.svg` | the same mark as vector | source, for re-rendering at other sizes |
| `signature.html` | HTML signature, table-based | Gmail → Settings → General → Signature |
| `signature.txt` | plain-text signature | clients set to plain text |
| `templates/welcome.html` | new account | not wired up — see *Not built* |
| `templates/payment-failed.html` | dunning | not wired up |
| `templates/support-ack.html` | receipt for a support submission | not wired up |

---

## Two things to do now

**1. Set the avatar.** Google account for admin@uil4b.com → profile picture →
upload `avatar-512.png`. Square on purpose: Gmail, Outlook and Apple Mail each
crop to a circle at slightly different radii, so a pre-cropped circle gets
cropped twice and arrives with a clipped edge.

**2. Paste the signature.** Open `signature.html`, copy the rendered result (not
the source) into Gmail's signature box. The default has **no image** — most
clients block remote images until the reader clicks, so an image-led signature
reaches a stranger as a broken placeholder. The avatar variant is commented out
at the bottom of the file for threads where that is not a concern.

**One line is yours.** The signature signs as *Dylan Coleman*. A role address
can also sign as *UIL4B Support*. Pick one — I have not decided it for you.

---

## What this does NOT replace

- **Password reset, email verification, sign-in links.** Firebase Auth sends
  these and they are styled in the Firebase console, not here. Writing our own
  would mean two systems sending the same mail.
- **Payment receipts.** Stripe sends these. Ours would duplicate them and
  disagree the first time a proration happened.

Only mail the product does not already send is in `templates/`.

---

## Why `payment-failed.html` is the one that matters

`docs/OWNER-ACTIONS.md` records that the in-app billing banner *"only ever
reaches someone who already came back on their own."* So today, a customer whose
card fails finds out by returning to the app and noticing. That template is the
half that goes and tells them. It is the only file here with money attached.

It is written flat on purpose — no red, no "urgent", no countdown. A failed card
is usually an expiry or a bank block, not a decision, and the reader is not in
trouble.

---

## Still blocked, and this folder does not unblock it

**A verified sending domain** — `OWNER-ACTIONS.md` §4.10. Until SPF, DKIM and a
return path exist on `uil4b.com`, none of this can be sent to a customer:

- `api/support.js:194` and `api/ai.js:609` both still send from
  **`onboarding@resend.dev`**, the Resend sandbox. That address is not
  deliverable in production and cannot be made to look like it came from you.
- Creating the mailbox is progress toward §4.10 but is **not the same thing**.
  A mailbox receives; a verified domain is what lets you send.

**Two addresses the site already promises and I could not verify exist:**

- `privacy@uil4b.com` — `src/pages/Privacy.jsx:133`
- `legal@uil4b.com` — `src/pages/Terms.jsx:58`

Both are printed on live legal pages. If they do not exist, mail sent to them
bounces, on the two pages where a bounce is worst. Worth checking while you are
in the mail admin — aliases onto admin@ would close it in a minute.

---

## Keeping these honest

- **No unsubscribe link on `welcome` or `support-ack`.** Both are triggered by
  the recipient's own action, so they are transactional, not marketing. Adding
  an unsubscribe invites a reader to opt out of receipts and resets. Anything
  *not* triggered by their own action needs one.
- **`support-ack` promises no response time.** "Within 24 hours" is a promise a
  one-person company cannot keep at 2am on a Sunday, and a missed promise is
  worse than none.
- **Tables and inline styles throughout.** Outlook on Windows renders through
  Word's HTML engine — no flex, no grid. 600px is the width that survives every
  client including Outlook's reading pane.
- **The `[FOUNDER]` marker in `welcome.html`** flags a sentence that should not
  ship as written. A welcome from the founder, written by an agent, is not a
  welcome from the founder.

## Re-rendering the avatar

`avatar.svg` is the source. The PNG was rendered through a headless browser so
the real Manrope was used rather than a system fallback — opening the SVG in a
tool without Manrope installed will silently substitute a different face.
