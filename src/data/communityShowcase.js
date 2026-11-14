// The community showcase's sample pieces: made-up brands, drawn with the app's
// own export renders. Every piece is labelled a sample wherever it is shown;
// nothing here is a real person's work, and there are no counts, likes or
// reviews attached to any of it.
//
// A piece is { id, title, maker, kind, topic, look, madeIn, colours, image,
// alt, fit, credit }. `image` is { thumb, large }, each { avif, webp, width,
// height }, the same shape the homepage showcase uses.
import { showcaseImage } from '../components/home/showcaseImages.js'
import { HOME_EXPORT_IMAGES, homeExportSrc } from '../components/home/homeExportsImages.js'

export const SHOWCASE_MAKERS = Object.freeze([
  { handle: 'kerbside', name: 'Kerbside', line: 'A bike courier.', mark: '#E8590C' },
  { handle: 'encore', name: 'Encore', line: 'A gig ticketing app.', mark: '#C2255C' },
  { handle: 'saltbush', name: 'Saltbush', line: 'A native-food grocer.', mark: '#5C7C3A' },
  { handle: 'two-shores', name: 'Two Shores', line: 'A river ferry.', mark: '#1F6F8B' },
  { handle: 'margin', name: 'Margin', line: 'An independent publisher.', mark: '#7048A8' },
  { handle: 'offcut', name: 'Offcut', line: 'Invoicing for tradies.', mark: '#B7791F' },
  { handle: 'northern-current', name: 'Northern Current', line: 'A rooftop solar installer.', mark: '#0B7285' },
  { handle: 'long-room', name: 'Long Room', line: 'A contemporary art space.', mark: '#495057' },
  { handle: 'plumbline', name: 'Plumbline', line: 'A renovation builder.', mark: '#2B6CB0' },
  { handle: 'shallow-end', name: 'Shallow End', line: 'A swim school.', mark: '#0E7C66' },
])

export const SHOWCASE_KINDS_FILTER = Object.freeze(['Brand guide', 'UI kit', 'Photo', 'Icon', 'Palette'])

const showcase = (theme, kind) => showcaseImage(theme, kind)

// A photo from the export renders: one file per width, so the two sizes are
// the smallest and the largest.
function photo(id) {
  const meta = HOME_EXPORT_IMAGES[id]
  const small = meta.widths[0]
  const ratio = meta.height / meta.width
  const at = (w) => ({
    avif: homeExportSrc(id, 'avif', w),
    webp: homeExportSrc(id, 'webp', w),
    width: w,
    height: Math.round(w * ratio),
  })
  return { thumb: at(meta.widths[meta.widths.length > 1 ? 1 : 0] || small), large: at(meta.width) }
}

const LOOKS = Object.freeze({
  '01-presentation': { name: 'Presentation', pro: true },
  '02-poster': { name: 'Poster', pro: true },
  '03-broadsheet': { name: 'Broadsheet', pro: true },
  '04-standards': { name: 'Standards', pro: true },
  '05-specimen': { name: 'Specimen', pro: true },
  '06-studio': { name: 'Studio', pro: true },
  '07-spec': { name: 'Specification', pro: true },
  '08-monograph': { name: 'Monograph', pro: true },
  '09-blueprint': { name: 'Blueprint', pro: true },
  '10-inuse': { name: 'In use', pro: true },
})

function exportPiece(id, title, maker, theme, page, kind, topic, madeIn, alt) {
  return {
    id, title, maker, kind, topic, madeIn, alt,
    colours: maker === 'kerbside' ? KERBSIDE_COLOURS : null,
    look: LOOKS[theme],
    image: showcase(theme, page),
    credit: null,
  }
}

function photoPiece(id, title, maker, photoId, topic, alt) {
  return {
    id, title, maker, kind: 'Photo', topic, madeIn: null, colours: null, alt,
    look: null,
    image: photo(photoId),
    credit: { own: true },
  }
}

// Kerbside's own palette, as the example kit draws it. Other makers show no
// colours: the app holds no palette for them.
const KERBSIDE_COLOURS = Object.freeze(['#FF5A1F', '#1A1A1A', '#E6E4DE', '#FFFFFF'])

// Newest first.
export const SHOWCASE_PIECES = Object.freeze([
  // The one landscape cover: it fills its frame, anchored left so the wordmark is not cut.
  { ...exportPiece('kerbside-guide-cover', 'Brand guide cover', 'kerbside', '01-presentation', 'guide-cover', 'Brand guide', 'Branding', 'Brand Kit',
    'Kerbside brand guide cover, orange wordmark on asphalt'), fit: 'cover', pos: 'left' },
  exportPiece('shallow-end-signage', 'Signage', 'shallow-end', '10-inuse', 'guide-signage', 'Brand guide', 'Branding', 'Brand Kit',
    'Shallow End swim school signage page, wayfinding signs in teal'),
  exportPiece('two-shores-signage', 'Signage', 'two-shores', '04-standards', 'guide-signage', 'Brand guide', 'Branding', 'Brand Kit',
    'Two Shores ferry signage page laid out as a standards manual'),
  photoPiece('kerbside-evening-run', 'Evening run', 'kerbside', 'evening', 'Branding',
    'A Kerbside courier riding through an evening street'),
  exportPiece('offcut-kit-buttons', 'UI kit buttons', 'offcut', '06-studio', 'kit-buttons', 'UI kit', 'Dashboard', 'Brand Kit',
    'Offcut invoicing UI kit, buttons in every state'),
  exportPiece('margin-typefaces', 'Typefaces', 'margin', '05-specimen', 'guide-typefaces', 'Brand guide', 'Branding', 'Brand Kit',
    'Margin publisher type specimen page showing the two typefaces'),
  exportPiece('encore-social', 'Social posts', 'encore', '02-poster', 'guide-social', 'Brand guide', 'Branding', 'Brand Kit',
    'Encore ticketing app social post templates in poster style'),
  exportPiece('northern-current-palette', 'Colour palette', 'northern-current', '07-spec', 'guide-palette', 'Palette', 'Branding', 'Palette Builder',
    'Northern Current colour page, five swatches with their values'),
  exportPiece('saltbush-kit-example', 'Kit example', 'saltbush', '03-broadsheet', 'kit-screen-light', 'UI kit', 'E-commerce', 'Brand Kit',
    'Saltbush grocer shop screen built from its UI kit'),
  exportPiece('long-room-photo-direction', 'Photo direction', 'long-room', '08-monograph', 'guide-cover', 'Brand guide', 'Portfolio', 'Brand Kit',
    'Long Room art space brand guide cover in a monograph layout'),
  exportPiece('plumbline-kit-screen', 'Kit screen', 'plumbline', '09-blueprint', 'kit-screen-light', 'UI kit', 'Landing', 'Brand Kit',
    'Plumbline renovation builder screen in a blueprint style'),
  exportPiece('kerbside-palette-page', 'Palette page', 'kerbside', '01-presentation', 'guide-palette', 'Palette', 'Branding', 'Brand Kit',
    'Kerbside colour page with five swatches'),
  exportPiece('offcut-guide-cover', 'Brand guide cover', 'offcut', '06-studio', 'guide-cover', 'Brand guide', 'Branding', 'Brand Kit',
    'Offcut brand guide cover in the studio look'),
  photoPiece('kerbside-bus-shelter-poster', 'Bus shelter poster', 'kerbside', 'busstop-poster', 'Branding',
    'A Kerbside poster on a bus shelter at dusk'),
])

export const SHOWCASE_TOPICS = Object.freeze(['Landing', 'Dashboard', 'Portfolio', 'E-commerce', 'Mobile', 'Branding'])

export const makerByHandle = (handle) => SHOWCASE_MAKERS.find((m) => m.handle === handle) || null
export const pieceById = (id) => SHOWCASE_PIECES.find((p) => p.id === id) || null
export const piecesBy = (handle) => SHOWCASE_PIECES.filter((p) => p.maker === handle)
export const isInspiration = (piece) => piece.kind === 'Photo'

/** The maker's name for a piece. */
export const makerName = (piece) => makerByHandle(piece.maker)?.name || ''

/**
 * Up to `n` pieces to show under a piece: the same maker's other pieces, or
 * when the maker has fewer than two, one piece from other makers.
 * Returns { head, pieces } where head is 'More from {Maker}' or 'More makers'.
 */
export function moreFor(piece, n = 3) {
  const own = SHOWCASE_PIECES.filter((p) => p.maker === piece.maker && p.id !== piece.id)
  if (own.length >= 2) return { head: `More from ${makerName(piece)}`, pieces: own.slice(0, n) }
  return { head: 'More makers', pieces: otherMakers(piece.maker, n) }
}

/** One piece from each of `n` other makers, newest first. */
export function otherMakers(handle, n = 3) {
  const seen = new Set([handle])
  const out = []
  for (const p of SHOWCASE_PIECES) {
    if (seen.has(p.maker)) continue
    seen.add(p.maker)
    out.push(p)
    if (out.length === n) break
  }
  return out
}

/** The text a search matches: title, maker, kind, topic. */
export const pieceHaystack = (piece) => `${piece.title} ${makerName(piece)} ${piece.kind} ${piece.topic}`.toLowerCase()
