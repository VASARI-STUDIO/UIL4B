# Marketing — six campaigns, and what each one needs

> Written for Dylan, 2026-09-15. Everything here is measured off the repository
> on that date, not guessed. Where a number appears, the place it was counted
> from is named so you can re-count it.
>
> **The rule this document obeys:** an agent may design the mechanism, the
> channel, the offer and the page. An agent does not write your copy. Every
> campaign below separates **what gets built** from **what you have to write**,
> and the sentences you have to write are described by their shape, with your
> own existing lines as the example — never drafted for you.

---

## What we are actually working with

Before the campaigns, the honest inventory. Three of these are stronger than
you probably think, and three are blockers.

**Assets — real, countable, already built**

| | What | Counted from |
|---|---|---|
| **14 live tools**, each on its own address with its own title, description and structured data | A visitor can land directly on the exact tool they searched for. Nothing has to load a homepage first | `liveToolRoutes()` in `src/data/toolTree.js`; 39 prerendered shells from `scripts/prerender.mjs` |
| **137 finished artefacts** you did not have to make this week | 37 palettes and 100 gradients, each already a page | `src/data/paletteLibrary.js`, `src/data/gradientGallery.js` |
| **7 Learn articles that are genuinely good** | An outside SEO audit on 2026-09-14 scored the Learn content **9/10** — "specific, cited, formula-driven, honest about its own limits — genuinely differentiated, not template copy." That is rare and it is the thing most small products cannot fake | `src/data/learnIndex.js`; audit in this session |
| **A palette already travels in a URL** | `paletteBuilderUrl(colors)` puts the colours in the link, so a shared link opens the real tool with that palette loaded. The hard half of a sharing loop is done | `src/data/paletteGallery.js` |
| **$7 a month** | Cheap enough that the decision is not a budget decision | `PLAN_LADDER` in `src/config/planLadder.js` |

**Blockers — nothing on this page works until these are cleared**

| | What | Which campaigns it stops |
|---|---|---|
| 1 | **The site has not deployed since 2 September.** Everything below is about sending people somewhere | All five |
| 2 | **No verified sending domain.** `admin@uil4b.com` exists as a mailbox, but until SPF, DKIM and a return path are set up, we cannot email a customer at all | 3 and 5 |
| 3 | **A shared link unfurls as its category, not as the thing.** Post a palette in Slack and the preview says "Colour" | 2, badly |

Blockers 1 and 2 are rows 1–8 of `OWNER-ACTIONS.md` and are yours. Blocker 3
is mine and is inside campaign 2.

---

## Why the obvious plan is the wrong plan

You asked for campaigns that do not feel generic or outdated. So, plainly, the
things I am **not** proposing and why:

- **"Launch on Product Hunt."** That is a day, not a strategy. It sends a spike
  of people who collect tools and do not return. Worth doing *after* campaign 1
  is working, as a one-off, never as the plan.
- **"Build in public on X."** It works for people who already have an audience.
  With no following it is a diary nobody reads, and it costs you every day.
- **"Start a newsletter."** You have nothing to send weekly and no list to send
  it to. A newsletter is what campaign 4 turns into later, not where it starts.
- **"Write blog posts targeting keywords."** You already have 7 articles rated
  9/10. The problem is not that you need more words. It is that nothing points
  from them to the tool that does the thing they explain.

Every campaign below uses something that already exists in the product. That
is the test I applied: if a campaign needed me to invent an asset from nothing,
it did not make the list.

---

# 1 · Take the one-tool sites' search traffic

**This is the engine. The other four feed it or convert it.**

Your own line is the strategy: *"No more trying to remember the names of the 1
tool websites."* Those sites exist because people search for a **task** —
"contrast checker", "type scale calculator", "hex to hsl", "aspect ratio
calculator". Each of those searches is someone who needs the thing *right now*
and will use whatever opens fastest. That is the cheapest, highest-intent
traffic on the internet for this product, and you have **14 tools** that each
answer one of those searches.

**Why this is not generic.** It is not "do SEO". It is one specific claim per
route, on routes that already exist and already carry clean, unique metadata.
The infrastructure is built — this campaign is the content going into it.

**The conversion path, which is the actual point:**

1. Someone searches "colour contrast checker", lands on `/create/contrast`.
2. They do the thing they came for. They leave. **That is fine** — the
   one-tool sites' entire business is that step.
3. **Your advantage starts here:** the next thing they need is already open.
   They needed contrast because they are choosing colours; the palette tool
   and the tint scale are one click away and hold the same colours.
4. The moment they use a *second* tool without opening a new tab, they have
   experienced the product's whole argument. That is the conversion event —
   not the signup.
5. Signup is what they do when they want to keep the thing they just built.

**What gets built (mine):**
- Each tool page links to the two tools someone realistically needs next, with
  the current colours or fonts carried across. Some of this exists; it is not
  consistent across all 14.
- The 7 Learn articles each link into the tool that does the thing they
  explain. Right now the article on WCAG thresholds and the contrast checker
  do not know about each other.

**What you write (yours):** one sentence per tool page saying what the tool
makes, in the shape you already used three times:

> *"One base colour and one curve. Every step below is that colour at a
> measured tone."* (tint)
> *"Colour stops and where each one sits. Everything below is those two facts,
> as CSS, Tailwind or SVG."* (gradient)
> *"Two families — one for headings, one for body. Every preview below is
> those two, together."* (font pair)

Name the two facts the tool is made of, then say everything below is those two
facts. **Eleven tools still need one.** These are already listed for you in
`OWNER-ACTIONS.md` and they are the single highest-value thing you can write.

**How you know it worked:** search impressions per tool route, and — the one
that matters — the share of sessions that touch **two or more** tools.

---

# 2 · Make every export carry the product

**The mechanism a design tool grows by, and you are one build away from it.**

Glide publishes its own brand guidelines as a public page built in Glide:
copy-on-click swatches, and a small **"Made with Glide"** badge in the corner.
Mural does the same page without the badge. The badge is the whole difference
between a nice page and a channel. *(Observed on Mobbin, 2026-09-15:
[Glide](https://mobbin.com/sites/sections/6f697904-0d8a-498d-9252-8d8bc401db9a),
[Mural](https://mobbin.com/sites/sections/13e7fecb-1d7d-4520-b941-914bbb34aa9d).
What I cannot tell from a screenshot is how well it converts — that is
something to measure, not to assume.)*

You already export design system books and brand guidelines. Every one of them
is a document a designer sends to a client or a developer. Today it arrives
with nothing on it.

**The conversion path:**

1. Your customer exports a kit and sends it to their client or their developer.
2. That person opens a document that is genuinely useful to them.
3. The document says where it was made, with a real address.
4. They click it because they want that document for their own work.
5. They land on the tool that makes it — with the kit already loaded.

The person who arrives this way is pre-qualified in a way no ad can match:
they have already seen the output and decided they want it.

**What gets built (mine):**
- A mark on exports, with the address. Not a watermark over the work — a line
  at the foot of the document, the way Glide does it.
- **Fix the unfurl.** A shared palette currently previews as the word "Colour",
  because there are 7 category share cards and no per-artefact one. A palette
  posted in Slack should preview *as that palette*. This is the single biggest
  wasted asset in the product right now: the link already carries the colours.
- A landing page for a shared artefact: the thing itself, large, with one
  button that opens it in the real tool.

**What you write (yours):** the line on the export foot. It is one short
sentence and it is on every document a customer ever sends, so it should be
yours.

**How you know it worked:** visits that arrive at a shared-artefact address,
and how many of them open the tool afterwards.

**One honest warning.** If Pro customers cannot remove the mark, some will not
send the document. The usual answer is that free exports carry it and Pro
exports can turn it off — which also makes it a reason to pay. That is a
decision for you, not for me.

---

# 3 · "Close these 14 tabs"

**The one campaign that is a campaign, with a date and an end.**

Your positioning is about bookmark folders. Nobody has ever made that feeling
into a page. The page is a list: **for each of your 14 tools, the
single-purpose site it replaces.** Not a feature comparison table — a list of
tabs a designer can close today.

**Why this is not generic.** It is checkable. Every row is a real site a real
designer has bookmarked, and a real tool of yours that does the same job. It
cannot be written by anyone who has not built the tools. It also works as a
conversation rather than an ad: "which of these do you actually still have
open?" is a question people answer.

**Where it goes.** This is a post, not a billboard:
- The design subreddits where "what's in your toolkit" threads already appear,
  answering the question rather than announcing yourself.
- Hacker News, as a Show HN — but only once blocker 1 is cleared, because a
  Show HN that 404s is a one-time card you have burnt.
- Designer News, Indie Hackers.

**The conversion path:** the page is the landing. Each row links straight into
the tool that replaces that tab. Someone testing whether you are telling the
truth ends up **using** the tool, which is the best outcome available.

**What gets built (mine):** the page, the routing, the metadata, the share
card.

**What you write (yours):** the opening. Two or three sentences in your own
voice, and it must not be a pitch — the list is the pitch. Your existing line
*"Gone are the days of searching through bookmark folders upon bookmark folders
to find each tool"* is already the right register.

**Also yours:** the 14 names. I can list the obvious competitor for each tool,
but which ones you are willing to name in public is your call, and there is a
real trade-off — naming them is what makes the page honest and specific, and it
also puts you on their radar.

**How you know it worked:** referral traffic from the thread, and whether the
people who arrive use more than one tool (campaign 1's number again).

---

# 4 · Let Discover do the work while you sleep

**You have 137 finished artefacts and they are currently a feature, not a
channel.**

37 palettes and 100 gradients. This is exactly how Coolors grew: people search
for "blue colour palette" or "sunset gradient css" far more often than they
search for a design tool, and they land on a specific artefact.

**Why this is not generic.** It is not a content plan that needs you to produce
anything. The content exists. What is missing is that each artefact is not yet
a page worth landing on — with its own address, its own preview, its hex
values, and a button that opens it in the real tool.

**The conversion path:**

1. Search for a specific palette or gradient. Land on it.
2. Copy the hex values — the thing they came for, free, no signup.
3. **Open it in the tool** — where they can change it, and where changing it
   is more useful than copying it.
4. Now they are in the product with something they like already loaded.

Step 3 is the whole design. A palette page that only lets you copy is a
dead-end; a palette page that lets you *fork* is an entrance.

**What gets built (mine):** the per-artefact pages, and the same share-card fix
as campaign 2. These two campaigns share most of their engineering, which is
why they should be built together.

**What you write (yours):** nothing, and that is the point of this one.

**How you know it worked:** organic landings on artefact addresses, and how
many go on to open a tool.

---

# 5 · Founding supporters, and what they are actually buying

**The only campaign about money, and the honest version is stronger than the
usual one.**

$7 a month is not a budget decision for a working designer. So the sale is not
about price, and a discount would be the wrong lever — it would say the product
is worth less, and it would attract people who leave when it ends.

What is actually true is better. **AI usage is lowered while in Beta. With
enough support, plans, API and MCPs get upgraded and the app improves.** That
is the approved wording and it should be used as written.

A founding supporter is buying the roadmap. That is a real thing to sell and it
is specific to where you are right now — it stops being available the moment
the product is established, which makes it genuinely, not artificially, a
limited offer.

**The conversion path:** someone who has used two or three tools and hit the AI
cap sees, at the cap, what more support unlocks — stated as the roadmap, not as
a paywall tantrum. They are not being blocked from work; they are being told
what changes if they back it.

**What gets built (mine):** the cap message pointing at the roadmap instead of
a bare limit, and a page saying what support changes.

**What you write (yours):** what you will do with the support, in your own
words. Concrete, so it can be checked later. This one will not work in anyone
else's voice — it is a founder making a promise, and the whole value is that it
is you making it.

**How you know it worked:** conversions from the cap message, and — the number
that actually matters — how many of them are still subscribed in month three.

**Never:** countdown timers, fake scarcity, "only 12 spots left" when there is
no such limit, or invented testimonials. Beyond the ethics, this audience spots
it instantly and it is the fastest way to become the thing you have been calling
AI slop all month. `docs/reference/growth-persuasion.md` is the longer version
of this rule.

------

# 6 · Email — the one to run once people are signing up

**Standalone on purpose.** You said you would look at this once there are enough
sign-ins, and that is the right order: an email campaign with no list is a
project with no audience. It is here so that the day the list exists, the plan
already does.

**Why it goes last and still matters most.** Of every channel in this document,
email to an existing list converts best by a wide margin — the benchmark
material puts targeted email at **5–20%+** against organic search at about
**2.7%** and paid social at **1–6%**. The reason is not the medium. It is that
the person already knows who you are, so the message lands on someone with
context instead of a stranger.

**The blocker is still blocker 2.** `admin@uil4b.com` is a mailbox, not a
verified sending domain. Until SPF, DKIM and a return path exist, we cannot send
to a customer at all, and every send below is theoretical. The templates are
already written and sitting in `brand/email/`.

**What to send, in the order it earns the right to be sent:**

1. **The one triggered email that is not marketing.** Someone signs up, so tell
   them what they now have and what the one thing worth doing first is. It is
   the highest-open message you will ever send and most products waste it on a
   greeting.
2. **The trial ending.** Quarterly and yearly now carry 7 free days. Two
   messages — one partway through, one the day before — saying what they built
   during the trial. Not "your trial is ending": *what they made*, which the
   product knows and a generic reminder does not.
3. **The drop from Pro to free.** Whoever finishes a trial without subscribing
   is the warmest audience the product will ever have, and the moment they lose
   a limit is the moment the value becomes concrete.
4. **Only then, anything broadcast.** A short note when something real shipped.
   Not a newsletter, not a digest, not "5 tips" — a changelog with a human
   sentence on top, sent when there is something to say and not on a schedule.

**What you write:** all of it. Every one of these is a founder talking to
someone who signed up to a product he built alone, and that is the only voice
that makes a small product's email worth opening.

**What gets built:** the triggers, the send, the unsubscribe, and the rule that
nobody gets two of these in one day.

**How you know it worked:** open rate tells you the subject line worked. What
you actually measure is whether people who got the trial-ending pair subscribe
at a higher rate than people who did not.

**Never:** buying a list, "we noticed you didn't...", fake personal-looking
plain-text messages that are actually a broadcast, or a re-engagement campaign
to people who never engaged in the first place.

---

# What the conversion research says, and what I did with it

You sent a lot of CRO material on 2026-09-15. It is digested into the wiki as
durable prose — `principle-conversion-patterns` gained a benchmark section and
`principle-ai-search-visibility` is new — rather than kept as links that can be
edited or deleted. Two things are worth repeating here.

**The one finding that changes this plan.** All three of the agency scenarios
you sent describe the same fix: traffic with a specific intent was landing on a
page that answered a broader question, and sending it to a dedicated page moved
the rate several times over — 0.8% to 3.2%, 0.9% to 2.7%, 1.1% to 4.8%. That is
exactly the argument for campaign 1 and campaign 3, arrived at independently.
**The homepage is the wrong landing page for someone who searched for a contrast
checker**, and we already have 14 pages that are the right one.

**The numbers to be careful with.** "Personalised CTAs convert 202% better" and
"social proof beside the CTA lifts 68%" arrive with no sample size, no date and
no method. The single-CTA figure — 13.5% against 10.5% — is correlational:
pages built around one action differ from multi-CTA pages in far more than the
button count. They are worth testing on a specific page; they are not worth
designing around as if they were established.

**One of your notes contradicts something the wiki already held.** You said
three seconds is the window in which someone judges a bad experience. The wiki's
existing position is that no verified universal three-second rule exists. I kept
both rather than overwriting either: the part nobody disputes is that first
impressions form fast and cost a lot to reverse, and where speed *does* have
measured support it is as load time, not as an attention budget.

**Acting on the speed material is free and worth doing.** Sub-two-second loads
and the bounce curve are the least contested figures in everything you sent, and
page speed is the one thing on this page that needs neither your words nor a
Stripe price. That belongs in the engineering queue, not in a campaign.

---

# The order to do them in

They are not independent. This is the sequence that makes each one cheaper than
the last.

| When | Do | Why then |
|---|---|---|
| **First — this week** | Clear blockers 1 and 2: deploy, and verify the sending domain | Nothing below exists for anyone until the site is live, and two campaigns need email |
| **Then** | **Campaign 1**, the eleven tool sentences | It is writing, not building, so it does not wait on me. It is also the foundation the other four convert into |
| **Together** | **Campaigns 2 and 4** | They are the same engineering — per-artefact pages and the share-card fix — and building them apart means building them twice |
| **Then** | **Campaign 3**, the tabs page | It is the one with a launch moment, so it should fire when the tools behind it are at their best |
| **Last** | **Campaign 5** | It needs people already using the product. Running it first would be asking strangers to fund a roadmap they have no reason to care about |
| **When the list exists** | **Campaign 6**, email | Your own call, and the right one — it is the best-converting channel in this document and the only one that cannot start from zero |

---

# Other marketing things worth doing

Smaller, and none of them is a campaign.

- **`llms.txt` is already generated at build.** ChatGPT, Claude and Perplexity
  are now a real way people find tools, and most sites have nothing for them.
  Yours does. Worth checking that it names all 14 tools by the task each one
  does, in the words a person would use.
- **The Learn articles should link to the tools.** Cheapest win on this page.
  Someone reading about WCAG thresholds is one click from the contrast checker
  and currently has no idea it exists.
- **Set up analytics before, not after.** Every "how you know it worked" line
  above needs the two-or-more-tools number. If that is not being recorded, the
  campaigns produce anecdotes instead of answers.
- **Answer the questions that already exist.** Search for the exact tasks your
  tools do on Reddit and Stack Overflow. Some of those threads are years old,
  still ranking, and still getting visitors. Answering one properly — with the
  answer in the reply, and the tool as a link — is worth more than a post
  nobody asked for.
- **A changelog page.** You ship constantly. Right now that is invisible to
  everyone outside the repository, and "this thing is actively built" is the
  main worry a person has about paying $7 to a small product.
- **Product Hunt, once, after campaign 3** — as a spike on top of something
  that already works, never as the plan.

---

# What I will not do, and why you should hold me to it

- I will not write your copy. Every campaign above names what you write and
  what it has to do, and shows your own sentences as the model.
- I will not invent proof. No testimonials, no user counts, no "trusted by",
  no logos, until they are real.
- I will not build urgency that is not real. No countdowns, no fake scarcity.
- I will not say we use free AI plans. The line is: **AI usage is lowered while
  in Beta; with enough support we will upgrade plans, API and MCPs to improve
  the app.**

---

*Sources for every number on this page: `src/data/toolTree.js`,
`src/data/paletteLibrary.js`, `src/data/gradientGallery.js`,
`src/data/learnIndex.js`, `src/config/planLadder.js`, `scripts/prerender.mjs`,
`scripts/share-cards.mjs`, and the SEO audit run on 2026-09-14. Re-count rather
than trusting a number here — that is the rule in `CLAUDE.md` and it applies to
this file too.*
