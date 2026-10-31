import { useEffect, useId, useMemo, useRef, useState } from 'react'
import useExportDesign from '../../hooks/useExportDesign'
import { readExportTemplates, EXPORT_TEMPLATES } from '../../config/exportTemplates'
import { templateThumb } from '../../utils/exportTemplateThumb'
import { STYLE_GUIDE_SCALE, freePreviewKey, previewLines } from '../../utils/exportFreePreview'
import { buildCodeFile, codeFileName, isCodeFile } from '../../utils/codeFiles'
import '../../styles/pages/export-preview.css'

// A real render of a free export, drawn from the person's own design: the UI kit's
// template picture, the style guide sheet, or the first lines of the stylesheet or
// token file. Never a mock-up.
//
//   kind       'kit' | 'guide' | 'code'
//   file       a Code file id (utils/codeFiles.js); only read when kind is 'code'
//   project    the project's name as typed, for the file name over the code
//   watermark  true while the account is free: the guide sheet carries the UIL4B
//              mark and the JSON file a credit in its description, as the real file does
//
// The design is read the way the rest of the export code reads it (useExportDesign),
// so a tool's live, unsaved preview is shown as well as a saved project.
//
// The box is reserved before anything lands (fixed height, flat fill), so nothing
// below it moves. While a new picture draws, the old one of the same kind stays; the
// box never shows a spinner. The guide generator and the token builders load on
// demand, so nobody who never opens those rows pays for them.

// The files that open with a block comment the preview steps past: the stylesheet's
// naming guide and the Tailwind file's usage note.
const COMMENT_LED = new Set(['css', 'tailwind'])
const FAILED_LINE = 'The preview didn’t draw. Your file isn’t affected.'

export default function ExportFreePreview({ kind, file = 'css', watermark = true, project }) {
  const labelId = useId()
  const design = useExportDesign()
  const projectName = design?.name || 'Design System'
  // The name the file will download under, which heads the code. The dialog passes the
  // open project's name; with none, it is the design's own.
  const savedAs = kind === 'code' && isCodeFile(file) ? codeFileName(file, project ?? design?.name) : ''
  const template = readExportTemplates(design).kit
  const key = useMemo(
    () => freePreviewKey({ kind, file, watermark, projectName, design, template }),
    [kind, file, watermark, projectName, design, template],
  )

  const [state, setState] = useState({ key: '', shown: null, failed: false })
  const [attempt, setAttempt] = useState(0)
  // The kit picture is a file on the site, so it needs no draw; only its load can fail.
  const [badSrc, setBadSrc] = useState('')
  const urlRef = useRef(null)
  // Names each finished picture, so a new one is a new element and fades in.
  const seqRef = useRef(0)

  const kitPic = kind === 'kit' ? templateThumb({ format: 'kit', id: template }) : null

  useEffect(() => {
    if (!design || kind === 'kit') return undefined
    let live = true
    const done = (shown) => {
      if (live) setState({ key, shown: { kind, id: (seqRef.current += 1), ...shown }, failed: false })
    }
    const fail = () => { if (live) setState((s) => ({ key, shown: s.shown, failed: true })) }

    if (kind === 'guide') {
      import('../../utils/styleGuideRaster')
        .then(({ renderStyleGuideImage, A4 }) => renderStyleGuideImage(design, { projectName, watermark, scale: STYLE_GUIDE_SCALE })
          .then((blob) => {
            if (!live) return
            const url = URL.createObjectURL(blob)
            if (urlRef.current) URL.revokeObjectURL(urlRef.current)
            urlRef.current = url
            done({ src: url, width: Math.round(A4.width * STYLE_GUIDE_SCALE), height: Math.round(A4.height * STYLE_GUIDE_SCALE) })
          }))
        .catch(fail)
    } else {
      buildCodeFile(file, design, { projectName, watermark })
        .then((text) => done({ lines: previewLines(text, { skipLeadingComment: COMMENT_LED.has(file) }) }))
        .catch(fail)
    }
    return () => { live = false }
    // `key` folds in every input the picture is drawn from; `attempt` is "Try again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  // Object URLs are released when the preview goes (a replaced one is released as it is replaced).
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  const tryAgain = () => {
    setBadSrc('')
    setState((s) => ({ ...s, failed: false }))
    setAttempt((n) => n + 1)
  }

  const kitFailed = kind === 'kit' && (!kitPic || badSrc === kitPic.src)
  const failed = kind === 'kit' ? kitFailed : state.key === key && state.failed
  // Nothing from another kind, and nothing while the design is unknown.
  const shown = kind !== 'kit' && design && state.shown?.kind === kind ? state.shown : null
  const kitName = EXPORT_TEMPLATES.kit.find((t) => t.id === template)?.name

  let body = null
  if (failed) {
    body = (
      <div className="xfp-failed" role="status">
        <p>{FAILED_LINE}</p>
        <button type="button" className="xfp-retry" onClick={tryAgain}>Try again</button>
      </div>
    )
  } else if (kind === 'kit' && kitPic) {
    body = (
      <img
        key={`${kitPic.src}|${attempt}`}
        className="xfp-img xfp-in"
        src={kitPic.src}
        srcSet={kitPic.srcSet}
        sizes="240px"
        alt={`Your UI kit in the ${kitName} layout`}
        onError={() => setBadSrc(kitPic.src)}
        draggable="false"
      />
    )
  } else if (shown?.src) {
    body = (
      <img
        key={shown.id}
        className="xfp-img xfp-in"
        src={shown.src}
        width={shown.width}
        height={shown.height}
        alt="Your style guide, an A4 sheet"
        draggable="false"
      />
    )
  } else if (shown?.lines) {
    body = (
      <pre className="xfp-code xfp-in" key={shown.id} role="group" aria-labelledby={labelId}>
        <code>{shown.lines.join('\n')}</code>
      </pre>
    )
  }

  // The label is always present for code, so it never shifts the box.
  return (
    <div className="xfp" data-kind={kind}>
      {kind === 'code' && (
        <p className="xfp-label" id={labelId}>
          <span className="xfp-file">{savedAs}</span>
          <span className="xfp-cap">First lines</span>
        </p>
      )}
      <div className="xfp-box" data-state={failed ? 'failed' : body ? 'ready' : 'loading'} aria-busy={!failed && !body}>
        {body}
      </div>
    </div>
  )
}
