import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useAuth } from '../../contexts/AuthContext'
import useExportDesign from '../../hooks/useExportDesign'
import { defaultTemplate, liveTemplates, readExportTemplates } from '../../config/exportTemplates'
import { readLogo } from '../../utils/brandLogo'
import { readIdentity } from '../../utils/kitIdentity'
import { formatFileName } from '../../utils/exportFileName'
import ExportFormatSwitch from '../ExportFormatSwitch'
import ExportProPreview from '../ExportProPreview'
import KitIdentityFields from '../KitIdentityFields'
import BrandLogoField from '../BrandLogoField'
import ExportFreePreview from './ExportFreePreview'
import ExportThemeRow, { ThemeStage } from './ExportThemeRow'
import ExportSignIn from './ExportSignIn'
import { UI_KIT_PAGES, freeGuidelinesThemeNames, freeThemeNames, pickerTheme, themedFile, themedFileIsPro, themedZipName, themeLines } from '../../config/exportThemePicker'

// The main column of the Export dialog (Preview, File, Layout, Details) and the
// dock under it. Everything here follows the category and file the rail and the
// File step have chosen; the building is done by useExportRunner, one level up.

// What each file is called, what it is, and what the button says. Keyed by
// format id, so the book's PDF and the slides' PDF each keep their own sentence.
const FILE_COPY = {
  book: { label: 'PDF', blurb: 'The brand book as a print document, in light and dark. It opens in a print window: choose Save as PDF there.', action: 'Export PDF' },
  'book-png': { label: 'PNG pages', blurb: '2K page images, 1448 by 2048 px, in one zip.', action: 'Export PNG pages' },
  'book-html': { label: 'HTML', blurb: 'The brand book as a site, in light and dark, in one zip. It opens offline.', action: 'Export HTML' },
  guidelines: { label: 'PDF', blurb: (n) => `The ${n}-page brand guidelines as a print document. It opens in a print window: choose Save as PDF there.`, action: 'Export PDF' },
  'guidelines-html': { label: 'HTML', blurb: (n) => `The ${n} guidelines pages as HTML, in one zip. They open offline.`, action: 'Export HTML' },
  html: { label: 'HTML', blurb: 'An A4 booklet. Prints to PDF from your browser.', action: 'Export style guide' },
  png: { label: 'PNG', blurb: 'One A4 sheet at 2x, for decks and tickets.', action: 'Export style guide' },
  jpeg: { label: 'JPEG', blurb: 'The same sheet, smaller file.', action: 'Export style guide' },
  md: { label: 'Markdown', blurb: 'For Notion or Google Docs.', action: 'Export style guide' },
  kit: { label: 'ZIP', blurb: `One zip: ${UI_KIT_PAGES} pages and code`, action: 'Export UI kit' },
  css: { label: 'CSS stylesheet', blurb: 'Custom properties for your palette, tints, semantic colours and type. Drop it into any site.', action: 'Export CSS' },
  json: { label: 'JSON', blurb: 'The same tokens in the W3C Design Tokens format, for token pipelines.', action: 'Export JSON' },
  tailwind: { label: 'Tailwind theme', blurb: 'A Tailwind v4 @theme file. Import it after Tailwind and your colours, fonts and type sizes become utilities.', action: 'Export Tailwind theme' },
  contrast: { label: 'Contrast CSV', blurb: 'Every colour on every other colour, and on white and black, with its ratio and WCAG result.', action: 'Export contrast pairs' },
  'contrast-json': { label: 'Contrast JSON', blurb: 'The same pairs as JSON, with each WCAG result as true or false.', action: 'Export contrast pairs' },
  'app-bundle': { label: 'ZIP', blurb: 'Figma variables, Adobe and Affinity swatches, a Procreate palette and code tokens, in folders by app, with a README.', action: 'Export app-ready bundle' },
}

// Where the free credit sits in each code file, for the dock line. The contrast
// files carry none.
const CREDIT_LINE = {
  css: 'The file ends with a small ‘Made with UI L4B’ credit comment.',
  tailwind: 'The file ends with a small ‘Made with UI L4B’ credit comment.',
  json: 'The file’s description carries a small ‘Made with UI L4B’ credit.',
  contrast: 'This file carries no credit line.',
  'contrast-json': 'This file carries no credit line.',
}
const copyOf = (id) => FILE_COPY[id] || { label: String(id).toUpperCase(), blurb: '', action: 'Export' }

// What the dock tells someone whose PDF has opened in a print window.
const PRINT_LINE = 'In the print dialog choose Save as PDF, Margins None, and turn Headers and footers off.'

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
function Preview({ cat, file, name, fileProject, isPro, checking, design, chosen, shown }) {
  const kind = cat.preview
  if (themedFile(file)) {
    // A picture of the theme's own sample pages. The kit is previewed sharp in every theme (the button carries the Pro line); a locked book or guidelines file shows a blurred stand-in, with the lock the live Pro previews carry.
    // A file the account cannot export shows the blurred stand-in pictures, and never the real ones on a guess while the plan is
    // read; the lock waits until the account is known not to be Pro.
    const standin = kind !== 'kit' && !isPro && themedFileIsPro(file, shown.id)
    const locked = standin && !checking
    const lines = themeLines(kind, shown)
    return (
      <div className="xd-prev">
        <ThemeStage kind={kind} theme={shown} locked={locked} standin={standin} lockText={kind === 'kit' ? 'Pro theme' : 'Pro export'} />
        <p className="xd-theme-cap">{lines.caption}</p>
      </div>
    )
  }
  if (kind === 'book' || kind === 'guidelines') {
    // The book as page images has its own single layout, so it shows the default one.
    const template = file === 'book-png' ? defaultTemplate('book') : chosen[cat.layouts]
    return (
      <div className={`xd-frame xd-frame--${kind}`}>
        <ExportProPreview kind={kind} template={template} design={design} projectName={name} blurred={!isPro} showLock={false} fit />
      </div>
    )
  }
  return (
    <div className="xd-prev">
      <ExportFreePreview kind={kind} file={file} watermark={!isPro} project={fileProject} />
    </div>
  )
}

// The files a category makes, one row each: the name as it will download, then what
// is in it. The row for the chosen file is marked. On the phone sheet a category with
// several files folds to one line ("4 files") that opens in place.
function Manifest({ rows, file, folded }) {
  const rowsId = useId()
  const [open, setOpen] = useState(false)
  const shown = !folded || open
  return (
    <div className="xd-man">
      {folded && (
        <button type="button" className="xd-man-t" aria-expanded={open} aria-controls={rowsId} onClick={() => setOpen((o) => !o)}>
          <span>{rows.length} files</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <ul className="xd-man-rows" id={rowsId} hidden={!shown}>
        {rows.map((r) => (
          <li key={r.id} className="xd-man-row" aria-current={r.id === file ? 'true' : undefined}>
            <span className={`xd-man-n${r.plain ? ' is-plain' : ''}`}>{r.saved}</span>
            <span className="xd-man-d">{r.blurb}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ExportSteps({ cat, file, onFile, name, fileProject = '', project, strip, onRenameState, theme, onTheme }) {
  const uid = useId()
  const { isPro, planKnown } = useSubscription()
  const { design: working } = useProject()
  const design = useExportDesign()
  const checking = planKnown === false
  const chosen = readExportTemplates(working)
  // The guidelines blurbs count the chosen theme's pages: a guidelines-only theme draws twelve, the others thirty-three.
  const guidePages = pickerTheme(theme).guidePages
  const files = cat.files.map((id) => {
    const copy = copyOf(id)
    return { id, ...copy, blurb: typeof copy.blurb === 'function' ? copy.blurb(guidePages) : copy.blurb }
  })
  // A Pro kit is filed under its identity name when it has one (uiKitExport.js).
  const identityName = isPro ? readIdentity(design).name : ''
  // A themed zip is named for its theme; a themed PDF is not saved at all, it opens as a print document, so it carries no file name.
  const rows = files.map((f) => {
    if (!themedFile(f.id)) return { ...f, saved: formatFileName(f.id === 'kit' && identityName ? identityName : fileProject, f.id) }
    const zip = themedZipName(f.id === 'kit' && identityName ? identityName : fileProject, f.id, theme)
    return zip ? { ...f, saved: zip } : { ...f, saved: 'Print document', plain: true }
  })
  const themed = Boolean(themedFile(file))
  const shown = pickerTheme(theme)
  const showLayout = !themed && Boolean(cat.layouts) && liveTemplates(cat.layouts).length > 1
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
          <p className="xd-note">Pro adds your description and logo, and removes the UI L4B mark.</p>
        </>
      )
  }

  // The Theme step sits under the picture at every width, so a chosen theme is seen at once. On a phone its list is folded to one row
  // that already reads "Theme: <name> · <brand>", so the heading is for screen readers only there.
  const themeStep = themed && (
    <section className="xd-step" aria-labelledby={`${uid}-theme`}>
      <h3 className={`xd-step-l${strip ? ' sr-only' : ''}`} id={`${uid}-theme`}>Theme</h3>
      <ExportThemeRow value={theme} onChange={onTheme} isPro={isPro} checking={checking} yourName={name} kind={cat.preview} file={file} strip={strip} />
      <p className="xd-note">{themeLines(cat.preview, shown).desc}</p>
    </section>
  )

  return (
    <>
      <Preview cat={cat} file={file} name={name} fileProject={fileProject} isPro={isPro} checking={checking} design={design} chosen={chosen} shown={shown} />

      {themeStep}

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
        <Manifest rows={rows} file={file} folded={strip && rows.length > 1} />
      </section>

      {showLayout && (
        <section className="xd-step" aria-labelledby={`${uid}-layout`}>
          <h3 className="xd-step-l" id={`${uid}-layout`}>Layout</h3>
          <p className="xd-note">PNG pages use one layout.</p>
        </section>
      )}

      {details && (
        <section className="xd-step" aria-labelledby={`${uid}-details`}>
          <h3 className="xd-step-l" id={`${uid}-details`}>Details</h3>
          {details}
        </section>
      )}
    </>
  )
}

// The dock: what the click will make, then the buttons. The status line is one live
// region, mounted empty; an error is its own alert. A Pro file says the same thing
// whether the click goes to checkout or to /plans (one offer, one wording; the page
// it lands on carries the price). The work in progress is said on the button only.
// `onPrimary` decides what the click does: after an export it is "Done" and closes the
// dialog, and `onAnother` is the other way on, back to the file step. After a 429 the
// button counts `retryIn` seconds down (aria-disabled, and still readable), then is live again.
export function ExportDock({ cat, file, busy, stage, error, notice, done, retryIn = 0, onPrimary, onAnother, onCopy, primaryRef, locked: lockedBy, signingIn = false, onSignIn }) {
  const { isPro, planKnown } = useSubscription()
  const { user } = useAuth()
  const checking = planKnown === false
  const locked = lockedBy ?? (cat.pro && !isPro)
  const waiting = retryIn > 0
  const doneInfo = done && typeof done === 'object' ? done : null
  const savedFile = doneInfo?.file || doneInfo?.filename || ''

  let line
  if (error || busy) line = null
  else if (notice) line = <><strong>{notice.lead}</strong> {notice.detail}</>
  else if (done) {
    line = doneInfo?.opened
      ? <><strong>Opened</strong> in a new tab. {PRINT_LINE}</>
      : <><strong>Downloaded</strong>{savedFile ? ` ${savedFile}.` : '.'}</>
  } else if (checking) line = 'Checking your plan…'
  else if (locked) {
    // The bundle has no free, marked version, so "no watermark" would promise a difference that isn't there.
    line = cat.preview === 'bundle' ? <><strong>Pro</strong> unlocks the app-ready bundle.</>
      : cat.preview === 'kit' ? <><strong>Pro theme.</strong> The UI kit is free in {freeThemeNames('kit')}. The guidelines are free in {freeGuidelinesThemeNames()}.</>
        : cat.preview === 'guidelines' ? <><strong>Pro theme.</strong> The guidelines are free in {freeGuidelinesThemeNames()}.</>
        : <><strong>Pro</strong> unlocks this file.</>
  } else if (isPro) line = cat.preview === 'bundle' ? <strong>Included in Pro.</strong> : <><strong>Included in Pro.</strong> No watermark.</>
  else if (!user) line = <><strong>Free with an account.</strong> Log in to export. The file carries a small ‘Made with UI L4B’ mark.</>
  else if (cat.preview === 'code') line = <><strong>Free.</strong> {CREDIT_LINE[file] || CREDIT_LINE.css}</>
  else line = <><strong>Free.</strong> The file carries a small ‘Made with UI L4B’ mark.</>

  let label = copyOf(file).action
  if (busy) label = BUSY_LABEL[stage] || 'Exporting…'
  else if (checking) label = 'Checking your plan…'
  else if (waiting) label = `Try again in ${retryIn >= 60 ? `${Math.floor(retryIn / 60)}:${String(retryIn % 60).padStart(2, '0')}` : `${retryIn}s`}`
  else if (locked) label = 'Unlock with Pro'
  else if (done) label = 'Done'

  // The sign-in step takes the dock over: the same form as the account dialog, in place.
  if (signingIn) return <div className="xd-dock xd-dock--signin"><ExportSignIn onDone={onSignIn} /></div>

  return (
    <div className="xd-dock">
      <div className="xd-dock-line">
        <p className="xd-status" role="status" aria-live="polite">{line}</p>
        {error && <p className="xd-error" role="alert">{error}</p>}
      </div>
      <div className="xd-dock-acts">
        {cat.preview === 'code' && (
          <button type="button" className="btn xd-act" onClick={onCopy} disabled={busy}>
            Copy file
          </button>
        )}
        {done && !busy && (
          <button type="button" className="btn xd-act xd-act--quiet" onClick={onAnother}>
            Export another file
          </button>
        )}
        <button type="button" className="btn btn-accent xd-act xd-primary" ref={primaryRef} onClick={onPrimary} disabled={busy || checking} aria-disabled={waiting || undefined}>
          {label}
        </button>
      </div>
    </div>
  )
}
