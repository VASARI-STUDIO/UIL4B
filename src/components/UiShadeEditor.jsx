import { useMemo, useState } from 'react'
import SnapSlider from './SnapSlider'
import { hctToHex, hexToHct } from '../utils/colors'
import { normaliseHex } from '../utils/paletteAdjust'

function rounded(values) {
  return {
    h: Math.round(values[0] * 10) / 10,
    c: Math.round(values[1] * 10) / 10,
    t: Math.round(values[2] * 10) / 10,
  }
}

function fieldGradient(key, request) {
  const stops = []
  for (let index = 0; index <= 8; index++) {
    const position = index / 8
    const next = { ...request }
    if (key === 'h') next.h = position * 359
    if (key === 'c') next.c = position * 150
    if (key === 't') next.t = position * 100
    stops.push(`${hctToHex(next.h, next.c, next.t)} ${Math.round(position * 100)}%`)
  }
  return `linear-gradient(90deg,${stops.join(',')})`
}

export default function UiShadeEditor({ group, item, onClose, onSave }) {
  const [request, setRequest] = useState(() => ({ ...item.achieved }))
  const [draft, setDraft] = useState(item.hex)
  const [error, setError] = useState('')
  const result = useMemo(() => {
    try {
      const hex = normaliseHex(hctToHex(request.h, request.c, request.t))
      const achieved = rounded(hexToHct(hex))
      return {
        hex,
        achieved,
        limited: request.c - achieved.c > 1.5 || Math.abs(request.t - achieved.t) > 1.2,
      }
    } catch {
      return null
    }
  }, [request])
  const gradients = useMemo(() => ({
    h: fieldGradient('h', request),
    c: fieldGradient('c', request),
    t: fieldGradient('t', request),
  }), [request])

  const setField = (key, value) => {
    setError('')
    const next = { ...request, [key]: value }
    setRequest(next)
    try { setDraft(normaliseHex(hctToHex(next.h, next.c, next.t)) || item.hex) } catch { /* keep the last valid preview */ }
  }

  const commitHex = () => {
    const hex = normaliseHex(draft)
    if (!hex) {
      setError('Enter a valid six-digit HEX colour.')
      return
    }
    const achieved = rounded(hexToHct(hex))
    setRequest(achieved)
    setDraft(hex)
    setError('')
  }

  const save = () => {
    const hex = normaliseHex(draft)
    if (!hex) {
      setError('Enter a valid six-digit HEX colour. The previous shade is unchanged.')
      return
    }
    onSave(hex)
  }

  return (
    <div className="uis-editor-layer" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="uis-editor" role="dialog" aria-modal="true" aria-labelledby="uis-editor-title">
        <div className="uis-editor-head">
          <div>
            <p className="uis-kicker">Individual override</p>
            <h2 id="uis-editor-title">Edit {group.label} {item.step}</h2>
          </div>
          <span className="uis-hct-help">
            <button type="button" className="uis-help-button" aria-describedby="uis-hct-tooltip">What is HCT?</button>
            <span id="uis-hct-tooltip" className="uis-hct-tooltip" role="tooltip">
              Hue chooses the colour family. Chroma controls colourfulness. Tone sets perceptual lightness from 0 black to 100 white. Display gamut can limit a requested combination; the requested controls stay put while the achieved colour is reported separately.
            </span>
          </span>
          <button type="button" className="plb-pop-x" aria-label="Close shade editor" onClick={onClose}>×</button>
        </div>

        <div className="uis-editor-fields">
          {[
            { key: 'h', label: 'Hue', min: 0, max: 359, unit: '°', snaps: [90, 180, 270] },
            { key: 'c', label: 'Chroma', min: 0, max: 150, unit: '', snaps: [50, 100] },
            { key: 't', label: 'Tone', min: 0, max: 100, unit: '', snaps: [50] },
          ].map(field => (
            <div className="uis-editor-field" key={field.key}>
              <label htmlFor={`uis-edit-${field.key}`}>{field.label}</label>
              <SnapSlider
                id={`uis-edit-${field.key}`}
                min={field.min}
                max={field.max}
                value={request[field.key]}
                snaps={field.snaps}
                snapRadius={2}
                unit={field.unit}
                trackGradient={gradients[field.key]}
                onChange={value => setField(field.key, Math.round(value * 10) / 10)}
                ariaLabel={`${field.label} request for ${group.label} ${item.step}`}
              />
            </div>
          ))}
        </div>

        <div className="uis-editor-result">
          <label htmlFor="uis-editor-hex">HEX override</label>
          <input
            id="uis-editor-hex"
            type="text"
            value={draft}
            spellCheck="false"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            onChange={event => setDraft(event.target.value)}
            onBlur={commitHex}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitHex()
              }
            }}
          />
          {result && (
            <div>
              <p>Requested H {request.h.toFixed(1)}° · C {request.c.toFixed(1)} · T {request.t.toFixed(1)}</p>
              <p>Achieved H {result.achieved.h.toFixed(1)}° · C {result.achieved.c.toFixed(1)} · T {result.achieved.t.toFixed(1)}</p>
              {result.limited && <p className="uis-limit-note"><strong>Limited gamut.</strong> The closest displayable colour is {result.hex}; the slider values remain your request.</p>}
            </div>
          )}
          {error && <p className="uis-field-error" role="alert">{error}</p>}
        </div>

        <div className="uis-editor-actions">
          <button type="button" className="btn btn-s btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-s btn-accent" onClick={save}>Save override</button>
        </div>
      </div>
    </div>
  )
}
