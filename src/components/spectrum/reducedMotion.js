// "Is motion off right now?", answered the way global.css answers it.
//
// The app has TWO inputs and they are not equal partners. `html[data-reduced-motion]`
// is the user's own choice in Settings (AppearanceContext writes it) and it WINS
// in both directions; `prefers-reduced-motion` is the operating system's
// preference and applies only when the user has expressed no choice. global.css
// encodes exactly that precedence:
//
//     html[data-reduced-motion="true"] … { transition-duration:0.01ms!important }
//     @media(prefers-reduced-motion:reduce){ html:not([data-reduced-motion="false"]) … }
//
// A JS check that reads only the media query would disagree with the stylesheet
// for the two users who matter most here: somebody who turned motion OFF in
// Settings on a machine with no OS preference (JS says animate, CSS says do not),
// and somebody who turned it ON deliberately despite an OS preference (JS says
// do not, CSS says animate). Both produce a half-animated page.
//
// Returns false during SSR/prerender, which is correct: scripts/prerender.mjs
// renders to a string with no window, nothing animates in a string, and the
// hydrated page re-runs this on mount.
export function prefersReducedMotion() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  const chosen = document.documentElement.getAttribute('data-reduced-motion')
  if (chosen === 'true') return true
  if (chosen === 'false') return false
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}
