import { useRef, useState } from 'react'
import { meshLayoutPoints } from '../../utils/gradientPreviewStyles'
import { ToolSection, ToolSlider } from './ToolLayout'
import ColorPickerPop from '../ColorPickerPop'

export default function GradientArtworkEditor({ stops, paint, oklch, layout, onEdit, onAddPoint, onColour, locked }) {
  const points = meshLayoutPoints(stops, oklch, layout)
  const [selected, setSelected] = useState(0)
  const drag = useRef(null)
  const index = Math.min(selected, points.length - 1)
  const point = points[index]
  const pointName = `Point ${index + 1}`

  const sampled = stops.length > points.length
  const source = [...stops].sort((a, b) => a.position - b.position)[index]
  const add = stops.length < 5 && !locked && (
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
    <ToolSection label="Mesh points" className="grd-art-editor" aside={add}>
      <div className="grd-art-map" style={{ background: paint }}
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
        {points.map((p, i) => (
          <button key={i} type="button" data-point={i} aria-pressed={index === i}
            aria-label={`Select mesh point ${i + 1}, ${p.color}`}
            style={{ left: `clamp(17px, ${p.x}%, calc(100% - 17px))`, top: `clamp(17px, ${p.y}%, calc(100% - 17px))` }}
            onClick={() => setSelected(i)}>{i + 1}</button>
        ))}
      </div>
      <div className="grd-art-point">
        <span>{pointName}</span>
        {sampled ? <span>{point.color}</span> : (
          <ColorPickerPop value={source.color} ariaLabel={`Change ${pointName.toLowerCase()} colour`}
            onChange={hex => onColour(stops.indexOf(source), { color: hex.toUpperCase() })}
            triggerClassName="grd-art-ink" triggerChildren={<><i style={{ background: source.color }} />{source.color.toUpperCase()}</>}
            disabled={locked} portal popClassName="grd-cpk-pop" />
        )}
      </div>
      {sampled && <small>Five points sample your {stops.length} stops.</small>}
      {[['x', 'Horizontal'], ['y', 'Vertical'], ['size', 'Spread']].map(([key, label]) => (
        <ToolSlider key={key} label={label} ariaLabel={`${pointName} ${label.toLowerCase()}`}
          min={key === 'size' ? 20 : -10} max={key === 'size' ? 160 : 110}
          value={point[key]} display={`${point[key]}%`} disabled={locked}
          onChange={value => onEdit(index, { [key]: value }, key)} />
      ))}
    </ToolSection>
  )
}
