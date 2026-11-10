import { useEffect } from 'react'

// The sample brand's faces, loaded when the section is near rather than up
// front: Archivo at its widest cut (the width axis is why the shared font
// loader can't be used) and IBM Plex Sans.
const HREF = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
const NEAR = '600px'

export function loadBookmarkFonts() {
  if (typeof document === 'undefined' || document.querySelector('link[data-bookmark-fonts]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = HREF
  link.dataset.bookmarkFonts = ''
  document.head.appendChild(link)
}

/** Loads the faces once `el` is within NEAR of the viewport. */
export function useBookmarkFonts(el) {
  useEffect(() => {
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      loadBookmarkFonts()
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadBookmarkFonts()
        observer.disconnect()
      }
    }, { rootMargin: NEAR })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
}
