/** Land after the route's scroll reset, allowing lazy content up to two seconds. */
export function landOnHash(hash, getScroller, onlyIfNeeded = false) {
  if (!hash) return () => {}
  let id
  try { id = decodeURIComponent(hash.slice(1)) } catch { id = hash.slice(1) }
  if (!id) return () => {}
  const deadline = performance.now() + 2000
  let raf
  const land = () => {
    const el = document.getElementById(id)
    if (el) {
      const lenis = getScroller()
      if (onlyIfNeeded) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
        const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
        const destination = Math.max(0, Math.min(
          window.scrollY + el.getBoundingClientRect().top - margin - padding,
          document.documentElement.scrollHeight - window.innerHeight,
        ))
        // Native anchors may have landed already; Lenis may still be animating there.
        if (Math.abs(window.scrollY - destination) <= 8
          || (lenis && Math.abs(lenis.targetScroll - destination) <= 8)) return
      }
      if (lenis) {
        // Refresh the limit after a route changes the document's height.
        lenis.resize()
        lenis.scrollTo(el, { immediate: true, force: true })
      } else {
        el.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
    } else if (performance.now() < deadline) {
      raf = requestAnimationFrame(land)
    }
  }
  raf = requestAnimationFrame(() => { raf = requestAnimationFrame(land) })
  return () => cancelAnimationFrame(raf)
}
