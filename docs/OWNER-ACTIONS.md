# UIL4B — Owner actions

**This is your to-do list.** Everything on it needs your login, your card, or
your decision. No agent can do any of it.

Every item says the same four things: **Do** · **Time** · **Why** · **If you do
nothing**. Nothing else. If an item needs more explanation than that, the
explanation is in an engineering doc and this page links to it.

Engineering work is not here — it is in `src/data/pipeline.js`. Ideas waiting on
your verdict are in [`PROPOSALS.md`](PROPOSALS.md). Decisions you have already
made are in [`CHANGELOG.md`](../CHANGELOG.md).

_Last reviewed: 2026-09-05._

**Engineering is stopped on four of these.** The queue records these as waiting
on you and nothing can move on them: the GitHub bill (§1.1), the Stripe
retention setup (§4.6), a live Stripe checkout test (§6), and a verified sending
domain (§4.10). A fifth — moving Firebase off the public critical path — needs a
design from us before you can approve anything, so we will bring it to you rather
than the other way round.

---

# 1 · Stopped right now — two bills

These two are not engineering problems and no amount of waiting fixes either.

## 1.1 · GitHub is running no tests at all. Pay the bill.

**Do.** GitHub → Settings → Billing → clear the failed payment, or raise the
spending limit.

**Time.** A few minutes on one page.

**Why.** GitHub's own message, word for word: *"The job was not started because
recent account payments have failed or your spending limit needs to be
increased."* Every automated test run in this repository has died in 1–3 seconds
since 2026-09-04 — on branches **and on `main`**.

**The trap, and it matters.** GitHub now shows our pull requests as
**UNSTABLE**. That word looks like "this code is broken". It is not. It means
**the tests never ran**. Anyone judging our work by the badge — you, a
contractor, an agent — reads the wrong conclusion about every open change at
once.

**If you do nothing.** Nothing self-heals; a billing block does not expire. Every
new change keeps looking broken, and the only proof anything works is an agent
running the tests on their own machine and pasting the output into the pull
request.

## 1.2 · Vercel will not deploy. 76 merged changes are not live.

**Do.** Vercel → your team → Usage / Billing. Clear the deployment limit, or wait
out the window Vercel names.

**Time.** A few minutes to upgrade; 24 hours if you would rather wait.

**Why.** Vercel answered *"Deployment rate limited — retry in 24 hours"*.
Everything merged since 2026-09-02 is sitting on `main` and has never reached
uil4b.com.

**If you do nothing.** The live site keeps serving the 2 September build. Every
fix listed in the changelog since then is invisible to real visitors, so none of
it counts yet.

---

# 2 · Still needs you — three things

Everything else you were asked has been answered and is recorded in §3. These
three are all that is left.

## 2.1 · Which shape should the homepage's top section be — A, B or C?

**The question.** Pick a shape: **A**, **B** or **C**.

**How to look.** Open the site and add `?hero=a`, `?hero=b` or `?hero=c` to the
address. Remove it to see the current one. Nothing is shipped; these are three
sketches sitting beside the live page.

- **A** — the search bar opens the page; the headline gets smaller.
- **B** — the whole block moves off the centre line.
- **C** — almost everything removed, down to one sentence.

**Read this before you judge C.** Its headline is deliberately **faded to 45%**
and its words are a placeholder. **Judge the shape, not the paleness.** If you
pick C, the deliverable is **one sentence in your own words** — we will not write
it, because an agent writing it is exactly the "sounds AI-generated" problem you
have now reported three times.

**Why we are asking again.** #290 already rewrote the *words* inside the current
shape and you said it still read as AI. So the words are not the variable — the
shape is.

**If you do nothing.** The current hero stays, and it is the one you have
objected to three times.

**Your answer:** _______________

**Full working:** [`PROPOSALS.md` P-006](PROPOSALS.md).

**Related, and it needs no decision from you:** of the three homepage pull
requests still parked, **#269 is empty** (its one good change already shipped as
#363), **#264 cannot be rebased** (a file it edits no longer exists — its good
parts are re-filed as separate jobs), and **#270's specimen band still works and
is *not* waiting on your hero choice.** An earlier note said it was; that was
measured and found wrong — the band fits in all three shapes on desktop and
phone.

## 2.2 · Quieter text now looks like normal text on some palettes. Keep it?

**The question.** Keep the change, or reverse it?

**Plainly.** In the palette previews there are two levels of text: normal, and a
quieter second level. The quiet one used to be **too faint to read** on most
colours. We darkened it until it passes the readability floor. The side effect:
on **19.1% of palettes** the quiet text now looks nearly the same as the normal
text — it used to be 3.02%.

That trade is real and it cannot be tuned away. On a strongly coloured
background, all the available contrast is spent just making the text readable at
all; there is nothing left to make a *second*, quieter level out of.

| | Option | One-line case |
|---|---|---|
| **A** | **Keep it** (this is what shipped) | Everything is readable everywhere. On the 19% we carry the hierarchy with size and weight instead of colour. |
| B | Reverse it | The two levels look different again — and the quiet one goes back to being unreadable on most palettes. |
| C | Keep it and say so on screen | Print "contrast has been adjusted" beside the preview, the way Linear does. Extra work; extra words on screen. |

**We recommend A**, and it is already live. We checked eight comparable products:
where the background is a colour the user picked, Polywork and Squarespace both
use the **same** ink for both levels and separate them by size and weight. Not one
of the eight paints a faint tint on a saturated ground.

**If you do nothing.** A stays.

**Your answer:** _______________

**Full working:** [`PROPOSALS.md` P-023](PROPOSALS.md).

## 2.3 · Four sentences only you can write

**This is not a question — it is the one piece of writing we will not do for
you.** You decided the founder note is opt-in rather than a popup (§3.10). The
design, the trigger and the panel are ours. **The words are yours**, for the same
reason we will not write hero direction C: a welcome from the founder, written by
an agent, is not a welcome from the founder.

**Do.** Fill in the four lines below. One sentence each. **Write them badly** —
typos, no punctuation, half a thought. We will not rewrite them, and that is the
point.

**1. Who you are.**

> _____________________________________________________________

**2. What UIL4B is for.**

> _____________________________________________________________

**3. What state it is in right now.**

> _____________________________________________________________

**4. What help you want from people.**

> _____________________________________________________________

**Time.** Five minutes, and you have already said most of it in conversation.

**If you do nothing.** The panel cannot ship. It is the only part of the feature
that is blocked, and everything around it is ready to build.

---

# 3 · Decided — recorded so nobody asks you twice

**Ten decisions you made on 2026-09-05.** They are here so that no agent, and no
future version of this file, asks you again. The full record is in
[`CHANGELOG.md`](../CHANGELOG.md).

## 3.1 · The word "tokens" → we say **"Styles"**

Your pick of the three options offered. *(We had recommended "Foundations"; you
chose "Styles". Recorded as your call, not ours.)*

**What it means.** Every sales, navigation and tool heading that said *tokens*
now says *Styles*. The word **token survives only past the export boundary** —
the export panel, the generated file names, the code blocks, the `@uil4b/tokens`
package. That is the one place it is correct, expected, and searched for by the
developer consuming it; renaming it there would break customers' code.

**Status.** Implementation is in flight in a separate pull request. Roughly 35
lines of English copy, no translation work.

## 3.2 · The `pepsi` palette → **rename it to its era**

We could not verify it and could not ever verify it — every PepsiCo host blocks
automated access, and their own asset library only carries the corporate mark,
not the cola brand. Renaming keeps the palette and stops us claiming it is
today's brand.

## 3.3 · The `google` palette → **make it free**

*(We had recommended leaving it paid; you chose free, knowing the free tier
already had six palettes.)*

**Keep the history, because it is the useful part.** The row named `google` was
never Google — it was holding **Material 3's** default purple. #354 split them
into `material` (Material 3 Baseline) and a correct `google` row. The split was a
data correction; which side of the paywall Google lands on was never chosen by
anyone until now, and now it is.

## 3.4 · `/community` tile lettering → **yes, pick the ink per tile**

Nine of the twelve tiles were below the readability floor, the worst at 1.47:1
against a 3:1 minimum. Ten of the twelve now flip their letters from white to
black. **No colour changes.**

## 3.5 · Typography pricing → **browsing is free, saving is Pro**

Anyone may browse fonts, pair them, and build a type scale. **Pro is required to
save, to export, or to keep a type system in a project.**

You picked it because it is exactly how the colour tools already work — which
also means it needs no new concept explained to anyone, and it answers the open
question of what Pro means for typography.

## 3.6 · Learn is **proper design education**

Real articles on colour theory, typography and accessibility. **Not** how-to
guides for our tools, and **not** product documentation.

## 3.7 · Learn's voice is **neutral and factual — not yours**

No first person. You chose this deliberately so the content can be written at
scale and you only have to fact-check it.

**Note the contrast with §2.3, and it is not a contradiction.** Educational
articles are not yours to sign; a welcome from the founder is nothing but yours.

## 3.8 · Discover ends as a **community gallery, built in stages**

**Curated first, community publishing later.** Ship galleries you fill yourself
now, rather than launching an empty social feature and waiting for it to fill.

## 3.9 · Moderation → **an approval queue. Nothing publishes until you approve it.**

Chosen over publish-then-remove **on liability grounds**, as a solo developer.
This applies when community publishing arrives; it is a constraint on how that
feature gets built, not a separate feature.

## 3.10 · The founder note is **not a popup**

Your words: *"maybe we make it visable when a user clicks a certian section or
button, it will just be a short welcome from me and a what this app is for and
what state its in also asking for feedback support as im a solo developr"*.

**Opt-in only.** It never auto-opens. No timer, no scroll trigger, no
first-visit trigger. A visitor reaches it by clicking something.

**Blocked on §2.3** — your four sentences.

---

# 4 · Console and credential work

Still open, all of it needs your dashboard access. Ordered by what breaks
without it.

## 4.1 · P0 — Stripe prices do not match the prices on screen

**Do.** Stripe Dashboard → Products → **UIL4B Pro** → create or confirm live
prices at **$7 monthly · $18 quarterly · $48 yearly**.

**Time.** 15–30 minutes, plus a decision about existing customers.

**Why.** You approved this ladder on 2026-08-20. The website now shows those
prices. **Stripe still charges whatever its own price objects say** — the repo
only holds the display. **Yearly is a price rise, $39.99 → $48**; decide what
happens to existing yearly subscribers before you publish it.

Quarterly cannot be sold until four small code changes ship alongside it; that
part is our job, not yours, and it is in the queue.

**Done when.** `/api/get-prices` reports `source: "live"` for monthly and yearly
at the ladder amounts.

**If you do nothing.** The site advertises one price and charges another. That is
the only item on this page with a legal edge to it.

## 4.2 · P0 — Stripe webhook is not subscribed to the events we handle

**Do.** Stripe → Developers → Webhooks → `/api/stripe-webhook`. Subscribe to:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`charge.refunded`, all three `charge.dispute.*`, subscription
create/update/delete, invoice paid/failed, and trial-will-end. Send a test event
for each and confirm HTTP 200.

**Time.** 20 minutes.

**Why.** Our code handles all of these; Stripe is not sending them. Refunds and
chargebacks in particular are handled in code and never arrive.

**If you do nothing.** Do not create a lifetime price. A one-off payment we never
hear about is a customer who paid and got nothing.

## 4.3 · P0 — Firebase Storage is not switched on

**Do.** Firebase Console → Storage → enable it, then publish `storage.rules`.
Check that a signed-in user can write only under `community-media/{uid}/`.

**Time.** 10 minutes.

**Why.** The community architecture you approved needs it. Nothing that uploads a
file can work until it exists — including the community gallery in §3.8.

**If you do nothing.** Community media stays unbuildable.

## 4.4 · P0 — Admin → Feedback may not be able to read anything

**Do.** Open Admin → Feedback and see whether it loads.

**Time.** 2 minutes.

**Why.** The published rules require an admin flag on your account
(`request.auth.token.admin == true`). **No code anywhere sets that flag**, so it
probably does not exist. If the panel says `permission-denied`, tell us and we
will either set the flag properly or move the read behind a server route — that
is a decision, not a fix, so we will ask.

**This one now blocks more than feedback.** The approval queue you chose in §3.9
is an admin surface with the same requirement.

**If you do nothing.** User feedback is being collected and nobody is reading it.

## 4.5 · P1 — Prove the AI is using the provider you are paying for

**Do.** Sign in, open the **AI Image Prompt Generator**, generate one prompt, and
read the badge on the result card.

- Badge says **OpenRouter** → pass. Write the date here and close this item.
- Badge says **Gemini · fallback** → fail. The prompt in front of you will look
  perfectly good. **That is the defect, not a glitch.**

**Time.** 2 minutes.

**Why this is not already closed.** Your key was set on 2026-08-07 and that is
recorded as done. But a key being *present* is also what a wrong, revoked or
out-of-credit key looks like. **Only a real generation proves the route works.**

**Two other ways to see the same thing.** Admin → Overview → **AI provider
health** gives seven days of counts across all users, plus a plain verdict.
*"No generations to judge by" is not a pass* — generate one prompt and reload.
The same numbers are on `?diag=1` under `providerHealth` for when you want raw
JSON; it needs an admin login and answers 404 to a plain browser visit.

**Reading a failure.** Every generation response carries `provider: "openrouter"`
or `provider: "gemini"`, and the badge is just that field on screen. 401/403 = key
wrong or revoked · 429 = rate-limited or out of credit · 5xx = OpenRouter outage ·
HTTP 502 "AI provider rejected the API key" = both providers down · HTTP 500 "AI
is not configured" = neither key is set.

**If you do nothing.** The app looks healthy while the provider you pay for is
dead, and every generation quietly comes from the free fallback.

## 4.6 · P1 — Stripe Customer Portal has no retention offer

**Do.** Stripe → Settings → Customer Portal. Create the **`RETAIN50`** coupon (50%
for 3 months), enable cancellation, and select the retention offer.

**Time.** 15 minutes.

**Why.** The cancellation flow is built and is waiting on this.

**If you do nothing.** Every cancellation is final, with nothing offered.

## 4.7 · P1 — Check the legacy customers can still be matched to accounts

**Do.** Stripe → Customers. For each legacy paying customer, confirm
`metadata.firebaseUid` exists. Back-fill only genuinely missing values.
**Investigate — do not overwrite — a mismatched one.**

**Time.** Depends on how many; minutes each.

**If you do nothing.** A paying customer can lose their Pro access at renewal
because we cannot tell which account is theirs.

## 4.8 · P1 — Confirm your login email

**Do.** Confirm `dylanjacob1100@gmail.com` is the account the admin and server
allowlists should trust.

**Time.** 1 minute.

**Why.** If it is wrong, say so and we will change every copy in one go — this is
a Human Validation Zone, so we will not edit one and leave the others.

## 4.9 · P2 — Turn on the only alert this deployment can have

**Do.** Vercel → Environment Variables → set **`RESEND_API_KEY`** and
**`SUPPORT_NOTIFY_EMAIL`**, redeploy, submit a test feedback message, confirm one
email arrives.

**Time.** 10 minutes.

**Why.** This one pair buys two things: (a) email when someone sends feedback or
support, and (b) an email **the first time OpenRouter fails on any given day** —
at most one a day, naming the HTTP status and whether the fallback covered it.

**The actual choice.** Without these, a provider failure is counted but nothing
comes and finds you; you learn about it next time you open Admin → Overview. With
them, you are told. There is no third option that does not add a paid monitoring
service, which you have ruled out. Admin → Overview → AI provider health states
which mode you are in on its last line.

**If you do nothing.** Silence, not an error — the code is written to stay quiet
when the variables are unset.

## 4.10 · P1 — We cannot email a customer at all. Verify a sending domain.

**Do.** In Resend (or whichever provider you prefer), verify a real sending
domain for uil4b.com — DNS records for SPF, DKIM and a return path — and tell us
the address to send from.

**Time.** 20 minutes plus DNS propagation.

**Why.** **The product sends zero emails to users.** Not a welcome, not a quota
warning, not a trial-ending reminder, not a failed-payment notice, not a
cancellation confirmation. The only mail we send is inbound to you, from
`onboarding@resend.dev` — Resend's shared sandbox, which is not deliverable in
production, and our own admin panel already marks it failing.

**If you do nothing.** There is no way to reach a customer who is not currently
looking at the app. Every reminder, recovery and re-engagement moment is
unreachable — which is the missing half of the billing work, because the in-app
billing banner only ever reaches someone who already came back on their own.

Separately, and **not checked**: Stripe may be sending its own receipts and
failed-payment chases depending on your dashboard settings. Worth a look while
you are in there.

## 4.11 · P2 — Lock down the public Google Fonts key

**Do.** Google Cloud Console → Credentials. Restrict the public Google Fonts key
to the UIL4B and preview referrers, and to the Web Fonts API only.

**Time.** 5 minutes.

**If you do nothing.** The key is in the browser bundle and anyone can spend our
quota with it.

---

# 5 · Already confirmed — do not re-open

- **`firestore.rules` published.** You confirmed this. The publication blocker is
  **closed**.
- **Production OpenRouter key set and redeployed.** Your words to the Director,
  2026-08-07: *"openrouter key is updated and redeployed"*. This records the
  **key**, not that the route works — that is §4.5 above and it is still open.

That is the whole list of confirmations. It does **not** cover Storage, the admin
flag, analytics accuracy, a working AI generation, or any live payment or login
flow. All of those are open above.

---

# 6 · Checks nobody has run yet

These need real accounts or the production dashboards. **None has been attempted.**
An unticked line means "not attempted" — never "passed quietly". Write the result
and the date beside one when you run it.

- [ ] Switch between two real Google accounts; confirm the old session survives
      until the new one commits.
- [ ] On live Firebase: fresh email signup, fresh Google signup, returning login,
      abandon onboarding then open `/home`, a deep link, and every finish/skip
      exit.
- [ ] Complete, abandon, return to, and retry a live Stripe checkout; confirm
      UIL4B and Stripe agree in each case.
- [ ] Google Search Console — check real indexation now that prerendering ships.
- [ ] Admin Feedback panel and aggregate analytics against the published Firestore
      rules; record whether the admin flag and the totals are correct.

---

# 7 · Environment variables, for reference

**Public (browser):** `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_STRIPE_PUBLISHABLE_KEY`, optional `VITE_GOOGLE_FONTS_API_KEY`.

**Private (server):** `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`,
`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, the price ids, and the optional retention/support
variables.

**Never paste a secret value into this repository.**
