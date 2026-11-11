// The picture files for the homepage exports section, under public/home-exports/.
// Each image is AVIF and WebP at every width listed, every file under 200 KB. `width` and
// `height` are the largest file's own size, which every smaller width keeps the ratio of,
// so they are right for the <img> width and height attributes.

const DIR = '/home-exports/'

function img(file, widths, width, height) {
  return Object.freeze({ base: DIR + file, widths: Object.freeze(widths), width, height })
}

export const HOME_EXPORT_IMAGES = Object.freeze({
  evening: img('kerbside-evening', [720, 960, 1600], 1600, 1065),
  riders: img('kerbside-riders', [520, 1040], 1040, 633),
  busstop: img('kerbside-busstop', [480, 960], 960, 640),
  'riders-jacket': img('kerbside-riders-jacket', [264, 340], 340, 440),
  'busstop-poster': img('kerbside-busstop-poster', [264, 528], 528, 639),
  'guide-cover': img('kerbside-guide-cover', [260, 520, 1040], 1040, 585),
  'guide-signage': img('kerbside-guide-signage', [260, 520], 520, 292),
  'brandkit-palette': img('kerbside-brandkit-palette', [168, 320, 640], 640, 360),
  'book-screen': img('kerbside-book-screen', [240, 500, 1000], 1000, 625),
  'kit-screen-light': img('kerbside-kit-screen-light', [210, 440, 880], 880, 495),
  'two-shores-guide-signage': img('kerbside-two-shores-guide-signage', [425, 850], 850, 600),
  'shallow-end-guide-signage': img('kerbside-shallow-end-guide-signage', [360, 706], 706, 1000),
})

/** The file for one image at one width, as a URL path: `homeExportSrc('evening', 'webp', 960)`. */
export function homeExportSrc(id, format, width) {
  const image = HOME_EXPORT_IMAGES[id]
  if (!image) throw new Error(`No home export image called ${id}`)
  const w = width ?? image.width
  if (!image.widths.includes(w)) throw new Error(`${id} has no ${w}px file`)
  return `${image.base}-${w}.${format}`
}

/** A srcset string for one image in one format, every width it has: "a-720.avif 720w, a-960.avif 960w". */
export function homeExportSrcSet(id, format) {
  return HOME_EXPORT_IMAGES[id].widths.map((w) => `${homeExportSrc(id, format, w)} ${w}w`).join(', ')
}
