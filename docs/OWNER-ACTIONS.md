# UIL4B — Owner actions

**This is your to-do list.** Everything on it needs your login, your card, or
your decision. No agent can do any of it.

Every item says the same four things: **Do** · **Time** · **Why** · **If you do
nothing**. Nothing else. If an item needs more explanation than that, the
explanation is in an engineering doc and this page links to it.

Engineering work is not here — it is in `src/data/pipeline.js`. Ideas waiting on
your verdict are in [`PROPOSALS.md`](PROPOSALS.md). Decisions you have already
made are in [`CHANGELOG.md`](../CHANGELOG.md).

_Last reviewed: 2026-09-10 — every item re-checked against the code._

**What changed in this review.** §2.1 asked you to pick a hero shape by
opening `?hero=a|b|c`. You retired that exploration on 2026-09-07 and the
code is gone, so the item was both answered and impossible; it has moved to
§3. §1.1 said our half of the deploy fix was still in flight — it landed.
§4.6 asked for less than the job needs. And six decisions that came out of
the last two weeks of audits had never been written down anywhere you would
find them; they are now §2.3 to §2.6.

**Engineering is stopped on these, and nothing moves until you act:** the
deploy block (§1.1), the GitHub bill (§1.2), the four approved changes
waiting on one command (§1.3), the Stripe retention setup (§4.6) and a
verified sending domain (§4.10). A live Stripe checkout test (§6) also needs
you but blocks nothing today.

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

**Our half is done and is not waiting on you.** That 32 MB engine now loads
from a free public CDN (jsDelivr, pinned to one exact version), which takes
91% of the weight off your bill permanently. It shipped on 2026-09-06 and
the deploy went from 35 MB to **5.6 MB**. It cannot reach the live site
until the block below clears, which is the whole point of this item.

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
on your laptop. Until the deploy block in §1.1 is cleared, that second step is
waiting on Vercel.

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

Six decisions. None of them is a task — there is nothing to install and
nothing to configure. Each one is a choice only you can make, with what we
recommend and what it costs to leave it.

## 2.1 · Quieter text now looks like normal text on some palettes. Keep it?

**The question.** Keep the change, or reverse it?

**Plainly.** In the palette previews there are two levels of text: normal, and
a quieter second level. The quiet one used to be **too faint to read** on most
colours. We darkened it until it passes the readability floor. The side effect:
on **19.1% of palettes** the quiet text now looks nearly the same as the normal
text — it used to be 3.02%.

That trade is real and it cannot be tuned away. On a strongly coloured
background, all the available contrast is spent just making the text readable
at all; there is nothing left to make a *second*, quieter level out of.

| | Option | One-line case |
|---|---|---|
| **A** | **Keep it** (this is what shipped) | Everything is readable everywhere. On the 19% we carry the hierarchy with size and weight instead of colour. |
| B | Reverse it | The two levels look different again — and the quiet one goes back to being unreadable on most palettes. |
| C | Keep it and say so on screen | Print “contrast has been adjusted” beside the preview, the way Linear does. Extra work; extra words on screen. |

**We recommend A**, and it is already live. We checked eight comparable
products: where the background is a colour the user picked, Polywork and
Squarespace both use the **same** ink for both levels and separate them by size
and weight. Not one of the eight paints a faint tint on a saturated ground.

**Re-measured 2026-09-10 and the figures still stand.** Two later changes
touched contrast elsewhere and neither moved this: the search that kept walking
one direction was replaced without reaching these previews at all, and the FREE
badge and Remove fixes are in the tool’s menus, not the preview.

**If you do nothing.** A stays.

**Your answer:** _______________

**Full working:** [`PROPOSALS.md` P-023](PROPOSALS.md).

## 2.2 · The sentences only you can write

**This is not a question — it is the one piece of writing we will not do for
you.** Two separate groups have built up, and they were on two separate lists
until today.

**Write them badly** — typos, no punctuation, half a thought. We will not
rewrite them, and that is the point.

### A · The founder note — four lines, and nothing can ship without them

You decided the note is opt-in rather than a popup (§3.10). The design, the
trigger and the panel are ours. **The words are yours**: a welcome from the
founder, written by an agent, is not a welcome from the founder.

**1. Who you are.**

> _____________________________________________________________

**2. What UIL4B is for.**

> _____________________________________________________________

**3. What state it is in right now.**

> _____________________________________________________________

**4. What help you want from people.**

> _____________________________________________________________

**Time.** Five minutes, and you have already said most of it in conversation.

**If you do nothing.** The panel cannot ship. It is the only part of the
feature that is blocked, and everything around it is ready to build.

### B · Six slots on live pages that hold an agent’s sentence

The anti-slop pass of 2026-09-09 deleted every line that read as generated and
replaced it with one of yours wherever one existed. These six are the ones
where no sentence of yours fits, so what stands there today is either an
agent’s or a gap. **Each row says the exact file, so nothing has to be hunted
for.** Every page below is live now.

| | Slot | File | What stands there today |
|---|---|---|---|
| 1 | The line under the **Discover** heading | `src/pages/SurfaceLanding.jsx` | **Nothing.** The heading is the word “Discover” and the line under it is empty, because nothing you have written is about Discover |
| 2 | The **`/help`** heading | `src/pages/HelpCentre.jsx` | “Open any tool. It starts with **something** in it.” — kept because it is true and the strip under it proves it, but it is ours, not yours |
| 3 | The **Create** nav card | `src/data/toolTree.js` | “Build your brand kit, step by step” |
| 4 | The **Discover** nav card | `src/data/toolTree.js` | “Inspiration worth the tab” / “Community UI systems, font pairings and prompts — curated, never scraped.” **This one is also false:** Inspiration is badged Soon, so the card advertises something nobody can open |
| 5 | The **Learn** nav card | `src/data/toolTree.js` | “Understand the why” |
| 6 | The **Palette Library** and **Gradient Library** headings | `src/pages/PaletteGallery.jsx`, `src/pages/GradientGallery.jsx` | One sentence with the nouns swapped: “…with a point of view … make it yours.” We deleted these once; the pages measured 183px of empty space without them and they went back. A hole is worse than a templated line, so they stay until you replace them |

**One of these has a yes/no answer instead of a sentence.** The homepage’s
export section is headed by your own line, *“Build and export UI and brand
design kits and content for website building.”* — and the hero directly above
it now opens *“Build and export UI and brand design kits, in one unified
location.”*, which you approved on 2026-09-10. **Same five words, twice on one
screen.** Either that reuse is fine and we leave it, or the export section
needs a heading of its own.

**Your answer on the reuse:** _______________

**If you do nothing.** Four of the six keep an agent’s words on a live page,
the Discover heading keeps standing alone, and the Discover nav card keeps
advertising a section that is not open.

## 2.3 · Are the two Pro documents free with a credit, or not?

**The question.** Two of our documents say one thing about exports and three of
our pages say another. Which is true?

**What the pages do.** `src/config/exportFormats.js` marks the **design system
book** and the **brand guidelines** as Pro. `/plans` prints them in the Pro
column as “Not included” for Free, and the homepage price panel lists them
under “Everything in Free, plus:”. The other four formats — HTML, Markdown, PNG
and JPEG — are free with a “Made with UIL4B” line, which Pro removes.

**What the documents say.** `README.md` and `docs/reference/positioning.md`
both say **every** format is free with a visible footer credit and that Pro
removes the credit. That sentence carries a note recording that **you approved
it on 2026-08-20**, and that any surface implying exports are Pro-only was the
thing that was wrong.

So this is not a typo in a document — it is a decision that was made one way
and shipped the other, and we have left both standing rather than pick for you.

| | Option | What it costs |
|---|---|---|
| **A** | **The pages are right.** The two Pro documents stay Pro | Two lines change in two documents. Nothing on a page moves |
| B | **The 2026-08-20 decision is right.** Every format goes free with a credit | Pro loses two of the five things `/plans` sells it on, and the price panel needs re-deriving |

**We recommend A**, because it is what three live surfaces already do and
because those two documents are the only two things that say otherwise — but
this is a decision about what Pro sells, so it is yours.

**If you do nothing.** A customer who reads the README and then opens `/plans`
is told two different things about what their money buys.

**Your answer:** _______________

## 2.4 · A notice covers the Palette Builder’s toolbar until it is dismissed

**The question.** Move the two condition notices into the page, or leave them?

**What happens.** The “sync is failing” notice and the “you look offline”
banner are pinned to the top-centre of the screen. Since they started appearing
on the Create tools, they sit **on top of** the Palette Builder’s toolbar until
someone dismisses them. Measured: at 320px they fully cover SYSTEM, Randomise,
Pick seed colour, Seed colour hex, Undo and Reset; at 390px those plus
Save/export; at 1280px Image, Explore, Preview, Vision type and Gradient.

**Why it is a decision and not a fix.** Moving them into the page’s flow is a
change to the shell that every full-screen tool shares, not a tweak to one
page. It is a day’s careful work across every Create tool, and it changes where
those notices appear everywhere else too.

**We recommend moving them**, because the moment those notices appear is
exactly the moment somebody is trying to save.

**If you do nothing.** Anyone whose sync is failing, or who is offline, must
dismiss a banner before they can reach the toolbar — on the tool where losing
work matters most.

**Your answer:** _______________

## 2.5 · Four small design calls we will not make for you

Each of these was found by a rendered audit, each is a few lines of work, and
each changes how something **looks or feels** rather than whether it works. We
have left all four alone.

| | The call | Where | Our recommendation |
|---|---|---|---|
| 1 | The **gradient stop handle** is 20×20. The accessibility floor we hold everywhere else is 24×24 | `.ggn-handle`, `src/styles/global.css` | **Leave it.** Growing it changes how the stop bar is dragged, and dragging is the whole interaction |
| 2 | The **emoji tab** says “Live library connected”. The emoji library is built in, so the pill describes a connection that is not doing anything | `src/pages/IconEmojiLibrary.jsx` | **Change it**, but no existing sentence fits and we would not invent one. One phrase from you and it is a one-line fix |
| 3 | The five **buttons inside the semantic-colour illustrations** look like buttons and do nothing — they are a picture of an interface | `.stc-sc-ghost` / `.stc-sc-link`, `src/pages/ColorStudio.jsx` | **Stop making them buttons.** They are 14–21px tall, below the floor, and enlarging them would blow up the miniature they are drawn in |
| 4 | The **SOON tag** on the file converter is 8px — the smallest type anywhere in the product | `.fc-soon`, `src/styles/global.css` | **Grow it to 10px**, which is what the lines beside it use. We fixed its colour and left its size |

**If you do nothing.** Nothing breaks. Items 2 and 3 are the two that tell a
visitor something untrue about the product.

## 2.6 · Do SEO, Marketing and AI assistants belong in Learn?

**The question.** Three topics are queued for Learn and we have stopped before
writing them, because they may not be Learn at all.

**Why we are asking.** You decided Learn is **proper design education** — real
articles on colour theory, typography and accessibility, not how-to guides for
our tools and not product documentation (§3.6). Seven guides are live and all
seven sit inside that. **SEO, Marketing and AI assistants** are useful to the
same reader and are not design education, so writing them would either widen
what Learn is or quietly break the rule you set.

**We recommend leaving them out** and keeping Learn narrow — but you set the
rule, so widening it is yours to do.

**Time.** One minute to answer. Neither answer creates work for you.

**If you do nothing.** Two guides being written now will land and the three
stay unwritten, which is the safe outcome — but nobody will raise it again.

**Your answer:** _______________

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
on this list waiting on us. We cannot see your dashboards, so we cannot tick
any of these for you; that is why none of them has moved to §5.

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

**Code side: done.** The site reads every amount from `src/config/planLadder.js`.
Quarterly is the exception and it is ours, not yours: it has no Stripe price and
no checkout entry, so it cannot be sold yet.

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

**Code side: done.** Every event listed above has a handler in
`api/stripe-webhook.js`.

**If you do nothing.** Do not create a lifetime price. A one-off payment we never
hear about is a customer who paid and got nothing.

## 4.3 · P0 — Firebase Storage is not switched on

**Do.** Firebase Console → Storage → enable it, then publish `storage.rules`.
Check that a signed-in user can write only under `community-media/{uid}/`.

**Time.** 10 minutes.

**Why.** The community architecture you approved needs it. Nothing that uploads a
file can work until it exists — including the community gallery in §3.8.

**Code side: done.** `storage.rules` is written and the emulator suite covers
it; it just has nowhere to be published to until Storage exists.

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

## 4.5 · P1 — You are paying OpenRouter for a tool nobody can open. Keep it or stop it?

**The question.** **A** — we make the AI Image Prompt Generator reachable, then
you run the two-minute check. **B** — you cancel or pause OpenRouter until we do.

**We recommend A**, because the tool is written and only the last wire is
missing. But B costs you nothing to choose and saves the subscription.

**Why.** OpenRouter is used by **exactly one thing** — the AI Image Prompt
Generator. The Alt Text tool, which *is* live, runs on Gemini. And
`/create/ai-prompt` is badged *Soon*: the page exists but no route reaches it,
so there is no button anywhere on the site that runs it. **No visitor can
cause an OpenRouter request at all**, which is why Admin → Overview → AI
provider health says "no generations to judge by" and always will.

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

**Code side: n/a** — this one is entirely a console setting.

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

That is the whole list of confirmations. It does **not** cover Storage, the
admin flag, analytics accuracy, a working AI generation, or any live payment or
login flow. All of those are open above.

**Nothing in §4 has moved here, and that is deliberate.** Every one of those
items is finished on our side and finished nowhere else, and we have no way to
see a Stripe or Firebase dashboard. Ticking one off on your word is how §4.4
came to say something false for weeks.

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
