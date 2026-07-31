import { useRef, useState } from 'react'
import UiShadeEditor from './UiShadeEditor'
import UiSystemLab from './UiSystemLab'
import UiSystemMatrix from './UiSystemMatrix'
import { useProModal } from '../contexts/ProModalContext'
import { normaliseHex } from '../utils/paletteAdjust'
import { createUiSystem, uiSystemExports } from '../utils/uiSystem'

const PRO_COPY = {
  seed: {
    title: 'Edit the UI system seed',
    subtitle: 'Your complete generated system stays visible. Pro lets you change its brand source and regenerate every connected role.',
  },
  edit: {
    title: 'Fine-tune individual UI shades',
    subtitle: 'Pro adds perceptual HCT overrides while keeping requested and achieved colour values explicit.',
  },
  controls: {
    title: 'Rebalance the complete UI system',
    subtitle: 'Pro unlocks neutral modes, regeneration and reset controls across all six scales.',
  },
  export: {
    title: 'Export production-ready UI tokens',
    subtitle: 'Copy all six scales, light and dark aliases, and paired foregrounds as CSS, DTCG-shaped JSON or Tailwind-ready configuration.',
  },
  scenes: {
    title: 'Open every applied UI scene',
    subtitle: 'Pro previews the generated roles in Product Workspace, Settings, Commerce, Documentation and Mobile App layouts.',
  },
  apply: {
    title: 'Apply a complete Brand scale',
    subtitle: 'Pro can transfer all nine Brand shades into the editable Palette while keeping Brand 500 as its first swatch and seed.',
  },
}

export default function UiSystemBuilder({
  initialSeed,
  isPro,
  entitlementLoading,
  onBack,
  onApplyBrand,
  onCopy,
  toast,
}) {
  const { openProModal } = useProModal()
  const [startingSeed] = useState(() => normaliseHex(initialSeed))
  const [systemSeed, setSystemSeed] = useState(startingSeed)
  const [seedDraft, setSeedDraft] = useState(startingSeed)
  const [neutralTinted, setNeutralTinted] = useState(true)
  const [overrides, setOverrides] = useState({})
  const [system, setSystem] = useState(() => createUiSystem(startingSeed))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const seedInputRef = useRef(null)

  const canEdit = isPro && !entitlementLoading

  const gate = kind => {
    if (entitlementLoading) {
      setMessage('Plan access is still being checked. The generated system remains available read-only.')
      return false
    }
    const copy = PRO_COPY[kind] || PRO_COPY.controls
    openProModal({ eyebrow: 'UI System · Pro', title: copy.title, subtitle: copy.subtitle })
    return false
  }

  const rebuild = (nextSeed, nextNeutral, nextOverrides) => {
    try {
      const next = createUiSystem(nextSeed, {
        neutralTinted: nextNeutral,
        overrides: nextOverrides,
      })
      setSystem(next)
      setSystemSeed(next.seed)
      setSeedDraft(next.seed)
      setNeutralTinted(nextNeutral)
      setOverrides(nextOverrides)
      setError('')
      return true
    } catch (nextError) {
      setError(nextError?.message || 'This system could not be generated. The last valid result is unchanged.')
      return false
    }
  }

  const commitSeed = raw => {
    if (!canEdit) return gate('seed')
    const next = normaliseHex(raw)
    if (!next) {
      setError('Enter a valid six-digit HEX colour. The last valid system is unchanged.')
      return false
    }
    return rebuild(next, neutralTinted, overrides)
  }

  const setNeutralMode = tinted => {
    if (!canEdit) return gate('controls')
    rebuild(systemSeed, tinted, overrides)
  }

  const rebalance = () => {
    if (!canEdit) return gate('controls')
    if (rebuild(systemSeed, neutralTinted, {})) setMessage('Overrides cleared and all six scales rebalanced.')
  }

  const reset = () => {
    if (!canEdit) return gate('controls')
    if (rebuild(startingSeed, true, {})) setMessage('UI system reset to the palette seed.')
  }

  const editShade = (group, item) => {
    if (!canEdit) return gate('edit')
    if (group.id === 'brand' && item.step === 500) {
      setMessage('Brand 500 is the system seed. Edit it from the Brand 500 field.')
      seedInputRef.current?.focus()
      return
    }
    setEditing({ group, item })
  }

  const saveShade = hex => {
    if (editing.group.id === 'brand' && editing.item.step === 500) {
      commitSeed(hex)
      setEditing(null)
      return
    }
    const key = `${editing.group.id}-${editing.item.step}`
    const nextOverrides = { ...overrides, [key]: hex }
    if (rebuild(systemSeed, neutralTinted, nextOverrides)) {
      setMessage(`${editing.group.label} ${editing.item.step} override saved.`)
      setEditing(null)
    }
  }

  const exportSystem = async format => {
    if (!canEdit) return gate('export')
    const exports = uiSystemExports(system)
    const label = format === 'dtcg' ? 'DTCG JSON' : format === 'tailwind' ? 'Tailwind config' : 'CSS variables'
    const copied = await onCopy?.(exports[format])
    setMessage(copied === false ? `${label} could not be copied. Try again or check clipboard access.` : `${label} copied.`)
  }

  const applyBrand = () => {
    if (!canEdit) return gate('apply')
    const shades = system.groups[0].shades
    const seedShade = shades.find(item => item.step === 500)
    const orderedPalette = [
      seedShade,
      ...shades.filter(item => item.step !== 500),
    ].filter(Boolean).map(item => item.hex)
    const applied = onApplyBrand?.(orderedPalette)
    if (applied === false) {
      setMessage('The Brand scale could not be applied to Palette.')
      return false
    }
    setMessage('Brand 500 and the remaining Brand scale applied to Palette.')
    toast?.('Brand scale applied to Palette')
    return true
  }

  return (
    <div className="uis">
      <p className="sr-only" aria-live="polite">{message}</p>
      <header className="uis-header">
        <div className="uis-title-block">
          <div className="uis-mode-switch" aria-label="Palette workspace mode">
            <button type="button" onClick={onBack}>Palette</button>
            <span aria-hidden="true">/</span>
            <strong aria-current="page">UI System <span>Pro</span></strong>
          </div>
          <h1>UI System Builder</h1>
          <p>One brand colour expanded into six scales, measured roles and interface-ready light and dark tokens.</p>
        </div>
        <button type="button" className="btn btn-s btn-ghost uis-back" onClick={onBack}>← Back to palette</button>
      </header>

      <section className="uis-command" aria-label="UI system controls">
        <div className="uis-seed-control">
          <label htmlFor="uis-seed">Brand 500</label>
          <input
            className="uis-seed-picker"
            type="color"
            value={systemSeed}
            aria-label="Choose UI system brand colour"
            aria-disabled={!canEdit}
            onClick={event => {
              if (!canEdit) {
                event.preventDefault()
                gate('seed')
              }
            }}
            onChange={event => commitSeed(event.target.value)}
          />
          <input
            ref={seedInputRef}
            id="uis-seed"
            className={error ? 'uis-seed-hex uis-seed-hex--error' : 'uis-seed-hex'}
            type="text"
            value={seedDraft}
            readOnly={!canEdit}
            aria-readonly={!canEdit}
            aria-invalid={Boolean(error)}
            spellCheck="false"
            autoComplete="off"
            onClick={() => { if (!canEdit) gate('seed') }}
            onChange={event => { setSeedDraft(event.target.value); setError('') }}
            onBlur={() => {
              if (canEdit && !commitSeed(seedDraft)) setSeedDraft(systemSeed)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitSeed(seedDraft)
              }
            }}
          />
          <span>Exact Brand 500</span>
        </div>

        <div className="uis-neutral-control" role="group" aria-label="Neutral scale type">
          <span>Neutral</span>
          <button
            type="button"
            className={neutralTinted ? 'uis-choice uis-choice--on' : 'uis-choice'}
            aria-pressed={neutralTinted}
            onClick={() => setNeutralMode(true)}
          >
            Brand-tinted
          </button>
          <button
            type="button"
            className={!neutralTinted ? 'uis-choice uis-choice--on' : 'uis-choice'}
            aria-pressed={!neutralTinted}
            onClick={() => setNeutralMode(false)}
          >
            True grey
          </button>
        </div>

        <div className="uis-command-actions">
          <button type="button" className="btn btn-s btn-ghost" onClick={rebalance}>Regenerate / rebalance</button>
          <button type="button" className="btn btn-s btn-ghost" onClick={reset}>Reset</button>
          <button type="button" className="btn btn-s" onClick={applyBrand}>
            Apply Brand scale to palette <span className="uis-pro-label">Pro</span>
          </button>
        </div>
      </section>

      {error && <p className="uis-error" role="alert">{error}</p>}
      {entitlementLoading ? (
        <p className="uis-plan-note" role="status"><strong>Checking plan.</strong> The complete system is available read-only while access resolves.</p>
      ) : !isPro ? (
        <p className="uis-plan-note"><strong>Complete system preview.</strong> Every scale, role and Component Lab state is visible and copyable. Pro unlocks changes, overrides, exports and extra scenes.</p>
      ) : null}
      {system.warnings.length > 0 && (
        <div className="uis-warnings" role="status">
          <strong>System notes</strong>
          <ul>{system.warnings.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <UiSystemMatrix system={system} onCopy={onCopy} onEdit={editShade} />
      <UiSystemLab
        system={system}
        isPro={isPro}
        entitlementLoading={entitlementLoading}
        onGate={gate}
      />

      <section className="uis-section uis-export" aria-labelledby="uis-export-title">
        <div className="uis-section-head">
          <div>
            <p className="uis-kicker">Token hand-off <span className="uis-pro-label">Pro</span></p>
            <h2 id="uis-export-title">Export the complete system</h2>
          </div>
          <p>Six scales, both semantic themes and every paired foreground are included. Review any override warning before shipping.</p>
        </div>
        <div className="uis-export-actions">
          <button type="button" className="btn btn-s" onClick={() => exportSystem('css')}>Copy CSS</button>
          <button type="button" className="btn btn-s" onClick={() => exportSystem('dtcg')}>Copy JSON / DTCG</button>
          <button type="button" className="btn btn-s" onClick={() => exportSystem('tailwind')}>Copy Tailwind</button>
        </div>
      </section>

      {editing && (
        <UiShadeEditor
          key={`${editing.group.id}-${editing.item.step}`}
          group={editing.group}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSave={saveShade}
        />
      )}
    </div>
  )
}
