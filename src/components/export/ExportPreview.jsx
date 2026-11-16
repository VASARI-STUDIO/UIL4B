import { useMemo, useState } from 'react'
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
import { brandOf } from './exportPreviewClient'

// The work area of the Export dialog: the main picture, the file switch and the "Show the default template" box under it, and the
// gallery of pages beside it (under it on a phone).
//
// A themed file (the guidelines, the book, the UI kit) shows one page of the chosen template. It is drawn with the person's brand
// from the server (useLivePage) when that is on offer; "Show the default template" swaps to the stock picture, and the box is ticked
// and disabled when only the stock picture exists (signed out, a Pro template on a free plan, or no live preview yet). A template
// the account cannot export is never drawn from the real picture: a book or guidelines page is the blurred stand-in, and the UI kit,
// which has no stand-in, is shown as it is with the Pro mark.
// A file with no templates shows its own preview in the stage, and has no gallery.
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
  const themed = Boolean(themedFile(file))
  const kind = cat.preview
  const shown = pickerTheme(themeId)
  const pages = useMemo(() => (themed ? pagesOf(themeId, kind) : []), [themed, themeId, kind])
  const [carousel, dispatch] = usePageCarousel(pages.length, `${themeId}|${cat.id}`)
  const page = pages[Math.min(carousel.index, pages.length - 1)] || null

  // Whether the viewer may export this template. The UI kit has no stand-in pictures, so it stays sharp; the other two are blurred.
  const proTemplate = themed && !isPro && themedFileIsPro(file, themeId)
  const standin = proTemplate && kind !== 'kit'
  const [stock, setStock] = useState(false)
  const brand = useMemo(() => brandOf(design, name), [design, name])
  const live = useLivePage({ enabled: Boolean(user) && !proTemplate && !checking && themed && !stock, theme: themeId, page: page?.id, brand })
  const noLive = !user || proTemplate || checking || live.status === 'unavailable' || live.status === 'upgrade'
  const showStock = stock || noLive

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
          ? <ExportStage page={page} theme={shown} standin={standin} locked={proTemplate && !checking} html={!showStock && live.status === 'ok' ? live.html : ''} />
          : <ExportStage plain={<PlainPreview cat={cat} file={file} name={name} fileProject={fileProject} isPro={isPro} design={design} chosen={chosen} />} />}
        <div className="xd-under">
          {themed && (
            <label className="xd-stock">
              <input type="checkbox" checked={showStock} disabled={noLive} onChange={(e) => setStock(e.target.checked)} />
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
          <ExportPageGallery pages={pages} state={carousel} dispatch={dispatch} standin={standin} />
        </div>
      )}
    </div>
  )
}
