import { useLayoutEffect } from 'react'

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

// Belt-and-suspenders reveal: never leave content stranded hidden.
function revealAll(scope) {
  scope.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'))
}

// The home page's motion system, scoped to the home route and fully torn down on
// unmount: Lenis smooth-scroll + a GSAP hero entrance, scroll-triggered reveals
// and a light hero parallax. Everything sits behind a reduced-motion guard — when
// motion is off we reveal all content instantly and leave native scrolling alone.
//
// GSAP + Lenis (~50KB gzip) are dynamically imported so they code-split into their
// own chunk and never weigh down the tool pages — only a home visit fetches them.
// To stay flash-free while that chunk loads, we hide the hero synchronously (in a
// layout effect, before paint) via `.motion-armed` and hand that hidden state to
// GSAP the instant it arrives. If the chunk ever fails to load, we reveal
// everything and fall back to native scroll, so content is never stuck.
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

    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')])
      .then(([{ gsap }, { ScrollTrigger }, { default: Lenis }]) => {
        if (cancelled || !scope.isConnected) return
        gsap.registerPlugin(ScrollTrigger)

        // Lenis owns the scroll. Drive its RAF from GSAP's ticker and keep
        // ScrollTrigger synced to the smoothed position so scrubbed + triggered
        // animations track it exactly. `anchors` makes in-page #links glide.
        const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true })
        lenis.on('scroll', ScrollTrigger.update)
        const ticker = (time) => lenis.raf(time * 1000)
        gsap.ticker.add(ticker)
        gsap.ticker.lagSmoothing(0)

        const ctx = gsap.context(() => {
          // GSAP now controls the hidden state; drop the CSS pre-hide so its
          // inline tweens are unobstructed (same frame — no paint in between).
          scope.classList.remove('motion-armed')

          // ── Hero entrance: the display line focuses in from a blur, the rest
          //    rises and staggers underneath it. ──
          gsap.timeline({ defaults: { ease: 'power3.out' } })
            .from('.home-hero-h1', { y: 26, autoAlpha: 0, filter: 'blur(10px)', duration: 1, ease: 'expo.out' })
            .from('.home-hero-sub', { y: 22, autoAlpha: 0, duration: 0.8 }, '-=0.62')
            .from('.home-hero-cta > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, '-=0.5')
            .from('.home-hero-hint', { y: 14, autoAlpha: 0, duration: 0.6 }, '-=0.45')

          // ── Hero parallax: content gently recedes as you scroll past it, giving
          //    the fold depth against the sections sliding up beneath it. ──
          gsap.to('.home-hero', {
            yPercent: -8,
            autoAlpha: 0.5,
            ease: 'none',
            scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: true },
          })

          // ── Scroll reveals: batch so each group animates in together with a
          //    stagger as it crosses into view, instead of one element at a time. ──
          gsap.set('[data-reveal]', { autoAlpha: 0, y: 28 })
          ScrollTrigger.batch('[data-reveal]', {
            start: 'top 86%',
            onEnter: (els) => {
              els.forEach((el) => el.classList.add('is-in'))
              gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.12, overwrite: true })
            },
          })

          ScrollTrigger.refresh()
        }, scope)

        teardown = () => {
          gsap.ticker.remove(ticker)
          lenis.destroy()
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
