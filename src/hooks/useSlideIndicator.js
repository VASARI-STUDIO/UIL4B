import { useLayoutEffect } from 'react'

// A pill that slides to the chosen option.
//
// A segmented control or pill group passes its container's ref and the value
// that is selected. The hook measures the selected child and writes its box
// onto the container as custom properties; the stylesheet draws the pill as the
// container's ::before and moves it with a transform. Nothing in the flow moves,
// so the control never shifts the layout.
//
//   --si-x / --si-y   the selected child's offset inside the container
//   --si-w / --si-h   its size
//   --si-n            its width as a bare number, for a bar that moves by scaleX
//                     (an underline slides on transform alone, never on width)
//   --si-r            its corner radius
//
// data-slide on the container is the state the CSS reads:
//   (absent)  no pill drawn; the selected child paints its own selected look
//             (server render, a hidden control, nothing selected)
//   placed    the pill is drawn in place with no transition (first paint, a resize)
//   ready     the pill is drawn and its moves are animated
// The first measure lands in `placed`, and two frames later the control becomes
// `ready`, so the pill appears where it belongs instead of sliding in from the
// corner. A resize or a font load re-places it the same way, without a slide.
//
// The motion itself, and its reduced-motion form, live in the stylesheet.

const SELECTED = '[aria-pressed="true"],[aria-checked="true"],[aria-selected="true"]'

function measure(root, item) {
  // One pill follows one selection. A group that can hold several (or none)
  // lets each selected child paint its own look instead.
  const all = root.querySelectorAll(item)
  const on = all.length === 1 ? all[0] : null
  // Hidden (display:none), or not exactly one selected: let the children paint their own look.
  if (!on || on.offsetWidth === 0) {
    delete root.dataset.slide
    return false
  }
  const s = root.style
  s.setProperty('--si-x', `${on.offsetLeft}px`)
  s.setProperty('--si-y', `${on.offsetTop}px`)
  s.setProperty('--si-w', `${on.offsetWidth}px`)
  s.setProperty('--si-h', `${on.offsetHeight}px`)
  s.setProperty('--si-n', String(on.offsetWidth))
  s.setProperty('--si-r', getComputedStyle(on).borderTopLeftRadius)
  return true
}

export default function useSlideIndicator(ref, value, item = SELECTED) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return undefined
    let raf = 0
    const arm = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (root.dataset.slide === 'placed') root.dataset.slide = 'ready'
        })
      })
    }
    // Put the pill in place without a slide.
    const place = () => {
      root.dataset.slide = 'placed'
      if (!measure(root, item)) return
      arm()
    }

    if (root.dataset.slide === 'ready') {
      // A change of selection on a control that is already drawn: the move is the animation.
      if (!measure(root, item)) delete root.dataset.slide
    } else {
      place()
    }

    // The control's own size can change under the pill (a resize, a web font
    // arriving, an option added): re-place it, still without a slide.
    let first = true
    const ro = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
        if (first) { first = false; return }
        place()
      })
      : null
    if (ro) {
      ro.observe(root)
      for (const child of root.children) ro.observe(child)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [ref, value, item])
}
