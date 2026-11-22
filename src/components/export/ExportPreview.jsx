import { useId, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { defaultTemplate } from '../../config/exportTemplates'
import { pickerTheme, themedFile, themedFileIsPro } from '../../config/exportThemePicker'
import ExportFormatSwitch from '../ExportFormatSwitch'
import ExportProPreview from '../ExportProPreview'
import ExportFreePreview from './ExportFreePreview'
import ExportStage from './ExportStage'
import ExportPageGallery from './ExportPageGallery'
import usePageCarousel from './usePageCarousel'
import useLivePage from './useLivePage'
import { pagesOf } from './exportPages'
import { brandOf, syncPreviewOwner } from './exportPreviewClient'

// The work area of the Export dialog: the main picture, the file switch and the "Show the default template" box under it, and the
// gallery of pages beside it (under it on a phone).
//
// A themed file (the guidelines, the book, the UI kit) shows one page of the chosen template. It is drawn with the person's brand
// from the server (useLivePage) when that is on offer; "Show the default template" swaps to the stock picture, and the box is ticked
// and disabled when only the stock picture exists (signed out, a Pro template on a free plan, or no live preview yet). A template
// the account cannot export is drawn as a sample in every document, the UI kit included: its 1x picture under a tiled mark, with no retina version.
// A file with no templates shows its own preview in the stage, and has no gallery.
// The page opened at its own size in a tab of its own. The document carries its own policy (no script, nothing fetched), so it may be a blob.
function openFullSize(html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function PlainPreview({ cat, file, name, fileProject, isPro, design, chosen }) {
  const kind = cat.preview
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

export default function ExportPreview({ cat, file, files, onFile, themeId, name, fileProject, isPro, checking, design, chosen }) {
  const { user } = useAuth()
  // Before any page is read from memory: a sign-out, another account or a change of plan empties what the last one was shown.
  syncPreviewOwner(user?.uid, isPro)
  const themed = Boolean(themedFile(file))
  const kind = cat.preview
  const shown = pickerTheme(themeId)
  const pages = useMemo(() => (themed ? pagesOf(themeId, kind) : []), [themed, themeId, kind])
  const [carousel, dispatch] = usePageCarousel(pages.length, `${themeId}|${cat.id}`)
  const page = pages[Math.min(carousel.index, pages.length - 1)] || null

  // Whether the viewer may export this template. A template they cannot export is drawn as a 1x sample under the mark, in every document.
  const proTemplate = themed && !isPro && themedFileIsPro(file, themeId)
  const [stock, setStock] = useState(false)
  // The project's own name, as typed; the 'Design System' stand-in is for the unnamed and must not stand in the brand, where it would
  // print on a project that has a name (the server has its own wording for none).
  const brand = useMemo(() => brandOf(design, fileProject), [design, fileProject])
  const live = useLivePage({ enabled: Boolean(user) && !proTemplate && !checking && themed && !stock, theme: themeId, page: page?.id, brand })
  // The server's 403 is the account's real plan. When it disagrees with the plan this screen holds, the page is treated as a Pro
  // template: the sample with the Pro mark, and the default template one click away.
  const refused = live.status === 'upgrade'
  const sample = proTemplate || refused
  const noLive = !user || proTemplate || checking || live.status === 'unavailable' || refused
  const showStock = stock || noLive
  const shownLive = !showStock && live.status === 'ok'
  const drawing = live.status === 'loading'
  // Why the stock picture is showing, or that the live page is on its way: one line under the stage, and the reason the box below it is disabled.
  const statusId = useId()
  let status = ''
  if (themed) {
    if (checking) status = 'Checking your plan…'
    else if (!user) status = 'Sign in to see this page with your brand. Showing the sample.'
    else if (sample) status = 'Pro template: showing the sample.'
    else if (live.status === 'unavailable') status = 'Showing the sample — live preview unavailable'
    else if (drawing) status = 'Drawing your brand…'
  }

  const hold = (on) => dispatch({ type: 'hover', on })
  return (
    <div className="xd-work" data-pages={pages.length > 1 ? 'many' : 'one'}>
      <div
        className="xd-stagecol"
        onMouseEnter={() => hold(true)}
        onMouseLeave={() => hold(false)}
        onFocus={() => hold(true)}
        onBlur={() => hold(false)}
      >
        {themed
          ? <ExportStage page={page} theme={shown} sample={sample} locked={(proTemplate && !checking) || refused} html={shownLive ? live.html : ''} expectLive={!showStock && drawing} loading={drawing && !showStock} />
          : <ExportStage plain={<PlainPreview cat={cat} file={file} name={name} fileProject={fileProject} isPro={isPro} design={design} chosen={chosen} />} />}
        {themed && (
          <div className="xd-meta">
            <p className="xd-status" id={statusId} aria-live="polite">{status}</p>
            {shownLive && <button type="button" className="xd-full" onClick={() => openFullSize(live.html)} aria-label="Open full size, in a new tab">Open full size</button>}
          </div>
        )}
        <div className="xd-under">
          {themed && (
            <label className="xd-stock">
              <input type="checkbox" checked={showStock} disabled={noLive} aria-describedby={noLive ? statusId : undefined} onChange={(e) => setStock(e.target.checked)} />
              <span>Show the default template</span>
            </label>
          )}
          {files.length > 1 && (
            <ExportFormatSwitch
              label={`${cat.name} file type`}
              options={files.map((f) => ({ id: f.id, label: f.label }))}
              value={file}
              onChange={onFile}
            />
          )}
        </div>
      </div>
      {pages.length > 1 && (
        <div
          className="xd-galcol"
          onMouseEnter={() => hold(true)}
          onMouseLeave={() => hold(false)}
          onFocus={() => hold(true)}
          onBlur={() => hold(false)}
        >
          <ExportPageGallery pages={pages} state={carousel} dispatch={dispatch} sample={sample} />
        </div>
      )}
    </div>
  )
}
