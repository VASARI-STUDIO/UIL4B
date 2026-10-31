// The Palette Builder's "From image" dialog: a photo with numbered markers on
// it, a mini board of the colours they pick, a mood and a count, and the two
// ways to put the result on the board.
//
// This file is the view only. PaletteBuilder owns the image, the markers and
// every action (loading, sampling, apply), because they read and write the
// board; the dialog gets values and callbacks.
//
// Layout (from-image-dialog.css), chosen by width:
//   900px and up   two panes: the photo, and a rail of strip, mood and count
//                  with the actions pinned under it.
//   600 to 899px   one column.
//   under 600px    full screen, with the actions in a bottom bar.
// The mood control is the one piece of markup that differs by width, so it is
// chosen with useMediaQuery: a radio list with mini strips from 900px, a button
// that opens a sheet below it.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { textColorForBg } from '../../utils/colors'
import { MOOD_OPTIONS, moodArg, pickPalette, rankClusters } from '../../utils/imagePalette'
import { FROM_IMAGE_SAMPLES } from '../../data/fromImageSamples'
import '../../styles/pages/from-image-dialog.css'

const Svg = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const IcoClose = () => <Svg><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
const IcoPhoto = () => <Svg size={28}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Svg>
const IcoChevron = () => <Svg size={14}><path d="m6 9 6 6 6-6" /></Svg>

// A mood's picks as a row of small squares. Purely decorative: the option's
// name and description carry the meaning.
function MiniStrip({ hexes }) {
  return (
    <span className="plb-imgmini" aria-hidden="true">
      {hexes.map((h, i) => <i key={i} style={{ background: h }} />)}
    </span>
  )
}

export default function FromImageDialog({
  dialogRef, onClose, phone,
  error, loading, status,
  src, aspect, sample,
  points, active, epoch, intro,
  stageRef, loupeRef,
  onStagePointerDown, onPointPointerDown, onPointFocus, onPointKeyDown, onSelect, onRemovePoint,
  mood, onMood, clusters,
  count, onStep, canDec, canInc, maxPoints, fewColours,
  lockedCount, usedCount, trimmed, ceiling, addRoom,
  onChoose, onSample, onReset, onRemovePhoto, onAdd, onReplace,
}) {
  const wide = useMediaQuery('(min-width:900px)')
  const titleId = useId()
  const moodId = useId()
  const samplesId = useId()
  const [dragging, setDragging] = useState(false)
  const [link, setLink] = useState(null)         // the marker / slot pair under the pointer or focus
  const [sheet, setSheet] = useState(false)      // the phone mood sheet
  const moodBtnRef = useRef(null)
  const sheetRef = useRef(null)
  const stripRef = useRef(null)
  const refocus = useRef(null)                   // slot index to focus after a Delete removes one

  const empty = !src
  const active0 = active != null ? points[active] : null
  const atMax = points.length >= maxPoints
  const moodLabel = MOOD_OPTIONS.find((m) => m.id === mood)?.label || 'Balanced'

  // What each mood would pick for this photo at the current count, for the mini
  // strips. Re-ranking is a few milliseconds, so it is done here rather than kept.
  const moodPicks = useMemo(() => {
    if (!clusters.length) return null
    const n = Math.max(2, count)
    return MOOD_OPTIONS.map((m) => pickPalette(rankClusters(clusters, { mood: moodArg(m.id), limit: n }), n).map((c) => c.hex))
  }, [clusters, count])

  // The sheet is the one Escape layer inside the dialog. The modal hook sees
  // its trigger (aria-expanded) and leaves the dialog open for this key.
  useEffect(() => {
    if (!sheet) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setSheet(false)
      moodBtnRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    sheetRef.current?.querySelector('[aria-selected="true"]')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  // Delete removes the focused slot, which unmounts it, so focus is handed on.
  useEffect(() => {
    if (refocus.current == null) return
    const at = refocus.current
    refocus.current = null
    const slots = stripRef.current?.querySelectorAll('.plb-imgslot-btn')
    const next = slots?.[Math.min(at, (slots?.length || 1) - 1)]
    ;(next || stageRef.current?.querySelector('.plb-imgpoint') || dialogRef.current)?.focus()
  }, [points.length, stageRef, dialogRef])

  const onSlotKey = (e, i) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    e.preventDefault()
    refocus.current = i
    onRemovePoint(i)
  }

  const onSheetKey = (e) => {
    const opts = Array.from(sheetRef.current?.querySelectorAll('[role="option"]') || [])
    const at = opts.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); opts[(n + opts.length) % opts.length]?.focus() }
    if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(opts.length - 1)
    else if (e.key === 'Tab') e.preventDefault()
  }

  const pickMood = (id) => {
    onMood(id)
    setSheet(false)
    moodBtnRef.current?.focus()
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')

  // ── Pieces ────────────────────────────────────────────────────────────────

  const stepper = (
    <div className="plb-imgcount">
      <span className="plb-imgcount-l" id={`${moodId}-count`}>Colours</span>
      <div className="plb-imgcount-ctl" role="group" aria-labelledby={`${moodId}-count`}>
        <button type="button" className="plb-imgstep" onClick={() => onStep(-1)} disabled={!canDec} aria-label="Fewer colours">−</button>
        <span className="plb-imgcount-n">{count}</span>
        <button type="button" className="plb-imgstep" onClick={() => onStep(1)} disabled={!canInc} aria-label="More colours">+</button>
      </div>
    </div>
  )

  const moodList = (
    <div className="plb-imgmoodbox">
      <span className="plb-imgmood-h" id={`${moodId}-h`}>Mood</span>
      <div className="plb-imgmoods" role="radiogroup" aria-labelledby={`${moodId}-h`} data-strips={moodPicks ? 'on' : 'off'}>
        {MOOD_OPTIONS.map((m, i) => (
          <label key={m.id} className="plb-imgmood" data-on={mood === m.id}>
            <input type="radio" name={`${moodId}-mood`} className="plb-imgmood-in" checked={mood === m.id} onChange={() => onMood(m.id)} />
            <span className="plb-imgmood-dot" aria-hidden="true" />
            <span className="plb-imgmood-t">
              <span className="plb-imgmood-name">{m.label}</span>
              <span className={moodPicks ? 'sr-only' : 'plb-imgmood-note'}>{moodPicks ? `. ${m.note}` : m.note}</span>
            </span>
            {moodPicks && <MiniStrip hexes={moodPicks[i]} />}
          </label>
        ))}
      </div>
    </div>
  )

  const moodButton = (
    <button
      type="button"
      ref={moodBtnRef}
      className="plb-imgmoodbtn"
      aria-haspopup="listbox"
      aria-expanded={sheet}
      onClick={() => setSheet(true)}
    >
      <span className="plb-imgmoodbtn-k">Mood</span>
      <span className="plb-imgmoodbtn-v">{moodLabel}</span>
      <IcoChevron />
    </button>
  )

  const room = addRoom
  const addCount = Math.min(room, points.length)
  const tooFew = points.length < 2
  const full = !tooFew && room <= 0
  const addLabel = !tooFew && room > 0 && room < points.length
    ? `Add ${addCount} of ${points.length}`
    : (phone ? 'Add' : 'Add to palette')
  const footNote = tooFew ? 'Pick at least 2 colours.' : full ? 'Your palette is full. Replace it, or remove a colour first.' : ''

  const notes = [
    lockedCount > 0 && (lockedCount === 1 ? '1 locked colour stays where it is.' : `${lockedCount} locked colours stay where they are.`),
    trimmed > 0 && `Your palette holds ${ceiling}. Only the first ${usedCount} colours will be used.`,
    fewColours > 0 && `This photo has only ${fewColours} distinct colours.`,
  ].filter(Boolean)

  const hint = (
    <p className="plb-imghint">
      Drag a point to sample another pixel.{' '}
      {atMax ? `${maxPoints} is the most. Remove one to add another.` : phone ? 'Tap the photo to add one.' : 'Click the photo to add a point.'}
    </p>
  )

  return (
    <div
      className="plb-modal plb-imgmodal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      ref={dialogRef}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="plb-modal-card plb-imgcard"
        data-state={empty ? 'empty' : 'loaded'}
        data-drop={dragging}
        onDragOver={(e) => { if (Array.from(e.dataTransfer?.types || []).includes('Files')) setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
        // The drop itself is loaded by PaletteBuilder's window listener, which
        // also keeps the browser from opening the file.
        onDrop={() => setDragging(false)}
      >
        <header className="plb-imghead">
          <h2 className="plb-imgtitle" id={titleId}>From image</h2>
          <button type="button" className="plb-imgx" onClick={onClose} aria-label="Close"><IcoClose /></button>
        </header>

        {/* Status and marker announcements. A keyboard nudge is silent
            otherwise, and the loupe it arms is aria-hidden because a canvas of
            pixels is not something to read out. */}
        <p className="sr-only" aria-live="polite">{status}</p>
        <p className="sr-only" aria-live="polite">
          {active0 ? `Colour ${active + 1} is on ${active0.hex}` : ''}
        </p>

        <div className="plb-imgbody">
          <div className="plb-imgmain">
            {empty ? (
              <>
                <div className="plb-imgzone" aria-busy={loading}>
                  <IcoPhoto />
                  <h3 className="plb-imgzone-t">{loading ? 'Finding colours…' : phone ? 'Take a photo or choose one' : 'Drop a photo here'}</h3>
                  {!phone && <p className="plb-imgzone-s">{`or choose one from your device. You can paste one too (${isMac ? '⌘ V' : 'Ctrl V'}).`}</p>}
                  <button type="button" className="btn btn-primary plb-imgchoose" onClick={onChoose}>Choose a photo</button>
                  <p className="plb-imgzone-f">JPG, PNG, WebP or GIF, up to 25 MB</p>
                </div>
                {error && <p className="plb-imgerr" role="alert">{error}</p>}
                <section className="plb-imgsamples" aria-labelledby={samplesId}>
                  <h3 className="plb-imgsamples-h" id={samplesId}>No photo handy? Try one of these</h3>
                  <ul className="plb-imgsamples-grid">
                    {FROM_IMAGE_SAMPLES.map((s) => (
                      <li key={s.id}>
                        <button type="button" className="plb-imgsample" onClick={() => onSample(s)}>
                          <img src={s.thumbSrc} alt="" loading="lazy" draggable={false} />
                          <span>{s.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <>
                <div className="plb-imgphoto">
                  <div
                    className="plb-imgstage"
                    ref={stageRef}
                    style={{ '--plb-img-ar': aspect }}
                    data-img-aspect={aspect}
                    data-intro={intro}
                    onPointerDown={onStagePointerDown}
                  >
                    <img src={src} alt="Your photo" className="plb-imgstage-img" draggable={false} />
                    {points.map((p, i) => (
                      <button
                        key={`${epoch}-${i}`}
                        type="button"
                        className={`plb-imgpoint${active === i ? ' plb-imgpoint--on' : ''}${link === i ? ' plb-imgpoint--link' : ''}`}
                        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, '--c': p.hex, '--ink': textColorForBg(p.hex), '--i': i }}
                        onPointerDown={(e) => onPointPointerDown(e, i)}
                        onPointerEnter={() => setLink(i)}
                        onPointerLeave={() => setLink((l) => (l === i ? null : l))}
                        // Focus, not click, arms the loupe for a keyboard user:
                        // arriving on the marker is the moment they need to see
                        // where it is, and it is the only cue they get that the
                        // arrow keys now do something.
                        onFocus={() => { setLink(i); onPointFocus(i) }}
                        onBlur={() => setLink((l) => (l === i ? null : l))}
                        onKeyDown={(e) => onPointKeyDown(e, i)}
                        aria-label={`Colour ${i + 1}: ${p.hex}. Arrow keys nudge it, Shift and arrow nudge it further.`}
                        data-hex={p.hex}
                      >
                        <span className="plb-imgdot" aria-hidden="true">{i + 1}</span>
                      </button>
                    ))}
                    {/* Parked in a corner rather than under the pointer, and on
                        the side AWAY from the marker, so the magnifier never
                        covers the region it is magnifying. */}
                    {active0 && (
                      <div className="plb-loupe" data-side={active0.x > 0.5 ? 'left' : 'right'} aria-hidden="true">
                        <canvas ref={loupeRef} className="plb-loupe-cv" width={272} height={272} />
                        <span className="plb-loupe-hex">{active0.hex}</span>
                      </div>
                    )}
                  </div>
                </div>
                {hint}
                {sample && <p className="plb-imgcredit">{sample.credit}</p>}
                <div className="plb-imgacts">
                  <button type="button" className="plb-imglink" onClick={onChoose}>Change photo</button>
                  <button type="button" className="plb-imglink" onClick={onReset}>Reset points</button>
                  <button type="button" className="plb-imglink" onClick={onRemovePhoto}>Remove photo</button>
                </div>
                {error && <p className="plb-imgerr" role="alert">{error}</p>}
              </>
            )}
          </div>

          <div className="plb-imgrail">
            {!empty && (
              <>
                <div className="plb-imgstrip" ref={stripRef} role="group" aria-label="Colours picked" data-intro={intro}>
                  {points.length === 0 && loading
                    ? Array.from({ length: count }, (_, i) => <div key={i} className="plb-imgslot plb-imgslot--empty" aria-hidden="true" />)
                    : points.map((p, i) => (
                      <div
                        key={`${epoch}-${i}`}
                        className="plb-imgslot"
                        data-active={active === i}
                        data-link={link === i}
                        style={{ '--c': p.hex, '--ink': textColorForBg(p.hex), '--i': i }}
                        onPointerEnter={() => setLink(i)}
                        onPointerLeave={() => setLink((l) => (l === i ? null : l))}
                      >
                        <button
                          type="button"
                          className="plb-imgslot-btn"
                          aria-label={`Colour ${i + 1}, ${p.hex}`}
                          aria-pressed={active === i}
                          onClick={() => onSelect(i)}
                          onFocus={() => setLink(i)}
                          onBlur={() => setLink((l) => (l === i ? null : l))}
                          onKeyDown={(e) => onSlotKey(e, i)}
                        >
                          <span className="plb-imgslot-n">{i + 1}</span>
                          <span className="plb-imgslot-hex">{p.hex}</span>
                        </button>
                        <button
                          type="button"
                          className="plb-imgslot-x"
                          aria-label={`Remove colour ${i + 1}, ${p.hex}`}
                          onClick={() => { refocus.current = i; onRemovePoint(i) }}
                        >
                          <IcoClose />
                        </button>
                      </div>
                    ))}
                </div>
                <p className="plb-imgsel">
                  {loading ? 'Finding colours…' : active0 ? <>{active + 1} · <span className="plb-imgsel-hex">{active0.hex}</span></> : ''}
                </p>
                {notes.map((n) => <p key={n} className="plb-imgnote">{n}</p>)}
              </>
            )}

            {wide ? (
              <>
                {moodList}
                {stepper}
              </>
            ) : (
              <div className="plb-imgctl">
                {moodButton}
                {stepper}
              </div>
            )}
          </div>
        </div>

        {!empty && (
          <footer className="plb-imgfoot">
            {footNote && <p className="plb-imgfoot-note">{footNote}</p>}
            <div className="plb-imgfoot-btns">
              <button
                type="button"
                className="btn btn-ghost plb-imgadd"
                onClick={onAdd}
                disabled={tooFew || full}
                aria-label={addLabel === 'Add' ? 'Add to palette' : undefined}
              >
                {addLabel}
              </button>
              <button type="button" className="btn btn-primary plb-imgreplace" onClick={onReplace} disabled={tooFew}>Replace palette</button>
            </div>
          </footer>
        )}

        {sheet && !wide && (
          <div className="plb-imgsheet-layer">
            <div className="plb-imgsheet-scrim" aria-hidden="true" onClick={() => { setSheet(false); moodBtnRef.current?.focus() }} />
            <div className="plb-imgsheet" role="listbox" aria-label="Mood" ref={sheetRef} onKeyDown={onSheetKey}>
              <p className="plb-imgsheet-h" aria-hidden="true">Mood</p>
              {MOOD_OPTIONS.map((m, i) => (
                <div
                  key={m.id}
                  role="option"
                  aria-selected={mood === m.id}
                  tabIndex={mood === m.id ? 0 : -1}
                  className="plb-imgopt"
                  onClick={() => pickMood(m.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickMood(m.id) } }}
                >
                  <span className="plb-imgopt-t">
                    <span className="plb-imgopt-name">{m.label}</span>
                    <span className="plb-imgopt-note">{m.note}</span>
                  </span>
                  {moodPicks && <MiniStrip hexes={moodPicks[i]} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
