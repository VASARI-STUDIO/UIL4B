// Fetch one emoji's artwork from one Iconify set and turn it into an image src.
//
// The request is the batched `/{prefix}.json?icons=name` form the Icon Library
// already uses, sent through the same cached, rate-limit-aware iconifyFetch.
// The answer is `{ icons: { name: { body } }, aliases, not_found: [name] }`.
// The body is markup from a third party, so it never goes into the DOM as HTML:
// it is wrapped in an <svg> root and handed to an <img> as a data: URI, a
// non-scripting context.

import { iconifyFetch, ICONIFY_HOST, HELD_HEADER } from './iconifyFetch.js'

// Iconify's own default box when neither the icon nor the set gives one.
const DEFAULT_BOX = 16

// 'prefix:name' -> the settled answer. Only a definite answer is kept: a
// failure is not, so the next open of the dialog tries again.
const settled = new Map()

/**
 * The standalone SVG for `name` from a batched answer, or '' when the answer
 * has no usable icon of that name. An alias is followed to its parent; an alias
 * that rotates or flips its parent is treated as absent rather than drawn wrong.
 */
export function svgFromBatch(data, name) {
  const icons = data?.icons
  if (!icons || typeof icons !== 'object') return ''
  let icon = icons[name]
  if (!icon) {
    const alias = data.aliases?.[name]
    if (!alias || alias.rotate || alias.hFlip || alias.vFlip) return ''
    icon = icons[alias.parent]
  }
  if (!icon || typeof icon.body !== 'string' || !icon.body) return ''
  const width = Number(icon.width ?? data.width) || DEFAULT_BOX
  const height = Number(icon.height ?? data.height) || DEFAULT_BOX
  const left = Number(icon.left ?? data.left) || 0
  const top = Number(icon.top ?? data.top) || 0
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}">${icon.body}</svg>`
}

export function svgDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// A comment may not hold "--", so a value that has one is closed up.
const commentSafe = (value) => String(value || '').replace(/-{2,}/g, '-').replace(/[\r\n]+/g, ' ').trim()

/**
 * The SVG as a downloaded file: the same markup with the set's credit written
 * into it as a comment straight after the root tag, so the attribution every
 * one of these licences asks for travels with the file. `credit` is a
 * packCredit() row; with none, the markup is returned unchanged.
 */
export function attributedSvg(svg, credit) {
  if (!svg || !credit) return svg || ''
  const lines = [
    `${credit.name}${credit.author ? ` by ${credit.author}` : ''}`,
    credit.copyright,
    credit.licenceName ? `Licence: ${credit.licenceName}${credit.licenceUrl ? ` (${credit.licenceUrl})` : ''}` : '',
    credit.url ? `Source: ${credit.url}` : '',
  ].map(commentSafe).filter(Boolean)
  const close = svg.indexOf('>')
  if (close < 0) return svg
  return `${svg.slice(0, close + 1)}<!-- ${lines.join(' | ')} -->${svg.slice(close + 1)}`
}

/** `waving-hand-twemoji.svg`: the emoji's name, then the set's prefix. */
export function styleFileName(emojiName, prefix) {
  const base = String(emojiName || 'emoji').toLowerCase().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'emoji'
  return `${base}-${prefix}.svg`
}

/**
 * Resolves to one of
 *   { status: 'ok', src, svg } the set draws this emoji; `src` is a data: URI of `svg`
 *   { status: 'missing' }     the set answered and has no such icon
 *   { status: 'error' }       the service could not be reached or refused
 * and never rejects.
 */
export async function loadStyleImage(prefix, name) {
  const key = `${prefix}:${name}`
  const hit = settled.get(key)
  if (hit) return hit
  try {
    const url = `${ICONIFY_HOST}/${prefix}.json?icons=${encodeURIComponent(name)}`
    const res = await iconifyFetch(url, { timeout: 8000 })
    if (res.headers.get(HELD_HEADER) || !res.ok) return { status: 'error' }
    const svg = svgFromBatch(await res.json(), name)
    const out = svg ? { status: 'ok', src: svgDataUri(svg), svg } : { status: 'missing' }
    settled.set(key, out)
    return out
  } catch {
    return { status: 'error' }
  }
}
