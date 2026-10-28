import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import useExportDesign from '../hooks/useExportDesign'
import useExportGate from '../hooks/useExportGate'
import { usePrices, useProPrice, formatPrice } from '../hooks/usePrices'
import { resolveOffers } from '../config/planFacts'
import { PLAN_LADDER } from '../config/planLadder'
import { readExportTemplates } from '../config/exportTemplates'
import { loadAuthSdk } from '../utils/firebaseAccess'
import {
  labelPrintWindow, releasePrintWindow, requestExportDocument, reservePrintWindow,
  showInPrintWindow, withPrintBootstrap,
} from '../utils/exportDocument'
import { trackActivation } from '../utils/analytics'
import {
  DEFAULT_PICK, GALLERY_CHECKOUT, GALLERY_DESIGNS, GALLERY_FORMATS,
  chooseDesign, clearPick, exportLabel, isProPick, normalisePick, readPick, storePick, trialLabel,
} from '../utils/kitGalleryPick'
import ExportProPreview from '../components/ExportProPreview'
import { lazyRoute as lazy } from '../utils/lazyRoute'
import '../styles/pages/project-export.css'

const ExportPanel = lazy(() => import('../components/ExportPanel'))

// /projects/:id/export: where the brand-kit walkthrough ends. The project is
// already saved when this opens, so leaving at any point loses nothing.
//
// Pro previews are the pictures ExportProPreview already draws, blurred in the
// pixels for anyone who is not Pro (utils/proPreviews.js). Pro files are never
// built here: the server builds them (api/_lib/exportDocument.js) and refuses a
// session without the plan. A Pro pick from a free account goes to checkout.

const LOOKUP_WAIT_MS = 10000
const DESIGN_COPY = {
  book: 'A 12-page A4 manual: colour specimens, the contrast matrix, type specimens and every token.',
  guidelines: 'A 16:9 landscape deck: named swatches, alphabet grids, and your logo on every brand ground.',
  kit: 'One HTML page with your palette and tints, semantic colours, type, foundations and component states.',
}
const FILE_NAME = { book: 'design-system-book.html', guidelines: 'brand-guidelines.html' }

export default function ProjectExportRoute() {
  const { id } = useParams()
  return <ProjectExport key={id} id={id} />
}

const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kit'

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// A small page in the kit's own colours, drawn live: the UI kit is free, so its
// preview carries no gate.
function KitPreview({ colours, name }) {
  const [a = '#1F4B8E', b = '#2E7BB8', c = '#3FA9A0'] = colours
  return (
    <div className="pxg-kit" role="img" aria-label={`UI kit for ${name} in your colours`}>
      <div className="pxg-kit-bar"><i /><i /><i /></div>
      <div className="pxg-kit-body">
        <strong>{name}</strong>
        <div className="pxg-kit-tints">{colours.slice(0, 5).map((h, i) => <span key={`${h}-${i}`} style={{ background: h }} />)}</div>
        <div className="pxg-kit-btns"><span style={{ background: a }} /><span style={{ background: b }} /><span style={{ background: c }} /></div>
      </div>
    </div>
  )
}

function ProjectExport({ id }) {
  const navigate = useNavigate()
  const { loading: authLoading, user } = useAuth()
  const { isPro, planKnown } = useSubscription()
  const { projects, canSaveProjects, projectsLoading, loadProject, design: working } = useProject()
  const design = useExportDesign()
  const project = projects.find((p) => p.id === id)
  const proPrice = useProPrice()
  const { prices } = usePrices()
  // A file needs an account; the gallery is signed-in only, so this resolves at once.
  const gate = useExportGate()

  // A pick stored before a trip to checkout is applied when it is this project's.
  const [pick, setPick] = useState(() => {
    const back = readPick()
    return back && back.projectId === id ? normalisePick(back) : { ...DEFAULT_PICK }
  })
  const [status, setStatus] = useState('idle') // idle | exporting | done | failed | offline
  const [more, setMore] = useState(false)
  const exporting = useRef(false)
  const loaded = useRef(false)
  // The page reserves room under its content for the fixed bar. The bar's height
  // moves with the price line (two lines at one width, three at another, more with
  // large text), so the real height is measured and handed to the page as a custom
  // property; the CSS token is the floor.
  const barWatch = useRef(null)
  const watchBar = useCallback((el) => {
    barWatch.current?.disconnect()
    barWatch.current = null
    const root = el?.closest('.pxg')
    if (!el || !root || typeof ResizeObserver === 'undefined') return
    const sync = () => root.style.setProperty('--pxg-bar-live', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    sync()
    barWatch.current = new ResizeObserver(sync)
    barWatch.current.observe(el)
  }, [])
  // The stored pick has been applied above; it is used once.
  useEffect(() => { if (readPick()?.projectId === id) clearPick() }, [id])

  useEffect(() => {
    if (project && !loaded.current) { loaded.current = true; loadProject(project.id) }
  }, [project, loadProject])

  const unknown = !project && (authLoading || (canSaveProjects && projectsLoading))
  const [gaveUp, setGaveUp] = useState(false)
  useEffect(() => {
    if (!unknown) return undefined
    const timer = setTimeout(() => setGaveUp(true), LOOKUP_WAIT_MS)
    return () => clearTimeout(timer)
  }, [unknown])

  if (unknown && !gaveUp) {
    return <div className="pxg" role="status"><p className="pxg-lede">Opening your project…</p></div>
  }
  if (!canSaveProjects || !project) return <Navigate to="/projects" replace />

  const name = project.name
  const colours = (design?.palette?.colors || project.design?.palette?.colors || []).filter((c) => typeof c === 'string')
  const current = GALLERY_DESIGNS.find((d) => d.id === pick.design)
  const pro = isProPick(pick)
  const needsTrial = pro && !isPro
  const checking = planKnown === false

  const yearly = resolveOffers({ prices, currency: proPrice.currency, loaded: proPrice.loaded }).offers
    .find((o) => o.checkoutPlan === 'yearly')
  const trialDays = PLAN_LADDER.find((e) => e.id === 'yearly')?.trialDays || 0
  const price = yearly?.available ? formatPrice(yearly.total, proPrice.currency) : null
  const trialEnd = new Date(Date.now() + trialDays * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const priceReady = proPrice.loaded && Boolean(price) && trialDays > 0

  const choose = (next) => { setPick(next); setStatus('idle') }

  const runExport = async () => {
    if (exporting.current) return
    exporting.current = true
    setStatus('exporting')
    let win = null
    try {
      if (!(await gate('export this design'))) { setStatus('idle'); return }
      const projectName = design?.name || name
      const slug = slugOf(projectName)
      if (pick.design === 'kit') {
        const { buildUiKit } = await import('../utils/uiKitAssets')
        const { blob, filename } = await buildUiKit(design, {
          tier: isPro ? 'pro' : 'free',
          template: readExportTemplates(working).kit,
          onStage: () => {},
        })
        download(blob, filename)
        trackActivation('ui-kit', 'export')
      } else {
        if (pick.format === 'pdf') win = reservePrintWindow()
        labelPrintWindow(win, 'Preparing your document…')
        const answer = await requestExportDocument(
          { format: pick.design, design, projectName, template: readExportTemplates(working)[pick.design] },
          { loadAuth: loadAuthSdk },
        )
        if (answer.status !== 'ok') throw new Error(answer.status)
        const file = `${slug}-${FILE_NAME[pick.design]}`
        if (pick.format === 'pdf') {
          const url = URL.createObjectURL(new Blob([withPrintBootstrap(answer.html)], { type: 'text/html;charset=utf-8' }))
          if (showInPrintWindow(win, url)) {
            win = null
            setTimeout(() => URL.revokeObjectURL(url), 60000)
          } else {
            URL.revokeObjectURL(url)
            download(new Blob([answer.html], { type: 'text/html;charset=utf-8' }), file)
          }
        } else {
          download(new Blob([answer.html], { type: 'text/html;charset=utf-8' }), file)
        }
        trackActivation(pick.design === 'book' ? 'design-system-book' : 'brand-guidelines', 'export')
      }
      setStatus('done')
    } catch {
      setStatus('failed')
    } finally {
      releasePrintWindow(win)
      exporting.current = false
    }
  }

  const onCta = () => {
    if (needsTrial) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { setStatus('offline'); return }
      storePick(id, pick)
      navigate(GALLERY_CHECKOUT)
      return
    }
    runExport()
  }

  const ctaLabel = status === 'exporting'
    ? 'Exporting…'
    : needsTrial ? (trialDays > 0 ? trialLabel(trialDays) : 'Continue to checkout') : status === 'done' ? 'Export again' : exportLabel(pick)
  // The price never holds the button: checkout shows it again before anyone pays,
  // so a price that cannot load only changes the line beside the button.
  const ctaDisabled = status === 'exporting' || checking

  let priceLine
  if (status === 'offline') priceLine = 'You’re offline. Your project is saved; try again when you’re back online.'
  else if (status === 'failed') priceLine = 'That file didn’t build. Try again, or open the project and export from there.'
  else if (status === 'exporting') priceLine = 'Preparing your file…'
  else if (status === 'done') priceLine = 'Downloaded. Find it in your downloads folder.'
  else if (checking) priceLine = 'Checking your plan…'
  else if (needsTrial) {
    if (priceReady) priceLine = <><strong>{trialDays} days free</strong>, then {price} a year until you cancel. Cancel before {trialEnd} and you pay nothing.</>
    else if (!proPrice.loaded) priceLine = 'Loading price'
    else priceLine = <><strong>{trialDays} days free</strong>, then billed yearly until you cancel. Checkout shows the price before you pay.</>
  } else if (pro) priceLine = <><strong>Included in Pro.</strong> Your file has no watermark.</>
  else priceLine = <><strong>Free.</strong> The file carries a small “Made with UIL4B” mark.</>

  return (
    <div className="pxg">
      <p className="pxg-saved">Saved to your projects as <strong>{name}</strong> · <Link to={`/projects/${id}`}>Open project</Link></p>
      <h1 className="pxg-h1">Choose a design for {name}</h1>
      <p className="pxg-lede">Every preview is set in your own colours and fonts. Pick a design, then the file you want.</p>

      <h2 className="pxg-h2" id="pxg-designs">Designs</h2>
      <p className="pxg-sub">3 designs, 1 free. Pro previews are blurred; your export is full size with no watermark.</p>
      <div className="pxg-designs" role="radiogroup" aria-labelledby="pxg-designs">
        {GALLERY_DESIGNS.map((d) => (
          <label key={d.id} className={`pxg-card pxg-card--${d.id}${pick.design === d.id ? ' is-on' : ''}`}>
            <input type="radio" name="pxg-design" className="sr-only" checked={pick.design === d.id} onChange={() => choose(chooseDesign(pick, d.id))} />
            <span className="pxg-frame">
              {d.id === 'kit'
                ? <KitPreview colours={colours} name={name} />
                : <ExportProPreview kind={d.id} template={readExportTemplates(working)[d.id]} design={design} projectName={name} blurred={!isPro} showLock={false} fit />}
            </span>
            <span className="pxg-meta"><span className="pxg-name">{d.name}</span><span className={d.pro ? 'pxg-tier is-pro' : 'pxg-tier'}>{d.pro ? 'Pro' : 'Free'}</span></span>
            <span className="pxg-desc">{DESIGN_COPY[d.id]}</span>
            <span className="pxg-facts">{d.shape}</span>
          </label>
        ))}
      </div>

      <h2 className="pxg-h2" id="pxg-formats">File format</h2>
      <p className="pxg-sub">For {current.name}</p>
      <div className="pxg-formats" role="radiogroup" aria-labelledby="pxg-formats">
        {current.formats.map((f) => (
          <label key={f} className={`pxg-fm${pick.format === f ? ' is-on' : ''}`}>
            <input type="radio" name="pxg-format" className="sr-only" checked={pick.format === f} onChange={() => choose(normalisePick({ ...pick, format: f }))} />
            <span className="pxg-meta"><span className="pxg-name">{GALLERY_FORMATS[f].label}</span><span className={current.pro ? 'pxg-tier is-pro' : 'pxg-tier'}>{current.pro ? 'Pro' : 'Free'}</span></span>
            <span className="pxg-desc">{GALLERY_FORMATS[f].blurb}</span>
          </label>
        ))}
      </div>
      <p className="pxg-note">
        Every file carries the name {name}. The style guide, design tokens and templates are in{' '}
        <button type="button" className="pxg-link" onClick={() => setMore(true)}>more export options</button>
        {' '}and in the project at any time.
      </p>

      <div className="pxg-bar" ref={watchBar} role="region" aria-label="Your pick">
        <div className="pxg-sum"><strong>{current.name} · {GALLERY_FORMATS[pick.format].label}</strong> <span className={pro ? 'pxg-tier is-pro' : 'pxg-tier'}>{pro ? 'Pro' : 'Free'}</span></div>
        <Link className="pxg-not" to={`/projects/${id}`} aria-label={`Not now, open the ${name} project`}>Not now, open project</Link>
        <p className="pxg-price" aria-live="polite">{priceLine}</p>
        <button type="button" className="pxg-cta" onClick={onCta} disabled={ctaDisabled}>{ctaLabel}</button>
      </div>

      {more && user && createPortal(
        <Suspense fallback={null}><ExportPanel onClose={() => setMore(false)} /></Suspense>,
        document.querySelector('.app-shell') || document.body,
      )}
    </div>
  )
}
