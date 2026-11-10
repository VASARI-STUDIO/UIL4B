import { Link } from 'react-router-dom'
import PhIcon from '../../spectrum/PhIcon'

// Shared pieces of the "Try the tools" frames: the foot (one status line on the
// left, the link into the full tool on the right), a small segmented control and
// the phone well.

/** The foot of a tool frame. `fill` makes the link the filled one. */
export function ToolLink({ to, onClick, fill = false, line, short, children }) {
  return (
    <div className="ht-ft">
      <p className="ht-ln" role="status" aria-live="polite">
        <span data-l>{line}</span>
        <span data-s>{short ?? line}</span>
      </p>
      <Link className="ht-go mi-ring" data-fill={fill ? 'true' : 'false'} to={to} onClick={onClick}>
        <span>{children}</span>
        <span className="mi-go mi-go--r" aria-hidden="true"><PhIcon name="arrow-right" className="mi-a" /></span>
      </Link>
    </div>
  )
}

/** A radio segment: arrow keys move the choice, only the chosen one is in the tab order
 *  (the first one, when `value` is -1 because none is chosen). */
export function Radios({ label, labelledBy, items, value, onPick, className = '', isDisabled }) {
  const enabled = items.map((_, i) => !(isDisabled && isDisabled(i)))
  const move = (e, i) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    let next = i
    do { next = (next + step + items.length) % items.length } while (!enabled[next] && next !== i)
    onPick(next)
    e.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus()
  }
  return (
    <div className={`ht-seg ${className}`.trim()} role="radiogroup" aria-label={label} aria-labelledby={labelledBy}>
      {items.map((text, i) => (
        <button
          key={text}
          type="button"
          role="radio"
          aria-checked={value === i}
          tabIndex={value === i || (value < 0 && i === 0) ? 0 : -1}
          disabled={!enabled[i]}
          onClick={() => onPick(i)}
          onKeyDown={(e) => move(e, i)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/** Phone only (CSS hides it from 768px): the tool's controls give way to a three-way
 *  choice with the chosen control under it. `children` is that one control. */
export function Well({ label, items, value, onPick, children }) {
  return (
    <div className="ht-well">
      <Radios label={label} items={items} value={value} onPick={onPick} className="ht-ab" />
      <div className="ht-ctl">{children}</div>
    </div>
  )
}
