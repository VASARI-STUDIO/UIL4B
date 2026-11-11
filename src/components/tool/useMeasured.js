import { useLayoutEffect, useRef, useState } from 'react'

// Where text sits on the area it is drawn over, as fractions of that area, read from the
// laid-out page so the ink follows the real layout at any width. `measure(root)` returns
// the boxes (a plain object or array, compared by value); it must be a stable function.
// Every element marked data-box is watched too, so a font arriving late re-measures.
export default function useMeasured(measure) {
  const ref = useRef(null)
  const [value, setValue] = useState(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const read = () => {
      const next = measure(root)
      setValue((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watcher = new ResizeObserver(read)
    watcher.observe(root)
    root.querySelectorAll('[data-box]').forEach((el) => watcher.observe(el))
    return () => watcher.disconnect()
  }, [measure])
  return [ref, value]
}
