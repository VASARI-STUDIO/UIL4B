import { useRef } from 'react'
import { dragBox } from '../../utils/mediaEncode'

// The custom crop box, drawn over the preview stage. Its numbers are source
// pixels, the same four the Left / Top / Width / Height fields hold, and every
// change goes through dragBox() so a drag, a key press and a typed number all
// land on the same kind of box (whole pixels, even sides, inside the picture).
//
// The body moves the box; the four corner dots resize it. Each dot is drawn
// small and has a 44 px hit area, so a finger can take it. The stage is the
// positioned parent, and touch-action is off on the box so a drag moves the box
// instead of scrolling the page.

const CORNERS = ['nw', 'ne', 'sw', 'se']
const KEY_STEP = 2
const KEY_STEP_BIG = 20

export default function CropBox({ box, size, onChange, disabled = false }) {
  const drag = useRef(null)

  const begin = (e, handle) => {
    if (disabled || e.button > 0) return
    const stage = e.currentTarget.closest('.fc-vstage')
    const rect = stage?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { handle, x: e.clientX, y: e.clientY, box, kx: size.w / rect.width, ky: size.h / rect.height }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    const next = dragBox(d.box, d.handle, (e.clientX - d.x) * d.kx, (e.clientY - d.y) * d.ky, size.w, size.h)
    if (next) onChange(next)
  }
  const end = () => { drag.current = null }

  const onKeyDown = (e) => {
    if (disabled) return
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!dir) return
    e.preventDefault()
    const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP
    // Alt pulls the bottom-right corner, so the keyboard can size the box as well as move it.
    const next = dragBox(box, e.altKey ? 'se' : 'move', dir[0] * step, dir[1] * step, size.w, size.h)
    if (next) onChange(next)
  }

  return (
    <div
      className="fc-crop-keep fc-crop-box"
      role="group"
      tabIndex={disabled ? -1 : 0}
      aria-label="Crop box. Arrow keys move it, Alt with the arrow keys resizes it."
      data-disabled={disabled || undefined}
      style={{
        left: `${(box.x / size.w) * 100}%`,
        top: `${(box.y / size.h) * 100}%`,
        width: `${(box.w / size.w) * 100}%`,
        height: `${(box.h / size.h) * 100}%`,
      }}
      onPointerDown={(e) => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
    >
      {CORNERS.map((c) => (
        <span
          key={c}
          className={`fc-crop-dot fc-crop-dot--${c}`}
          data-handle={c}
          onPointerDown={(e) => begin(e, c)}
        />
      ))}
    </div>
  )
}
