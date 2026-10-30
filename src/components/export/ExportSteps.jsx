import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import useExportDesign from '../../hooks/useExportDesign'
import { usePrices, useProPrice, formatPrice } from '../../hooks/usePrices'
import { resolveOffers } from '../../config/planFacts'
import { PLAN_LADDER } from '../../config/planLadder'
import { defaultTemplate, liveTemplates, readExportTemplates } from '../../config/exportTemplates'
import { templateThumb } from '../../utils/exportTemplateThumb'
import { readLogo } from '../../utils/brandLogo'
import { trialLabel } from '../../utils/kitGalleryPick'
import ExportFormatSwitch from '../ExportFormatSwitch'
import ExportTemplatePicker from '../ExportTemplatePicker'
import ExportProPreview from '../ExportProPreview'
import ExportProTag from '../ExportProTag'
import KitIdentityFields from '../KitIdentityFields'
import BrandLogoField from '../BrandLogoField'
import ExportFreePreview from './ExportFreePreview'

// The main column of the Export dialog (Preview, File, Layout, Details) and the
// dock under it. Everything here follows the category and file the rail and the
// File step have chosen; the building is done by useExportRunner, one level up.

// What each file is called, what it is, and what the button says. Keyed by
// format id, so the book's PDF and the slides' PDF each keep their own sentence.
const FILE_COPY = {
  book: { label: 'PDF', blurb: 'A4 pages, ready to save as PDF. Text stays sharp at any size.', action: 'Export PDF' },
  'book-png': { label: 'PNG pages', blurb: '2K page images, 1448 by 2048 px, in one zip.', action: 'Export PNG pages' },
  'book-html': { label: 'HTML', blurb: 'Opens offline in any browser.', action: 'Export HTML' },
  guidelines: { label: 'PDF', blurb: 'A 16:9 deck, ready to present or print.', action: 'Export PDF' },
  'guidelines-html': { label: 'HTML', blurb: 'Opens offline in any browser.', action: 'Export HTML' },
  html: { label: 'HTML', blurb: 'An A4 booklet. Prints to PDF from your browser.', action: 'Export style guide' },
  png: { label: 'PNG', blurb: 'One A4 sheet at 2x, for decks and tickets.', action: 'Export style guide' },
  jpeg: { label: 'JPEG', blurb: 'The same sheet, smaller file.', action: 'Export style guide' },
  md: { label: 'Markdown', blurb: 'For Notion or Google Docs.', action: 'Export style guide' },
  kit: { label: 'HTML', blurb: 'One HTML file. Opens offline and carries its CSS, JSON and fonts.', action: 'Export UI kit' },
  css: { label: 'CSS stylesheet', blurb: 'Custom properties for your palette, tints, semantic colours and type. Drop it into any site.', action: 'Export CSS' },
  json: { label: 'JSON', blurb: 'The same tokens in the W3C Design Tokens format, for token pipelines.', action: 'Export JSON' },
}
const copyOf = (id) => FILE_COPY[id] || { label: String(id).toUpperCase(), blurb: '', action: 'Export' }

// What the button and the dock say while a file is being made.
const BUSY_LABEL = { fonts: 'Embedding fonts…', building: 'Building the kit…', document: 'Preparing your document…', pages: 'Drawing the pages…' }

// Who the name on the file belongs to, by the kind of document.
const NAME_LEAD = { book: 'Name on every page', guidelines: 'Name on every slide', guide: 'Name on the cover', kit: 'Name on the kit' }

// The name line: "Name on every page: Lumen Studio", with a Rename link when a
// saved project is open. Renaming is the project's own (ProjectContext). While
// the field is open, Escape closes the field and not the dialog: the dialog
// hands that Escape to `stop`, which is passed up through `onRenameState`.
function NameLine({ lead, name, project, onRenameState }) {
  const { renameProject } = useProject()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const trigger = useRef(null)
  const stop = useCallback(() => {
    setEditing(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }, [])
  useEffect(() => {
    if (!editing) return undefined
    onRenameState(stop)
    return () => onRenameState(null)
  }, [editing, stop, onRenameState])

  const save = (e) => {
    e.preventDefault()
    if (draft.trim() && project) renameProject(project.id, draft.trim())
    stop()
  }

  if (editing) {
    return (
      <form className="xd-rename" onSubmit={save}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Rename ${name}`}
          autoComplete="off"
          spellCheck="false"
          autoFocus
        />
        <button type="submit" className="btn btn-accent xd-rename-b">Save</button>
        <button type="button" className="btn xd-rename-b" onClick={stop}>Cancel</button>
      </form>
    )
  }
  return (
    <p className="xd-name">
      <span>{lead}: <strong>{name}</strong></span>
      {project && (
        <button type="button" className="xd-link" ref={trigger} onClick={() => { setDraft(name); setEditing(true) }}>Rename</button>
      )}
    </p>
  )
}

// The picture at the top of the column. The two Pro documents are drawn by
// ExportProPreview, blurred in the pixels for a free account (and while the plan
// is read, never sharp on a guess); the free ones by the free preview. Both sit
// in a box whose height is reserved before any picture lands.
function Preview({ cat, file, name, isPro, checking, design, chosen }) {
  const kind = cat.preview
  if (kind === 'book' || kind === 'guidelines') {
    // The book as page images has its own single layout, so it shows the default one.
    const template = file === 'book-png' ? defaultTemplate('book') : chosen[cat.layouts]
    return (
      <div className={`xd-frame xd-frame--${kind}`}>
        <ExportProPreview kind={kind} template={template} design={design} projectName={name} blurred={!isPro} showLock={false} fit />
        {!isPro && !checking && (
          <div className="xd-lock">
            <ExportProTag className="xd-pro" />
            <span>Pro export</span>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="xd-prev">
      <ExportFreePreview kind={kind} file={file} watermark={!isPro} />
    </div>
  )
}

export default function ExportSteps({ cat, file, onFile, onLayout, name, project, strip, coming, onRenameState }) {
  const uid = useId()
  const { isPro, planKnown } = useSubscription()
  const { design: working, updateDesign } = useProject()
  const design = useExportDesign()
  const checking = planKnown === false
  const chosen = readExportTemplates(working)
  const files = cat.files.map((id) => ({ id, ...copyOf(id) }))
  const picked = copyOf(file)
  const showLayout = Boolean(cat.layouts) && liveTemplates(cat.layouts).length > 1
  const lead = NAME_LEAD[cat.preview]
  const hasLogo = Boolean(readLogo(working))

  let details = null
  if (cat.preview === 'book') {
    details = <><NameLine lead={lead} name={name} project={project} onRenameState={onRenameState} /><BrandLogoField /></>
  } else if (cat.preview === 'guidelines') {
    details = (
      <>
        <NameLine lead={lead} name={name} project={project} onRenameState={onRenameState} />
        <BrandLogoField />
        {!hasLogo && <p className="xd-note">Add a logo and the slides gain a logo section.</p>}
      </>
    )
  } else if (cat.preview === 'guide') {
    details = <NameLine lead={lead} name={name} project={project} onRenameState={onRenameState} />
  } else if (cat.preview === 'kit') {
    details = isPro
      ? <KitIdentityFields />
      : (
        <>
          <NameLine lead={lead} name={name} project={project} onRenameState={onRenameState} />
          <p className="xd-note">Pro adds your description and logo, and removes the UIL4B mark.</p>
        </>
      )
  }

  return (
    <>
      <Preview cat={cat} file={file} name={name} isPro={isPro} checking={checking} design={design} chosen={chosen} />

      <section className="xd-step" aria-labelledby={`${uid}-file`}>
        <h3 className="xd-step-l" id={`${uid}-file`}>File</h3>
        {files.length > 1 && (
          <ExportFormatSwitch
            label={`${cat.name} file type`}
            options={files.map((f) => ({ id: f.id, label: f.label }))}
            value={file}
            onChange={onFile}
          />
        )}
        <p className="xd-note">{picked.blurb}</p>
      </section>

      {showLayout && (
        <section className="xd-step" aria-labelledby={`${uid}-layout`}>
          <h3 className="xd-step-l" id={`${uid}-layout`}>Layout</h3>
          {file === 'book-png'
            ? <p className="xd-note">PNG pages use one layout.</p>
            : (
              <ExportTemplatePicker
                format={cat.layouts}
                value={chosen[cat.layouts]}
                onChange={(id) => { updateDesign({ exportTemplates: { [cat.layouts]: id } }); onLayout?.() }}
                thumbs={templateThumb}
              />
            )}
        </section>
      )}

      {details && (
        <section className="xd-step" aria-labelledby={`${uid}-details`}>
          <h3 className="xd-step-l" id={`${uid}-details`}>Details</h3>
          {details}
        </section>
      )}

      {strip && coming && <p className="xd-coming">{coming}</p>}
    </>
  )
}

// The dock: what the click will make and what it costs, then the buttons. The
// status line is one live region, mounted empty; an error is its own alert.
// `upgrade` is 'checkout' (a saved project: the trial) or 'plans' for a free
// account on a Pro file; `onPrimary` decides what the click does.
export function ExportDock({ cat, file, busy, stage, error, notice, done, upgrade, onPrimary, onCopy, primaryRef }) {
  const { isPro, planKnown } = useSubscription()
  const proPrice = useProPrice()
  const { prices } = usePrices()
  const checking = planKnown === false
  const locked = cat.pro && !isPro
  const trialDays = PLAN_LADDER.find((e) => e.id === 'yearly')?.trialDays || 0
  // Read once when the dock mounts, so the cancel-by date holds still while it is open.
  const [mountedAt] = useState(() => Date.now())
  const trialEnd = new Date(mountedAt + trialDays * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const yearly = resolveOffers({ prices, currency: proPrice.currency, loaded: proPrice.loaded }).offers.find((o) => o.checkoutPlan === 'yearly')
  const price = yearly?.available ? formatPrice(yearly.total, proPrice.currency) : null
  const doneInfo = done && typeof done === 'object' ? done : null
  const savedFile = doneInfo?.file || doneInfo?.filename || ''

  let line = null
  if (error) line = null
  else if (busy) line = BUSY_LABEL[stage] || 'Exporting…'
  else if (notice) line = <><strong>{notice.lead}</strong> {notice.detail}</>
  else if (done) {
    line = doneInfo?.opened
      ? <><strong>Opened</strong> in a new tab. Choose Save as PDF in the print dialog.</>
      : <><strong>Downloaded</strong>{savedFile ? ` ${savedFile}.` : '.'}</>
  } else if (checking) line = 'Checking your plan…'
  else if (locked && upgrade === 'checkout') {
    if (trialDays > 0) {
      const then = price ? `, then ${price} a year until you cancel.` : proPrice.loaded ? ', then billed yearly until you cancel.' : '.'
      line = <><strong>{trialDays} {trialDays === 1 ? 'day' : 'days'} free</strong>{then} Cancel before {trialEnd} and you pay nothing.{proPrice.loaded && !price ? ' Checkout shows the price before you pay.' : ''}</>
    } else line = 'Checkout shows the price before you pay.'
  } else if (locked) line = <><strong>Pro</strong> unlocks this file with no watermark.</>
  else if (isPro) line = <><strong>Included in Pro.</strong> No watermark.</>
  else if (cat.preview === 'code') line = <><strong>Free.</strong> The file starts with a small ‘Made with UIL4B’ credit comment.</>
  else line = <><strong>Free.</strong> The file carries a small ‘Made with UIL4B’ mark.</>

  let label = copyOf(file).action
  if (busy) label = BUSY_LABEL[stage] || 'Exporting…'
  else if (checking) label = 'Checking your plan…'
  else if (locked) label = upgrade === 'checkout' ? (trialDays > 0 ? trialLabel(trialDays) : 'Continue to checkout') : 'Unlock with Pro'
  else if (done) label = 'Export again'

  return (
    <div className="xd-dock">
      <div className="xd-dock-line">
        <p className="xd-status" role="status" aria-live="polite">{line}</p>
        {error && <p className="xd-error" role="alert">{error}</p>}
      </div>
      <div className="xd-dock-acts">
        {cat.preview === 'code' && (
          <button type="button" className="btn xd-act" onClick={onCopy} disabled={busy}>
            Copy {file === 'json' ? 'JSON' : 'CSS'}
          </button>
        )}
        <button type="button" className="btn btn-accent xd-act xd-primary" ref={primaryRef} onClick={onPrimary} disabled={busy || checking}>
          {label}
        </button>
      </div>
    </div>
  )
}
