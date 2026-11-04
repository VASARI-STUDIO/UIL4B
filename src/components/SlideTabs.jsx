import { useRef } from 'react'
import useSlideIndicator from '../hooks/useSlideIndicator'

// A row of text tabs whose underline slides to the selected one.
//
// The caller keeps its own buttons, roles and key handling; this only measures
// the selected tab (aria-pressed / aria-selected / aria-checked) and lets the
// stylesheet draw the underline as the row's ::after (`.slide-ul`, global.css).
// `value` is whatever identifies the selection: the underline is re-measured
// when it changes. Everything else passes straight through to the <div>.
export default function SlideTabs({ value, className, children, ...rest }) {
  const ref = useRef(null)
  useSlideIndicator(ref, value)
  return <div ref={ref} className={className ? `slide-ul ${className}` : 'slide-ul'} {...rest}>{children}</div>
}
