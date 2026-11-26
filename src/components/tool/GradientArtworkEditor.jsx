import { useRef, useState } from 'react'
import { artworkPoints } from '../../utils/gradientPreviewStyles'
import { ToolSection, ToolSlider } from './ToolLayout'
import GradientFx from './GradientFx'
import ColorPickerPop from '../ColorPickerPop'

export default function GradientArtworkEditor({ kind, stops, oklch, layout, onEdit, onAddPoint, onColour, locked }) {
  const points = artworkPoints(kind, stops, oklch, layout)
  const [selected, setSelected] = useState(0)
  const drag = useRef(null)
  const index = Math.min(selected, points.length - 1)
  const point = points[index]
  const mesh = kind === 'mesh'
  const pointName = mesh ? `Point ${index + 1}` : 'Orb'

  const sampled = mesh && stops.length > points.length
  const source = [...stops].sort((a, b) => a.position - b.position)[mesh ? index : 0]
  const add = mesh && stops.length < 5 && !locked && (
    <button type="button" className="grd-gen-more" onClick={() => {
      const added = onAddPoint()
      if (added != null) setSelected(added)
    }}>Add point</button>
  )

  function place(event, i) {
    const rect = event.currentTarget.getBoundingClientRect()
    const percent = (value, length) => Math.max(0, Math.min(100, Math.round(100 * value / length)))
    onEdit(i, { x: percent(event.clientX - rect.left, rect.width), y: percent(event.clientY - rect.top, rect.height) }, 'position')
  }

  return (
    <ToolSection label={mesh ? 'Mesh points' : 'Orb composition'} className="grd-art-editor" aside={add}>
      <div className="grd-art-map" data-art={kind}
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary) return
          const handle = event.target.closest('[data-point]')
          const i = handle ? Number(handle.dataset.point) : index
          setSelected(i)
          if (locked) return
          drag.current = { i, pointer: event.pointerId }
          event.currentTarget.setPointerCapture(event.pointerId)
          if (!handle) place(event, i)
        }}
        onPointerMove={event => { if (drag.current?.pointer === event.pointerId) place(event, drag.current.i) }}
        onLostPointerCapture={() => { drag.current = null }}
      >
        <GradientFx id={kind} stops={stops} oklch={oklch} layout={layout} />
        {points.map((p, i) => (
          <button key={i} type="button" data-point={i} aria-pressed={index === i}
            aria-label={mesh ? `Select mesh point ${i + 1}, ${p.color}` : 'Select orb centre'}
            style={{ left: `clamp(17px, ${p.x}%, calc(100% - 17px))`, top: `clamp(17px, ${p.y}%, calc(100% - 17px))` }}
            onClick={() => setSelected(i)}>{mesh ? i + 1 : '+'}</button>
        ))}
      </div>
      <div className="grd-art-point">
        <span>{mesh ? pointName : 'Inner colour'}</span>
        {sampled ? <span>{point.color}</span> : (
          <ColorPickerPop value={source.color} ariaLabel={`Change ${mesh ? pointName.toLowerCase() : 'orb inner'} colour`}
            onChange={hex => onColour(stops.indexOf(source), { color: hex.toUpperCase() })}
            triggerClassName="grd-art-ink" triggerChildren={<><i style={{ background: source.color }} />{source.color.toUpperCase()}</>}
            disabled={locked} portal popClassName="grd-cpk-pop" />
        )}
      </div>
      {sampled && <small>Five points sample your {stops.length} stops.</small>}
      {[['x', 'Horizontal'], ['y', 'Vertical'], ['size', mesh ? 'Spread' : 'Diameter']].map(([key, label]) => (
        <ToolSlider key={key} label={label} ariaLabel={`${pointName} ${label.toLowerCase()}`}
          min={key === 'size' ? 20 : -10} max={key === 'size' ? 160 : 110}
          value={point[key]} display={`${point[key]}%`} disabled={locked}
          onChange={value => onEdit(index, { [key]: value }, key)} />
      ))}
    </ToolSection>
  )
}
