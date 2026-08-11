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
// unmount: a GSAP hero entrance, scroll-triggered reveals, a light hero parallax,
// the satellite → workbench convergence and a magnetic primary CTA. Everything
// sits behind a reduced-motion guard — when motion is off we reveal all content
// instantly and leave native scrolling alone.
//
// Smooth scroll itself is owned app-wide by `useSmoothScroll` (a single Lenis
// module singleton); here we only subscribe ScrollTrigger to that shared instance
// so scrubbed + triggered animations track the smoothed scroll position exactly.
// There is exactly one rAF loop in the app and it lives in useSmoothScroll.
//
// GSAP + ScrollTrigger (~40KB gzip) are dynamically imported so they code-split
// into their own chunk and never weigh down the tool pages — only a home visit
// fetches them. To stay flash-free while that chunk loads, we hide the hero
// headline block synchronously (in a layout effect, before paint) via
// `.motion-armed` and hand that hidden state to GSAP the instant it arrives. If
// the chunk ever fails to load, we reveal everything and fall back to native
// scroll, so content is never stuck.
//
// PROGRESSIVE-ENHANCEMENT RULE, non-negotiable: the eleven satellite links and the
// whole mini-workbench are never hidden, faded, `inert`ed or opacity-gated by
// this file. The only thing that depends on GSAP is a layer of decorative,
// aria-hidden, non-focusable proxies that is CREATED here and destroyed on
// teardown — if GSAP never arrives, that layer simply never exists and the
// static composition is already the finished page.
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

    // Synchronous, pre-paint: mark the tree so CSS hides the hero copy and
    // silences its own reveal transition (GSAP will be the only engine easing
    // these). Note this covers the headline block only — never the tool links
    // and never the workbench.
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

        let removeProxyLayer = null

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

          // Must match the `max-width:1280px` static-field breakpoint in
          // global.css: below it the field is a plain grid and the convergence
          // proxies do not apply.
          const wide = window.matchMedia?.('(min-width: 1281px)').matches

          // ── THE IDLE DRIFT IS GONE. It was the cause of the founder's "it's
          //    not smooth". Eleven infinite yoyo tweens moved `.hsat-item` on x
          //    and y forever — and the convergence below measures its travel
          //    vector from `.hsat-link`, which lives INSIDE those moving items.
          //    So every proxy was placed from, and travelled from, an origin
          //    that had already moved by the time it painted, and every
          //    ScrollTrigger refresh re-measured against a different phase of
          //    eleven independent sine waves. Drift and convergence were
          //    animating the same coordinates against each other.
          //
          //    Removing it fixes the jitter at the root rather than damping it,
          //    and takes eleven permanently-running tweens off the main thread
          //    for a motion nobody asked for. The satellites now hold still,
          //    which is also what makes the convergence legible: something that
          //    was already floating cannot appear to depart. ──

          // ── Convergence: the causal story, told with throwaway objects. ──
          //    Eleven tools; five modes. A decorative chip peels off each tool
          //    link and travels to the workbench tab it belongs to — the three
          //    extra colour tools all land on Palette, both media tools land on
          //    Image — then fades as the workbench takes focus. Everything below
          //    is aria-hidden, non-focusable and removed on teardown.
          const intro = scope.querySelector('.home-workspace-intro')
          const anchors = gsap.utils.toArray('.hsat-link')
          if (wide && intro && anchors.length) {
            const layer = document.createElement('div')
            layer.className = 'hsat-proxy-layer'
            layer.setAttribute('aria-hidden', 'true')
            intro.appendChild(layer)
            removeProxyLayer = () => layer.remove()

            const proxies = anchors.map((anchor) => {
              const el = document.createElement('span')
              el.className = 'hsat-proxy'
              el.dataset.family = anchor.dataset.family || ''
              const icon = anchor.querySelector('.hsat-icon svg')?.cloneNode(true)
              if (icon) el.appendChild(icon)
              const label = document.createElement('span')
              label.className = 'hsat-proxy-label'
              label.textContent = anchor.querySelector('.hsat-label')?.textContent || ''
              el.appendChild(label)
              const hue = anchor.closest('.hsat-item')?.dataset.hue
              if (hue) el.dataset.hue = hue
              layer.appendChild(el)
              return {
                el,
                anchor,
                target: scope.querySelector(`.hw-tab[data-tab="${anchor.dataset.family}"]`),
              }
            }).filter((p) => p.target)

            // Both endpoints are measured against the same containing block, so
            // the travel vector survives scrolling, zoom and a re-layout.
            const centreIn = (base, el) => {
              const r = el.getBoundingClientRect()
              return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
            }
            const place = () => {
              const base = intro.getBoundingClientRect()
              proxies.forEach(({ el, anchor }) => {
                const r = anchor.getBoundingClientRect()
                el.style.left = `${r.left - base.left}px`
                el.style.top = `${r.top - base.top}px`
                el.style.width = `${r.width}px`
                el.style.height = `${r.height}px`
              })
            }
            place()

            let converged = false
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: '.home-hero',
                start: '34% top',
                end: 'bottom 26%',
                scrub: 0.3,
                invalidateOnRefresh: true,
                onRefresh: place,
                onUpdate: ({ progress }) => {
                  // Marks the moment the last proxy lands, so the workbench can
                  // settle as one beat. The old ring-and-crosshair "splash" that
                  // fired here is gone — the founder's note was that it was not
                  // what they were after, and it read as a second, unrelated
                  // animation firing at the end of the first. What remains is a
                  // single quiet settle on the shell itself.
                  const next = progress >= 0.96
                  if (next === converged) return
                  converged = next
                  scope.dataset.homeConverge = next ? 'converged' : 'moving'
                },
                onLeaveBack: () => { delete scope.dataset.homeConverge },
              },
            })

            proxies.forEach(({ el, anchor, target }, i) => {
              const travel = (axis) => () => {
                const base = intro.getBoundingClientRect()
                const from = centreIn(base, anchor)
                const to = centreIn(base, target)
                const current = Number(gsap.getProperty(el, axis)) || 0
                return axis === 'x' ? to.x - (from.x - current) : to.y - (from.y - current)
              }
              timeline
                .fromTo(el, { autoAlpha: 0, scale: 1 }, { autoAlpha: 0.92, duration: 0.08, ease: 'none' }, i * 0.012)
                .to(el, { x: travel('x'), y: travel('y'), scale: 0.62, ease: 'power1.inOut', duration: 0.74 }, 0.08 + i * 0.012)
                .to(el, { autoAlpha: 0, duration: 0.12, ease: 'none' }, 0.8 + i * 0.012)
            })
          }

          // Recede only the copy, so the satellites keep a stable travel origin.
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
          removeProxyLayer?.()
          scope.classList.remove('has-gsap')
          delete scope.dataset.homeConverge
        }
      })
      .catch(() => {
        // Motion chunk failed to load — restore native scroll and reveal all
        // content so nothing is left hidden behind the arming class. The
        // satellites and workbench were never hidden in the first place.
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
