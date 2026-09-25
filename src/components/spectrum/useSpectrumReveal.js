import { useEffect } from 'react'
import { prefersReducedMotion } from './reducedMotion'

// A SCROLL REVEAL WHOSE RESTING STATE IS VISIBLE.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS RATHER THAN `useReveal()`
// ─────────────────────────────────────────────────────────────────────────────
// The shared hook is fine and this page used it first. The difference is not the
// observer, it is the CSS contract behind the attribute it drives:
//
//     [data-reveal]{opacity:0}
//     [data-reveal].is-in{opacity:1}
//
// The resting state is INVISIBLE, so every one of those blocks depends on the
// observer firing. Measured in a rendered browser on this page at 1440, driving
// the real Lenis scroll with wheel events from top to bottom:
//
//     fast pass (600px every 70ms)   16 of 19 blocks still at opacity 0
//     slow pass (300px every 250ms)   3 of 19 blocks still at opacity 0
//
// Both passes reached the foot of the document. A trackpad flick is the fast
// pass, and this is the front door — so on the most common way to read a long
// sales page, most of it was blank. The sections that stayed hidden were not the
// same ones twice, which is what makes it invisible in review: scroll it by hand
// at reading speed and it looks correct.
//
// It is the same defect class the repo has already paid for once. `useReveal`'s
// own comment records /learn meeting a reduced-motion visitor with "13 of its 14
// blocks blank — 1,659 characters of invisible text". That was fixed by forcing
// the blocks visible under reduced motion. This is the other half of the same
// bug: motion is ON, and the text is still gone.
//
// ── THE FIX IS THE ORDERING, NOT A BETTER OBSERVER ──────────────────────────
// `[data-sp-reveal]` has NO opacity of its own. The entrance is a keyframe
// animation that exists only while `.is-in` is on the element, and its final
// frame is the element's ordinary appearance. So:
//
//   · a missed observation costs the ANIMATION, never the content;
//   · the prerendered shell, which has no JS at all, reads correctly;
//   · a runtime with no IntersectionObserver reads correctly;
//   · reduced motion reads correctly, and does not depend on a CSS override
//     remembering to name every block.
//
// Nothing here can leave text on the page that a reader cannot see, which is the
// only property that actually matters.
//
// ── WHAT `.is-in` DRIVES ─────────────────────────────────────────────────────
// Only the word reveal. The design keeps every block at rest (`[data-reveal]
// {opacity:1;transform:none}`) and moves only the words, so the block fade
// (`sp-rise`) is gone and `[data-sp-reveal]` is purely the trigger for the
// headings inside it. The trigger line is the design's: 6% up from the bottom.
//
// ── AND IT STILL OBSERVES, BECAUSE THE ENTRANCE IS WORTH HAVING ─────────────
// `rootMargin` pulls the trigger line up from the bottom edge so a block starts
// moving as it comes into view rather than once it is already read, and each
// node is unobserved after it fires — a one-shot, like the shared hook. Content
// on this page is static, so a single mount-time scan is sufficient.
export function useSpectrumReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-sp-reveal]:not(.is-in)'))
    if (!nodes.length) return undefined

    // Motion off: mark everything settled immediately. The class is still added
    // rather than left off, so `.is-in` means "arrived" everywhere on the page
    // and no rule has to special-case the absence of it.
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      nodes.forEach((n) => n.classList.add('is-in'))
      return undefined
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          obs.unobserve(entry.target)
        }
      },
      // threshold 0 — ANY overlap counts. The shared hook asks for 0.15, which a
      // block taller than the viewport can never reach while it is the thing
      // being read. Here the cost of a late trigger is only a late animation, so
      // the generous threshold is the right trade.
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}
