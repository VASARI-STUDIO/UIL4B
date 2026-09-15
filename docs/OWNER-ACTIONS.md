# UIL4B — Owner actions

**Your to-do list.** Everything here needs your login, your card, or your
decision. No agent can do any of it.

_Last reviewed: 2026-09-15 — every row below was re-checked against the live
service that day, not reworded. Three rows changed._

_Updated later the same day, after a long engineering session. **Two things you
should know before you start clicking:**_

_**1. Row 6 is worth more than it was this morning.** The webhook handler's
refund-and-chargeback path was dead against the current Stripe API — pointing
the webhook at it would have changed nothing. That is fixed. See "Row 6 changed
today" under the table before you do it._

_**2. Exporting now needs a free account.** Producing a file — a converted
image, an icon SVG, a palette PNG, a style guide — asks the visitor to sign up
first. Copying a value (Copy CSS, a hex, an SVG snippet) stays free forever,
and every tool is still fully usable signed out. This is your "make users have
to make an account to use alot of the extra feature", and it is the reason
signups should start moving before the prices in row 4 matter._

> ## Can we release?
>
> **The site is live and current. The money side is not.**
>
> **The deploy block is gone.** Twenty deploys went out on 14–15 September,
> every one of them succeeded, and the newest is the newest commit — so
> uil4b.com is now showing what is actually in the repository. That was row 1
> for weeks. It is finished, and you are staying on the free plan.
>
> **What is left is Stripe and email.** You still cannot email a customer, a
> Pro subscriber still cannot cancel, and the Stripe webhook is pointed at the
> wrong address so refunds never reach us.
>
> **If you do exactly one thing today, do row 2** — your tests have not run
> since 4 September and it is one billing page.
>
> (This replaces `RELEASE-READINESS.md`, retired 2026-09-14. It restated this
> page's own rows with a second set of numbers, so the two could disagree — and
> did. What it held that was genuinely its own is now in
> [`build-and-verify.md`](reference/build-and-verify.md) under *What a green
> gate does NOT prove*.)

---

## ⚡ Do these now, in order

Work straight down. Each row is one place to click. **Rows 2 and 3 unblock the
most** — everything after them is money and email plumbing.

A struck row is done — it keeps its number so nothing that points at it breaks.

| # | Do this | Where | Time | If you skip it |
|---|---|---|---|---|
| **1** | ~~Check Fast Origin Transfer. Upgrade off Hobby~~ **Nothing — you are staying free.** Read *What free costs you* below once | — | 2 min to read | Nothing. The site is deploying again and the free plan is holding |
| **2** | Clear the failed payment, or raise the spending limit | GitHub → Settings → **Billing** | 5 min | No test has run since 4 September. Every PR reads `UNSTABLE`, which looks like broken code |
| **3** | Run `npm run apply:gated`, type **y**, then publish the rules | a terminal in this repo | 2 min | **This is what the Firebase "insecure rules" email is about.** Your feedback collection is open to anyone on the internet, and you stay the only person who can approve a submission |
| **4** | Set the prices to **$7 · $18 · $48** (you decided this 2026-09-15) | Stripe → Products → UIL4B Pro | 25 min | You keep selling at $4.99 and $39.99 — less than you decided to charge, and quarterly cannot be bought at all |
| **5** | Edit the product description: **30 AI actions a day, 300 a month** | Stripe → Products → UIL4B Pro | 2 min | Your own product page promises 1,000/day that the app does not give |
| **6** | Point the webhook at **`/api/stripe-webhook`**, then add the refund and dispute events | Stripe → Developers → Webhooks | 20 min | **It currently posts to your homepage, so nothing Stripe sends is ever handled.** Refunds and chargebacks vanish. See the note directly below — this row is worth more today than it was yesterday |
| **7** | Switch Storage on, publish `storage.rules` | Firebase Console → Storage | 10 min | Anything that uploads a file cannot work |
| **8** | Verify a real sending domain (SPF, DKIM, return path) | Resend, or your provider | 20 min + DNS | **We cannot email a customer at all** — no welcome, no failed-payment notice |
| **9** | Turn the Customer Portal on, then add a retention offer | Stripe → Customer Portal | 15 min | **A Pro subscriber cannot cancel at all.** The portal has never been set up |
| **10** | Confirm `dylanjacob1100@gmail.com` is the admin account | — | 1 min | Admin and server checks may be keyed to the wrong address |
| **11** | Restrict the public Google Fonts key | Google Cloud → Credentials | 5 min | The key is public and unrestricted |
| **12** | ~~Check legacy customers still match to accounts~~ **Done — checked 2026-09-15** | — | — | — |
| **13** | ~~Make `www.uil4b.com` work~~ **Done — it works, 2026-09-15** | — | — | — |
| **14** | Make the Google sign-in box say `uil4b.com` | Firebase + Google Cloud | 20 min | It says `uil4b-357c5.firebaseapp.com`, which looks fake |

### Row 6 changed today — the webhook is now worth pointing at us

**Until 2026-09-15, fixing row 6 would have done less than it looked like.**
Even with the webhook correctly pointed, a chargeback or refund on a renewal
would have left Pro switched on.

**Why.** The code that traces a reversed charge back to the subscription it
paid for walked two fields — `PaymentIntent.invoice`, then
`Invoice.subscription`. Stripe deleted **both** in its Basil release
(2025-03-31): *"Removed the `invoice` field from the PaymentIntent and Charge
objects."* Our Stripe library is pinned two releases past that. So the lookup
returned "not found" on every single call, silently — nothing threw, nothing
was logged, and no test failed, because the code was inert rather than wrong.

**It is fixed.** It now uses the object Stripe added to replace those fields,
and it is held by seven tests; putting the old code back turns four of them
red. So when you do row 6, revocation will actually happen.

**What row 6 still needs from you, in this order:**

1. Change the endpoint URL to `https://uil4b.com/api/stripe-webhook`
2. Add these events, which are the ones that take money back:
   `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
3. Copy the **signing secret** Stripe shows you and put it in Vercel as
   `STRIPE_WEBHOOK_SECRET` — without it every delivery is rejected as unsigned

**One thing to check after.** Stripe's webhook page has a "Send test webhook"
button. Send a `charge.dispute.created`. You should get a **200**, not a 400 or
a 500. A 400 almost always means the signing secret in Vercel does not match
the one Stripe is showing you.

### What free costs you — Vercel stays on Hobby

**Your decision, 2026-09-15: Vercel billing stays free.** Good news first —
the thing that was blocking you fixed itself. Twenty deploys went out on 14–15
September and every one succeeded, so the "nothing is live since 2 September"
problem is over. You are still on Hobby and it is coping.

**So what does free actually cost you?** Three limits, and only one of them is
close to biting.

| The limit | Where you stand | What happens if you hit it |
|---|---|---|
| **Fast Origin Transfer** — 10 GB a month | The 32 MB converter engine that ate it now loads from a free public CDN instead of your site. That was 91% of the weight, gone since 2026-09-06 | Deploys get rate-limited again, exactly like 2 September. It clears on the monthly reset |
| **Function storage** — the deploy carries `src/data/pipeline.js` into the AI function | **This is the one to watch.** It is 964 KB today and grows about 5 KB every commit. `vercel.json` already trims the other 280 KB of files the function does not import | Nothing sudden. It creeps, and one day a deploy is refused |
| **Deploy retention and history** | Hobby keeps fewer old deploys | You lose the ability to roll back to something old. The last few are always there |

**What we do about it, so you do not have to.** Two things, both ours:

1. The 280 KB of files the AI function never imports are already excluded.
2. `pipeline.js` is the file that grows. It is our engineering log, and it is
   only in the deploy because the admin backlog view reads it. Shrinking it is
   a product decision we will bring you as a proposal, not a surprise.

**If you do nothing.** Nothing, for now. Free is genuinely working. The number
that creeps is function storage, and we are the ones watching it — if it gets
close we will tell you before Vercel does.

**One thing we still cannot see.** Your actual Vercel usage page. Only you can
open that, so if a deploy ever fails again, that is the first place to look.

---

### Why Firebase emailed you about insecure rules

**It is real, it is ours, and the fix is already written.**

`firestore.rules` line 56 says:

```
match /feedback/{feedbackId} {
  allow create: if true;
```

`if true` means no sign-in, no field checks, no size limit, no rate limit.
Anyone on the internet can write documents straight into the collection your
admin feedback queue reads from — as many as they like, any shape, up to
Firestore's 1 MB per-document ceiling. Firebase's scanner looks for exactly this
and emails you about it.

**Nothing in the app relies on it.** Every report goes through
`fetch('/api/support')`, which writes with the Admin SDK and skips these rules
entirely. So the rule never protected a real write — it only granted one to
strangers. Closing it breaks nothing, and reads, updates and deletes are
untouched, so the queue keeps working.

**The fix is row 3.** `npm run apply:gated` changes it to `allow create: if
false` and also puts size and shape limits on the three collections a signed-in
account can write to. It was reviewed in #418 and is tested against the Firebase
emulator before you publish it.

**Then publish.** Applying the change only edits the file on your machine. The
rules that are live are whatever the Firebase console last published, so the
email will keep coming until you publish — see the line below.

**After row 3 you must also:** publish the new rules (Firebase console, or
`firebase deploy --only firestore:rules`) **and deploy the site** —
`api/verify-admin.js` is a serverless function and does nothing until it ships.
**Deploys work again**, so that half is no longer blocked: push the change and
it goes out on its own.

---

## 🌐 Your web address and the sign-in box

One of these is fixed. The other still looks wrong to every new visitor.

---

### 13 · ~~`www.uil4b.com` does not load~~ — FIXED, and it went the other way round

**Checked 2026-09-15 and it works.** `www.uil4b.com` answers **200 OK**
straight away. Somebody — you, last night — added it in Vercel and pointed the
DNS at a real Vercel server instead of the nameserver it used to point at.

**One thing changed that you should know about.** `www` is now the **main**
address, not the redirect. Type `uil4b.com` and you get sent to
`www.uil4b.com`, which is the opposite of what this page told you to set up.

**That is fine and nothing is broken.** Both addresses work, nobody sees an
error, and every link we publish still says `uil4b.com` — which now costs one
extra hop before the page loads. Not worth undoing.

**If you would rather have it the other way** (plain `uil4b.com` as the main
address, `www` redirecting to it), it is the same screen: Vercel → Settings →
Domains, and set `uil4b.com` as the primary. Say the word and we will tell you
exactly what to click. **Nothing bad happens if you leave it.**

---

### 14 · The Google sign-in box shows a strange address

**What is wrong.** When someone clicks "Sign in with Google", the Google box
says:

> Continue to **uil4b-357c5.firebaseapp.com**

It should say **uil4b.com**.

**Why this matters.** That address looks like nothing the visitor has heard of.
They came to `uil4b.com`, clicked sign in, and Google is now asking them to
trust a random-looking name with numbers in it. People stop at that screen.
It is the single worst moment to look untrustworthy, because it is the moment
you are asking for their account.

**Why it happens.** Firebase gives every project a free address like
`uil4b-357c5.firebaseapp.com`. Google shows whatever address handles the
sign-in. Right now that is the Firebase one, because nobody has told it to use
yours. You can see it in the code at `src/utils/firebase.js` line 16.

**Still open, checked 2026-09-15.** `auth.uil4b.com` does not exist yet — we
asked the internet for it and got "no such address". So none of the steps
below has been done.

**Do this.** Three steps, in this order. Do not skip step 1.

**Step 1 — pick an address for sign-in.** Use `auth.uil4b.com`. It is a
subdomain, like `www`, and it exists only to handle the sign-in handoff.
Visitors will barely see it, but they will see `uil4b.com` in it, which is the
whole point.

**Step 2 — tell Firebase about it.**

1. **Firebase Console → Hosting → Add custom domain.**
2. Enter `auth.uil4b.com` and follow the steps it gives you. It will ask you to
   add a DNS record, the same kind you just added for `www`.
3. Then go to **Firebase Console → Authentication → Settings → Authorized
   domains** and make sure both `uil4b.com` and `auth.uil4b.com` are listed.

**Step 3 — tell the app to use it.**

1. **Vercel → Settings → Environment Variables.**
2. Add `VITE_FIREBASE_AUTH_DOMAIN` with the value `auth.uil4b.com`.
3. Redeploy the site. The variable only takes effect on a new build.

**Then check your branding.** Go to **Google Cloud Console → APIs & Services →
OAuth consent screen**. Make sure the app name says **UIL4B** and the logo is
set. That is the other half of what the visitor reads on that screen.

**Time.** About 20 minutes, plus waiting for DNS.

**If you do nothing.** Every person who tries to sign in with Google is shown a
name that looks made up, at the exact moment they are deciding whether to trust
you. Some of them will not finish.

**Test it when you are done.** Open a private window, go to `uil4b.com`, click
sign in with Google, and read the top of the Google box. It should say
`uil4b.com` or `auth.uil4b.com`. If it still says `firebaseapp.com`, the
environment variable did not reach the build — redeploy.

---

## ✍️ Only you can write these

Not tasks — sentences. **Write them badly.** Typos, no punctuation, half a
thought. We will not rewrite them, and that is the point.

| | What | Why it is stuck |
|---|---|---|
| 1 | **The founder note — 4 lines.** Who you are · what UIL4B is for · what state it is in · what help you want | The panel cannot ship without them. Everything around it is built |
| 2 | **The `/create/palette` line** | The heading slot is built and waiting. Empty until you fill it |
| 3 | **The `/discover` line** | Its h1 is the bare word "Discover" with nothing under it |
| 4 | **A heading for the homepage export section** | You decided 2026-09-14 it needs its own, because the hero above it already opens with the same five words |
| 5 | **Three nav card lines** — Create, Discover, Learn | They hold an agent's sentence today. The Discover one is also **false**: it advertises Inspiration, which is badged Soon |
| 6 | **Six homepage tool-card lines** | `src/data/toolTree.js`, the `desc` on each group. All six are an agent's. Two overclaim: *"scales that hold up"* says nothing measurable, and *"frame every asset"* is not true of every format |

---

---

## 💳 Turning quarterly on — the one thing that is built and waiting on you

You asked on 2026-09-15 for monthly, quarterly and yearly, with the free trial
on quarterly and yearly only. **All of the code is done and pushed.** One field
in `src/config/planLadder.js` is still `null`, and that is deliberate: flipping
it puts quarterly in front of buyers, and today there is no Stripe price behind
it, so the buy button would fail.

**Checked in your live Stripe account, 2026-09-15: the quarterly price is not
there yet.** We read every price on UIL4B Pro. There are two — monthly and
yearly — and neither is a three-month one. So **step 5 below has definitely not
been done.**

**What we could not check: test mode.** Our Stripe access only reaches your
live account, so if you already made the test-mode price in steps 2 and 3, we
cannot see it. Tell us and we will pick up at step 4.

You chose test mode first. Do these in order.

| # | Do this | Where | Why it is in this order |
|---|---|---|---|
| 1 | Switch Stripe to **Test mode** (the toggle, top right) | Stripe dashboard | Everything below is reversible while this is on |
| 2 | Create a price on the **UIL4B Pro** product: **$18.00 USD**, Recurring, **every 3 months** | Stripe → Products → UIL4B Pro → Add price | **Check the "every 3 months" twice.** If it says "monthly" you have made an $18-a-month price, which is three times what you meant to charge |
| 3 | Set its **lookup key** to `uil4b_pro_quarterly` | same screen, under "Advanced" | This is the name the code looks it up by. A different key means the code cannot find it |
| 4 | Tell me it is done | — | I run a full test-mode checkout on quarterly and on yearly, and confirm the trial is 7 days and the first charge is 3 months out |
| 5 | Repeat steps 2 and 3 in **Live mode** | Stripe dashboard | Only after the test-mode checkout passed |
| 6 | Tell me again, and I flip the one field | — | Quarterly goes on sale |

**What is already safe, and we checked the live site says so.** Until the price
exists, choosing quarterly cannot charge anybody — the server finds no price
and answers "the quarterly price is temporarily unavailable. No payment session
was created." Asked live on 2026-09-15, the site reports quarterly as
unavailable in every currency, which is the right answer.

**The trap this closed.** The code that creates Stripe prices was sending the
recurrence but not the *count*. Stripe reads that as "every month", so a
quarterly price created by the old code would have billed **$18 every month**.
Nothing would have errored; the first you would have known is a customer's
statement. That is fixed, and a test fails if anyone undoes it.

**What the trial is now.** Monthly bills the day you subscribe and the page says
so. Quarterly and yearly each get 7 free days. The sentence the customer reads
and the number Stripe is told are now the same value read from the same table,
so the page cannot promise a trial the server will not honour.

## 🤔 One thing to decide

Not a task and not a sentence — a taste call, and it is yours.

| | The question | The options |
|---|---|---|
| 1 | **The small square icons on the homepage tool cards.** You said the mini tools were bad visual representations. The card sizes now carry that meaning instead, which leaves the 38px pictogram doing nothing | **Delete them** (my recommendation) or **keep them**. Full reasoning under *The homepage tool cards* further down. Nothing breaks either way |

---

## ✅ Done and checked 2026-09-15 — three rows came off this page

Each of these was checked against the real service on 2026-09-15, not taken on
anyone's word.

| Row | What changed | How we know |
|---|---|---|
| **1** | **The deploy block is over, and Vercel stays free.** Nothing to upgrade | Twenty production deploys on 14–15 September, every one of them succeeded, and the newest carries the newest commit. The live page was last rebuilt at 22:35 on 14 September |
| **12** | **Legacy customers are fine. Nothing to back-fill** | Read your live Stripe customers. There are two, both already carry the `firebaseUid` we match accounts by, and there are no subscriptions at all — so no one can lose access |
| **13** | **`www.uil4b.com` works** | It answers 200 OK and its DNS now points at a real Vercel server. Note the direction flipped — see row 13 above |

**Two things this turned up that are worse than they looked**, and both are
still on your list:

- **Row 6 — the Stripe webhook posts to `https://uil4b.com/`**, your homepage,
  not to `/api/stripe-webhook`. It is switched on and subscribed to ten events,
  so it looks healthy in the dashboard, and **not one of those events has ever
  reached our code.** Refunds and disputes are not even in the list.
- **Row 9 — your Customer Portal has never been set up at all.** We asked
  Stripe for its settings and it has none. So this is not "cancelling customers
  get no offer" — **a Pro subscriber has no way to cancel**.

---

## ✅ Answered 2026-09-14 — nothing here needs you again

| | You decided |
|---|---|
| Export formats | **The pages are right.** The design system book and brand guidelines stay Pro; the two docs that said otherwise were corrected |
| Stripe AI promise | **Change Stripe to match the app** — 30/day, 300/month (row 5 above) |
| AI usage wording | **Never mention free plans to users.** The line is *"AI usage is lowered while in Beta; with enough support we'll upgrade plans, API and MCPs to improve the app"* |
| Learn scope | **Widen it** — SEO, Marketing and AI assistants now belong in Learn |
| Muted preview text | **Keep it.** Readable everywhere; hierarchy carried by size and weight on the 19% |
| Condition notices | **Move them into the page flow** so they stop covering the Palette Builder toolbar. Done 2026-09-15 — the offline and sync notices now sit in a strip that reserves its own height, so no toolbar on the site is covered |
| Semantic-colour "buttons" | **Stop making them buttons** — done, they are spans |
| SOON tag | **Grow 8px → 10px** — done |
| Gradient stop handle | **Leave it at 20×20** — dragging is the whole interaction |
| Emoji "Live library connected" pill | **Delete it** — found already fixed; the emoji tab has not shown it while online since #435 |
| Homepage gradient demo | **Re-seed from the brand accent** #0F6FFF — done |
| Chargebacks | **Do not cancel the Stripe subscription.** Access is already revoked |
| June portfolio screenshots | **Archive them** — done, moved to `screenshots/archive-2026-06/` |
| The tools-section line | **Replace** "All the design tools you're constantly searching for, in one unified location." with your new line: *"No more trying to remember the names of the 1 tool websites."* |
| Homepage export section | **Needs its own heading** — the hero above it already opens with the same five words. Yours to write |
| Font Pair page shape | **Two zones** — control rail plus a dominant preview, not four co-equal panels |
| Font Pair suggestions | **Cards preview the pairing**, the scoring reason moves to hover/expand |
| "Read the pairing" heading | **Removed** — done. The h2 stays `sr-only` so the region keeps its name |
| The taxonomy eyebrow | **Remove site-wide** — done on 8 surfaces. The Alpha badge and "Admin Only" state were kept |

---

## Where everything else lives

- **Ideas awaiting your verdict** — [`PROPOSALS.md`](PROPOSALS.md)
- **Engineering work** — `src/data/pipeline.js`
- **Decisions you already made** — [`CHANGELOG.md`](../CHANGELOG.md) and §3 below

Everything below this line is the **detail** behind the rows above: what each
one is, what it costs, and what we already did on our side. You do not need to
read it to do the work.

---

# 1 · Stopped right now — a bill and one command

The deploy block that used to head this section is gone. **Two things are left
here and neither is an engineering problem.**

## 1.1 · ~~Nothing is live~~ — CLEARED. The site deploys again, and you are staying free.

**Nothing to do.** This was the biggest thing on the page for two weeks and it
is finished.

**What we checked, 2026-09-15.** Twenty production deploys went out across 14
and 15 September. Every single one succeeded. The newest one is built from the
newest commit in the repository, and the live page was last rebuilt at 22:35 on
14 September — so what a visitor sees now is genuinely current, not the 2
September build.

**Why it cleared.** The video/image converter's engine is a single 32 MB file
that used to be served from our own site — 91% of everything we deployed.
Hobby includes **10 GB a month** of that traffic and the file got a new name on
every deploy, so every region re-fetched all 32 MB each time. **About 300
visitors was the entire month's allowance, from one file.** That engine now
loads from a free public CDN instead (jsDelivr, pinned to one exact version).
It shipped 2026-09-06 and took the deploy from 35 MB to **5.6 MB**. Once the
old traffic aged out, deploys started working again on their own.

**Your decision, 2026-09-15: Vercel billing stays free.** That is the right
call and nothing on this page needs you to change it. What free constrains, and
the one number that still creeps, is in *What free costs you* near the top.

**The one thing we still cannot see** is your actual Vercel usage page. If a
deploy ever fails again, that is the first place to look — and tell us, because
the cause will almost certainly be ours to fix, not yours to pay for.

## 1.2 · GitHub is running no tests at all. Pay the bill.

**Do.** GitHub → Settings → Billing → clear the failed payment, or raise the
spending limit.

**Time.** A few minutes on one page.

**Why.** GitHub's own message, word for word: *"The job was not started because
recent account payments have failed or your spending limit needs to be
increased. Please check the 'Billing & plans' section in your settings."* Every
automated test run in this repository has died in 1–3 seconds since 2026-09-04 —
on branches **and on `main`**.

**Re-checked 2026-09-15 and it is still broken.** We read the last ten runs.
All ten failed, the most recent at 22:23 on 14 September, and it died in **two
seconds** carrying that exact message. **This is now the oldest unfixed thing
on the page.**

**The trap, and it matters.** GitHub now shows our pull requests as
**UNSTABLE**. That word looks like "this code is broken". It is not. It means
**the tests never ran**. Anyone judging our work by the badge — you, a
contractor, an agent — reads the wrong conclusion about every open change at
once.

**If you do nothing.** Nothing self-heals; a billing block does not expire. Every
new change keeps looking broken, and the only proof anything works is an agent
running the tests on their own machine and pasting the output into the pull
request.

## 1.3 · Four approved changes are written and not switched on. One command applies all four.

**Do.** Open a terminal in this repository and run:

```
npm run apply:gated
```

It tells you what it is about to do and waits for you to type **y**. Nothing
else — you do not need to read any of the code.

**Time.** About two minutes, most of it the command running its own checks.

**Why.** You approved these changes. We could not make them. `firestore.rules`,
`api/verify-admin.js` and `src/contexts/AuthContext.jsx` are refused by the
**Claude Code auto-mode classifier** — a guardrail inside the tool itself,
*separate from and stricter than* `docs/reference/human-validation-zones.md`.
That doc says "ask Dylan first"; the classifier refuses **after** you have said
yes. It blocked the agent and it blocked the coordinator, so your approval alone
never lifted it.

The command applies them in the order that composes, refuses to touch anything
if any one of them no longer fits, skips whatever is already in, and then runs
the three suites so you find out here rather than in production.

**The four, and what each one gives you:**

| | What it changes | What you get |
|---|---|---|
| 1 | `firestore.rules` + `src/utils/projectSync.js` | **Project sync stops dying.** Every saved project gets its own record instead of all of them sharing one, so sync no longer stops working forever — silently — once you have about thirty projects with logos in them. |
| 2 | `firestore.rules` + `api/verify-admin.js` | **You can appoint a moderator, and they can clear the queues.** The rules start honouring a `moderator` role on feedback, community prompts and community submissions, and the sign-in handshake grants that role from a roster only you can write to. Accounts, billing and analytics are untouched. |
| 3 | `firestore.rules` | **Strangers stop being able to write to your feedback queue.** It was open to anyone on the internet. Every signed-in write is also now held to the shape and size the site actually sends, instead of anything up to 1 MB. |
| 4 | `src/contexts/AuthContext.jsx` + `src/contexts/SubscriptionContext.jsx` | **The homepage paints sooner.** Measured: 360 ms faster to first paint, 624 ms faster to the headline, and 21.8% fewer bytes in the first request. |

**The moderator role is now whole, and this used to say it was not.** Until
2026-09-10 this item told you that `api/verify-admin.js` — the piece that
*mints* the moderator role onto a person’s account — was not applied by this
command, because its change was written as prose with a partial diff rather
than as something a machine can apply. The change was not missing; it was
written, reviewed and tested weeks ago and left uncommitted on a branch nobody
picked back up. It is now a real diff, generated against the file as it stands
today, and this command applies it. **After you run this and deploy, open
Admin → Users: every person has a Moderator column, and you can appoint or
remove one from their own row.** Everything in the table is complete.

**What the command does, step by step.**

1. Prints the four and waits for **y**. `npm run apply:gated -- --dry-run` shows
   you every line it would change and touches nothing.
2. Refuses to run at all if those files have unsaved edits it did not make, and
   prints exactly what it would have overwritten.
3. Skips anything already applied. Running it twice is safe: the second run
   reports all four as already in and changes nothing.
4. Runs `npm run test:rules` (the Firestore emulator), then
   `npm run test:unit`, then the deferred production build. It stops at the
   first failure and tells you which change caused it.

   **The emulator needs Java 21 and this machine’s default `java` is 8.**
   The command checks the version first and looks for a Java 21 elsewhere on
   the machine; if it cannot find one it stops and prints the path it
   looked in, rather than failing with a Java stack trace. The four changes
   are already written to your files by then, so the undo below is what you
   want if that happens — tell us and we will point it at your JDK.
5. **Commits nothing and pushes nothing.** It prints the one command that undoes
   everything: `git checkout -- api/verify-admin.js firestore.rules
   src/contexts/AuthContext.jsx src/contexts/SubscriptionContext.jsx
   src/utils/projectSync.js`.

**Two steps afterwards that only you can do.** First, the new rules are then in
the repository and not in front of your users: publish them from the Firebase
console, or run `firebase deploy --only firestore:rules`. Second, commit and
deploy the site — `api/verify-admin.js` is a serverless function, so until it
is deployed the moderator role cannot be granted from a file that only exists
on your laptop. **That second step is no longer blocked** — deploys work again,
so pushing the change is enough to ship it.

**If it stops and says a change no longer fits.** Tell us. It means the file
moved after the change was reviewed, and it needs an engineer to regenerate the
diff. Do not hand-edit around it.

**If you do nothing.** All four stay written and switched off. Your feedback
queue stays open to anyone on the internet, project sync stays one bad day away
from stopping silently, the homepage stays 624 ms slower than it needs to be,
and **you remain the only person on earth who can approve a community submission
or clear a feedback report** — the bottleneck the moderator role exists to
remove, and the reason you asked for it.

---

### The diffs, for the reader who wants to see them

You do not need this section to run the command. It is here because these are
security rules and somebody should always be able to read what changed without
running anything.

Every one of these is committed in this repository, and the command applies
these exact files rather than a retyped copy of them:

| | Where the diff lives | Reviewed in |
|---|---|---|
| 1 | `docs/design/per-project-sync-rules.patch` | the per-project sync design |
| 2 | `docs/design/moderator-role-rules.patch` + `docs/design/moderator-verify-admin.patch` | [#390](https://github.com/VASARI-STUDIO/UIL4B/pull/390), the second half recovered and corrected in this PR |
| 3 | `tests/rules/pending-firestore-rules.mjs` | [#418](https://github.com/VASARI-STUDIO/UIL4B/pull/418) |
| 4 | `docs/design/firebase-deferral-gated.patch` | [#427](https://github.com/VASARI-STUDIO/UIL4B/pull/427) |

**2 · The moderator role**, the heart of it — a reviewer is you, or somebody you
have put on the roster, and the three review collections start accepting them:

```diff
+    function isReviewer() {
+      return request.auth != null
+        && (request.auth.token.admin == true
+            || request.auth.token.moderator == true);
+    }
+
     match /feedback/{feedbackId} {
       allow create: if true;
-      allow read, update, delete: if request.auth != null
-        && request.auth.token.admin == true;
+      allow read, update, delete: if isReviewer();
     }

     match /community-prompts/{promptId} {
-      allow update, delete: if request.auth != null
-        && request.auth.token.admin == true;
+      allow update, delete: if isReviewer();
     }

     match /community-submissions/{submissionId} {
-      function isAdmin() { return isSignedIn() && request.auth.token.admin == true; }
-      allow update: if isAdmin()
+      allow update: if isReviewer()
         || (isOwner() && request.resource.data.status == 'withdrawn'
             && request.resource.data.authorUid == resource.data.authorUid);
-      allow delete: if isAdmin() || isOwner();
+      allow delete: if isReviewer() || isOwner();
     }
```

`users/{uid}` is not touched — it stays owner-only and still refuses every
billing field. `analytics-daily` is deliberately not widened: reviewing
submissions is not a reason to hand a volunteer your site-wide usage numbers.

**2b · The half that grants it.** `api/verify-admin.js` already proves who you
are from a verified email against a server-side allowlist. It now also keeps a
`moderator` claim in step with a roster no browser can read, and lets you — and
only you — put somebody on it or take them off. A moderator cannot appoint
another moderator; nothing else about the route changes.

**3 · The feedback queue closed**, which is the one on this page a stranger can
exploit today:

```diff
     match /feedback/{feedbackId} {
-      allow create: if true;
+      allow create: if false;
```

Nothing in the site has ever written there — every report goes through
`/api/support`, which writes as the server and bypasses these rules entirely. So
that line never guarded a real write; it only granted one, to anyone. Reading,
updating and deleting are unchanged, so the admin queue works exactly as before.
The same change bounds what a signed-in account may write to
`community-prompts`, `community-submissions` and `analytics-daily` — an exact
list of allowed fields, a length cap on every string, and a document id that has
to be a date. The full text is in `tests/rules/pending-firestore-rules.mjs`,
which is also what the emulator tests run against.

**1 · Per-project sync** adds one rule inside your own user record, granting
exactly what the record beside it already grants:

```diff
       match /sync/{docId} {
         allow read, write: if isOwner();
       }
+      match /projects/{projectId} {
+        allow read, write: if isOwner();
+      }
```

**4 · The homepage deferral** is 373 lines of JavaScript and is not reproduced
here; it is `docs/design/firebase-deferral-gated.patch`, and it changes no rule
and no permission. All it does is stop two files fetching the sign-in code
before the page has drawn anything.
---

# 2 · Still needs you

**Everything that was here has been answered.** On 2026-09-14 the founder took
all six decisions this section held; they are in the *Answered 2026-09-14* table
at the top of this page, and the reasoning behind each is in `PROPOSALS.md`
where it had a proposal number.

**What is left is not a decision — it is writing**, and it is hoisted to *Only
you can write these* at the top of this page so it is not buried behind answered
questions. Five sentences, none of which an agent should produce:

- the founder note's four lines
- the `/create/palette` line
- the `/discover` line
- a heading for the homepage export section
- the three nav card lines (Create, Discover, Learn)

The Discover nav card is the one with a cost attached: it advertises
Inspiration, which is badged Soon, so it currently promises something nobody can
open.

### The homepage tool cards, measured 2026-09-14 — item 1 fixed 2026-09-15

Founder: *"the mini tools on the homepage are bad visual representations, and the
text areas besides them look AI generated."* Rendered at 1280, three things were
true and only one of them is copy:

1. ~~**Six cards of identical weight for six unequal things.**~~ **Done
   2026-09-15.** The grid is six columns now and the span is counted, not
   chosen: half a row for a family with three or more live tools, a third for
   one with a pair, and the whole row — as a low strip with no card fill — for
   UI Component Builder, which has nothing live at all. Add a live tool to a
   family and its card widens on the next build. The dead space went with it:
   every card now ends where its content ends, instead of being stretched to the
   height of the tallest card in its row.
2. **The glyphs are category pictograms, not the product.** Still true, and
   **this one needs a word from you**, because the remedy the audit suggested
   does not fit. The mega menu was fixed by showing a page of a real export —
   it has a panel to put one in. These cards have a 38px square, which will not
   hold a screenshot of anything. So the real choice is:
   - **Delete the squares** (what I would do). The card's size and its list of
     tools now say what it is, so the pictogram is decoration that stopped doing
     work. Subtracting is also what you asked for on the favicon and the mega
     menu. Cost: the per-category colour on this section goes with it.
   - **Keep them.** They help scanning, and nobody but you has called them out.
   - *Cost of leaving it undecided:* nothing breaks. The squares stay where
     they are until you pick.
3. **The six descriptions are agent-written**, which is row 6 above. Unchanged —
   they are yours to write and nothing here touched them.

**Checked and NOT a defect**, so it is not re-raised: the Soon badges are
honest. AI Studio's group badge is off and the two Soon labels inside it belong
to Image Prompt and Landing-Page Prompt, which genuinely are unbuilt. Alt Text
and Brand Starter are live and unbadged.


---

# 3 · Decided — recorded so nobody asks you twice

**Twelve decisions you have already made** — ten on 2026-09-05, two since.
They are here so that no agent, and no future version of this file, asks you
again. The full record is in [`CHANGELOG.md`](../CHANGELOG.md).

## 3.1 · The word "tokens" → we say **"Styles"**

Your pick of the three options offered. *(We had recommended "Foundations"; you
chose "Styles". Recorded as your call, not ours.)*

**What it means.** Every sales, navigation and tool heading that said *tokens*
now says *Styles*. The word **token survives only past the export boundary** —
the export panel, the generated file names, the code blocks, the `@uil4b/tokens`
package. That is the one place it is correct, expected, and searched for by the
developer consuming it; renaming it there would break customers' code.

**Status. Shipped**, in two parts — #394 took the homepage and #378 the rest.
Nothing is outstanding and nothing is waiting on you.

## 3.2 · The `pepsi` palette → **rename it to its era**

We could not verify it and could not ever verify it — every PepsiCo host blocks
automated access, and their own asset library only carries the corporate mark,
not the cola brand. Renaming keeps the palette and stops us claiming it is
today's brand.

## 3.3 · The `google` palette → **make it free**

*(We had recommended leaving it paid; you chose free, knowing the free tier
already had six palettes.)*


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

**Note the contrast with §2.2, and it is not a contradiction.** Educational
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

**Blocked on §2.2** — your four sentences.

## 3.11 · The hero shape → **retired the exploration; the V2 hero decides**

*(2026-09-07. Your words: “Retire it, V2 hero decides.”)*

This page asked you three times to compare hero shapes A, B and C by opening
`?hero=a`, `?hero=b` or `?hero=c`. You ended it instead. **The three sketches
and the switch that showed them are deleted from the code**, so that question
no longer has anything to look at — and this file went on asking it for three
days after you had answered. That is what this review found and removed.

## 3.12 · The hero headline → **ship it**

*(2026-09-10.)* It reads:

> **Build and export UI and brand design kits, in one unified location.**

**Every word of it is yours.** It was assembled, not written — the first half
is the opening of one sentence you wrote, the marked half is the end of
another, and the comma between them is punctuation. You chose that over an
agent draft, read it beside the two lines it was cut from, and said ship it.

A test now pins the exact sentence, so it cannot be reworded by an agent
tidying punctuation. **One thing it leaves open:** the export section further
down the same page is headed by the full version of the first line. See §2.2.

---

# 4 · Console and credential work

Still open, all of it needs your dashboard access. Ordered by what breaks
without it.

**Every item here has a code side and a dashboard side.** The code side is
stated on each one and every code side below is **done** — there is no item
on this list waiting on us.

**Re-checked against the live services on 2026-09-15.** We can now read your
Stripe account directly, so the Stripe items below say what is actually there
rather than what we assumed. One of them (4.7) closed as a result, one got
better (4.1 is no longer a legal risk) and two got worse (4.2 and 4.6).
Firebase and Google Cloud we still cannot see.

## 4.1 · P1 — Stripe is still on the old prices. Nobody is being misled.

**You decided on 2026-09-15: the prices are $7, $18 and $48.** So this is a
task now, not a question. Here is what we read in your live Stripe account on
the same day, and what has to change.

| Plan | Stripe charges today | You want | Action |
|---|---|---|---|
| Monthly | **$4.99** | **$7** | Add a new $7 price, make it the default |
| Quarterly | *does not exist* | **$18** | Create it — every 3 months, not monthly |
| Yearly | **$39.99** | **$48** | Add a new $48 price, make it the default |

**Nobody is being misled while you do this.** The site always shows the price
Stripe will actually charge, not the one written in the code, so today it says
$4.99 and $39.99 and that is the truth. The moment you add the new prices the
site says $7 and $48 by itself. There is nothing to change in the code.

**Two things to know before you click.**

**Your existing customers do not move.** You have two live subscriptions.
Adding a new price never changes an existing one — they keep paying $4.99 until
you migrate them, which is a separate decision you do not have to make today.

**You have no yearly subscribers at all.** So the $39.99 → $48 rise, which is
the big one, costs you nothing and annoys nobody. It will never be cheaper to
do than right now.

**Do it in this order**

| # | Step | Why this order |
|---|---|---|
| 1 | Switch Stripe to **Test mode** | Everything below is reversible while this is on |
| 2 | On **UIL4B Pro**, add a price: **$7.00 USD, recurring, monthly** | |
| 3 | Add a price: **$18.00 USD, recurring, every 3 months** | **Check "every 3 months" twice.** If it says monthly you have made an $18-a-month price — three times the intended charge |
| 4 | Add a price: **$48.00 USD, recurring, yearly** | |
| 5 | Give the quarterly one the lookup key `uil4b_pro_quarterly` | It is the name the code finds it by |
| 6 | Tell me — I run a full test-mode checkout on all three | |
| 7 | Repeat 2–5 in **Live mode** | Only after the test-mode checkout passed |
| 8 | Tell me again, and I switch quarterly on in the code | One field |

**Time.** 20–30 minutes.

**Code side: done.** Every amount on the site comes from Stripe when Stripe has
one, and from `src/config/planLadder.js` only as a fallback.

**If you do nothing.** You keep charging the old prices. That is a revenue
decision now, not a risk.

**Quarterly is separate** and it is the section near the top of this page.

## 4.2 · P0 — The Stripe webhook is pointed at your homepage

**We read your live webhook on 2026-09-15 and found something worse than this
item used to say.** The webhook exists, it is switched on, and it is subscribed
to ten events — so in the dashboard it looks completely healthy.

**It is pointed at `https://uil4b.com/`.** That is your homepage. The code that
handles these events lives at `/api/stripe-webhook`. **So every event Stripe
has ever sent has been delivered to a web page that ignores it.** Nothing
errors. Nothing is retried. It just goes nowhere.

**Do. Two fixes on one screen** — Stripe → Developers → Webhooks → open the
endpoint called *UI L4B App*:

1. **Change the URL** to `https://uil4b.com/api/stripe-webhook`. This is the
   important one.
2. **Make the event list exactly these twelve.** Read out of the `switch` in
   `api/stripe-webhook.js` on 2026-09-15 — these are every event that has a
   handler, and anything else you subscribe to is delivered and ignored. Tick
   them against what is already there rather than counting:

   ```
   checkout.session.completed
   checkout.session.async_payment_succeeded
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   customer.subscription.trial_will_end
   invoice.paid
   invoice.payment_failed
   charge.refunded
   charge.dispute.created
   charge.dispute.funds_withdrawn
   charge.dispute.closed
   ```

   The last four are the ones that decide whether a refund or a chargeback ever
   reaches us. `customer.subscription.trial_will_end` is the one that matters
   once quarterly and yearly start granting seven free days.

Then send a test event and confirm it comes back **HTTP 200**.

**Time.** 20 minutes.

**Code side: done.** Every event listed has a handler in
`api/stripe-webhook.js`, and they have never been reached.

**If you do nothing.** A customer can pay, cancel, be refunded, or charge back,
and we never find out. Do not create a lifetime price — a one-off payment we
never hear about is a customer who paid and got nothing.

## 4.3 · P0 — Firebase Storage is not switched on

**Do.** Firebase Console → Storage → enable it, then publish `storage.rules`.
Check that a signed-in user can write only under `community-media/{uid}/`.

**Time.** 10 minutes.

**Why.** The community architecture you approved needs it. Nothing that uploads a
file can work until it exists — including the community gallery in §3.8.

**Code side: done.** `storage.rules` is written and the emulator suite covers
it; it just has nowhere to be published to until Storage exists.

**Checked 2026-09-15, and this one is not certain.** We asked both of the
addresses your storage bucket would live at and got "not found" from each,
which is what an un-created bucket answers. A bucket that exists but refuses
strangers answers differently. **So this is strong evidence Storage is still
off, not proof** — only the Firebase console can settle it, and we cannot open
it.

**If you do nothing.** Community media stays unbuildable.

## 4.4 · P1 — Admin → Feedback: confirm it now loads

**Do.** Open Admin → Feedback and read the line above the list.

**Time.** 2 minutes.

**Why.** The panel used to render "No submissions yet" whether the queue was
empty **or** the read had been refused — the two looked identical. It now
refreshes your token and says which it is.

**What you should see.** A count line: `N from the server · M from this
browser`. If instead you see a red **"The server's copy could not be read"**,
copy the reason underneath it and send it to us — that is a real fault and we
will fix it.

**Code side: done** (#390).

**If you do nothing.** Feedback submitted through the site may still be
unreviewed, and you will not know which.

## 4.5 · ~~You are paying OpenRouter for a tool nobody can open~~ — ANSWERED, and the premise was wrong

**ANSWERED 2026-09-14, and it closes on a fact this page had wrong.** The item
asked whether to keep paying for OpenRouter. The founder's answer: *"im not
paying for it im on the free tier."* There was never a subscription to cancel,
so option B was a saving that did not exist and this was never a P1.

**Nothing to do.** The AI Image Prompt Generator stays behind its Soon badge
until the route is wired, which is engineering work, not yours. When it opens,
the two-minute production check moves to §6.

**A STANDING RULE CAME OUT OF THIS, and it applies to every surface that
mentions AI limits.** Verbatim, 2026-09-14:

> *"when telling about AI usage dont tell them we use free plans that is a
> deterent just tell them AI usage is lowered while in Beta, if there is enough
> support for this then we will upgrade plans api and MCPs to improve the app"*

So: **never name a free tier to a user.** The sanctioned line is that AI usage
is lowered while in Beta, and that enough support means upgrading the plans,
APIs and MCPs. This binds `/plans`, the AI tool surfaces, any limit or quota
message, and the Stripe product description.

### The check that is still owed, once the route opens

**This half of the old item is NOT closed, and it is not about money.** It was
removed once by accident while answering the billing half; the guard in
`tests/unit/ai-provider-path.test.js` put it back, which is what that guard is
for.

**Do, when `/create/ai-prompt` is reachable.** Run one real generation, then
open Admin → Overview → AI and read the **`provider`** field on the response.

- `provider: "openrouter"` — **PASS.** The request genuinely routed through
  OpenRouter.
- `provider: "gemini"` — **FAIL, and this is the failure worth knowing about.**
  It means OpenRouter was configured, was tried, and quietly fell over to the
  Gemini fallback. The tool still answered, so nothing on screen looks broken.

**Why the wording matters.** This item used to say *"confirm the diagnostic now
reports OpenRouter as available"*. It cannot: availability reports presence of a
key, which was already confirmed on 2026-08-07. Following that instruction would
have recorded a PASS for a check that never ran — which is the silent failover
itself, written into the runbook. **Presence is not proof of path.** The
`provider` field on a real response is the only thing that closes this.

## 4.6 · P0 — The Stripe Customer Portal has never been set up

**Checked 2026-09-15: your Customer Portal has no settings at all.** We asked
Stripe for them and it returned nothing — not a portal without a retention
offer, a portal that was never turned on. **So a Pro subscriber has no way to
cancel**, which is why "Cancel any time" had to come off `/plans`.

This was filed as P1 "no retention offer". It is P0 and it is bigger than that.

**Do.** Two halves, and the item is not finished without both.

1. Stripe → Settings → Customer Portal. Create a 50%-for-3-months coupon,
   enable cancellation, and select the retention offer.
2. Vercel → Environment Variables → set **`STRIPE_RETENTION_COUPON`** to that
   coupon’s id, and redeploy.

**Time.** 15 minutes, plus the redeploy.

**Why.** `api/create-portal.js` asks Stripe for its cancellation flow and
attaches the retention offer **only when that variable is set** — the name
`RETAIN50` appears in our notes but nowhere in the code, so the coupon has to
be named to us, not just created.

**If you do nothing — and this is worse than it used to say here.** It is not
that a cancelling customer is offered nothing. **A Pro subscriber has no way
to cancel at all**, because the portal has no cancellation flow to show them.
That is why “Cancel any time” had to be taken off `/plans`: we could not
honour it. Everything on the code side is written and defensive already.

## 4.7 · ~~P1 — Check the legacy customers can still be matched to accounts~~ — DONE, checked 2026-09-15

**Nothing to do.** We read your live Stripe customers. There are **two**, and
both already carry the `firebaseUid` we match accounts by. Nothing is missing,
so there is nothing to back-fill and nothing to investigate.

**There are also no subscriptions at all** — not active, not cancelled, none.
So nobody can lose Pro access at renewal, because nobody is renewing.

**Worth re-running this** once you genuinely have paying customers. It is a
two-minute read and we can do it for you.

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

**Checked 2026-09-15 — half a step exists, and it is the wrong half.** Your
domain has an SPF record, but it only names **Titan**, your mailbox provider:
`v=spf1 include:spf.titan.email ~all`. That is what lets you *receive* mail at
`admin@uil4b.com`. There is **no DKIM record at all** — we looked for Resend's
and for Titan's and neither exists. So nothing has been done toward letting the
product *send*.

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

**Code side: n/a** — this one is entirely a console setting.

**If you do nothing.** The key is in the browser bundle and anyone can spend our
quota with it.

## 4.12 · P1 — Your Stripe product still promises 1,000 AI actions a day

**Confirmed still wrong on 2026-09-15.** We read the live product description
and it says, word for word: *"1,000 AI generations per day, higher-quality
models, cross-device project sync, and advanced design-system exports."*

**Do.** One of two, and we recommend the first:

- **Recommended — run the tool you already have.** Sign in as admin, open the
  Stripe setup panel and save. The code now rewrites the product description to
  match what the server actually allows, so saving once fixes it and keeps
  fixing it.
- **Or edit it by hand.** Stripe → Products → **UIL4B Pro** → edit
  **Description**. Paste exactly:
  *"30 AI actions a day and 300 a month, unlimited project and custom-icon
  saves, advanced colour controls, and the Pro export documents — the design
  system book (PDF) and the brand guidelines presentation."*

**Time.** 2 minutes either way.

**Code side: done** (#417) **— and this is the whole of what is left for you.**
The sentence is no longer typed anywhere. `api/_lib/plans.js` derives it from
the same limits the server enforces, a test fails the build if the two drift,
and the setup route now *updates* a product whose description is stale instead
of only ever creating one. **But nothing runs that update until somebody
triggers it**, because Stripe products are not rewritten by a deploy. Saving
the Stripe setup panel once is the trigger.

**Why.** The description said *"1,000 AI actions per day … and full design JSON
export."* The server allows **30** a day, and the JSON export has never been
built — it is a greyed-out "Soon" button. Stripe prints this sentence on the
checkout page, on the emailed receipt and on the invoice, so it is the only
version of the promise a customer reads **with their card already charged**. The
code side is fixed and guarded by a test; the live product in your Stripe
account keeps the old sentence until someone saves over it, because Stripe
products are not rewritten by a deploy.

**If you do nothing.** Every receipt and invoice you send keeps advertising 33×
the AI allowance the product will actually give, and a file it cannot produce.
That is the strongest chargeback and refund argument a customer could have, and
it is in writing, from us.

---

# 5 · Already confirmed — do not re-open

- **`firestore.rules` published.** You confirmed this. The publication blocker is
  **closed**.
- **Production OpenRouter key set and redeployed.** Your words to the Director,
  2026-08-07: *"openrouter key is updated and redeployed"*. This records the
  **key**, not that the route works — that is §4.5 above and it is still open.

- **The hero headline.** Approved 2026-09-10 and pinned by a test — §3.12.
- **The hero shape exploration.** Retired 2026-09-07 — §3.11. The `?hero=`
  sketches are deleted; there is nothing to go back and look at.
- **The site deploys again, and it is current.** Twenty successful production
  deploys on 14–15 September; the newest is the newest commit. Checked
  2026-09-15 — §1.1.
- **`www.uil4b.com` works.** Answers 200 OK; DNS points at a real Vercel
  server. Checked 2026-09-15 — row 13.
- **Legacy Stripe customers are correctly matched.** Both of them. Checked
  2026-09-15 — §4.7.

That is the whole list of confirmations. It does **not** cover Storage, the
admin flag, analytics accuracy, a working AI generation, or any live payment or
login flow. All of those are open above.

**One item moved here on 2026-09-15, and only because we could read it
ourselves.** §4.7, the legacy-customer check, closed on a direct read of your
live Stripe account — two customers, both correctly matched. That is evidence,
not a tick on somebody's word, which is the distinction that matters: ticking
one off on your word is how §4.4 came to say something false for weeks.

**Everything else in §4 stays open.** The Firebase and Google Cloud items in
particular we still cannot see at all.

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
`STRIPE_WEBHOOK_SECRET`, the price ids, `MAIL_FROM` (see below), and the
optional retention/support variables.

### `MAIL_FROM` — set this the day uil4b.com can send

Every email the product sends currently goes out as
`UIL4B <onboarding@resend.dev>`. That is Resend's sandbox address: it is not
your domain, and **Resend will only deliver it to your own inbox**. It is fine
for the alerts that come to you, and useless for anything sent to a customer.

**When the sending domain is verified** (row 8 — SPF, DKIM and a return path on
uil4b.com), add this in **Vercel → Settings → Environment Variables**:

```
MAIL_FROM = UIL4B <admin@uil4b.com>
```

Then redeploy. That one field switches every outbound message. No code change.

**Do not set it before the domain is verified.** Resend rejects a sender it
cannot verify, so the mail would simply vanish — and the notifications that
reach you today would stop.

**Replies already work.** Every message the product sends now carries
`reply-to: admin@uil4b.com`, which needs no verified domain. Hitting reply on a
notification reaches the real mailbox today.

**How to check which one is live:** Admin → Overview → AI. The panel names the
current sender and says plainly whether it is the sandbox or a verified
uil4b.com address.

**Never paste a secret value into this repository.**
