import { useRef } from 'react'

// The keyboard half of a radio group with one Tab stop (the checked item).
// Right and Down choose the next item, Left and Up the previous, Home and End
// jump, and the ends wrap, as a native radio group does. Choosing also moves
// focus. `select(i)` makes item i the checked one.
//
//   const { refs, onKeyDown } = useRovingRadio(count, select)
//   <button ref={(el) => { refs.current[i] = el }} onKeyDown={(e) => onKeyDown(e, i)} />
export default function useRovingRadio(count, select) {
  const refs = useRef([])
  const move = (to) => {
    const next = (to + count) % count
    select(next)
    const el = refs.current[next]
    if (el) {
      el.focus()
      el.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
    }
  }
  const onKeyDown = (e, i) => {
    const key = e.key
    if (key === 'ArrowRight' || key === 'ArrowDown') move(i + 1)
    else if (key === 'ArrowLeft' || key === 'ArrowUp') move(i - 1)
    else if (key === 'Home') move(0)
    else if (key === 'End') move(count - 1)
    else return
    e.preventDefault()
  }
  return { refs, onKeyDown }
}
