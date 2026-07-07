import { useLayoutEffect } from 'react'
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
// unmount: a GSAP hero entrance, scroll-triggered reveals, a light hero parallax
// and a magnetic primary CTA. Everything sits behind a reduced-motion guard — when
// motion is off we reveal all content instantly and leave native scrolling alone.
//
// Smooth scroll itself is owned app-wide by `useSmoothScroll` (a single Lenis
// module singleton); here we only subscribe ScrollTrigger to that shared instance
// so scrubbed + triggered animations track the smoothed scroll position exactly.
// There is exactly one rAF loop in the app and it lives in useSmoothScroll.
//
// GSAP + ScrollTrigger (~40KB gzip) are dynamically imported so they code-split
// into their own chunk and never weigh down the tool pages — only a home visit
// fetches them. To stay flash-free while that chunk loads, we hide the hero
// synchronously (in a layout effect, before paint) via `.motion-armed` and hand
// that hidden state to GSAP the instant it arrives. If the chunk ever fails to
// load, we reveal everything and fall back to native scroll, so content is never
// stuck.
//
// Owns the reveals that `useReveal()` handles elsewhere, so Home calls this
// instead of that hook.
export function useHomeMotion(scopeRef) {
  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    if (prefersReducedMotion()) {
      revealAll(scope)
      return
    }

    // Synchronous, pre-paint: mark the tree so CSS hides the hero and silences its
    // own reveal transition (GSAP will be the only engine easing these).
    scope.classList.add('has-gsap', 'motion-armed')

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
          // GSAP now controls the hidden state; drop the CSS pre-hide so its
          // inline tweens are unobstructed (same frame — no paint in between).
          scope.classList.remove('motion-armed')

          // ── Hero entrance: each headline line clips up from below with a blur
          //    burn-off, then the sub, CTAs and hint rise underneath it. ──
          gsap.timeline({ defaults: { ease: 'power3.out' } })
            .from('.home-hero-line-in', { yPercent: 110, filter: 'blur(12px)', duration: 1.1, stagger: 0.12, ease: 'expo.out', clearProps: 'transform,filter' })
            .from('.home-hero-sub', { y: 22, autoAlpha: 0, duration: 0.8 }, '-=0.7')
            .from('.home-hero-cta > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.1, clearProps: 'transform' }, '-=0.5')
            .from('.home-hero-hint', { y: 14, autoAlpha: 0, duration: 0.6 }, '-=0.45')

          // ── Hero parallax: content gently recedes as you scroll past it, giving
          //    the fold depth against the sections sliding up beneath it. ──
          gsap.to('.home-hero', {
            yPercent: -8,
            autoAlpha: 0.5,
            ease: 'none',
            scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: true },
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

          // ── Community rail: cards slide in from the right with a stagger. ──
          const scroller = scope.querySelector('.home-scroller')
          if (scroller && scroller.children.length) {
            gsap.from(scroller.children, {
              x: 48,
              autoAlpha: 0,
              duration: 0.7,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: { trigger: scroller, start: 'top 88%' },
            })
          }

          // ── Magnetic hero CTA: the primary pill drifts a few px toward the
          //    pointer on fine-pointer devices, then springs back. Skipped on
          //    touch; reduced motion never reaches here. ──
          const magnet = scope.querySelector('.home-hero-cta .ui-pill-ink')
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
        // content so nothing is left hidden behind the arming class.
        scope.classList.remove('has-gsap', 'motion-armed')
        revealAll(scope)
      })

    return () => {
      cancelled = true
      if (teardown) teardown()
      else scope.classList.remove('has-gsap', 'motion-armed')
    }
  }, [scopeRef])
}
