# UIL4B — Owner actions

**This is your to-do list.** Everything on it needs your login, your card, or
your decision. No agent can do any of it.

Every item says the same four things: **Do** · **Time** · **Why** · **If you do
nothing**. Nothing else. If an item needs more explanation than that, the
explanation is in an engineering doc and this page links to it.

Engineering work is not here — it is in `src/data/pipeline.js`. Ideas waiting on
your verdict are in [`PROPOSALS.md`](PROPOSALS.md). Decisions you have already
made are in [`CHANGELOG.md`](../CHANGELOG.md).

_Last reviewed: 2026-09-06 (documentation review — every item re-checked against
the code, two rewritten, one found impossible)._

**Engineering is stopped on five of these.** The queue records these as waiting
on you and nothing can move on them: the deploy block (§1.1), the GitHub bill
(§1.2), **four approved changes waiting on one command (§1.3)**, the Stripe
retention setup (§4.6), and a verified sending domain (§4.10). A live Stripe
checkout test (§6) also needs you but blocks nothing today.

**One item changed shape today and you should know why.** §4.5 asked you to open
the AI Image Prompt Generator and generate a prompt. **You cannot** — that tool
is not reachable by anyone, so the check was impossible. It is rewritten below
as a decision instead of a task, and it is the only place in this file where you
may be paying for something no visitor can use.

**Are we ready to release?** [`RELEASE-READINESS.md`](RELEASE-READINESS.md) —
one page, what is done, what is on you, what is on someone else.

---

# 1 · Stopped right now — a deploy block, a bill and one command

These three are not engineering problems and no amount of waiting fixes any of
them. **They are in order of how much each one unblocks.**

## 1.1 · Nothing is live. Vercel has not deployed since 2 September.

**Do.** Vercel → your team → **Usage**. Look at two numbers: **Fast Origin
Transfer** and deployments. If Fast Origin Transfer is at or near its limit,
either upgrade off Hobby or wait for the monthly reset. Tell us which you chose.

**Time.** A few minutes to upgrade; up to a month if you wait for the reset.

**Why.** This is the single biggest thing on the page. **Every change merged
since 2 September is sitting on `main` and has never reached uil4b.com** — well
over a hundred pull requests now, and it grows every day. Vercel first answered
*"Deployment rate limited — retry in 24 hours"*, and that message on its own
suggested waiting would fix it. Waiting has not fixed it.

**The cause we found, in plain terms.** The video/image converter's engine is a
single 32 MB file, and it was being served from our own site. It is 91% of
everything we deploy. Vercel's Hobby plan includes **10 GB a month** of that kind
of traffic, and — because the file gets a new name on every deploy — every
region has to fetch all 32 MB again after each one. **About 300 visitors is the
entire month's allowance, from one file.**

**This half is ours, and it is nearly done.** We are moving that engine to a free
public CDN (jsDelivr, pinned to one exact version), which takes 91% of the weight
off your bill permanently. It is in flight on the `perf/ffmpeg-core-off-origin`
branch and is not waiting on you.

**So your part is only the dashboard.** Check the Usage page and decide upgrade
versus wait. **We have not seen your Vercel usage numbers — only you can.**

**If you do nothing.** The live site keeps serving the 2 September build. Every
fix in the changelog since then is invisible to real visitors, so none of it
counts yet — and our fix, when it merges, cannot deploy either.

## 1.2 · GitHub is running no tests at all. Pay the bill.

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

The old version of this item asked you to paste a permissions block into
`.claude/settings.json` and hope. That was never verified to work, and it left
four separate diffs for you to find in four pull requests and paste by hand into
two files — in an order nobody had written down, where the wrong order silently
produces a rules file that does not compile. **This command is that job, done
properly.** It applies them in the order that composes, refuses to touch
anything if any one of them no longer fits, skips whatever is already in, and
then runs the three suites so you find out here rather than in production.

**The four, and what each one gives you:**

| | What it changes | What you get |
|---|---|---|
| 1 | `firestore.rules` + `src/utils/projectSync.js` | **Project sync stops dying.** Every saved project gets its own record instead of all of them sharing one, so sync no longer stops working forever — silently — once you have about thirty projects with logos in them. |
| 2 | `firestore.rules` | **A moderator can clear the queues.** The rules start honouring a `moderator` role on feedback, community prompts and community submissions. Accounts, billing and analytics are untouched. |
| 3 | `firestore.rules` | **Strangers stop being able to write to your feedback queue.** It was open to anyone on the internet. Every signed-in write is also now held to the shape and size the site actually sends, instead of anything up to 1 MB. |
| 4 | `src/contexts/AuthContext.jsx` + `src/contexts/SubscriptionContext.jsx` | **The homepage paints sooner.** Measured: 360 ms faster to first paint, 624 ms faster to the headline, and 21.8% fewer bytes in the first request. |

**One half of the moderator role is NOT in this command, and you should know
which.** `api/verify-admin.js` is the piece that *mints* the moderator role onto
a person's account. Its change was written as prose with a partial diff rather
than as something a machine can apply, so applying it would mean shipping a
version of a security route that no review has seen. The command says so on
every run. **After you run this, the rules will honour a moderator; appointing
one still needs that route, and that is a separate job.** Everything else in the
table is complete.

**What the command does, step by step.**

1. Prints the four and waits for **y**. `npm run apply:gated -- --dry-run` shows
   you every line it would change and touches nothing.
2. Refuses to run at all if those files have unsaved edits it did not make, and
   prints exactly what it would have overwritten.
3. Skips anything already applied. Running it twice is safe: the second run
   reports all four as already in and changes nothing.
4. Runs `npm run test:rules` (the Firestore emulator — it needs Java 21, and the
   command finds one for you rather than failing with a Java error), then
   `npm run test:unit`, then the deferred production build. It stops at the
   first failure and tells you which change caused it.
5. **Commits nothing and pushes nothing.** It prints the one command that undoes
   everything: `git checkout -- firestore.rules src/contexts/AuthContext.jsx
   src/contexts/SubscriptionContext.jsx src/utils/projectSync.js`.

**One step afterwards that only you can do.** The new rules are then in the
repository, not in front of your users. Publish them from the Firebase console,
or run `firebase deploy --only firestore:rules`.

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
| 2 | `docs/design/moderator-role-rules.patch` | [#390](https://github.com/VASARI-STUDIO/UIL4B/pull/390) |
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

**Related, and it needs no decision from you:** the three parked homepage pull
requests are now closed out. **#269 and #270 have both been salvaged** — #397 and
#401 took everything in them that still worked, and found that most of it had
already been fixed elsewhere. **#264 cannot be rebased** (a file it edits no
longer exists; its good parts are re-filed as separate jobs). The only piece of
#270 still held back is its specimen band, and that one *is* waiting on your
shape pick above.

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

## 4.4 · P1 — Admin → Feedback: confirm it now loads

**Do.** Open Admin → Feedback and read the line above the list.

**Time.** 2 minutes.

**Why — this item has changed, and the old version of it was wrong.** It used to
say "no code anywhere sets that flag". That stopped being true in #241:
`api/verify-admin.js` mints `admin` from your verified email. The real fault was
narrower and quieter — nothing in the browser ever *refreshed* your token after
the flag was minted, so your session went on using a token that did not carry
it, and the panel absorbed the refusal in an empty `catch` and rendered **"No
submissions yet"**. A refused read and an empty inbox looked identical.

Both halves shipped in #390. The panel now forces the token refresh, and it says
which it is: either `N from the server · M from this browser`, or a red **"The
server's copy could not be read"** with the actual reason.

So this is no longer a decision — it is a two-minute confirmation.

**What you should see.** The count line. If you instead see the red box, copy the
reason underneath it and send it to us; that is a real fault and we will fix it.

**If you do nothing.** Feedback submitted through the site may still be
unreviewed, and you will not know which.

## 4.5 · P1 — You are paying OpenRouter for a tool nobody can open. Keep it or stop it?

**The question.** **A** — we make the AI Image Prompt Generator reachable, then
you run the two-minute check. **B** — you cancel or pause OpenRouter until we do.

**We recommend A**, because the tool is written and only the last wire is
missing. But B costs you nothing to choose and saves the subscription.

**This item used to be a task and it was impossible.** It said: sign in, open the
AI Image Prompt Generator, generate one prompt, read the badge. **You cannot open
that tool.** `/create/ai-prompt` is badged *Soon* and shows the "still in the
workshop" page. The page component exists but no route reaches it, so there is no
button anywhere on the site that runs it.

**Why that matters more than a broken to-do.** OpenRouter is used by **exactly
one thing** — the prompt generator. The Alt Text tool, which *is* live, runs on
Gemini. So **no visitor to uil4b.com can cause an OpenRouter request at all**,
and Admin → Overview → AI provider health will keep saying "no generations to
judge by" forever. That is not a fault in the panel; there is genuinely nothing
to count.

**Time.** One minute to answer. Two minutes for the check itself, *after* we ship
A.

**The check, for when it becomes possible.** Generate one prompt and read the
badge on the result card. Every generation response carries
`provider: "openrouter"` or `provider: "gemini"`. **OpenRouter → pass.** **Gemini
→ fail, and the prompt in front of you will look perfectly good — that is the
defect, not a glitch.** 401/403 = key wrong or revoked · 429 = rate-limited or
out of credit · 5xx = OpenRouter outage · HTTP 502 "AI provider rejected the API
key" = both providers down · HTTP 500 "AI is not configured" = neither key is set.

**Why a key being set is not the answer.** You set the key on 2026-08-07 and that
is recorded as done. A key that is *present* is also what a wrong, revoked or
out-of-credit key looks like. Only a real generation tells them apart.

**Your answer:** _______________

**If you do nothing.** You keep paying a monthly bill for a route that no user
can reach, and you will not find out, because the panel that would tell you has
nothing to report.

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

## 4.12 · P1 — Your Stripe product still promises 1,000 AI actions a day

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
