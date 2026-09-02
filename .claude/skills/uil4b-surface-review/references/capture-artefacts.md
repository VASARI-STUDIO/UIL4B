# Capture artefacts — what is not a defect

Read this **before writing a finding**, not after.

Each of the three below produces a report that is confident, specific,
plausible, high-severity and entirely wrong. They are properties of how the
screenshot was taken, not of the page. Reporting one costs an engineer a real
investigation and costs the review its credibility — after the second false
BROKEN, the whole list gets discounted.

The rule: **an artefact is discounted and named, never silently dropped.** Say in
the report that you considered it. That is what stops the next agent
re-reporting it.

---

## 1. Scroll reveals never fire in a still capture

**The symptom:** whole sections below the fold are blank, invisible, or missing
in a full-page screenshot. It looks like catastrophic content loss.

**The cause:** `global.css` has

```css
[data-reveal]{opacity:0;transform:translateY(16px);…}
[data-reveal].is-in{opacity:1;transform:none}
```

`.is-in` is added by an IntersectionObserver-style trigger in
`src/hooks/useHomeMotion.js` — `ScrollTrigger.batch('[data-reveal]', { start:
'top 86%', onEnter … })`. The element becomes visible **only when it crosses 86%
of the viewport height during an actual scroll.** A full-page screenshot of a
page that was never scrolled leaves every below-fold `[data-reveal]` at
`opacity:0`. The content is there; it has not been revealed.

**What to do:** scroll the page to the bottom, wait for the reveals to settle,
then capture. If you need a true full-page shot, scroll first and capture second.

**Do not "fix" it by forcing opacity** and then reviewing that — you would be
reviewing a state no user ever sees, and the staggered arrival is part of the
design.

**The genuine defect nearby, worth distinguishing:** if a reveal element is
still invisible *after* a real scroll past it, that is real and it is BROKEN —
`useHomeMotion.js` has a fallback that reveals everything when the motion chunk
fails to load, and if that fallback is not working the content is unreachable.

## 2. Windowed lists render enormous blank height

**The symptom:** a library or gallery shows a handful of rows and then hundreds
or thousands of pixels of empty space. It reads as a catastrophic layout failure.

**The cause:** the grid is windowed. Only rows near the viewport are mounted;
the container is sized to the full list so the scrollbar is honest. The Emoji
Library is the clear case — **the grid renders 430 buttons at 1440×900 against a
catalogue of 1,636**. The other 1,206 are not missing, they are not mounted yet.

**What to do:** scroll the list and confirm rows mount as they approach. If they
do, there is no defect.

**The genuine defect nearby:** rows that never mount on scroll, a container
sized to the wrong total, or a windowed list whose scrollbar has been deleted —
that last one is the recurring defect and is real.

## 3. Blocked webfonts produce a spurious "didn't load" banner

**The symptom:** the Font Gallery or another typography surface shows
*"<Family> couldn't load, so a fallback is shown"*, or every specimen's script
column reads "Latin" down the whole page. It looks like the font pipeline is
broken.

**The cause:** the capture environment blocked Google Fonts, or the run is on the
bundled fallback catalogue. `FontGallery.jsx` is *deliberately* loud about this —
it verifies a face is actually painting before claiming to show it, precisely so
a system fallback is never silently passed off as the real family. The banner is
the honest-state machinery working. On the bundled fallback catalogue every entry
is latin-only, so "Latin" everywhere is the fallback list showing, not a data
fault.

**What to do:** confirm the capture had network access to the font host before
reporting anything about font loading. If it did not, the banner is an artefact
of your environment.

**The genuine defect nearby:** the banner appearing on a run that *did* have
network access, or a specimen rendering in a fallback face with **no** banner —
that second one is the failure the machinery exists to prevent and it is BROKEN.

---

## The general rule

Before any finding whose cause would be "the page is fundamentally broken", ask:
**would this have shipped without anyone noticing?** These are live surfaces the
founder uses. A defect that would be obvious within five seconds of real use, on
a route that is exercised, is more likely to be an artefact of your capture than
a regression nobody saw.

That instinct is not a reason to suppress a real finding. It is a reason to
**reproduce it by interacting with the live page** before you write it down. One
minute of interaction settles what an hour of reasoning about a screenshot
cannot.
