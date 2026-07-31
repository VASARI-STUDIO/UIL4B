import { useCallback, useRef, useState } from 'react'
import { UI_SYSTEM_SHADES } from '../utils/uiSystem'

const inkName = hex => hex === '#000000' ? 'Black' : 'White'

function colourRef(item) {
  return element => {
    if (!element) return
    element.style.setProperty('--uis-swatch', item.hex)
    element.style.setProperty('--uis-ink', item.contrast.recommended)
  }
}

function PassState({ pass, label }) {
  return (
    <span className={pass ? 'uis-pass uis-pass--yes' : 'uis-pass uis-pass--no'}>
      <span aria-hidden="true">{pass ? '✓' : '×'}</span>
      {label}: {pass ? 'Pass' : 'Fail'}
    </span>
  )
}

export default function UiSystemMatrix({ system, onCopy, onEdit }) {
  const [active, setActive] = useState({ row: 0, column: 4 })
  const [openGroups, setOpenGroups] = useState(() => new Set(['brand']))
  const [message, setMessage] = useState('')
  const cellRefs = useRef(new Map())

  const selectedGroup = system.groups[active.row] || system.groups[0]
  const selected = selectedGroup.shades[active.column] || selectedGroup.shades[4]

  const copyShade = useCallback((group, item, row, column) => {
    setActive({ row, column })
    onCopy?.(item.hex)
    setMessage(`${group.label} ${item.step}, ${item.hex}, copied.`)
  }, [onCopy])

  const focusCell = useCallback((row, column) => {
    const nextRow = Math.max(0, Math.min(system.groups.length - 1, row))
    const nextColumn = Math.max(0, Math.min(UI_SYSTEM_SHADES.length - 1, column))
    setOpenGroups(previous => {
      if (previous.has(system.groups[nextRow].id)) return previous
      const next = new Set(previous)
      next.add(system.groups[nextRow].id)
      return next
    })
    setActive({ row: nextRow, column: nextColumn })
    requestAnimationFrame(() => cellRefs.current.get(`${nextRow}-${nextColumn}`)?.focus())
  }, [system.groups])

  const onCellKeyDown = (event, row, column, group, item) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusCell(row, column + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusCell(row, column - 1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusCell(row + 1, column)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusCell(row - 1, column)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusCell(row, 0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusCell(row, UI_SYSTEM_SHADES.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      copyShade(group, item, row, column)
    }
  }

  const toggleGroup = id => {
    setOpenGroups(previous => {
      const next = new Set(previous)
      if (next.has(id) && id !== 'brand') next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="uis-section" aria-labelledby="uis-scales-title">
      <div className="uis-section-head">
        <div>
          <p className="uis-kicker">Foundation scales</p>
          <h2 id="uis-scales-title">One system, six continuous ranges</h2>
        </div>
        <p>Choose a shade to copy its HEX and inspect measured accessibility evidence.</p>
      </div>

      <p className="sr-only" aria-live="polite">{message}</p>
      <div className="uis-matrix-wrap">
        <div className="uis-matrix" role="grid" aria-label="UI colour system scales" aria-rowcount="7" aria-colcount="10">
          <div className="uis-matrix-head" role="row">
            <span role="columnheader">Group</span>
            {UI_SYSTEM_SHADES.map(step => <span role="columnheader" key={step}>{step}</span>)}
          </div>
          {system.groups.map((group, row) => {
            const open = openGroups.has(group.id)
            return (
              <div
                className={open ? 'uis-matrix-row uis-matrix-row--open' : 'uis-matrix-row'}
                role="row"
                key={group.id}
                id={`uis-row-${group.id}`}
              >
                <div className="uis-rowhead" role="rowheader">
                  <span className="uis-row-label">{group.label}</span>
                  <button
                    type="button"
                    className="uis-disclosure"
                    aria-expanded={open}
                    aria-controls={`uis-cells-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{group.label}</span>
                    <span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                </div>
                <div className="uis-row-cells" id={`uis-cells-${group.id}`} role="presentation">
                  {group.shades.map((item, column) => (
                    <button
                      type="button"
                      role="gridcell"
                      aria-selected={active.row === row && active.column === column}
                      aria-label={`${group.label} ${item.step}, ${item.hex}. Copy and inspect.`}
                      tabIndex={active.row === row && active.column === column ? 0 : -1}
                      className={item.limited ? 'uis-cell uis-cell--limited' : 'uis-cell'}
                      key={item.step}
                      ref={element => {
                        if (element) cellRefs.current.set(`${row}-${column}`, element)
                        else cellRefs.current.delete(`${row}-${column}`)
                        colourRef(item)(element)
                      }}
                      onClick={() => copyShade(group, item, row, column)}
                      onFocus={() => setActive({ row, column })}
                      onKeyDown={event => onCellKeyDown(event, row, column, group, item)}
                    >
                      <span className="uis-cell-step">{item.step}</span>
                      <span className="uis-cell-hex">{item.hex}</span>
                      {item.limited && <span className="uis-cell-limit" aria-label="Limited gamut">!</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <article className="uis-detail" aria-label={`${selectedGroup.label} ${selected.step} details`}>
        <div className="uis-detail-ident">
          <span className="uis-detail-chip" ref={colourRef(selected)} aria-hidden="true" />
          <div>
            <p>{selectedGroup.label} {selected.step}</p>
            <strong>{selected.hex}</strong>
          </div>
          <button type="button" className="btn btn-s" onClick={() => copyShade(selectedGroup, selected, active.row, active.column)}>
            Copy HEX
          </button>
          <button type="button" className="btn btn-s btn-ghost" onClick={() => onEdit(selectedGroup, selected)}>
            Edit shade <span className="uis-pro-label">Pro</span>
          </button>
        </div>

        <div className="uis-detail-grid">
          <div className="uis-evidence">
            <p className="uis-detail-label">Contrast evidence</p>
            <dl>
              <div><dt>Black text</dt><dd>{selected.contrast.black.toFixed(2)}:1</dd></div>
              <div><dt>White text</dt><dd>{selected.contrast.white.toFixed(2)}:1</dd></div>
              <div><dt>Recommended ink</dt><dd>{inkName(selected.contrast.recommended)}</dd></div>
            </dl>
          </div>
          <div className="uis-standards">
            <p className="uis-detail-label">WCAG against recommended ink</p>
            <div className="uis-pass-list">
              <PassState pass={selected.contrast.aaNormal} label="AA normal text" />
              <PassState pass={selected.contrast.aaLarge} label="AA large text" />
              <PassState pass={selected.contrast.aaUi} label="AA UI graphics" />
              <PassState pass={selected.contrast.aaa} label="AAA normal text" />
            </div>
          </div>
          <div className="uis-hct-evidence">
            <div className="uis-hct-label">
              <p className="uis-detail-label">Achieved HCT</p>
              <span className="uis-hct-help">
                <button type="button" className="uis-help-button" aria-describedby="uis-hct-detail-tooltip">What is HCT?</button>
                <span id="uis-hct-detail-tooltip" className="uis-hct-tooltip" role="tooltip">
                  Hue chooses the colour family. Chroma controls colourfulness. Tone is perceptual lightness from 0 black to 100 white. Display gamut can limit a request, so marked shades show both requested and achieved HCT.
                </span>
              </span>
            </div>
            <p>Hue {selected.achieved.h.toFixed(1)}° · Chroma {selected.achieved.c.toFixed(1)} · Tone {selected.achieved.t.toFixed(1)}</p>
            {selected.limited && (
              <p className="uis-limit-note">
                <strong>Limited range.</strong> Requested H {selected.requested.h.toFixed(1)}° · C {selected.requested.c.toFixed(1)} · T {selected.requested.t.toFixed(1)}; this is the closest displayable colour.
              </p>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}
