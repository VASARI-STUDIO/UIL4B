import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import {
  applyAdjust, autoTonalPalette, contrastRatio, generateHarmony,
  hexToHsl, hslToHex, simCvd, textColorForBg, tonalRamp,
} from '../utils/colors'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'

// Palette Builder — the standalone /color/palette workbench. A Coolors-style
// full-bleed board: a toolbar (seed + harmony + vision + randomise + save/share),
// full-height colour columns with per-column tools, and a bottom global-adjust
// bar. Runs on the exact same colour engine as the merged Colour Studio
// (utils/colors.js), so palettes built here match what the studio produces.

const DEFAULT_SEED = '#4338E0'
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
const PRO_MAX = 6   // free ceiling on TOTAL columns — mirrors the studio's cap
const HARD_MAX = 10 // absolute ceiling so the board never becomes slivers

// Harmony tabs, in display order. `free` mirrors the studio's CSYS_HARMS split.
const HARMONIES = [
  { id: 'analogous', label: 'Analogous', free: false },
  { id: 'complement', label: 'Complementary', free: false },
  { id: 'triadic', label: 'Triadic', free: false },
  { id: 'split', label: 'Split', free: false },
  { id: 'tetradic', label: 'Tetradic', free: false },
  { id: 'monochromatic', label: 'Mono', free: true },
]

// Colour-vision preview modes — same ids simCvd understands.
const VISION_MODES = [
  ['normal', 'Normal'],
  ['protanopia', 'Protanopia'],
  ['deuteranopia', 'Deuteranopia'],
  ['tritanopia', 'Tritanopia'],
  ['achromatopsia', 'Achromatopsia'],
]

// Global adjust lens — identical field spec to the studio ({h,s,b,temp}).
const ADJUST_FIELDS = [
  { key: 'h', label: 'Hue', min: -180, max: 180, unit: '°', snaps: [-90, 0, 90] },
  { key: 's', label: 'Saturation', min: -100, max: 100, unit: '%', snaps: [-50, 0, 50] },
  { key: 'b', label: 'Tone', min: -100, max: 100, unit: '%', snaps: [-50, 0, 50] },
  { key: 'temp', label: 'Temperature', min: -100, max: 100, unit: '', snaps: [-50, 0, 50] },
]
const ZERO_ADJUST = { h: 0, s: 0, b: 0, temp: 0 }

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

// '#Abc' / 'aabbcc' → canonical '#AABBCC'; null when the string isn't a hex.
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// Shared palettes arrive as /color/palette?c=4338E0,7C6CF0,… — parse or null.
function colorsFromQuery() {
  try {
    const c = new URLSearchParams(window.location.search).get('c')
    if (!c) return null
    const list = c.split(',').map(normaliseHex).filter(Boolean)
    return list.length >= 2 ? list.slice(0, HARD_MAX) : null
  } catch {
    return null
  }
}

// "From image" — downsample to a small canvas, histogram 12-bit RGB buckets,
// then keep the most-common buckets that are visually distinct. A lightweight
// dominant-colour pull (no k-means) — plenty for seeding a palette board.
function extractImageColors(file, count) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const size = 72
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        const buckets = new Map()
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
          const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 }
          b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; b.n++
          buckets.set(key, b)
        }
        const ranked = [...buckets.values()].sort((a, b) => b.n - a.n)
        const picks = []
        for (const b of ranked) {
          const rgb = [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]
          const dupe = picks.some(p => Math.hypot(p.rgb[0] - rgb[0], p.rgb[1] - rgb[1], p.rgb[2] - rgb[2]) < 48)
          if (dupe) continue
          picks.push({ rgb, hex: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() })
          if (picks.length >= count) break
        }
        resolve(picks.map(p => p.hex))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that image')) }
    img.src = url
  })
}

// Legible-ink contrast of a swatch → the AA badge. textColorForBg picks the ink,
// so the badge reports the contrast a label ON this colour actually gets.
function badgeFor(hex) {
  const ink = textColorForBg(hex) === 'rgba(0,0,0,.85)' ? '#000000' : '#FFFFFF'
  const ratio = contrastRatio(hex, ink)
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA18' : 'LOW'
  return { level, ratio }
}

// Column colour + legible ink through CSS custom properties — the
// no-inline-styles route (same pattern as TintTool's swatchRef).
function colRef(color, ink) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-c', color)
    el.style.setProperty('--plb-ink', ink)
  }
}
function barRef(color) {
  return (el) => { if (el) el.style.setProperty('--plb-rc', color) }
}

// ── Tiny mono icons (stroke = currentColor, so they inherit the column ink) ──
function Ico({ size = 15, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const IcoLock = ({ open, size }) => (
  <Ico size={size}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    {open ? <path d="M8 11V7a4 4 0 0 1 7.6-1.7" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
  </Ico>
)
const IcoSwap = () => (
  <Ico><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></Ico>
)
const IcoCopy = () => (
  <Ico><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Ico>
)
const IcoX = () => <Ico><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Ico>
const IcoImage = () => (
  <Ico size={13}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Ico>
)
const IcoShuffle = () => (
  <Ico size={13}><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="m4 4 5 5" /></Ico>
)
const IcoChevron = () => <Ico size={12}><path d="m6 9 6 6 6-6" /></Ico>

export default function PaletteBuilder({ onCopy, toast }) {
  const { design, setPalette, saveProject, overwriteProject, projects, canSaveProjects } = useProject()
  const { isPro } = useSubscription()

  // Colours are the source of truth (positional: index 0–4 = the five ROLES,
  // beyond = CUSTOM n). Seed + harmony act as a generator over the unlocked
  // slots; a shared ?c= link or a carried-in project design wins on first paint.
  const [colors, setColors] = useState(() =>
    colorsFromQuery()
    || (design?.palette?.colors?.length >= 2 ? design.palette.colors.slice(0, HARD_MAX) : generateHarmony(DEFAULT_SEED, 'analogous'))
  )
  const [seed, setSeed] = useState(() => colorsFromQuery()?.[0] || design?.palette?.base || DEFAULT_SEED)
  const [seedInput, setSeedInput] = useState(seed)
  const [harmony, setHarmony] = useState(() =>
    (HARMONIES.some(h => h.id === design?.palette?.harmony) ? design.palette.harmony : 'analogous')
  )
  const [locked, setLocked] = useState(() => new Set(design?.palette?.locked || []))
  const [adjust, setAdjust] = useState(() => design?.palette?.globalAdjust || ZERO_ADJUST)
  const [vision, setVision] = useState('normal')
  const [liveMsg, setLiveMsg] = useState('')

  // Save / Share popovers (index-free, close on outside click or Escape).
  const [saveOpen, setSaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const menusRef = useRef(null)
  const fileRef = useRef(null)

  const seedValid = normaliseHex(seedInput) != null

  // The adjust lens is non-destructive: `colors` stays raw, exports/labels use
  // the adjusted values, and the board shows the vision-simulated version.
  const adjusted = useMemo(() => applyAdjust(colors, adjust), [colors, adjust])
  const view = useMemo(() => adjusted.map(c => simCvd(c, vision)), [adjusted, vision])

  // Keep ProjectContext in sync so Save/overwrite capture the live palette and
  // the merged studio picks it up (same persisted shape as the studio writes).
  useEffect(() => {
    setPalette({ base: seed, harmony, colors: adjusted, extraColors: adjusted.slice(ROLES.length), globalAdjust: adjust, locked: [...locked], activeIdx: 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, harmony, adjusted.join(','), JSON.stringify(adjust), locked])

  // Regenerate the harmony over the UNLOCKED role slots; extras stay put.
  const regen = (fromSeed, type) => {
    const gen = generateHarmony(fromSeed, type)
    setColors(prev => prev.map((c, i) => (i < gen.length && !locked.has(i) ? gen[i] : c)))
  }

  const setFromSeedInput = (raw) => {
    setSeedInput(raw)
    const norm = normaliseHex(raw)
    if (norm) { setSeed(norm); regen(norm, harmony) }
  }

  const pickHarmony = (h) => {
    if (!h.free && !isPro) { toast?.('Harmony systems are a Pro feature — upgrade to unlock'); return }
    setHarmony(h.id)
    regen(seed, h.id)
  }

  // Tonal randomise — the same accessible-by-construction deal as the studio,
  // with the same HSL fallback if the HCT solver ever throws. Locked survive.
  const randomize = useCallback(() => {
    let fresh
    try {
      fresh = autoTonalPalette()
      if (!Array.isArray(fresh) || fresh.length < ROLES.length || fresh.some(c => !/^#[0-9a-f]{6}$/i.test(c))) {
        throw new Error('tonal palette invalid')
      }
    } catch {
      fresh = ROLES.map(() => hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30)))
      toast?.('Colour engine fell back to a simple random palette')
    }
    setColors(prev => prev.map((c, i) => {
      if (locked.has(i)) return c
      if (i < fresh.length) return fresh[i]
      return hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    }))
    if (!locked.has(0)) { setSeed(fresh[0]); setSeedInput(fresh[0]) }
    setLiveMsg('Palette randomised')
  }, [locked, toast])

  // Spacebar = randomise (never while typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      e.preventDefault()
      randomize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomize])

  // Close the Save/Share popovers on outside click or Escape.
  useEffect(() => {
    if (!saveOpen && !shareOpen) return
    const close = () => { setSaveOpen(false); setShareOpen(false) }
    const onDown = (e) => { if (menusRef.current && !menusRef.current.contains(e.target)) close() }
    const onEsc = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [saveOpen, shareOpen])

  const toggleLock = (i) => {
    setLocked(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i); setLiveMsg(`Colour ${i + 1} unlocked`) }
      else { next.add(i); setLiveMsg(`Colour ${i + 1} locked`) }
      return next
    })
  }

  // ⇄ swaps a column with its right neighbour (the last swaps left) — the
  // quick way to re-assign roles, since roles are positional. Locks follow.
  const swapCols = (i) => {
    const j = i === colors.length - 1 ? i - 1 : i + 1
    if (j < 0 || j === i) return
    setColors(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
    setLocked(prev => {
      const next = new Set(prev)
      const a = next.has(i), b = next.has(j)
      next.delete(i); next.delete(j)
      if (a) next.add(j)
      if (b) next.add(i)
      return next
    })
  }

  const removeCol = (i) => {
    if (colors.length <= 2) { toast?.('A palette needs at least two colours'); return }
    setColors(prev => prev.filter((_, k) => k !== i))
    setLocked(prev => {
      const next = new Set()
      prev.forEach(k => { if (k < i) next.add(k); else if (k > i) next.add(k - 1) })
      return next
    })
  }

  const addCol = () => {
    if (colors.length >= HARD_MAX) { toast?.(`Palettes max out at ${HARD_MAX} colours`); return }
    if (!isPro && colors.length >= PRO_MAX) { toast?.('Palettes beyond 6 colours are a Pro feature — upgrade to unlock'); return }
    const [h] = hexToHsl(colors[colors.length - 1])
    setColors(prev => [...prev, hslToHex((h + 40) % 360, 62, 58)])
  }

  const onImageFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const picks = await extractImageColors(file, colors.length)
      if (!picks.length) throw new Error('No colours found in that image')
      setColors(prev => prev.map((c, i) => (!locked.has(i) && picks[i] ? picks[i] : c)))
      if (!locked.has(0) && picks[0]) { setSeed(picks[0]); setSeedInput(picks[0]) }
      setLiveMsg('Palette pulled from the image')
      toast?.('Palette pulled from the image')
    } catch (err) {
      toast?.(err?.message || 'Couldn’t read that image')
    }
  }

  const cssExport = useMemo(() => {
    const lines = adjusted.map((c, i) => {
      const role = i < ROLES.length ? ROLES[i].toLowerCase() : `custom-${i - ROLES.length + 1}`
      return `  --color-${role}: ${c};`
    })
    return `:root {\n${lines.join('\n')}\n}`
  }, [adjusted])

  const shareLink = () => `${window.location.origin}/color/palette?c=${adjusted.map(c => c.slice(1)).join(',')}`

  const doSave = () => {
    const name = saveName.trim()
    if (!name) return
    try {
      saveProject(name)
      setSaveName(''); setSaveOpen(false)
      toast?.('Project saved')
    } catch (err) {
      toast?.(err?.message || 'Couldn’t save')
    }
  }

  const adjustDirty = ADJUST_FIELDS.some(f => adjust[f.key] !== 0)

  return (
    <div className="plb">
      <p className="sr-only" aria-live="polite">{liveMsg}</p>

      {/* ── Toolbar ── */}
      <header className="plb-toolbar">
        <div className="plb-toolbar-group">
          <h1 className="plb-title">Palette Builder</h1>
          <div className="plb-seed" ref={colRef(view[0] || seed, 'transparent')}>
            <input
              type="color"
              value={seed}
              onChange={(e) => setFromSeedInput(e.target.value.toUpperCase())}
              aria-label="Pick seed colour"
            />
          </div>
          <input
            type="text"
            className={seedValid ? 'plb-hexfield' : 'plb-hexfield plb-hexfield--bad'}
            value={seedInput}
            onChange={(e) => setFromSeedInput(e.target.value)}
            onBlur={() => setSeedInput(seed)}
            placeholder={DEFAULT_SEED}
            spellCheck="false"
            autoComplete="off"
            aria-invalid={!seedValid}
            aria-label="Seed colour hex"
          />
          <div className="plb-tabs" role="group" aria-label="Harmony">
            {HARMONIES.map(h => (
              <button
                key={h.id}
                type="button"
                className={harmony === h.id ? 'plb-tab plb-tab--on' : 'plb-tab'}
                aria-pressed={harmony === h.id}
                onClick={() => pickHarmony(h)}
              >
                {h.label}
                {!h.free && !isPro && <span className="plb-tab-lock"><IcoLock size={10} /></span>}
              </button>
            ))}
          </div>
        </div>

        <div className="plb-toolbar-group" ref={menusRef}>
          <button type="button" className="btn btn-s" onClick={() => fileRef.current?.click()}>
            <IcoImage /> From image
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="plb-file" onChange={onImageFile} aria-hidden="true" tabIndex={-1} />
          <label className="plb-vision">
            <span>Vision</span>
            <select value={vision} onChange={(e) => setVision(e.target.value)} aria-label="Colour-vision preview">
              {VISION_MODES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <NavLink to="/color" className="btn btn-s" title="Open the full Colour Studio">System</NavLink>
          <button type="button" className="btn btn-s btn-accent plb-random" onClick={randomize}>
            <IcoShuffle /> Randomise <kbd className="plb-kbd">Space</kbd>
          </button>
          <span className="plb-toolbar-sep" aria-hidden="true" />
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={saveOpen}
              onClick={() => {
                if (!canSaveProjects) { toast?.('Sign in to save projects'); return }
                setShareOpen(false); setSaveOpen(o => !o)
              }}
            >
              Save
            </button>
            {saveOpen && (
              <div className="plb-menu" role="dialog" aria-label="Save palette to a project">
                <div className="plb-menu-title">Save palette to a project</div>
                <div className="plb-menu-row">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doSave() }}
                    placeholder="Project name…"
                    aria-label="Project name"
                  />
                  <button type="button" className="btn btn-s btn-accent" onClick={doSave}>Save</button>
                </div>
                {projects.length > 0 && (
                  <>
                    <div className="plb-menu-sub">Overwrite existing</div>
                    {projects.slice(-5).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="plb-menu-item"
                        onClick={() => {
                          try { overwriteProject(p.id); setSaveOpen(false); toast?.('Updated: ' + p.name) }
                          catch (err) { toast?.(err?.message || 'Couldn’t save') }
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-dark"
              aria-expanded={shareOpen}
              onClick={() => { setSaveOpen(false); setShareOpen(o => !o) }}
            >
              Share <IcoChevron />
            </button>
            {shareOpen && (
              <div className="plb-menu" role="menu" aria-label="Share palette">
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(shareLink()); setShareOpen(false) }}>Copy link to this palette</button>
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(cssExport); setShareOpen(false) }}>Copy CSS variables</button>
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(adjusted.join(', ')); setShareOpen(false) }}>Copy hex values</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── The board ── */}
      <div className="plb-board">
        {view.map((c, i) => {
          const ink = textColorForBg(c)
          const { level, ratio } = badgeFor(adjusted[i])
          const ramp = tonalRamp(c)
          const role = i < ROLES.length ? ROLES[i] : `CUSTOM ${i - ROLES.length + 1}`
          const isLocked = locked.has(i)
          return (
            <section
              key={i}
              className={isLocked ? 'plb-col plb-col--locked' : 'plb-col'}
              ref={colRef(c, ink)}
              aria-label={`${role} ${adjusted[i]}`}
            >
              <div className="plb-col-tools">
                <button
                  type="button"
                  className={isLocked ? 'plb-tool plb-tool--on' : 'plb-tool'}
                  aria-pressed={isLocked}
                  title={isLocked ? 'Unlock — allow randomise to change it' : 'Lock — keep this colour through randomise'}
                  aria-label={isLocked ? `Unlock ${role}` : `Lock ${role}`}
                  onClick={() => toggleLock(i)}
                >
                  <IcoLock open={!isLocked} />
                </button>
                {view.length > 1 && (
                  <button type="button" className="plb-tool" title="Swap with the next column" aria-label={`Swap ${role} with the next column`} onClick={() => swapCols(i)}>
                    <IcoSwap />
                  </button>
                )}
                <button type="button" className="plb-tool" title="Copy hex" aria-label={`Copy ${adjusted[i]}`} onClick={() => onCopy?.(adjusted[i])}>
                  <IcoCopy />
                </button>
                {view.length > 2 && (
                  <button type="button" className="plb-tool" title="Remove colour" aria-label={`Remove ${role}`} onClick={() => removeCol(i)}>
                    <IcoX />
                  </button>
                )}
              </div>
              <div className="plb-ramp" role="group" aria-label={`Tonal ramp of ${adjusted[i]} — click a bar to copy it`}>
                {ramp.map((rc, k) => (
                  <button key={k} type="button" className="plb-ramp-bar" ref={barRef(rc)} title={rc} aria-label={`Copy tone ${rc}`} onClick={() => onCopy?.(rc)} />
                ))}
              </div>
              <button type="button" className="plb-hex" title="Copy hex" onClick={() => onCopy?.(adjusted[i])}>{adjusted[i]}</button>
              <div className="plb-role">{role}</div>
              <span className={`plb-badge plb-badge--${level.toLowerCase()}`}>{level} {ratio.toFixed(1)}</span>
            </section>
          )
        })}
        <button type="button" className="plb-add" onClick={addCol} aria-label="Add a colour">+ Add</button>
      </div>

      {/* ── Global adjust ── */}
      <footer className="plb-adjust" aria-label="Global palette adjustments">
        {ADJUST_FIELDS.map(f => (
          <div className="plb-adjust-field" key={f.key}>
            <label className="plb-adjust-label" htmlFor={`plb-${f.key}`}>{f.label}</label>
            <SnapSlider
              id={`plb-${f.key}`}
              min={f.min}
              max={f.max}
              value={adjust[f.key]}
              defaultValue={0}
              snaps={f.snaps}
              unit={f.unit}
              onChange={(v) => setAdjust(prev => ({ ...prev, [f.key]: v }))}
              ariaLabel={`${f.label} adjustment`}
            />
          </div>
        ))}
        {adjustDirty && (
          <button type="button" className="btn btn-s btn-ghost" onClick={() => setAdjust(ZERO_ADJUST)}>Reset</button>
        )}
        <button type="button" className="btn btn-s plb-copycss" onClick={() => onCopy?.(cssExport)}>Copy CSS</button>
      </footer>
    </div>
  )
}
