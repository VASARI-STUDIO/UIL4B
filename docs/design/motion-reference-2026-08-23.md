# Motion and style reference — founder-supplied, 2026-08-23

> ## Status, 2026-09-10 — **LIVE REFERENCE. Not superseded.**
>
> This is the only document here the founder supplied himself, and it records
> taste rather than a plan, so nothing in the product can date it. Use it as
> design input.
>
> Two things to know before you reach for it: the motion that has actually
> shipped is governed by `src/hooks/useHomeMotion.js` and the reduced-motion
> rules in `src/styles/global.css`, not by this file; and the frames are
> deliberately not committed, for the reason stated below.

The founder supplied a reference and said: *"i like alot of these micro
animations, i like the design style i also like some of ther other larger
animations and styles for the discover sales page."*

**Source:** a Dribbble shot for **"Pallet Ross"**, an art marketplace —
`https://cdn.dribbble.com/userupload/17954723/file/original-c33ce0d880b26637e8ad3ddd194159d6.mp4`
(43s, 1600×1200, 30fps).

**Third-party work. Frames are deliberately not committed** — this is someone
else's design and the repository should not carry it. Reproduce them instead:

```bash
curl -sL -o ref.mp4 "<url above>"
ffmpeg -i ref.mp4 -vf "fps=1/3.6,scale=760:-1" -q:v 3 f_%02d.jpg
```

That gives 12 evenly-spaced frames, which is what this analysis is based on.

---

## The one idea underneath all of it

**The chrome is neutral and every drop of colour comes from the content.**

Ground is a warm off-white. Nav is small and grey. Buttons are black pills.
Type is a large geometric grotesk in near-black. Then the artwork — saturated,
loud, wildly varied — supplies the entire palette of the page.

That is exactly the correction `anti-slop-and-hero-2026-08.md` asks for. Its
tell #2 is *"the first screen contains no product artefact"* and tell #5 is the
decorative grid that *"references nothing"*. This reference solves both without
adding a single decorative element: it deletes the decoration and lets the
content be the decoration.

**And it maps onto us almost directly.** Their artwork is our palettes and
gradients. We already ship 64 `GALLERY_PALETTES`, 100 `GALLERY_GRADIENTS` and
36 `BRAND_LIBRARY_PALETTES`, all real, all colourful, all offline-safe, and
PR #264 already renders them as their true artefacts. The V2 bone-and-ink
ground is already the neutral chrome this pattern needs. We have the ingredients.

---

## The vocabulary, frame by frame

### 1 · The page floats as a rounded sheet

Every frame sits on a soft grey ground with the page itself as a large
rounded-corner card carrying a wide, low-opacity shadow. It reads as an object,
not a document.

Cheap for us: one container, one radius token, one shadow token. **Caution:**
it eats horizontal room at small widths, and our mobile audit already found
content clipping on phones. If adopted, the sheet inset must collapse to zero
below roughly 768px.

### 2 · Fanned and cascading card decks

Two variants:
- **Hero (frame 1):** a symmetric arc of ~8 cards, each rotated a few degrees,
  overlapping, splaying outward from centre.
- **Split hero (frame 2):** an asymmetric cascade falling to the lower right,
  cards at varied scales and rotations, some bleeding off the edge.

For us this is a fan of **palette cards** or **gradient tiles** — our artefacts
already render at card scale.

### 3 · Attribution chips as speech bubbles

Small dark rounded chips reading `@howard`, `@robin` pinned above cards, with a
little tail. In the grid (frame 10) the highlighted card carries `@artist` plus
a name row and a **Like** button.

> ⚠️ **Do not copy this literally.** Our gallery data is **curated, not
> member-submitted**. Putting `@handle` chips on it would fabricate a community
> we have not built — the exact failure `growth-persuasion.md` forbids, and the
> reason PR #264 moved that section's eyebrow from `[ COMMUNITY ]` to
> `[ DISCOVER ]`. The *form* is worth stealing; the *claim* is not. Use the
> artefact's real identity — palette name, harmony, contrast grade — where they
> put a handle.

### 4 · Staggered word-level text reveals

Frames 1 and 4 catch body copy mid-reveal: words arriving individually with
what looks like blur plus opacity, slightly out of sync.

**We already have the safe version of this** — `home-hero-clip-up` with the
`.28em` clip-container derivation from PR #262. Reuse it rather than inventing
a second entrance. Note our clip container is load-bearing: changing its padding
moves where the mask starts.

### 5 · Drifting tile fields (frame 7)

"You will find yourself among us" — rounded avatar tiles scattered above and
below the headline, drifting slowly inward at varied sizes and depths. Genuinely
striking, and the closest thing here to a signature moment.

Our equivalent is a drift of **real palette swatches and gradient tiles**. This
is the strongest candidate for the Discover page's one large moment.

### 6 · The highlighted grid card (frame 10)

A masonry grid where one card lifts, scales slightly, and reveals attribution
and a Like action. This is the browsing pattern the earlier Mobbin research
already recommended (Lovable's *From the Community*), arrived at independently.

> ⚠️ **The reveal must not use `visibility`.** It is a discrete property; putting
> it in a `transition` flips it at 50% of the duration and a keyboard user
> outruns it — measured here as **0 of 5 controls reachable** at normal tabbing
> speed. Use `opacity` + `pointer-events`, and make the actions reachable on
> touch, where there is no hover at all. Our mobile audit found this exact fault
> live on the Palette Library (S12) and Community (S13/S14).

### 7 · Marquee ticker (frame 12)

A yellow strip of icons scrolling horizontally behind the nav. Our `--hi`
(`#E9FF64`) is almost exactly that yellow.

> ⚠️ `--hi` is budgeted at **one use per viewport** — anti-slop tell #4 is that
> we currently spend it badly. A marquee would consume that budget entirely.
> Worth it only if it replaces the current use, not adds to it. A marquee is
> also auto-moving content, so **WCAG 2.2.2** applies: it needs a discoverable
> stop. We already have one partially-met 2.2.2 case in the typing animation.

### 8 · Two-up feature cards (frame 12)

One full-bleed image card with overlaid text and a light pill CTA, beside one
white card with a large artefact and a dark pill CTA. Deliberately **unequal** —
different grounds, different CTA treatments.

That asymmetry is the point, and it is the fix for anti-slop tell "three cards
of equal weight where the three things are not equally important."

### 9 · Buttons

One dark pill primary, one ghost secondary, consistently. We already have this:
`.btn` on `--radius-pill` with Primary / `.btn-inverse` / Quiet, plus
`.hover-lift`. **No new button system is needed.**

---

## What to do with this

**Adopt:** neutral chrome with colour from content (§1 idea) · the artefact fan
(§2) · the drifting tile field as Discover's one signature moment (§5) · the
highlighted grid card (§6) · deliberate two-up asymmetry (§8).

**Adapt, do not copy:** attribution chips — keep the form, replace the fabricated
handle with the artefact's real identity (§3).

**Weigh carefully:** the floating sheet (§1 — mobile cost) and the marquee
(§7 — spends the whole `--hi` budget and triggers WCAG 2.2.2).

**Already have it:** staggered entrance (§4) and the button system (§9).

## The evidence gap this does not close

This is **one reference the founder likes** — evidence class `observed`, and a
sample of one. It says what the founder responds to, which is genuinely
decisive for taste, but it is not proof a pattern performs.

It also **cannot supply timings.** These are 12 stills from a 43-second video;
every duration and easing here would be inferred from frame positions, which is
guessing. The `motionsites` MCP server was registered on 2026-08-23 for exactly
this gap but **its tools are not live until Claude Code restarts**. Until then,
any timing recommendation is `judgement` and must say so — as the tab-switch
transition and the typing animation already do.

Pair this with Mobbin for structure and `motionsites` for motion before the
Discover design pass is treated as evidenced.
