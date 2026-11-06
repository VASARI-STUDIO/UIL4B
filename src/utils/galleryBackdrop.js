// The image an open Font Gallery band shows behind its family name.
//
// There are 30 strips under public/gallery-bg: 20 for a dark ground (four each
// for sans, serif, display, script and mono) and 10 for a light one (two each).
// A family picks one from its kind, then from the sum of its name's character
// codes, so the same family always gets the same strip.

export const BACKDROP_BASE = '/gallery-bg/'

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

// Fetches a strip and resolves once it can paint. A strip that is already in
// resolves at once; one that fails resolves false so a caller can carry on to
// the next.
export function loadBackdrop(url) {
  if (loaded.has(url)) return Promise.resolve(true)
  if (typeof Image === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    const done = (ok) => {
      if (ok) loaded.add(url)
      resolve(ok)
    }
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = url
  })
}

export const backdropReady = (url) => loaded.has(url)

// Loads strips one after another, so a phone on a slow link never has several
// in flight at once. A url that is already queued or in is skipped.
export async function loadBackdropsInTurn(urls, shouldStop) {
  for (const url of urls) {
    if (shouldStop?.()) return
    if (loaded.has(url) || queued.has(url)) continue
    queued.add(url)
    await loadBackdrop(url)
    queued.delete(url)
  }
}
