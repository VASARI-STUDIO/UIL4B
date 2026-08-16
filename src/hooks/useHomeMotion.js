import { useLayoutEffect, useRef } from 'react'
import { getLenis } from './useSmoothScroll'

// Reduced-motion source of truth. AppearanceContext writes
// html[data-reduced-motion="true|false"] and treats that toggle as authoritative
// (the app deliberately lets a user opt back into motion even if their OS asks to
// reduce it), so we mirror that here and only fall back to the OS query if the
// attribute is ever missing.
function prefersReducedMotion() {
  const attr = document.documentElement.getAttribute('data-reduced-motion')
  if (attr === 'true') return true
  if (attr === 'false') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Belt-and-suspenders reveal: never leave content stranded hidden. Covers the
// single-element reveals and the grouped ones (whose children are the animated
// units), so the reduced-motion / failed-chunk paths show everything at rest.
function revealAll(scope) {
  scope.querySelectorAll('[data-reveal],[data-reveal-group]').forEach((el) => el.classList.add('is-in'))
}

// The home page's motion system, scoped to the home route and fully torn down on
// unmount: scroll-triggered reveals, a light hero parallax, the V2 sticky-step
// sync and a magnetic primary CTA. Everything sits behind a reduced-motion
// guard — when motion is off we reveal all content instantly and leave native
// scrolling alone.
//
// V2: the satellite → workbench convergence is GONE. It moved decorative proxies
// from the eleven hero tool links to the workbench tabs, and the V2 page has
// neither of those adjacencies — the tools grid is now a section of its own and
// the workbench lives inside the sticky-scroll section far below the hero. What
// replaced it is the sticky step sync, which is the same idea told better:
// scrolling the step narrative swaps the mode of the REAL workbench beside it,
// so the motion moves actual product state rather than throwaway chips.
//
// The mock drove that sync with a raw window.addEventListener('scroll') handler.
// That is not ported: it ignores the reduced-motion contract, it fights Lenis
// for the scroll position, and it cannot be torn down with the rest of the
// context. ScrollTrigger, subscribed to the shared Lenis instance, is the
// existing mechanism and it already honours both.
//
// Smooth scroll itself is owned app-wide by `useSmoothScroll` (a single Lenis
// module singleton); here we only subscribe ScrollTrigger to that shared instance
// so scrubbed + triggered animations track the smoothed scroll position exactly.
// There is exactly one rAF loop in the app and it lives in useSmoothScroll.
//
// GSAP + ScrollTrigger (~40KB gzip) are dynamically imported so they code-split
// into their own chunk and never weigh down the tool pages — only a home visit
// fetches them. If the chunk ever fails to load, we reveal everything and fall
// back to native scroll, so content is never stuck.
//
// NOTHING ABOVE THE FOLD WAITS ON THAT CHUNK. The hero entrance used to run from
// a timeline here, which meant the headline was held at opacity:0 by a JS arming
// class until the import resolved — ~350ms of blank hero on a throttled CPU,
// then a pop. It is CSS keyframes in global.css now: it starts at first paint
// and runs on the compositor. Do not move it back.
//
// PROGRESSIVE-ENHANCEMENT RULE, non-negotiable: the command bar, every tool
// link and the whole mini-workbench are never hidden, faded, `inert`ed or
// opacity-gated by this file. If GSAP never arrives, the static composition is
// already the finished page: the workbench's own tablist is the authoritative
// mode control and the step narrative is plain readable prose.
//
// Owns the reveals that `useReveal()` handles elsewhere, so Home calls this
// instead of that hook.
//
// `options.onStepChange(tabId)` is called when the sticky section's active step
// changes. It is invoked from a scroll callback, never from the effect body, so
// it is a normal event-driven setState and not the set-state-in-effect
// advisory. It never fires under reduced motion or without GSAP.
export function useHomeMotion(scopeRef, options = {}) {
  const { onStepChange } = options
  const stepRef = useRef(onStepChange)
  stepRef.current = onStepChange

  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    if (prefersReducedMotion()) {
      revealAll(scope)
      return
    }

    // Synchronous, pre-paint: silence the CSS reveal transitions on
    // `[data-reveal]` so GSAP is the only engine easing them. This no longer
    // hides the hero — CSS owns that entrance start to finish.
    scope.classList.add('has-gsap')

    let cancelled = false
    let teardown = null

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !scope.isConnected) return
        gsap.registerPlugin(ScrollTrigger)

        // Keep ScrollTrigger synced to the app-wide Lenis instance so triggered +
        // scrubbed animations track the smoothed position. If Lenis is absent
        // (a teardown race), ScrollTrigger just reads native scroll.
        const lenis = getLenis()
        lenis?.on('scroll', ScrollTrigger.update)

        const ctx = gsap.context(() => {
          // The hero entrance is NOT here — it is CSS keyframes in global.css.
          // Running it from this timeline meant it could not begin until the
          // GSAP chunk resolved, so the headline sat hidden and then popped, and
          // its `filter: blur(12px)` tween re-rasterised the largest text on the
          // page every frame. Both are gone. GSAP keeps the work it is actually
          // needed for: the scroll-driven work below.

          // ── V2 sticky step sync ──────────────────────────────────────────
          //    The narrative column's steps each own a scroll band. As a band
          //    takes the middle of the viewport, its step becomes active — the
          //    left column marks it (CSS reads [data-active]) and the callback
          //    swaps the REAL workbench beside it into the matching mode.
          //
          //    Two-way: onEnter going down, onEnterBack coming up, so scrolling
          //    upward walks the modes back rather than sticking on the last one.
          //
          //    Below the two-column breakpoint the panel is not sticky and the
          //    steps read as a plain stacked list, so there is nothing to sync —
          //    matching `--hsteps-split` in global.css (min-width: 981px).
          const split = window.matchMedia?.('(min-width: 981px)').matches
          const steps = gsap.utils.toArray('.hstep')
          if (split && steps.length) {
            steps.forEach((step) => {
              const tab = step.dataset.step
              if (!tab) return
              const activate = () => stepRef.current?.(tab)
              ScrollTrigger.create({
                trigger: step,
                start: 'top 55%',
                end: 'bottom 55%',
                onEnter: activate,
                onEnterBack: activate,
              })
            })
          }

          // The hero copy recedes as the page moves past it.
          // `scrub: 0.4` rather than `true`: an unsmoothed scrub applies the raw
          // wheel delta, which on a trackpad arrives in coarse jumps and made
          // the headline step rather than glide — the same complaint as the
          // drift, from a different cause. The number is a catch-up duration, so
          // GSAP eases toward the scroll position instead of snapping to it.
          gsap.to('.home-hero-core', {
            yPercent: -8,
            autoAlpha: 0.5,
            ease: 'none',
            scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: 0.4 },
          })

          // ── Scroll reveals: batch single elements so each group animates in
          //    together with a stagger. `media` variants add a subtle scale
          //    burn-in; clearProps hands transform back to CSS afterwards so hover
          //    lifts keep working. ──
          gsap.set('[data-reveal]', { autoAlpha: 0, y: 28 })
          gsap.set('[data-reveal="media"]', { scale: 1.04, transformOrigin: '50% 50%' })
          ScrollTrigger.batch('[data-reveal]', {
            start: 'top 86%',
            onEnter: (els) => {
              els.forEach((el) => el.classList.add('is-in'))
              gsap.to(els, { autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: 'power3.out', stagger: 0.12, overwrite: true, clearProps: 'transform' })
            },
          })

          // ── Grouped reveals: the group's children are the animated units,
          //    staggering in together as the group crosses the trigger. ──
          gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
            const kids = gsap.utils.toArray(group.children)
            if (!kids.length) return
            gsap.set(kids, { autoAlpha: 0, y: 24 })
            ScrollTrigger.create({
              trigger: group,
              start: 'top 86%',
              once: true,
              onEnter: () => {
                group.classList.add('is-in')
                gsap.to(kids, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, overwrite: true, clearProps: 'transform' })
              },
            })
          })

          // The community strip is a `[data-reveal-group]`, so its cards are
          // already staggered by the grouped-reveal pass above. It used to get a
          // second, bespoke slide-from-the-right here — two engines animating
          // the same elements, which is how the old page ended up with cards
          // that stuttered on arrival.

          // ── Magnetic hero CTA: the primary pill drifts a few px toward the
          //    pointer on fine-pointer devices, then springs back. Skipped on
          //    touch; reduced motion never reaches here. ──
          const magnet = scope.querySelector('.home-hero-cta .ui-pill-accent')
          let removeMagnet = null
          if (magnet && window.matchMedia?.('(pointer: fine)').matches) {
            const xTo = gsap.quickTo(magnet, 'x', { duration: 0.5, ease: 'power3.out' })
            const yTo = gsap.quickTo(magnet, 'y', { duration: 0.5, ease: 'power3.out' })
            const onMove = (e) => {
              const r = magnet.getBoundingClientRect()
              xTo((e.clientX - (r.left + r.width / 2)) * 0.3)
              yTo((e.clientY - (r.top + r.height / 2)) * 0.4)
            }
            const onLeave = () => { xTo(0); yTo(0) }
            magnet.addEventListener('pointermove', onMove)
            magnet.addEventListener('pointerleave', onLeave)
            removeMagnet = () => {
              magnet.removeEventListener('pointermove', onMove)
              magnet.removeEventListener('pointerleave', onLeave)
            }
          }

          ScrollTrigger.refresh()

          // Returned cleanup runs on ctx.revert() — drop the magnet listeners.
          return () => { if (removeMagnet) removeMagnet() }
        }, scope)

        teardown = () => {
          lenis?.off('scroll', ScrollTrigger.update)
          ctx.revert()
          scope.classList.remove('has-gsap')
        }
      })
      .catch(() => {
        // Motion chunk failed to load — restore native scroll and reveal all
        // content so nothing is left hidden. The command bar, the tool links and
        // the workbench were never hidden in the first place; only the step sync
        // is lost, and the workbench's own tablist still selects every mode.
        scope.classList.remove('has-gsap')
        revealAll(scope)
      })

    return () => {
      cancelled = true
      if (teardown) teardown()
      else scope.classList.remove('has-gsap')
    }
  }, [scopeRef])
}
