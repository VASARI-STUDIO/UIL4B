import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import useExportDesign from '../../hooks/useExportDesign'
import useMediaQuery from '../../hooks/useMediaQuery'
import useModalDialog from '../../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../../hooks/useCloseOnBack'
import useExportRunner from '../../hooks/useExportRunner'
import { DEFAULT_PRESET, EXPORT_TYPES, readLastPick, resolvePreset, storeLastPick } from '../../config/exportV3'
import { comingLine } from '../../config/exportFormats'
import ExportNav from './ExportNav'
import ExportSteps, { ExportDock } from './ExportSteps'
// The reused pieces (pills, tiles, fields, the Pro preview) are styled by the
// overlay sheet; the dialog's own layout is in export-dialog.css.
import '../../styles/deferred/overlay.css'
import '../../styles/pages/export-dialog.css'

// The Export popup: a rail (what you are making), one scrolling column (preview,
// file, layout, details) and a dock that always shows the price line and the
// Export button. It works from any page; `preset` says where it opens and
// `projectId` is the saved project, if one is open (it enables Rename and the
// trial path). Files are built by useExportRunner; nothing here makes one.
//
// The layout is chosen once by width and height, as PalettePreviewDialog does:
// rail from 1024px, a narrower rail from 768px, and the phone sheet below that
// or in a window under 500px tall.
export default function ExportDialog({ onClose, preset, projectId }) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const mid = useMediaQuery('(min-width: 768px)')
  const tall = useMediaQuery('(min-height: 500px)')
  const layout = !tall ? 'strip' : wide ? 'rail' : mid ? 'menu' : 'strip'
  const strip = layout === 'strip'

  const runner = useExportRunner()
  const { busy } = runner
  const { isPro, planKnown } = useSubscription()
  const { projects } = useProject()
  const design = useExportDesign()
  const project = projectId ? projects.find((p) => String(p.id) === String(projectId)) || null : null
  const name = project?.name || design?.name || ''

  const [pick, setPick] = useState(() => resolvePreset(preset || readLastPick() || DEFAULT_PRESET))
  const type = EXPORT_TYPES.find((t) => t.id === pick.type) || EXPORT_TYPES[0]
  const cat = type.categories.find((c) => c.id === pick.category) || type.categories[0]
  // The file last chosen in each category, so leaving Style guide on PNG and coming back finds PNG.
  const lastFile = useRef({ [cat.id]: pick.file })

  // The close the modal hooks call. It reads refs so its identity never changes
  // (a new one would re-run the modal hook and pull focus back to the dialog).
  const busyRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const renameStop = useRef(null)
  useEffect(() => { busyRef.current = busy; onCloseRef.current = onClose })
  const requestClose = useCallback(() => {
    if (busyRef.current) return
    // An open rename field takes the Escape first.
    if (renameStop.current) { renameStop.current(); return }
    onCloseRef.current()
  }, [])
  const onRenameState = useCallback((stop) => { renameStop.current = stop }, [])

  useCloseOnBack(true, requestClose)
  useInertBehind(true)
  const dialogRef = useModalDialog(requestClose, { initialFocus: '.xd-title' })

  const mainRef = useRef(null)
  const primaryRef = useRef(null)
  const [localError, setLocalError] = useState('')

  const apply = (next) => {
    if (next.type === pick.type && next.category === pick.category && next.file === pick.file) return
    setPick(next)
    storeLastPick(next)
    runner.reset()
    setLocalError('')
    if (mainRef.current) mainRef.current.scrollTop = 0
  }
  const pickCategory = (typeId, catId) => {
    const c = EXPORT_TYPES.find((t) => t.id === typeId).categories.find((x) => x.id === catId)
    apply({ type: typeId, category: catId, file: lastFile.current[catId] || c.files[0] })
  }
  const onType = (id) => pickCategory(id, EXPORT_TYPES.find((t) => t.id === id).categories[0].id)
  const onCategory = (id) => pickCategory(type.id, id)
  const onFile = (id) => {
    lastFile.current[cat.id] = id
    apply({ ...pick, file: id })
  }

  const checking = planKnown === false
  const locked = cat.pro && !isPro
  const target = locked && !checking ? runner.upgradeTarget(pick.file, projectId) : null
  const upgrade = target?.checkout ? 'checkout' : 'plans'

  // run() sends a free account on a Pro file to checkout or /plans itself; the
  // dialog only has to get out of the way.
  const onPrimary = async () => {
    if (busy || checking) return
    setLocalError('')
    const result = await runner.run(pick.file, { projectId })
    if (result?.status === 'upgrade') onCloseRef.current()
  }
  const onCopy = async () => {
    const result = await runner.copy(pick.file)
    const message = result?.ok ? (result.count ? `Copied ${result.count} tokens` : 'Copied') : 'That didn’t copy. Select the text and copy it instead.'
    window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message, type: result?.ok ? 'success' : 'error' } }))
  }

  // Export disables while it builds, and a disabled button drops focus to the
  // page behind. Hold focus on the dialog meanwhile, then hand it back.
  const wasBusy = useRef(false)
  useEffect(() => {
    if (busy) {
      wasBusy.current = true
      dialogRef.current?.focus({ preventScroll: true })
    } else if (wasBusy.current) {
      wasBusy.current = false
      const btn = primaryRef.current
      if (btn && !btn.disabled) btn.focus({ preventScroll: true })
    }
  }, [busy, dialogRef])

  const titleId = useId()
  const title = name ? `Export ${name}` : 'Export your design system'

  return (
    <div className="xd" data-layout={layout} onPointerDown={(e) => { if (e.target === e.currentTarget) requestClose() }}>
      <div className="xd-card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <header className="xd-head">
          <h2 className="xd-title" id={titleId} tabIndex={-1}>{title}</h2>
          <button type="button" className="xd-x" aria-label="Close export" aria-disabled={busy || undefined} onClick={requestClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="xd-body">
          <ExportNav
            types={EXPORT_TYPES}
            typeId={type.id}
            categoryId={cat.id}
            onType={onType}
            onCategory={onCategory}
            strip={strip}
            disabled={busy}
            showTags={!isPro && !checking}
            coming={comingLine()}
          />
          <div className="xd-col">
            <div className="xd-scroll" ref={mainRef}>
              {/* Keyed by category: a swap replays the 150ms fade. Fields stop while a file builds. */}
              <fieldset className="xd-swap" key={`${type.id}/${cat.id}`} disabled={busy}>
                <ExportSteps
                  cat={cat}
                  file={pick.file}
                  onFile={onFile}
                  name={name || 'Design System'}
                  project={project}
                  strip={strip}
                  coming={comingLine()}
                  onRenameState={onRenameState}
                />
              </fieldset>
            </div>
            <ExportDock
              cat={cat}
              file={pick.file}
              busy={busy}
              stage={runner.stage}
              error={runner.error || localError}
              notice={runner.notice}
              done={runner.done}
              upgrade={upgrade}
              onPrimary={onPrimary}
              onCopy={onCopy}
              primaryRef={primaryRef}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
