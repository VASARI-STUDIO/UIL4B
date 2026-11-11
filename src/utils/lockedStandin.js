// The picture a locked image preview loads in place of the real one.
//
// A CSS blur over the real file is not a paywall: the file is in the page, so an
// image-saving extension, "Save image as" or a devtools edit gets it sharp. A
// locked preview therefore never receives the real URL. It receives the address
// of a stand-in: the same picture shrunk to a few dozen pixels and softened
// (scripts/library/lockedStandins.mjs, public/locked-images/). The card scales
// it up with a mild CSS blur, so the look is the old wash with nothing sharper
// behind it.
//
// The mapping is a pure string function, so a component that knows only that a
// row is locked can ask for the stand-in without importing the real address, and
// tests can check both halves.
import { themeShots } from '../config/exportThemePicker.js'

const BASE = '/locked-images'

/** The stand-in for a community prompt's output poster. */
export const promptStandinSrc = (id) => `${BASE}/prompts/${encodeURIComponent(id)}.webp`

/**
 * The stand-in for an export theme picture, from that picture's own address
 * (`/export-themes/<theme>-<key>.webp`). Anything else comes back as an empty
 * string, never as the address it was given.
 */
export const themeStandinSrc = (src) => {
  const m = /^\/export-themes\/([\w-]+\.webp)$/.exec(String(src))
  return m ? `${BASE}/export-themes/${m[1]}` : ''
}

/** A theme's preview pictures for a kind, each pointing at its stand-in: [{ src, alt }]. */
export const themeStandinShots = (kind, theme) => (
  themeShots(kind, theme).map((s) => ({ ...s, src: themeStandinSrc(s.src) }))
)

const fetched = new Set()
/** Fetch a theme's stand-ins ahead of showing them. Resolves when they are in (a failed one counts). */
export const preloadThemeStandins = (kind, theme) => Promise.all(themeStandinShots(kind, theme).map(({ src }) => (
  fetched.has(src) ? true : new Promise((done) => {
    const img = new Image()
    img.onload = img.onerror = () => { fetched.add(src); done(true) }
    img.src = src
  })
)))
