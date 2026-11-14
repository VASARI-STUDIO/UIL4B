import { useSyncExternalStore } from 'react'

// The one colour the contrast guide is working with. The hero specimen, the
// size ruler, the channel bars and the try-it field all read it, so picking a
// grey in one place repaints the others. It is held outside React so those
// parts, which sit in different branches of the page, need no shared parent.
//
// The pick lives in the URL as ?fg= so a shared link keeps it.

export const CONTRAST_PICKS = ['#E5E5E5', '#949494', '#6B7280', '#595959', '#121418']
const DEFAULT_PICK = '#949494'

// 3 or 6 hex digits, with or without a leading #. Returns '#RRGGBB' or null.
export function parseHex(raw) {
  const v = String(raw ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(v)) return `#${v.split('').map((c) => c + c).join('').toUpperCase()}`
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`
  return null
}

let state = null
const listeners = new Set()

function fromUrl() {
  try {
    return parseHex(new URLSearchParams(window.location.search).get('fg')) || DEFAULT_PICK
  } catch {
    return DEFAULT_PICK
  }
}

function read() {
  if (!state) state = { hex: fromUrl(), text: null }
  return state
}

function write(next) {
  state = next
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('fg', next.hex.slice(1))
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* the pick still works without the URL */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** { hex, text }: the picked colour, and what the hex field shows while it is being typed (null: follow the pick). */
export function useContrastPick() {
  return useSyncExternalStore(subscribe, read, read)
}

export function pickContrastHex(hex) {
  write({ hex, text: null })
}

// Typing: a complete hex sets the pick; anything else is kept as typed.
export function typeContrastHex(text) {
  const hex = parseHex(text)
  write({ hex: hex || read().hex, text })
}

// Forgets the pick, so the next visit starts from its own ?fg= or the default.
export function resetContrastPick() {
  state = null
}
