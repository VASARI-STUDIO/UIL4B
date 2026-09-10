# Release readiness

**One page. What is finished, what needs you, what needs somebody outside this
project.** Everything here was measured on `5edbfc36` on 2026-09-10, not
remembered. Where a figure would go stale, this page names the command instead.

Your to-do list is [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md). This page is the
answer to *"can we release?"* — it does not restate the list, it sorts it.

---

## The short answer

**The code is ready. The account is not.**

Every gate passes locally. Nothing is failing, nothing is half-built at the
release boundary. But **the site cannot deploy**, so none of it is on
uil4b.com — and that is a billing page, not an engineering problem.

If you did exactly one thing today, do
[§1.1](OWNER-ACTIONS.md) — the Vercel Usage page.

---

## 1 · Done, and verified today

Measured on this branch. Each row is a command you or anyone can re-run.

| Gate | Command | Result on 2026-09-10 |
|---|---|---|
| Lint | `npm run lint` | **0 errors, 25 warnings** — under the ceiling, which came down from 31 |
| Build | `npm run build` | passes, and printed `prerender: wrote 39 route shells + a noindex 404 shell (27 on a section share card, 16 with a BreadcrumbList)`. The deploy is **5.6 MB** (was 35 MB before the ffmpeg core moved off origin) |
| Unit | `npm run test:unit` | **1786 pass, 0 fail, 0 skipped** |
| Firestore and Storage rules | `npm run test:rules` | **105 pass, 0 fail, 0 skipped** — the emulator now runs Storage too |
| Browser acceptance | `npm run test:users` | **976 passed, 13 skipped, 0 failed** — every skip is `12-ui-system-builder.spec.js`, see §4 |

What the gate *requires* — as opposed to what it happened to report today —
lives in [`reference/build-and-verify.md`](reference/build-and-verify.md) and
nowhere else. **Do not treat the numbers above as a target.** They are a dated
observation; a branch that adds tests will report more, and that is not a
regression.

**Also true, and worth knowing before you release:**

- **39 routes are prerendered**, so a search engine or an AI crawler sees real
  HTML rather than an empty shell.
- **Learn is live** — seven published guides, not a coming-soon page. The
  count is `LEARN_ARTICLES` in `src/data/learnIndex.js`; three more topics are
  waiting on a decision (`OWNER-ACTIONS.md` §2.6).
- **Discover is live** — six of its eight groups.
- **The moderator role is built, and it is in two halves that are not both
  ready.** `npm run apply:gated` ([§1.3](OWNER-ACTIONS.md)) makes the rules
  honour a `moderator` claim. **Nothing mints one**: that is
  `api/verify-admin.js`, whose change exists as prose rather than as an
  applicable diff, and the command deliberately does not carry it. So after
  the command the rules understand a moderator and there is still no way to
  appoint one.
- **The API is at 12 of 12 Vercel functions.** Not a problem today; it means the
  next endpoint has to replace one. `tests/unit/account-deletion.test.js` fails
  the build if it is exceeded, so this cannot be missed.
- **Brand Starter is live in beta** at `/create/auto-builder`: a prompt becomes a
  palette, a type pairing and starter copy. Free accounts get one run for the
  life of the account, Pro gets twenty a month. Both numbers live in
  `src/config/aiGeneration.js` and are yours to change; a unit test keeps the
  server's copy identical.
- **The homepage now says what you said.** The taglines are gone, the hero
  exploration variants are retired, the tools section leads with your sentence,
  and an export-kit section follows it. Every sales surface reads its claims
  from `src/data/positioning.js`. The headline itself is item 10 below.
- **Billing is correct on the money paths (#417).** Renewals used to write a
  null period end, which disarmed the stale-subscription safety net; the
  receipt description, the reconcile on `/checkout/return`, the silent price
  fallback and a customer-creation race are fixed with it.
- **Sync tells the user when it stops (#419).** The empty catch is gone, deletes
  propagate, and the 1 MiB ceiling is announced with a size instead of
  discovered. The per-project shape is written and inert behind one rule you
  have not approved yet — item 11.
- **Storage uploads must declare an image or video type (#418)**, and the AI
  quota is reserved inside a transaction before the provider is called.
- **The palette library has eight measured mood filters** and every gallery
  ends with a way to submit your own (#416).
- **The 2026-09-09 round (#426–#431):** every sales surface reads the value
  proposition from `positioning.js` and `llms.txt` is generated from the truth
  tables; the homepage LCP cause is measured (the entry chunk's static Firebase
  import, not the animation or the font — the fix waits on the gated patch, item
  11); acceptance runs write per-port report directories; ten breakpoint
  defects on the new surfaces are fixed, including the sync notice never
  mounting on the Create tools; Learn has a per-topic index, search over the
  guides' text and its own share card; the icon tests no longer depend on the
  live Iconify API, which rate-limited this machine to 429 after a day of runs.
- **The 2026-09-10 round (#433–#437):** the anti-slop pass below the hero (taglines,
  the closing banner, the figure strip and typed Pro claims out; the footer
  tagline gone from every page); breakpoint audits of the six core tools (14
  fixes) and the media, icon and content tools (10 fixes, including the icon
  pill that claimed a live library while the catalogue was refused); the six
  user flows walked end to end (7 fixes) and their follow-ups (9 fixes,
  including Export being unreachable on phones, refusals shown as green success
  toasts, and `/settings` opening on the upgrade pitch).
- **Your four answers of 2026-09-10 are shipped (#439–#441).** The hero headline is
  approved and pinned by a test, so it cannot be reworded by accident. New accounts
  no longer get a seeded "Default Project", which was quietly taking one of the
  three free slots and hiding the real empty state. The three parked homepage pull
  requests were salvaged (three missing guards recovered, the rest already landed or
  rejected) and closed, with their branches intact. And `npm run apply:gated` now
  exists — item 11 below.
- **Every route now loads only its own stylesheet (#424).** Eleven page sheets
  left `global.css` (687 → 588 kB), a computed-style snapshot over 25 routes
  proves nothing painted differently, and the one-directional contrast walk
  that kept returning is gone with its seven callers measured (#423).

---

## 2 · Blocked on you

Ordered by how much each unblocks. All of it is dashboard work; none of it is
code.

**Six decisions are open too, and none of them blocks a release** — the
palette contrast trade, the sentences only he can write, the export
entitlement two documents and three pages disagree on, the condition banners
over the Palette Builder toolbar, four small design calls, and whether three
topics belong in Learn. They are `OWNER-ACTIONS.md` §2 and are not repeated
here.

| | What | Where | Time | If you do nothing |
|---|---|---|---|---|
| **1** | **Nothing is live.** Vercel has not deployed since 2 September | [§1.1](OWNER-ACTIONS.md) | minutes | Every fix since 2 September stays invisible. Nothing else on this page matters until this clears |
| **2** | **No tests are running.** GitHub Actions is blocked on billing | [§1.2](OWNER-ACTIONS.md) | minutes | Every pull request reads `UNSTABLE`, which looks like broken code and means the gate never started |
| **3** | **Four approved changes are switched off.** One command applies all four — see item 11, which is the same command | [§1.3](OWNER-ACTIONS.md) | 2 min | Your feedback queue stays open to anyone on the internet, and you stay the only person who can approve a community submission |
| **4** | **Stripe charges a different price from the one on screen** | [§4.1](OWNER-ACTIONS.md) | 15–30 min | The only item with a legal edge. **Do not release with this open** |
| **5** | **Stripe is not sending the events we handle** | [§4.2](OWNER-ACTIONS.md) | 20 min | Refunds and chargebacks never arrive |
| **6** | **Firebase Storage is off** | [§4.3](OWNER-ACTIONS.md) | 10 min | Nothing that uploads a file can work |
| **7** | **We cannot email a customer at all** | [§4.10](OWNER-ACTIONS.md) | 20 min + DNS | No welcome, no failed-payment notice, no way to reach anyone who is not currently looking at the app |
| **8** | **OpenRouter has no reachable tool** — keep paying, or stop? | [§4.5](OWNER-ACTIONS.md) | 1 min to answer | You keep paying for a route no visitor can use |
| **9** | **The homepage price now comes from the plan ladder in code** (`src/config/planLadder.js`), not typed copy — but that ladder is still not read from Stripe | `src/config/planLadder.js` | 10 min to decide | Item 4 already means checkout can differ from `/plans`; keep the ladder and Stripe in step by hand until then |
| **10** | ~~**The hero headline needs your yes or no.**~~ — **closed 2026-09-10: you said ship it.** It reads *"Build and export UI and brand design kits, in one unified location."*, assembled only from words you wrote. The pending-approval flag is off `src/data/positioning.js`, `docs/reference/positioning.md` and the two tests that named it, and `tests/unit/positioning-truth.test.js` now pins the exact sentence so it cannot be reworded without coming back to you | `src/data/positioning.js` | done | — |
| **11** | **Four changes are written and waiting on one command from you.** Three `firestore.rules` diffs — the moderator role (#390), feedback `create` closed to strangers with size bounds on signed-in writes (#418), the per-project sync collection (#419) — plus the Firebase deferral (#427, measured at 624 ms off the homepage). No agent is allowed to save those files, so #441 built you `npm run apply:gated`: it applies all four, runs the rules emulator, the unit suite and a deferred build, and prints what each one changed. `-- --dry-run` shows every line first and touches nothing | [§1.3](OWNER-ACTIONS.md) | 2 min, then publish the rules in the Firebase console | Anyone can still write to the feedback queue; sync stays on the 1 MiB single document; you remain the only moderator; the homepage stays 624 ms slower |

**On item 9**, found by walking the first-visit flow on 2026-09-07 and narrowed
on 2026-09-08 (#415). The homepage price panel now derives its figure from
`src/config/planLadder.js` rather than typed copy, so the number can no longer
drift from the code's own ladder; but `/plans` still quotes whatever the live
Stripe price service returns — and `Home.jsx` says so
itself, in a comment: the ladder it names "is not guaranteed to be" what Stripe
holds. So a visitor who reads the homepage and then opens `/plans` may be shown
two prices for the same plan, and only one of them is real. This is **not** a bug
to fix in code: the panel is deliberately decoupled, for the good reason that
reading half a price ladder from a live service and hard-coding the other half
would be worse. **Your options are:** (a) make Stripe's yearly price match the
$4/month the homepage advertises, which costs nothing and makes the claim true;
(b) drop the number from the homepage and let `/plans` be the only surface that
quotes a price; or (c) leave it, and accept the mismatch until Stripe is
configured. **Recommendation: (a)** — it is the same dashboard visit item 4
already needs, and it is the only option that keeps a price on the homepage,
which is where it earns its keep. **If you do nothing:** item 4 already means the
checkout can charge a different figure from the one on screen; this adds a third
figure, on the page a stranger sees first.

**The release-blocking subset is 1 and 4.** It was 1, 4 and 10; item 10 closed on
2026-09-10 when you approved the hero headline. Everything else can follow a
launch; those two cannot. Item 1 stops anything reaching users at all, and item 4
means advertising one price and charging another.

---

## 3 · Blocked on someone outside this project

Nothing here is fixable by us or, in most cases, by you today. It is listed so
that none of it is mistaken for engineering work that has been forgotten.

| Service | What it holds up | What it actually needs |
|---|---|---|
| **GitHub Actions** | Every automated test run | A cleared payment on the account. It does not expire or self-heal |
| **Vercel** | Every deploy | Either an upgrade off Hobby or the monthly quota reset. Our half is done (#406): the 32 MB ffmpeg core loads from jsDelivr and the deploy shrank from 35 MB to 5.6 MB |
| **Stripe** | The price ladder, the webhook events, the retention offer | Dashboard configuration only. The code for all three is written and waiting |
| **A sending domain** | Every email the product would send to a customer | SPF, DKIM and a return path on a real domain. Until then the only mail we send is inbound to you, from a shared sandbox address that is not deliverable in production |
| **JDK 21** | `npm run test:rules` | **Not a blocker today.** A Zulu 21 JRE is installed on the founder's machine and the rules suite ran green on it — the figure is in §1, and this row carried a stale one (37) until 2026-09-10. The machine's *default* `java` is still 1.8, so the command needs the `PATH` prefix that `build-and-verify.md` records. `npm run apply:gated` looks for a 21 itself and stops rather than guessing if it cannot find one. CI does not care — it pins Temurin 21 itself |

---

## 4 · Known, accepted, not blocking

Honest state rather than a clean bill of health.

- **`12-ui-system-builder.spec.js` is skipped in full, and the reason printed
  here until 2026-09-07 was wrong.** It said the mode "went admin-only and that
  suite runs signed out". Both halves have stopped being true. The auth harness
  exists (#407: `signIn(page, { admin: true })`), and the surface is **not
  admin-only — it is unwired for everybody, admins included**. `PaletteBuilder
  .jsx` removed *both* doors on the founder's 2026-09-05 instruction (the "UI
  System / Admin" breadcrumb and the "Build UI system" button), nothing imports
  `components/UiSystemBuilder.jsx`, and it is therefore in no chunk of any
  build. Settled by RENDERING it rather than by reading the source: *"UI System
  mode is unreachable for an ADMIN too"* in `57-signed-in-session.spec.js` signs
  in as the founder, proves the session is admin by opening `/admin`, proves the
  Palette Builder rendered, and only then asserts the controls are absent.
  Skipped is still the correct state; re-entering the tool means giving it its
  own route, not restoring a button.
- **Two AI tools and the whole UI Component Builder group are badged *Soon*** and
  resolve to the workshop state. That is deliberate and honest — but see item 8
  above, because one of those unreachable tools is the only thing that would ever
  use OpenRouter.
- **`AiPromptGenerator.jsx` exists but no route reaches it.** A page file
  existing is not evidence a route reaches it; this is the same trap
  `doc-authority-map.md` documents. It is **deliberately kept** unrouted: it is
  the only caller of the OpenRouter path and §4.5 of `OWNER-ACTIONS.md` asks you
  to choose between wiring it up and cancelling OpenRouter. Deleting it would
  make that decision by default.
  `LandingPromptGenerator.jsx` was in this sentence and **is now deleted** — it
  reached no chunk of a production build, and unlike its twin nothing depended
  on keeping it.
- **The seven `Docs*.jsx` unrouted drafts are deleted** (2026-09-06), with the
  `DocsTOC` component only they used. Every `/docs-*` URL is still a 301 to
  `/learn` — deleting a component does not touch a redirect table — and `/learn`
  is what serves guides.
- **The browser suite has a known flake class** under runner contention. Re-run
  the full suite before treating a single red job as a regression, and say in the
  pull request which failures were flake and which were real.
- **A community submission cannot be followed into the moderation queue by a
  test.** Both ends are covered — the submit form renders and states that nothing
  appears publicly until reviewed, and `/admin` → Submissions renders the queue —
  but the write between them goes to Firestore, and the test session answers from
  memory rather than from a server. So "submitted, therefore it arrives" is
  checked by reading the code, not by rendering it. Not a defect; a boundary of
  the fixture, recorded so nobody mistakes the green suite for proof of the round
  trip.
- **Resuming a half-finished submission after sign-up has no rendered test.**
  `setSubmitIntent()` exists to reopen the form when a new account detours
  through onboarding. Deleting that call leaves the whole flow-6 spec green,
  which was verified deliberately — the sign-in gate's "Where you left off"
  sentence comes from a different source, so the two promises read as one and
  only the first is guarded.
- ~~**On a 390px-wide screen the project card's title control is 21px tall**~~
  — closed 2026-09-08. It measured 21.25px at *every* width (17px type,
  line-height 1.25), not only at 390; `.uh-card-name` now carries a 24px
  `min-height` and `tests/user-sim/65-new-surfaces-breakpoints.spec.js`
  measures it at 390 and 1440 (`npx playwright test 65-new-surfaces`).

---

## Keeping this page true

It has the same failure mode as everything it describes. Two defences:

1. **Every figure names the command that produced it**, so the next reader
   re-measures rather than trusts.
2. **It owns nothing.** The gate is `build-and-verify.md`; the to-do list is
   `OWNER-ACTIONS.md`; the queue is `src/data/pipeline.js`. If this page and one
   of those disagree, **the other file wins and this page is the bug.**
