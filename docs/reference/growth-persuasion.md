# Growth & Persuasion — Activation, Belonging, and Social Proof

> Reference doc for UIL4B. Linked from `CLAUDE.md`. Read before writing
> onboarding, upgrade, empty-state, or marketing copy, or before designing any
> flow whose job is to make a new user *stay*.
>
> **The ethical line is the whole point of this doc.** We want users who feel the
> product was built for them because **it genuinely serves them** — not because
> we manufactured a feeling they can't back out of. Every technique below is
> allowed only in its honest form. The "Never" column is not decoration; it is
> the spec.

---

## The goal, stated honestly

Dylan's brief was: *make every user feel like this app was built for them
specifically; find the friction in their workflow and show them we solve it;
give logged-in free users a taste of "power"; make them feel special and part of
something; gather social proof so people feel confident.*

That is a **real, defensible growth strategy** — the exact playbook every great
product uses — *provided* we hold one rule:

> **We earn the feeling; we never fake it.** Personalisation must be real.
> Social proof must be true. The "power" we give free users must be power they
> actually keep using the product for. Belonging must be a community that exists.

The reason to be strict here is not only ethics — it's retention. Manufactured
feelings (fake urgency, invented testimonials, dark-pattern lock-in) produce a
spike and then churn plus reputational damage. Honest activation compounds.

### What we take from "cult onboarding" — and what we refuse

The brief referenced how cults onboard effectively. There is a legitimate lesson
inside a dangerous frame. We take the **structural** insights and hard-refuse the
**coercive** ones.

| Take (ethical mechanism) | Refuse (coercive version) |
|---|---|
| Fast, visible early belonging — a newcomer feels welcomed and useful quickly | Isolation, us-vs-them, cutting people off from alternatives |
| A clear shared identity and language ("design systems, not screens") | Identity that punishes doubt or exit |
| Meaningful first "win" that proves the promise | Manufactured highs engineered to create dependence |
| Recognition for contribution | Love-bombing that's withdrawn to control behaviour |
| Story and mission a user can opt into | Deception about what the mission actually is |

The test for any onboarding idea: **would it still work if we explained exactly
what we were doing to the user's face?** If yes, ship it. If it only works while
hidden, it's a dark pattern — cut it.

---

## Four pillars

### 1. "Built for me" — real personalisation, not a fake mirror

Make the product visibly adapt to the person in front of it.

- **Use what we already know.** Role/flair (Designer, Developer, Founder…),
  location, the tools they open first, their saved projects. A developer landing
  on the Colour System Builder should see export-to-code paths surfaced; a brand
  designer should see brand-system entry points.
- **First-run intent, then reflect it.** A one-question "what are you here to
  build?" that actually changes the surface (starter project, suggested tool
  path) — not a survey we ignore.
- **Name the friction we genuinely remove.** The honest version of "find
  vulnerabilities in their workflow" is: articulate the real pain (tab-hopping
  across a dozen single-purpose sites, palettes that don't survive handoff) and
  show the concrete fix. We're describing a problem they already have, not
  inventing an insecurity.

| Do | Never |
|---|---|
| Personalise from real signals and let the user see/edit them | Invent a "you" that isn't them to sell harder |
| Describe real workflow pain the product solves | Manufacture anxiety or fake "you're doing it wrong" shame |
| Let personalisation be dismissible and correctable | Trap the user in an assumed persona |

### 2. Power moments — give free users something real

Logged-in free users should feel capable and a little bit *powerful* — because
they can actually do impressive things, and because they get honest, bounded
tastes of Pro.

- **A genuine early win.** The first session should end with the user having made
  something they're a little proud of — a saved palette, a shareable live preview
  URL (a real Free feature). Design the first five minutes around reaching that
  win.
- **Honest Pro trials, not teases.** A "power" moment is a *real* premium feature
  the user gets to actually use — a full export they can download once, a paid
  system unlocked for one project — clearly labelled as a taste of Pro. The
  gating rules still hold (see `human-validation-zones.md` and the palette
  gating logic); a trial is a deliberate, tracked grant, never a bypass left
  open by accident.
- **Progress the user can see.** Projects saved, colours exported, streak of days
  building. Reflect their growing capability back to them.

| Do | Never |
|---|---|
| Give a real, bounded taste of a paid feature, clearly labelled | Show a fake "unlocked!" then yank it at the last click |
| Make Free genuinely useful on its own | Cripple Free so the product feels broken until you pay |
| Celebrate real accomplishments | Celebrate fake milestones to inflate engagement |

### 3. Belonging — a community that actually exists

People stay for other people. Discover is the surface that makes UIL4B social;
lean into it honestly.

- **Fast, low-stakes first contribution.** Setting a flair, saving to a
  collection, submitting a palette — early, visible participation creates
  belonging faster than consumption does.
- **Recognition for real contribution.** Earned flairs (Top Community Sharer,
  Founding Member, Early Adopter) are awarded by actual behaviour, never sold and
  never faked. They're identity, not currency.
- **Shared language and mission.** "Build systems, not screens." "No more tab
  hoarding." A user can opt into that identity — and opt out freely.

| Do | Never |
|---|---|
| Reward genuine contribution with visible status | Award badges nobody earned to fake a thriving community |
| Make joining easy and leaving easy | Guilt, shame, or trap users who want to leave |
| Let the mission be something to opt into | Punish doubt or exit; manufacture us-vs-them |

### 4. Social proof — true, specific, and current

> In a social world, other people's confidence is contagious — so it has to be
> **real**. One fabricated number poisons every real one.

- **Prefer specific and verifiable over big and vague.** "1,204 palettes shared
  this month" (if true and live) beats "loved by thousands." Real creator names
  and real community work (with consent) beat stock testimonials.
- **Show the work, not just the claim.** Featured community systems, most-saved
  palettes, staff picks — social proof that *is* the product, generated by
  actual usage.
- **Keep it current.** Stale or padded metrics read as desperation and destroy
  trust. If a number can't be kept true and live, don't display it.

| Do | Never |
|---|---|
| Display real, live, attributable proof (with consent) | Invent testimonials, logos, reviews, or user counts |
| Use specific true numbers | Inflate or "round up" metrics into a lie |
| Attribute community work to real, consenting creators | Use someone's name/work as proof without permission |

---

## Hard guardrails (non-negotiable)

These apply to **every** growth surface, no exceptions:

1. **No fabricated social proof.** No fake testimonials, review counts, user
   counts, "as seen in" logos, or activity numbers. Ever.
2. **No fake scarcity or urgency.** No countdown that resets, no "3 left" that
   isn't true, no fake "someone in your city just upgraded."
3. **No dark-pattern friction.** Cancelling, downgrading, deleting an account, or
   declining an upsell must be as easy as the opposite action. (See the account
   deletion + downgrade flows — they stay honest.)
4. **No manufactured shame or anxiety.** We describe real problems the product
   solves; we never invent a defect in the user to sell a fix.
5. **A trial is a grant, not a leak.** Free tastes of Pro are deliberate,
   labelled, and tracked — never a gating bug we leave open. Gating logic
   (palette systems, exports) stays enforced.
6. **Consent for identity.** Real names, work, and likenesses appear as social
   proof only with permission.
7. **The face test.** If a tactic only works while the user doesn't understand
   it, it's a dark pattern. Cut it.

## How this maps to the surfaces

- **Onboarding / first run** — Pillar 1 (intent → reflected surface) + Pillar 2
  (drive to the first real win).
- **Empty states** — the highest-leverage "built for me" moment: an empty
  Projects list should suggest a personalised starting path, not shrug. (Ties
  into `murphys-law.md`.)
- **Upgrade prompts** — Pillar 2. Trigger on genuine value moments (the user hit
  a real limit after real use), state the honest benefit, and make declining
  frictionless.
- **Discover** — Pillars 3 and 4 live here; see `discover.md`.
- **Marketing / Learn copy** — Pillars 1 and 4; must not contradict
  `positioning.md`.

## The one-line test

> **Would this still work if the user could see exactly what we're doing — and
> would they thank us for it?**

If yes, it's growth. If no, it's manipulation, and it isn't shipped.
