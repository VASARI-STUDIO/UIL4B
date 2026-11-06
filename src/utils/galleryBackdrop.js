// The image an open Font Gallery band shows behind its family name.
//
// There are 30 strips under public/gallery-bg: 20 for a dark ground (four each
// for sans, serif, display, script and mono) and 10 for a light one (two each).
// A family picks one from its kind, then from the sum of its name's character
// codes, so the same family always gets the same strip.
//
// Each strip ships four files: `<name>.avif` and `<name>.webp` at 1536 x 460
// (the widest a band is painted; a retina screen is not asked for more), and
// `<name>-m.avif` and `<name>-m.webp` at 768 x 230 for a phone, where the band is
// 390 wide. A strip is named by its `<name>.webp` url, and every other file is
// worked out from that.

export const BACKDROP_BASE = '/gallery-bg/'

// The width up to which the gallery uses its phone layout, and so the small files.
export const BACKDROP_SMALL = '(max-width: 767px)'

// The order inside each list is part of the choice: it is what the index lands
// on, so reordering a list changes which family gets which strip.
const SETS = {
  dark: {
    sans: ['dark-sans-1b', 'dark-sans-3', 'dark-script-4', 'dark-serif-2'],
    serif: ['dark-serif-1', 'dark-serif-3', 'dark-serif-4', 'dark-sans-2'],
    display: ['dark-display-1', 'dark-display-3', 'dark-display-4', 'dark-sans-4'],
    script: ['dark-script-1', 'dark-script-2', 'dark-script-3', 'dark-display-2'],
    mono: ['dark-mono-1', 'dark-mono-2', 'dark-mono-3', 'dark-mono-4'],
  },
  light: {
    sans: ['light-sans-1', 'light-sans-2'],
    serif: ['light-serif-1', 'light-serif-2'],
    display: ['light-display-1', 'light-display-2'],
    script: ['light-script-1', 'light-script-2'],
    mono: ['light-mono-1', 'light-mono-2'],
  },
}

const KIND_OF_CATEGORY = {
  'sans-serif': 'sans',
  serif: 'serif',
  display: 'display',
  handwriting: 'script',
  monospace: 'mono',
}

const urlOf = (name) => `${BACKDROP_BASE}${name}.webp`

// The file for a strip's url in one format and size.
const fileOf = (url, ext, small) => url.replace(/\.webp$/, `${small ? '-m' : ''}.${ext}`)

const isSmall = () => typeof window !== 'undefined' && !!window.matchMedia?.(BACKDROP_SMALL).matches

// A CSS image for a strip: the browser takes the AVIF where it can read it and
// the WebP where it cannot.
export function backdropImage(url, small = false) {
  return `image-set(url(${fileOf(url, 'avif', small)}) type("image/avif"), url(${fileOf(url, 'webp', small)}) type("image/webp"))`
}

// The custom properties a band carries: the full size, and the small one the
// phone layout switches to in CSS.
export const backdropVars = (url) => ({
  '--fg-bgimg': backdropImage(url),
  '--fg-bgimg-m': backdropImage(url, true),
})

// The kind a Google category maps to; anything unknown reads as sans.
export function backdropKind(category) {
  return KIND_OF_CATEGORY[category] || 'sans'
}

// The sum of a name's UTF-16 character codes, the stable number a family's
// strip is picked by.
export function nameSum(family) {
  let sum = 0
  const name = String(family || '')
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return sum
}

// `ground` is 'dark' or 'light'; anything else is dark.
export function backdropFor(family, category, ground) {
  const set = SETS[ground === 'light' ? 'light' : 'dark'][backdropKind(category)]
  return urlOf(set[nameSum(family) % set.length])
}

// Every strip for a ground, or just the four or two of one kind.
export function backdropUrls(ground, kind) {
  const set = SETS[ground === 'light' ? 'light' : 'dark']
  const lists = kind && set[kind] ? [set[kind]] : Object.values(set)
  return lists.flat().map(urlOf)
}

const loaded = new Set()
const queued = new Set()

// A strip is in per size, so a window resized across the phone breakpoint
// does not count the other size as fetched.
const keyOf = (url) => `${url}|${isSmall() ? 'm' : 'w'}`

// Fetches a strip and resolves once it can paint. It goes through a detached
// <picture> so the browser makes the same format choice the band's CSS makes,
// and the file it fetches is the one the band paints. A strip that is already
// in resolves at once; one that fails resolves false so a caller can carry on
// to the next.
export function loadBackdrop(url) {
  const key = keyOf(url)
  if (loaded.has(key)) return Promise.resolve(true)
  if (typeof document === 'undefined') return Promise.resolve(false)
  const small = isSmall()
  return new Promise((resolve) => {
    const picture = document.createElement('picture')
    const source = document.createElement('source')
    source.type = 'image/avif'
    source.srcset = fileOf(url, 'avif', small)
    const img = document.createElement('img')
    img.decoding = 'async'
    picture.append(source, img)
    const done = (ok) => {
      if (ok) loaded.add(key)
      resolve(ok)
    }
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = fileOf(url, 'webp', small)
  })
}

export const backdropReady = (url) => loaded.has(keyOf(url))

// Loads strips one after another, so a phone on a slow link never has several
// in flight at once. A url that is already queued or in is skipped.
export async function loadBackdropsInTurn(urls, shouldStop) {
  for (const url of urls) {
    if (shouldStop?.()) return
    const key = keyOf(url)
    if (loaded.has(key) || queued.has(key)) continue
    queued.add(key)
    await loadBackdrop(url)
    queued.delete(key)
  }
}
