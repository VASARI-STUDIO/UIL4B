# Release readiness

**One page. What is finished, what needs you, what needs somebody outside this
project.** Everything here was measured on `5c6603a` on 2026-09-06, not
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

| Gate | Command | Result on 2026-09-06 |
|---|---|---|
| Lint | `npm run lint` | **0 errors, 25 warnings** — under the ceiling, which came down from 31 |
| Build | `npm run build` | passes, and printed `prerender: wrote 35 route shells + a noindex 404 shell (19 on a section share card, 14 with a BreadcrumbList)` |
| Unit | `npm run test:unit` | **1417 pass, 0 fail, 0 skipped** |
| Firestore rules | `npm run test:rules` | **37 pass, 0 fail, 0 skipped** |
| Browser acceptance | `npm run test:users` | run for this review; the result is in the pull request that carries this page |

What the gate *requires* — as opposed to what it happened to report today —
lives in [`reference/build-and-verify.md`](reference/build-and-verify.md) and
nowhere else. **Do not treat the numbers above as a target.** They are a dated
observation; a branch that adds tests will report more, and that is not a
regression.

**Also true, and worth knowing before you release:**

- **35 routes are prerendered**, so a search engine or an AI crawler sees real
  HTML rather than an empty shell.
- **Learn is live** — five published guides, not a coming-soon page.
- **Discover is live** — six of its eight groups.
- **The moderator role is built** and works everywhere except the two files in
  [§1.3](OWNER-ACTIONS.md).
- **The API is at 12 of 12 Vercel functions.** Not a problem today; it means the
  next endpoint has to replace one. `tests/unit/account-deletion.test.js` fails
  the build if it is exceeded, so this cannot be missed.

---

## 2 · Blocked on you

Ordered by how much each unblocks. All of it is dashboard work; none of it is
code.

| | What | Where | Time | If you do nothing |
|---|---|---|---|---|
| **1** | **Nothing is live.** Vercel has not deployed since 2 September | [§1.1](OWNER-ACTIONS.md) | minutes | Every fix since 2 September stays invisible. Nothing else on this page matters until this clears |
| **2** | **No tests are running.** GitHub Actions is blocked on billing | [§1.2](OWNER-ACTIONS.md) | minutes | Every pull request reads `UNSTABLE`, which looks like broken code and means the gate never started |
| **3** | **The moderator role is switched off.** One setting turns it on | [§1.3](OWNER-ACTIONS.md) | 1 min | You stay the only person who can approve a community submission |
| **4** | **Stripe charges a different price from the one on screen** | [§4.1](OWNER-ACTIONS.md) | 15–30 min | The only item with a legal edge. **Do not release with this open** |
| **5** | **Stripe is not sending the events we handle** | [§4.2](OWNER-ACTIONS.md) | 20 min | Refunds and chargebacks never arrive |
| **6** | **Firebase Storage is off** | [§4.3](OWNER-ACTIONS.md) | 10 min | Nothing that uploads a file can work |
| **7** | **We cannot email a customer at all** | [§4.10](OWNER-ACTIONS.md) | 20 min + DNS | No welcome, no failed-payment notice, no way to reach anyone who is not currently looking at the app |
| **8** | **OpenRouter has no reachable tool** — keep paying, or stop? | [§4.5](OWNER-ACTIONS.md) | 1 min to answer | You keep paying for a route no visitor can use |

**The release-blocking subset is 1 and 4.** Everything else can follow a launch;
those two cannot. Item 1 stops anything reaching users at all, and item 4 means
advertising one price and charging another.

---

## 3 · Blocked on someone outside this project

Nothing here is fixable by us or, in most cases, by you today. It is listed so
that none of it is mistaken for engineering work that has been forgotten.

| Service | What it holds up | What it actually needs |
|---|---|---|
| **GitHub Actions** | Every automated test run | A cleared payment on the account. It does not expire or self-heal |
| **Vercel** | Every deploy | Either an upgrade off Hobby or the monthly quota reset. Our half — taking 91% of the deploy weight off the origin — is in flight on `perf/ffmpeg-core-off-origin` |
| **Stripe** | The price ladder, the webhook events, the retention offer | Dashboard configuration only. The code for all three is written and waiting |
| **A sending domain** | Every email the product would send to a customer | SPF, DKIM and a return path on a real domain. Until then the only mail we send is inbound to you, from a shared sandbox address that is not deliverable in production |
| **JDK 21** | `npm run test:rules` | **Not a blocker today.** A Zulu 21 JRE is installed on the founder's machine and the rules suite ran green on it (37 pass). The machine's *default* `java` is still 1.8, so the command needs the `PATH` prefix that `build-and-verify.md` records. CI does not care — it pins Temurin 21 itself |

---

## 4 · Known, accepted, not blocking

Honest state rather than a clean bill of health.

- **`12-ui-system-builder.spec.js` is skipped in full.** UI System mode went
  admin-only and that suite runs signed out, so the surface is unreachable rather
  than broken. Skipped is the correct state; do not "fix" it by deleting the file.
- **Two AI tools and the whole UI Component Builder group are badged *Soon*** and
  resolve to the workshop state. That is deliberate and honest — but see item 8
  above, because one of those unreachable tools is the only thing that would ever
  use OpenRouter.
- **`AiPromptGenerator.jsx` and `LandingPromptGenerator.jsx` exist but no route
  reaches them.** A page file existing is not evidence a route reaches it; this
  is the same trap `doc-authority-map.md` documents.
- **Seven `Docs*.jsx` components are unrouted drafts.** Every `/docs-*` URL is a
  301 to `/learn`. They are not what `/learn` serves.
- **The browser suite has a known flake class** under runner contention. Re-run
  the full suite before treating a single red job as a regression, and say in the
  pull request which failures were flake and which were real.

---

## Keeping this page true

It has the same failure mode as everything it describes. Two defences:

1. **Every figure names the command that produced it**, so the next reader
   re-measures rather than trusts.
2. **It owns nothing.** The gate is `build-and-verify.md`; the to-do list is
   `OWNER-ACTIONS.md`; the queue is `src/data/pipeline.js`. If this page and one
   of those disagree, **the other file wins and this page is the bug.**
