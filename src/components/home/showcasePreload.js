// ships with the export themes
// Warms one showcase page: resolves true once its file is in the browser's cache,
// false if it failed to load.
//
// The load goes through a detached <picture> built like the visible one, so the
// browser picks the same file (AVIF, else WebP) and the visible image is then served
// from cache. `image` is `{ avif, webp }`, as showcaseImage() returns for a size.

// The set holds each element until it settles, so a load in flight is never collected.
const pending = new Set()

export function preloadPage(image) {
  return new Promise((resolve) => {
    const picture = document.createElement('picture')
    for (const [type, srcset] of [['image/avif', image.avif], ['image/webp', image.webp]]) {
      const source = document.createElement('source')
      source.type = type
      source.srcset = srcset
      picture.appendChild(source)
    }
    const img = document.createElement('img')
    picture.appendChild(img)
    pending.add(picture)
    img.onload = () => {
      pending.delete(picture)
      resolve(true)
    }
    img.onerror = () => {
      pending.delete(picture)
      resolve(false)
    }
    img.src = image.webp
  })
}
