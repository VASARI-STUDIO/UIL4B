import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackActivation } from '../utils/analytics'
import { reportUpgradeGate } from '../contexts/ProModalContext'
import useExportDesign from './useExportDesign'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import useExportGate from './useExportGate'
import { useProject } from '../contexts/ProjectContext'
import { loadAuthSdk } from '../utils/firebaseAccess'
import {
  labelPrintWindow, releasePrintWindow, requestExportDocument, reservePrintWindow,
  showInPrintWindow, withPrintBootstrap,
} from '../utils/exportDocument'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../utils/styleGuideExport'
import { storePick } from '../utils/kitGalleryPick'
import { EXPORT_FORMATS } from '../config/exportFormats'
import { readExportTemplates } from '../config/exportTemplates'
import { needsNetwork, resolveUpgradeTarget } from '../config/dialogExport'
import { buildCodeFile, codeFileName, CODE_FILES, isCodeFile } from '../utils/codeFiles'
import { formatFileName } from '../utils/exportFileName'

// Everything that happens between a click on Export and a file in the downloads
// folder: the gates, the build, the download. The dialog owns what is on screen;
// this owns what is true. The gates run in this order and the order matters: the
// Pro check, then the account gate, then the wait for the plan of someone who
// just signed in, then the build.
//
// run() resolves to { status } so the caller can act on the end of an export:
//   'done'      { file }  the file is saved, or opened in a print window
//   'upgrade'   { to }    a Pro file on a free account; this has already navigated
//   'cancelled'           the signup dialog was dismissed
//   'offline' | 'failed'  the line is in `error`
//   'busy'                an export is already running; nothing was started
//   'unmounted'           the dialog went away while the server worked

// WHAT EACH PAID DOCUMENT SAYS WHEN IT IS BEHIND THE WALL.
//
// One entry per Pro format, because the funnel says WHICH wall
// converted, and because two documents with one shared modal would sell neither:
// somebody who clicked "Brand guidelines" and was answered with a description of
// a 12-page A4 token manual has been told the wrong thing about what they are
// buying. `gate` is the analytics id and is deliberately distinct per document.
//
// Keyed by format id and looked up, not branched on, so adding a third Pro
// document cannot silently inherit the book's copy.
export const PRO_GATE = {
  book: {
    gate: 'design-system-book-export',
    eyebrow: 'UIL4B Pro',
    title: 'Export the design system book',
    subtitle: 'An A4 book of your system: cover, contents, colour specimens with roles and measured contrast, type specimens and every token. The style guide stays free.',
    features: [
      'Cover, contents and section openings',
      'Three layouts to choose from: Specification, Monograph and Atlas',
      'Every colour with its role, three notations and its reading ink',
      'A contrast matrix measuring every pair in the palette',
      'Type specimens set in your own families, and all your tokens',
    ],
  },
  guidelines: {
    gate: 'brand-guidelines-export',
    eyebrow: 'UIL4B Pro',
    title: 'Export the brand guidelines',
    subtitle: 'A 16:9 landscape brand book of your system: cover, numbered sections, named swatches, alphabet grids, and your palette set in your own type. Add a logo and it gains a logo section. The style guide stays free.',
    features: [
      'A cover and numbered section openings, with a rationale beside every page',
      'Each swatch with its name, hex and the ink that reads on it',
      'Alphabet grids and a type scale set in your own families',
      'Your logo on white, on black and on every brand colour, with a clear-space rule',
    ],
  },
  'app-bundle': {
    gate: 'app-ready-bundle-export',
    eyebrow: 'UIL4B Pro',
    title: 'Export the app-ready bundle',
    subtitle: 'One zip of your system, ready for the apps you design and build in, with a folder for each app and a README that says where to start. The style guide and the code tokens stay free.',
    features: [
      'Figma variables for your colours, with light and dark modes',
      'Swatch files for Adobe, Affinity and Procreate',
      'CSS and JSON tokens for code',
      'A step-by-step import guide for each app',
    ],
  },
}

// THE PAID DOCUMENTS ARE BUILT ON THE SERVER, NOT HERE. Their generators are not
// in this bundle at all (api/_lib/exportDocument.js holds them), so there is
// nothing in the page to call: the dialog asks, the server checks the account's
// plan, and only a Pro account gets the HTML back. What is looked up here is just
// how each one is named and reported.
//
// Keyed by format id, like PRO_GATE. `activation` is the analytics name (the paid
// deliverables are not averaged into the free style guide), `fallback` is what the
// notice says when the browser blocks the print window and the file is saved
// instead, `noun` is how the errors name it. The saved file's name is
// utils/exportFileName.js's.
export const PRO_DOCUMENT = {
  book: {
    activation: 'design-system-book',
    fallback: 'The book downloaded instead.',
    noun: 'book',
    waiting: 'Preparing your design system book…',
  },
  guidelines: {
    activation: 'brand-guidelines',
    fallback: 'The guidelines downloaded instead.',
    noun: 'guidelines',
    waiting: 'Preparing your brand guidelines…',
  },
}

// What the action button says while a kit or a document is being made.
export const BUSY_LABEL = { fonts: 'Embedding fonts…', building: 'Building the kit…', document: 'Preparing your document…', pages: 'Drawing the pages…' }

// How long an export waits for the plan of an account that signed in at its own
// gate. The entitlement is one document read, so this is generous; past it the
// export stops rather than build on a guess.
export const PLAN_WAIT_MS = 8000

// What the dock says when the build needs the network and there is none.
export const OFFLINE_LINE = 'You’re offline. Nothing was exported. Your project is saved; try again when you’re back online.'
const FAILED_LINE = 'That file didn’t build. Try again.'

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

// A variant of a document (the book as PNG or HTML) answers to the same wall as the document.
const gateOf = (formatId) => {
  const f = EXPORT_FORMATS.find((x) => x.id === formatId)
  return PRO_GATE[f?.variantOf || formatId]?.gate || 'export-pro-format'
}

// Build and download in the browser. No server round trip: the document is a
// pure function of the saved design (see utils/styleGuideExport.js), so there
// is nothing to upload and nothing to wait for — and a paid export that can
// fail on someone else's infrastructure is a support ticket waiting to happen.
//
// Free exports carry a visible footer credit; Pro exports are clean. That is
// the policy the Plans page already states, so it is read from the live
// entitlement rather than hard-coded here.
const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked on the next tick rather than immediately: revoking synchronously
  // races the download in Safari and produces an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}

// Show a finished paid document in the window reserved for it and raise the
// print dialog, so "Save as PDF" is one click away. The BROWSER's print engine
// is what makes this a real deliverable: it embeds the user's actual webfont,
// keeps the type vector and selectable, and costs nothing in bundle.
//
// The print bootstrap is appended HERE, to the copy the window gets, never to
// what the server returned: the file that is downloaded keeps its no-script
// guarantee. Returns false when the browser blocked the window, and the file
// was saved instead.
const showDocument = (html, filename, win, title) => {
  const url = URL.createObjectURL(new Blob([withPrintBootstrap(html, { title })], { type: 'text/html;charset=utf-8' }))
  const shown = showInPrintWindow(win, url)
  if (!shown) {
    // Popup blocked. Fall back to the file rather than failing: the user
    // still gets the document, and is told what happened instead of watching
    // the button do nothing.
    URL.revokeObjectURL(url)
    download(new Blob([html], { type: 'text/html;charset=utf-8' }), filename)
    return false
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}

/**
 * The export engine behind the dialog.
 *   run(formatId, { projectId })  make the file; see the statuses above
 *   copy(formatId)                put a Code file on the clipboard: { ok, count } (count is the
 *                                 number of tokens). Never asks for an account. Raises no toast.
 *   upgradeTarget(formatId, projectId)  where a Pro pick goes for this account: { to, checkout, pick, gate }
 *   reset()                       clear the notice, the error and the success line (a new pick)
 *   busy, stage                   an export is running, and which step it is on (a BUSY_LABEL key)
 *   error                         a failure line; the dock shows it as an alert
 *   notice                        { lead, detail } for a finished export that has something to say
 *   done                          null, or { file, opened } after a success: `file` is the name that
 *                                 downloaded ('' when nothing did), `opened` is a print window showing it
 */
export default function useExportRunner() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // A finished export that still has something to say (a font it could not
  // embed, a print window the browser blocked). { lead, detail }: the lead says
  // what happened, the detail what follows from it. Announced politely, and
  // never styled as an error.
  const [notice, setNotice] = useState(null)
  // Which step a long export is on, for the button label: 'fonts' | 'building' | 'document' | 'pages'.
  const [stage, setStage] = useState('')
  const [done, setDone] = useState(null)
  const design = useExportDesign()
  // The template picked for each format lives on the working design, beside the
  // identity, so it follows the project.
  const { design: working, projects } = useProject()
  const chosenTemplates = readExportTemplates(working)
  const { isPro, planKnown } = useSubscription()
  const { user } = useAuth()
  // A file needs an account; a copy never does. See useExportGate.js.
  const requireExportAccount = useExportGate()
  const navigate = useNavigate()
  // What an export in flight reads AFTER its awaits. run's closure holds
  // the render it was clicked in, which for a visitor who signs in at the account
  // gate is the signed-out one: free, and "known". These follow the latest render.
  const live = useRef({ isPro, planKnown, user })
  useEffect(() => { live.current = { isPro, planKnown, user } })
  // False once the dialog has unmounted, so an export waiting on the plan does
  // not go on to build for a dialog nobody can see.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  // Resolves true once an account is signed in AND its own plan has been read
  // (planKnown is false from the render the account appears until its entitlement
  // answers), false if the dialog closes or the wait runs out.
  const waitForPlan = () => new Promise((resolve) => {
    const until = Date.now() + PLAN_WAIT_MS
    const tick = () => {
      if (!mounted.current) resolve(false)
      else if (live.current.user && live.current.planKnown) resolve(true)
      else if (Date.now() > until) resolve(false)
      else setTimeout(tick, 50)
    }
    tick()
  })

  const upgradeTarget = (formatId, projectId) => ({
    ...resolveUpgradeTarget({ formatId, projectId, signedIn: Boolean(user) }),
    gate: gateOf(formatId),
  })

  // A line that stops an export before it starts.
  const stop = (line) => {
    setNotice(null)
    setDone(null)
    setError(line)
  }

  // ── WHERE A PRO FILE SENDS A FREE ACCOUNT. ────────────────────────────
  // A signed-in account with a saved project goes straight to the trial checkout,
  // with the pick stored so "Back to your export" reopens it; anyone else goes to
  // /plans, which is where a visitor with no account starts one, and the gate id
  // is reported so the funnel can say WHICH wall converted. The checkout address
  // is the gallery's own (see kitGalleryPick.js).
  const goUpgrade = (formatId, projectId, signedIn) => {
    const target = resolveUpgradeTarget({ formatId, projectId, signedIn })
    if (target.checkout) {
      // Checkout cannot load offline, so say so here and keep the pick.
      if (isOffline()) { stop(OFFLINE_LINE); return { status: 'offline' } }
      storePick(projectId, target.pick, { uid: live.current.user?.uid })
    } else {
      reportUpgradeGate(gateOf(formatId))
    }
    navigate(target.to)
    return { status: 'upgrade', to: target.to }
  }

  const runExport = async (format, projectId) => {
    // The name the dialog shows on the file: the open project's, else the design's own.
    // `fileProject` is that name as typed ('' for an unnamed project), which the file
    // names are made from; `projectName` is what the documents print, with a stand-in.
    const fileProject = projects.find((p) => String(p.id) === String(projectId))?.name || design?.name || ''
    const projectName = fileProject || 'Design System'
    const fmt = EXPORT_FORMATS.find((f) => f.id === format)
    if (!fmt?.live) { stop(FAILED_LINE); return { status: 'failed' } }

    // ── ENTITLEMENT GATE. FAILS CLOSED. ───────────────────────────────────
    // The check lives HERE, at the top of the function that builds the file,
    // and not only on the button. A disabled or relabelled button is a hint;
    // this is the gate. Nothing has been generated at this point, so a free
    // user cannot reach the artefact by calling this directly either.
    //
    // This runs BEFORE the account gate: the plans page is where a visitor with
    // no account starts one, so asking them to sign in first would put a login
    // popup in front of a Pro CTA.
    //
    // This check is a hint and a courtesy: it spares a free account a round
    // trip. It is not what protects the document. The server decides, from the
    // account's own record, and the generators are not in this page (see
    // PRO_DOCUMENT above), so a forged `isPro` here reaches a 403 and no file.
    if (fmt.pro && !isPro) return goUpgrade(format, projectId, Boolean(user))

    // ── OFFLINE. ───────────────────────────────────────────────────────────
    // The server builds the book and the slides and the kit fetches its fonts, so
    // they say so and send nothing. The style guide and the token files are made here.
    if (needsNetwork(format) && isOffline()) { stop(OFFLINE_LINE); return { status: 'offline' } }

    // A paid file the server builds (the book as PDF or HTML, the guidelines) asks the
    // server; a paid file drawn here (the book as PNG) does not. Both are behind the same plan check.
    // Only the PDF opens a print window; the HTML is saved as a file.
    const paidFile = Boolean(fmt.pro)
    const bookPng = format === 'book-png'
    // The app-ready zip is also drawn here, from the saved design.
    const appBundle = format === 'app-bundle'
    const htmlDocument = format === 'book-html' || format === 'guidelines-html'
    const proDocument = paidFile && !bookPng && !appBundle
    // The document the server is asked for: the HTML variants are the same document.
    const documentKey = htmlDocument ? fmt.variantOf : format

    // The window the document will print in, opened NOW, inside the click. The
    // server round trip below is a network wait, and a window opened after it is
    // blocked by Safari. Every way out of this function closes it again.
    let printWin = proDocument && !htmlDocument ? reservePrintWindow() : null
    const closePrintWin = () => { releasePrintWindow(printWin); printWin = null }

    // ── ACCOUNT GATE ──────────────────────────────────────────────────────
    // Producing a FILE needs a free account; copying a value never does
    // (sign-in only for saving, exporting and account actions). See
    // src/hooks/useExportGate.js for the map that puts the line here.
    const tokenFile = isCodeFile(format)
    const reason = format === 'kit' ? 'export this UI kit' : tokenFile ? 'export these design tokens' : bookPng ? 'export this design system book' : appBundle ? 'export this app-ready bundle' : 'export this style guide'
    const signedOut = !user
    if (!(await requireExportAccount(reason))) { closePrintWin(); return { status: 'cancelled' } }

    // ── THE PLAN OF AN ACCOUNT THAT JUST SIGNED IN. ───────────────────────
    // `isPro` above is the signed-out visitor's: free. Someone who is Pro and
    // signs in at the gate would get a watermarked, free-tier file, so wait for
    // their own entitlement and read it again. If it does not arrive the export
    // stops with the dialog open: the button already says "Checking your plan…"
    // or has the right label by then, and a file built on a guess cannot be
    // taken back.
    let proNow = isPro
    if (signedOut) {
      if (!(await waitForPlan())) {
        closePrintWin()
        if (mounted.current) setError('You are signed in, but your plan has not loaded yet. Try again in a moment.')
        return { status: 'failed' }
      }
      proNow = live.current.isPro
      // The same Pro gate as above, read against the plan that just arrived.
      if (paidFile && !proNow) {
        closePrintWin()
        return goUpgrade(format, projectId, Boolean(live.current.user))
      }
    }

    setBusy(true)
    setError('')
    setNotice(null)
    setDone(null)
    // Which activation this export completed.
    let activation = 'style-guide'
    // The file this export handed over, and whether a print window is showing it.
    let savedFile = ''
    let opened = false
    try {
      if (format === 'kit') {
        // The kit is built in the browser like everything else here, but it
        // fetches the selected font files first so the document opens offline.
        // Loaded on demand: the template and the font fetcher cost nothing to
        // anyone who never exports a kit. The tier is the live entitlement.
        const { buildUiKit } = await import('../utils/uiKitAssets')
        activation = 'ui-kit'
        const { blob, filename, missing } = await buildUiKit(design, {
          tier: proNow ? 'pro' : 'free',
          projectName,
          fileProject,
          template: chosenTemplates.kit,
          onStage: setStage,
        })
        savedFile = download(blob, filename)
        if (missing.length) {
          // The kit WAS produced and says the same inside itself; the dialog
          // carries the notice rather than closing over it.
          setNotice({
            lead: 'Your UI kit downloaded.',
            detail: `${missing.join(' and ')} could not be embedded, so the kit shows ${missing.length > 1 ? 'them' : 'it'} in a fallback font and says so.`,
          })
        }
      } else if (bookPng) {
        // The book as page images, drawn on a canvas like the style guide PNG (see
        // the note at the top of utils/bookRaster.js). Loaded on demand: the pages,
        // the zip writer and the font wait cost nothing to anyone who never exports
        // them. The plan check above has already passed.
        activation = PRO_DOCUMENT.book.activation
        setStage('pages')
        const { renderBookPng } = await import('../utils/bookRaster')
        const blob = await renderBookPng(design, { projectName, watermark: !proNow })
        savedFile = download(blob, formatFileName(fileProject, 'book-png'))
      } else if (proDocument) {
        // The book and the brand guidelines, as a PDF or as HTML. The server checks the plan and builds
        // the document; a refusal means there is no file to hand over.
        const doc = PRO_DOCUMENT[documentKey]
        activation = doc.activation
        setStage('document')
        labelPrintWindow(printWin, doc.waiting)
        const answer = await requestExportDocument({ format: documentKey, design, projectName, template: chosenTemplates[documentKey] }, { loadAuth: loadAuthSdk })
        // The dialog can unmount while the server works (the route changed under
        // it). Nobody is left to read a result, so close the blank window that was
        // reserved and touch nothing else.
        if (!mounted.current) { closePrintWin(); return { status: 'unmounted' } }
        // A refusal stays in the dialog and says so. It is not sent to /plans: this
        // account passed the Pro check on this page a moment ago, so the likely
        // cause is a plan that just ended or a stale read, and a pricing page
        // that may say "you are on Pro" is the wrong answer to that person.
        if (answer.status === 'pro-required') {
          throw new Error(`We couldn’t find a Pro plan on this account, so the ${doc.noun} wasn’t made.`)
        }
        if (answer.status === 'signed-out') {
          throw new Error(`You’re signed out. Sign in again, then export the ${doc.noun}.`)
        }
        // These two are the design's fault, not the connection's, and trying again
        // changes nothing, so they get their own words.
        if (answer.status === 'too-large') {
          throw new Error('This design is too large to export. Try a smaller logo.')
        }
        if (answer.status === 'too-many-colours') {
          throw new Error('This palette has more colours than the document can hold (200 max).')
        }
        if (answer.status !== 'ok') {
          throw new Error(`The ${doc.noun} couldn’t be made. Check your connection and try again.`)
        }
        const file = formatFileName(fileProject, format, { saved: true })
        if (htmlDocument) {
          savedFile = download(new Blob([answer.html], { type: 'text/html;charset=utf-8' }), file)
        } else {
          // The print window is titled with the PDF's name, so "Save as PDF" offers the name the manifest shows.
          opened = showDocument(answer.html, file, printWin, formatFileName(fileProject, format).replace(/\.pdf$/, ''))
          printWin = null
          if (!opened) {
            // The document WAS produced, so this is a notice and not an error: the
            // dialog carries it rather than closing over it.
            savedFile = file
            setNotice({ lead: doc.fallback, detail: 'Your browser blocked the print window. Open the file and print to PDF.' })
          }
        }
      } else if (appBundle) {
        // One zip with a folder per app (utils/appBundle.js). Loaded on demand with
        // its writers and the zip library. The plan check above has already passed.
        activation = 'app-ready-bundle'
        const { buildAppBundle, bundleDate } = await import('../utils/appBundle')
        const blob = await buildAppBundle(design, { date: bundleDate(new Date()), name: fileProject })
        savedFile = download(blob, formatFileName(fileProject, 'app-bundle'))
      } else if (tokenFile) {
        // The token, Tailwind and contrast files all read one token list
        // (utils/designTokens.js), so they carry the same names and values. Built by
        // utils/codeFiles.js, which loads each generator on demand.
        activation = 'design-tokens'
        const body = await buildCodeFile(format, design, { projectName, watermark: !proNow })
        savedFile = download(new Blob([body], { type: CODE_FILES[format].mime }), codeFileName(format, fileProject))
      } else if (format === 'png' || format === 'jpeg') {
        // Drawn on a canvas rather than rasterised from the HTML — see the note
        // at the top of utils/styleGuideRaster.js. Loaded on demand so the
        // raster path costs nothing to anyone exporting HTML.
        const { renderStyleGuideImage } = await import('../utils/styleGuideRaster')
        const blob = await renderStyleGuideImage(design, { projectName, watermark: !proNow, format })
        savedFile = download(blob, formatFileName(fileProject, format))
      } else {
        const markdown = format === 'md'
        const body = markdown
          ? buildStyleGuideMarkdown(design, { projectName, watermark: !proNow })
          : buildStyleGuideHtml(design, { projectName, watermark: !proNow })
        savedFile = download(
          new Blob([body], { type: markdown ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' }),
          formatFileName(fileProject, format),
        )
      }
      // ACTIVATION (export half). Fired only after the file actually
      // downloaded — an export that threw is not a piece of completed work,
      // and counting the attempt would inflate the one number meant to say
      // whether the product was useful. The book reports under its own name so
      // the paid deliverable is not averaged into the free one.
      try { trackActivation(activation, 'export') } catch { /* never break an export */ }
      if (!mounted.current) {
        // The dialog went away while the file was building, so there is no dock to say
        // what downloaded. Raised through the app's one toast host (useToast listens for this event).
        if (savedFile) {
          window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: `Downloaded ${savedFile}`, type: 'success' } }))
        }
        return { status: 'done', file: savedFile }
      }
      // The dialog stays open: a second file is one more click.
      setBusy(false)
      setStage('')
      setDone({ file: savedFile, opened })
      return { status: 'done', file: savedFile }
    } catch (err) {
      // The dialog stays open on failure: closing it would leave the user with
      // no file and no explanation, which reads as the button doing nothing.
      closePrintWin()
      if (!mounted.current) return { status: 'failed' }
      setBusy(false)
      setStage('')
      setError(err?.message || FAILED_LINE)
      return { status: 'failed' }
    }
  }

  // The click handler. A second click that lands before the first has set `busy`
  // (the account gate and the plan wait both await before it) would reserve a
  // second window and send a second request. The ref is set synchronously, so
  // the second call sees it at once; state would not be updated yet.
  const exporting = useRef(false)
  const run = async (formatId, { projectId } = {}) => {
    if (exporting.current) return { status: 'busy' }
    exporting.current = true
    try { return await runExport(formatId, projectId) } finally { exporting.current = false }
  }

  // Copy a Code file: the same text the download carries (with the credit
  // comment on a free account), straight to the clipboard. A copy is free forever and
  // needs no account (useExportGate.js), so none of the gates above run. It waits for
  // the plan like the file does, so a Pro account is never handed the credit.
  const copy = async (formatId) => {
    const none = { ok: false, count: 0 }
    if (!isCodeFile(formatId) || !design || live.current.planKnown === false) return none
    try {
      const projectName = design.name || 'Design System'
      const watermark = !live.current.isPro
      const text = await buildCodeFile(formatId, design, { projectName, watermark })
      await navigator.clipboard.writeText(text)
      // The token count is only true of the two token files.
      const count = formatId === 'css' || formatId === 'json' ? (await import('../utils/designTokens')).designTokens(design).length : 0
      return { ok: true, count }
    } catch { return none }
  }

  const reset = () => {
    setError('')
    setNotice(null)
    setDone(null)
  }

  return { run, copy, busy, stage, error, notice, done, reset, upgradeTarget }
}
