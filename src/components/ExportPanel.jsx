import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackActivation } from '../utils/analytics'
import { reportUpgradeGate } from '../contexts/ProModalContext'
import { lockScroll } from '../utils/scrollLock'
import useExportDesign from '../hooks/useExportDesign'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import useExportGate from '../hooks/useExportGate'
import { loadAuthSdk } from '../utils/firebaseAccess'
import {
  labelPrintWindow, releasePrintWindow, requestExportDocument, reservePrintWindow,
  showInPrintWindow, withPrintBootstrap,
} from '../utils/exportDocument'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../utils/styleGuideExport'
import { EXPORT_FORMATS, EXPORT_GROUPS, comingLine, groupFormats, isGroupPro } from '../config/exportFormats'
import { defaultTemplate, liveTemplates, readExportTemplates } from '../config/exportTemplates'
import { useProject } from '../contexts/ProjectContext'
import ExportTemplatePicker from './ExportTemplatePicker'
import BrandLogoField from './BrandLogoField'
import KitIdentityFields from './KitIdentityFields'
import ExportFormatSwitch from './ExportFormatSwitch'
import ExportProPreview from './ExportProPreview'
import ExportProTag from './ExportProTag'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/overlay.css'
import { useCloseOnBack, useInertBehind } from '../hooks/useCloseOnBack'

// The Export dialog. It works from any page (it reads nothing from the current
// tool) and is opened from the PillNav search cluster.
//
// THIS COMMENT USED TO SAY "there is NO real export logic yet: every format is
// a selectable preview". That stopped being true when the style guide and the
// design system book shipped, and it stayed on the file — which is part of how
// /plans came to describe the export offer wrongly. The live count is not
// restated here on purpose; read src/config/exportFormats.js, which is the one
// place that knows, and which the pricing page now derives its claims from.
//
// What holds regardless: a format without `live` gets no row and no button, only
// a name in the one "on the way" line, so we never advertise a capability that
// is not wired.
//
// The panel offers FIVE things (UI kit, style guide, design tokens, the book,
// the brand guidelines), not eleven formats: each row is a `group` in
// src/config/exportFormats.js, and a row with more than one file type shows them
// as a switch in its options. `format` below is still the single format id, so
// every export path further down is unchanged by the layout above it.
//
// Accessibility: role="dialog" + aria-modal, focus moves to the title on open
// (so a screen reader reads the title, then the intro), Tab is trapped, Escape
// and a backdrop click close it, and focus is restored to the opener (the Export
// button) on unmount. The rows are one radiogroup with a roving tab stop.

// Lives in src/config/exportFormats.js so /plans reads the same array instead
// of describing the export offer from memory. The file-top note here applies.
const FORMATS = EXPORT_FORMATS

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
const PRO_GATE = {
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
    subtitle: 'A 16:9 landscape brand book of your system — cover, numbered sections, swatches carrying a name as well as a hex, boxed alphabet grids, and your palette set in your own type. Add a logo and it gains a logo section. The style guide stays free.',
    features: [
      'A cover and numbered section openings, with a rationale beside every page',
      'Named swatches — “Optic White”, not just #FCFCFC — with the ink measured on each',
      'Alphabet grids and a type scale set in your own families',
      'Your logo on white, on black and on every brand colour, with a clear-space rule',
    ],
  },
}

// THE PAID DOCUMENTS ARE BUILT ON THE SERVER, NOT HERE. Their generators are not
// in this bundle at all (api/_lib/exportDocument.js holds them), so there is
// nothing in the page to call: the panel asks, the server checks the account's
// plan, and only a Pro account gets the HTML back. What is looked up here is just
// how each one is named and reported.
//
// Keyed by format id, like PRO_GATE. `file` ends the downloaded name, `activation`
// is the analytics name (the paid deliverables are not averaged into the free
// style guide), `fallback` is what the notice says when the browser blocks the
// print window and the file is saved instead, `noun` is how the errors name it.
const PRO_DOCUMENT = {
  book: {
    file: 'design-system-book.html',
    activation: 'design-system-book',
    fallback: 'The book downloaded instead.',
    noun: 'book',
    waiting: 'Preparing your design system book…',
  },
  guidelines: {
    file: 'brand-guidelines.html',
    activation: 'brand-guidelines',
    fallback: 'The guidelines downloaded instead.',
    noun: 'guidelines',
    waiting: 'Preparing your brand guidelines…',
  },
}

// What the action button says while a kit or a document is being made.
const BUSY_LABEL = { fonts: 'Embedding fonts…', building: 'Building the kit…', document: 'Preparing your document…' }

// How long an export waits for the plan of an account that signed in at its own
// gate. The entitlement is one document read, so this is generous; past it the
// export stops rather than build on a guess.
const PLAN_WAIT_MS = 8000

export default function ExportPanel({ onClose }) {
  // Mounted only while open: Back closes it (audit A3) and the page is inert (A12).
  useCloseOnBack(true, onClose)
  useInertBehind(true)
  const [format, setFormat] = useState('kit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // A finished export that still has something to say (a font it could not
  // embed, a print window the browser blocked). { lead, detail }: the lead says
  // what happened, the detail what follows from it. Announced politely, and
  // never styled as an error.
  const [notice, setNotice] = useState(null)
  // Which step a long export is on, for the button label: 'fonts' | 'building'.
  const [stage, setStage] = useState('')
  // An export finished and the panel stayed open to say something about it.
  // There is nothing left to cancel, so the secondary action reads Close.
  const [done, setDone] = useState(false)
  const design = useExportDesign()
  // The template picked for each format lives on the working design, beside the
  // identity, so it follows the project.
  const { design: working, updateDesign } = useProject()
  const chosenTemplates = readExportTemplates(working)
  const { isPro, planKnown } = useSubscription()
  const { user } = useAuth()
  // A file needs an account; a copy never does. See useExportGate.js.
  const requireExportAccount = useExportGate()
  const navigate = useNavigate()
  const activeFormat = FORMATS.find(f => f.id === format)
  const activeGroup = EXPORT_GROUPS.find(g => g.id === activeFormat?.group)
  // The file type last chosen in each row, so leaving the style guide on PNG and
  // coming back finds PNG still chosen.
  const lastInGroup = useRef({})
  // Every gate is explicit rather than silent. The free user is told what
  // they are about to hit BEFORE they click, by the button's own label, rather
  // than finding out from a modal after it.
  const locked = Boolean(activeFormat?.pro) && !isPro
  // The plan is still being read. A paid row must not say "Unlock with Pro" to
  // someone who is about to turn out to be Pro, nor run the gate on a guess, and
  // a free row must not build a watermarked file for someone who is Pro.
  const checking = planKnown === false
  // What an export in flight reads AFTER its awaits. runExport's closure holds
  // the render it was clicked in, which for a visitor who signs in at the account
  // gate is the signed-out one: free, and "known". These follow the latest render.
  const live = useRef({ isPro, planKnown, user })
  useEffect(() => { live.current = { isPro, planKnown, user } })
  // False once the panel has unmounted, so an export waiting on the plan does
  // not go on to build for a dialog nobody can see.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  // Resolves true once an account is signed in AND its own plan has been read
  // (planKnown is false from the render the account appears until its entitlement
  // answers), false if the panel closes or the wait runs out.
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
  const showDocument = (html, filename, win) => {
    const url = URL.createObjectURL(new Blob([withPrintBootstrap(html)], { type: 'text/html;charset=utf-8' }))
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

  const runExport = async () => {
    const projectName = design?.name || 'Design System'
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'style-guide'

    // ── ENTITLEMENT GATE. FAILS CLOSED. ───────────────────────────────────
    // The check lives HERE, at the top of the function that builds the file,
    // and not only on the button. A disabled or relabelled button is a hint;
    // this is the gate. Nothing has been generated at this point, so a free
    // user cannot reach the artefact by calling this directly either.
    //
    // WHERE IT SENDS YOU: /plans (every Pro CTA goes to /plans, never to a
    // login popup or a modal). That is also why it runs BEFORE the account
    // gate: the plans page is where a visitor with no account starts one, so
    // asking them to sign in first would put a login popup in front of a Pro
    // CTA. The gate id is still reported, so the funnel can say WHICH wall
    // converted.
    //
    // This check is a hint and a courtesy: it spares a free account a round
    // trip. It is not what protects the document. The server decides, from the
    // account's own record, and the generators are not in this page (see
    // PRO_DOCUMENT above), so a forged `isPro` here reaches a 403 and no file.
    if (FORMATS.find(f => f.id === format)?.pro && !isPro) {
      reportUpgradeGate(PRO_GATE[format]?.gate || 'export-pro-format')
      onClose()
      navigate('/plans')
      return
    }
    const proDocument = Boolean(FORMATS.find(f => f.id === format)?.pro)

    // The window the document will print in, opened NOW, inside the click. The
    // server round trip below is a network wait, and a window opened after it is
    // blocked by Safari. Every way out of this function closes it again.
    let printWin = proDocument ? reservePrintWindow() : null
    const closePrintWin = () => { releasePrintWindow(printWin); printWin = null }

    // ── ACCOUNT GATE ──────────────────────────────────────────────────────
    // Producing a FILE needs a free account; copying a value never does
    // (sign-in only for saving, exporting and account actions). See
    // src/hooks/useExportGate.js for the map that puts the line here.
    const tokenFile = format === 'css' || format === 'json'
    const reason = format === 'kit' ? 'export this UI kit' : tokenFile ? 'export these design tokens' : 'export this style guide'
    const signedOut = !user
    if (!(await requireExportAccount(reason))) { closePrintWin(); return }

    // ── THE PLAN OF AN ACCOUNT THAT JUST SIGNED IN. ───────────────────────
    // `isPro` above is the signed-out visitor's: free. Someone who is Pro and
    // signs in at the gate would get a watermarked, free-tier file, so wait for
    // their own entitlement and read it again. If it does not arrive the export
    // stops with the panel open: the button already says "Checking your plan…"
    // or has the right label by then, and a file built on a guess cannot be
    // taken back.
    let proNow = isPro
    if (signedOut) {
      if (!(await waitForPlan())) {
        closePrintWin()
        if (mounted.current) setError('You are signed in, but your plan has not loaded yet. Try again in a moment.')
        return
      }
      proNow = live.current.isPro
      // The same Pro gate as above, read against the plan that just arrived.
      if (proDocument && !proNow) {
        closePrintWin()
        reportUpgradeGate(PRO_GATE[format]?.gate || 'export-pro-format')
        onClose()
        navigate('/plans')
        return
      }
    }

    setBusy(true)
    setError('')
    setNotice(null)
    setDone(false)
    // Which activation this export completed, and whether the panel may close.
    let activation = 'style-guide'
    let keepOpen = false
    // The file this export handed over, for the confirmation once the panel closes.
    let savedFile = ''
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
          template: chosenTemplates.kit,
          onStage: setStage,
        })
        savedFile = download(blob, filename)
        if (missing.length) {
          // The kit WAS produced and says the same inside itself; the panel
          // stays open to carry the notice rather than closing over it.
          setNotice({
            lead: 'Your UI kit downloaded.',
            detail: `${missing.join(' and ')} could not be embedded, so the kit shows ${missing.length > 1 ? 'them' : 'it'} in a fallback font and says so.`,
          })
          setBusy(false)
          setStage('')
          keepOpen = true
        }
      } else if (proDocument) {
        // The book and the brand guidelines. The server checks the plan and builds
        // the document; a refusal means there is no file to hand over.
        const doc = PRO_DOCUMENT[format]
        activation = doc.activation
        setStage('document')
        labelPrintWindow(printWin, doc.waiting)
        const answer = await requestExportDocument({ format, design, projectName, template: chosenTemplates[format] }, { loadAuth: loadAuthSdk })
        // The panel can unmount while the server works (the route changed under
        // it). Nobody is left to read a result, so close the blank window that was
        // reserved and touch nothing else.
        if (!mounted.current) { closePrintWin(); return }
        // A refusal stays in the panel and says so. It is not sent to /plans: this
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
        const shownInWindow = showDocument(answer.html, `${slug}-${doc.file}`, printWin)
        printWin = null
        if (!shownInWindow) {
          // The document WAS produced, so this is a notice and not an error: the
          // panel stays open to carry it rather than closing over it.
          setNotice({ lead: doc.fallback, detail: 'Your browser blocked the print window. Open the file and print to PDF.' })
          setBusy(false)
          setStage('')
          keepOpen = true
        }
      } else if (tokenFile) {
        // Both token files come from one token list (utils/designTokens.js), so
        // they always carry the same names and values. Loaded on demand like the
        // other generators.
        const { buildTokensCss, buildTokensJson } = await import('../utils/designTokens')
        activation = 'design-tokens'
        const css = format === 'css'
        const body = css
          ? buildTokensCss(design, { projectName, watermark: !proNow })
          : buildTokensJson(design, { projectName, watermark: !proNow })
        savedFile = download(
          new Blob([body], { type: css ? 'text/css;charset=utf-8' : 'application/json;charset=utf-8' }),
          `${slug}.tokens.${css ? 'css' : 'json'}`,
        )
      } else if (format === 'png' || format === 'jpeg') {
        // Drawn on a canvas rather than rasterised from the HTML — see the note
        // at the top of utils/styleGuideRaster.js. Loaded on demand so the
        // raster path costs nothing to anyone exporting HTML.
        const { renderStyleGuideImage } = await import('../utils/styleGuideRaster')
        const blob = await renderStyleGuideImage(design, { projectName, watermark: !proNow, format })
        savedFile = download(blob, `${slug}-style-guide.${format === 'jpeg' ? 'jpg' : 'png'}`)
      } else {
        const markdown = format === 'md'
        const body = markdown
          ? buildStyleGuideMarkdown(design, { projectName, watermark: !proNow })
          : buildStyleGuideHtml(design, { projectName, watermark: !proNow })
        savedFile = download(
          new Blob([body], { type: markdown ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' }),
          `${slug}-style-guide.${markdown ? 'md' : 'html'}`,
        )
      }
      // ACTIVATION (export half). Fired only after the file actually
      // downloaded — an export that threw is not a piece of completed work,
      // and counting the attempt would inflate the one number meant to say
      // whether the product was useful. The book reports under its own name so
      // the paid deliverable is not averaged into the free one.
      try { trackActivation(activation, 'export') } catch { /* never break an export */ }
      // A kit or file export that finished after the panel went away has already
      // handed over its file; there is no dialog left to close or update.
      if (!mounted.current) return
      if (!keepOpen) {
        onClose()
        // The panel closing says nothing about the file, so name it. Raised
        // through the app's one toast host (useToast listens for this event).
        // The print-window books hand over no file here, so they stay quiet.
        if (savedFile) {
          window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: `Downloaded ${savedFile}`, type: 'success' } }))
        }
      } else setDone(true)
    } catch (err) {
      // The panel stays open on failure: closing it would leave the user with
      // no file and no explanation, which reads as the button doing nothing.
      closePrintWin()
      if (!mounted.current) return
      setBusy(false)
      setStage('')
      setError(err?.message || 'The export could not be created. Please try again.')
    }
  }
  // The click handler. A second click that lands before the first has set `busy`
  // (the account gate and the plan wait both await before it) would reserve a
  // second window and send a second request. The ref is set synchronously, so
  // the second call sees it at once; state would not be updated yet.
  const exporting = useRef(false)
  const startExport = async () => {
    if (exporting.current) return
    exporting.current = true
    try { await runExport() } finally { exporting.current = false }
  }
  // Escape, a click on the backdrop and the close button leave the panel, and
  // while an export is in flight there is no way to take it back: the same rule
  // the disabled Cancel button already states.
  const requestClose = () => { if (!busy) onClose() }
  const panelRef = useRef(null)
  const exportBtnRef = useRef(null)
  // What a finished export said (the notice, the error line) belongs to the
  // format that produced it, and the footer keeps it in view. Choosing another
  // format starts clean, so "Your UI kit downloaded" never sits beside "Export CSS".
  const pickFormat = (id) => {
    if (id === format) return
    const group = FORMATS.find(f => f.id === id)?.group
    if (group) lastInGroup.current[group] = id
    setFormat(id)
    setNotice(null)
    setError('')
    // The secondary button reads Close only while a finished export's message is
    // on screen; with the message gone there is something to cancel again.
    setDone(false)
  }
  // Choosing a row opens it on the file type last chosen there, else its first.
  const pickGroup = (groupId) => {
    if (groupId === activeFormat?.group) return
    pickFormat(lastInGroup.current[groupId] || groupFormats(groupId)[0].id)
  }
  // The rows are a radiogroup with one tab stop (the chosen row). Up and Down
  // choose and move, Home and End jump, and the ends wrap.
  const rowRefs = useRef([])
  const onRowKeyDown = (e, i) => {
    const key = e.key
    let to = -1
    if (key === 'ArrowDown') to = i + 1
    else if (key === 'ArrowUp') to = i - 1
    else if (key === 'Home') to = 0
    else if (key === 'End') to = EXPORT_GROUPS.length - 1
    else return
    e.preventDefault()
    to = (to + EXPORT_GROUPS.length) % EXPORT_GROUPS.length
    pickGroup(EXPORT_GROUPS[to].id)
    rowRefs.current[to]?.focus()
  }
  // Export disables while it builds, and a disabled button drops focus to the
  // page behind, so the next Tab would leave the dialog. Hold focus on the panel
  // while it builds, then hand it back to the Export button once it is enabled.
  const wasBusy = useRef(false)
  useEffect(() => {
    if (busy) {
      wasBusy.current = true
      panelRef.current?.focus()
    } else if (wasBusy.current) {
      wasBusy.current = false
      const btn = exportBtnRef.current
      if (btn && !btn.disabled) btn.focus()
    }
  }, [busy])
  const restoreRef = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  // Lock page scroll while open (this also pauses the app-wide Lenis); restore
  // focus to the opener when we unmount.
  useEffect(() => {
    const unlockScroll = lockScroll()
    const opener = restoreRef.current
    return () => {
      unlockScroll()
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Whether the panel scrolls and has more below what is showing, for the fade
  // above the dock. Re-measured on scroll and whenever a child changes size
  // (a selected row opening its fields, a notice arriving, the window resizing).
  // `scrolled` is the panel being off its top, for the phone head's hairline.
  const [moreBelow, setMoreBelow] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const measureRef = useRef(null)
  useEffect(() => {
    const el = panelRef.current
    if (!el) return undefined
    const measure = () => {
      // The last 20px under the dock is the bottom padding of the final block,
      // so a state that overflows by less than that has nothing cut off and
      // gets no fade over its last line.
      setMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 20)
      setScrolled(el.scrollTop > 0)
    }
    measureRef.current = measure
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure)
      ro.observe(el)
      Array.from(el.children).forEach((child) => ro.observe(child))
    }
    return () => {
      el.removeEventListener('scroll', measure)
      ro?.disconnect()
      measureRef.current = null
    }
  }, [])
  // A block added to the panel itself (the logo field) changes its scroll height
  // without resizing any child that was already observed.
  useEffect(() => { measureRef.current?.() }, [format, notice, error])

  // On open, focus goes to the title: a screen reader reads it, then the intro.
  // Its own effect with no dependencies, so a parent re-render that hands down a
  // new onClose can never pull focus back from the row someone is on.
  const titleRef = useRef(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  // Trap Tab within the panel, and close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      // Not while an export is in flight (see requestClose).
      if (e.key === 'Escape') { if (!busy) onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      // The title and the panel hold focus without being Tab stops, so
      // Shift+Tab from either one wraps to the last control as from the first.
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === titleRef.current || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  // The intro is for a free account, and waits for the plan so a Pro account
  // never sees it flash.
  const showIntro = !isPro && planKnown !== false
  const coming = comingLine()
  const choices = activeGroup ? groupFormats(activeGroup.id) : []
  const pickedFile = activeFormat?.id
  const needsOptions = choices.length > 1
    || (activeGroup?.id === 'kit' && isPro)
    || Boolean(activeGroup?.preview)
    || Boolean(activeFormat?.logo)
    || liveTemplates(activeFormat?.id).length > 1
  const options = activeGroup && needsOptions ? (
    <div className="exp-options" role="region" aria-label={`Options for ${activeGroup.name}`} key={activeGroup.id}>
      {choices.length > 1 && (
        <ExportFormatSwitch
          label={`${activeGroup.name} file type`}
          options={choices.map(f => ({ id: f.id, label: f.option }))}
          value={pickedFile}
          onChange={pickFormat}
        />
      )}
      {/* Shown only while the row has a choice: one live template needs no picker. */}
      {liveTemplates(activeFormat?.id).length > 1 && (
        <ExportTemplatePicker
          format={activeFormat.id}
          value={chosenTemplates[activeFormat.id]}
          onChange={(id) => updateDesign({ exportTemplates: { [activeFormat.id]: id } })}
        />
      )}
      {/* A Pro UI kit is personalised; a free kit carries no identity. */}
      {activeGroup.id === 'kit' && isPro && <KitIdentityFields />}
      {/* The pictures are drawn in the Specification layout, so the book shows them only for it. */}
      {activeGroup.preview && chosenTemplates[activeFormat?.id] === defaultTemplate(activeFormat?.id) && (
        <ExportProPreview
          kind={activeGroup.preview}
          design={design}
          projectName={design?.name || 'Design System'}
          blurred={!isPro}
          showLock={!isPro && !checking}
        />
      )}
      {/* Its own block under the preview, not a control inside the guidelines
          row. It appears only for a format whose document actually has logo
          pages, so the ask is never made of someone exporting a token file, and
          the flag that decides it is the same table that renders the rows. */}
      {activeFormat?.logo && <BrandLogoField />}
    </div>
  ) : null

  return (
    <div className="exp-overlay" onMouseDown={requestClose}>
      <div
        className={`exp-panel${moreBelow ? ' has-more' : ''}${scrolled ? ' is-scrolled' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exp-title"
        aria-describedby={showIntro ? 'exp-intro' : undefined}
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="exp-head">
          <div className="exp-head-text">
            {/* No eyebrow: it only said the title again. Focus lands here on
                open, so a screen reader reads the title, then the intro. */}
            <h2 className="exp-title" id="exp-title" tabIndex={-1} ref={titleRef}>Export your design system</h2>
            {showIntro && <p className="exp-sub" id="exp-intro">Pick what you need. Free files carry a small UIL4B mark.</p>}
          </div>
          <button type="button" className="exp-close" onClick={requestClose} disabled={busy} aria-label="Close export">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* The five things you can take, one radiogroup. The paid documents sit
            below a hairline-edged band (free accounts only), so free and paid
            are told apart by a divider rather than by a tinted box. Pro rows stay selectable for a free
            account: choosing one is how the preview and the way to Pro are seen. */}
        <div className="exp-formats" role="radiogroup" aria-labelledby="exp-title">
          {EXPORT_GROUPS.map((g, i) => {
            const active = g.id === activeFormat?.group
            const paid = isGroupPro(g.id)
            // Pro for a free account only: a Pro user sees neither lock nor word.
            // Held back while the plan is read, so a Pro account never sees the
            // tag, the band or the lock appear and then leave, shifting the list.
            const showPro = paid && !isPro && !checking
            // The band between free and paid is for a free account only: to a
            // Pro account every row is theirs, so there is nothing to divide.
            const startsPaid = showPro && i > 0 && !isGroupPro(EXPORT_GROUPS[i - 1].id)
            return (
              <Fragment key={g.id}>
                {startsPaid && <div className="exp-fmt-gap" aria-hidden="true" />}
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={showPro ? `${g.name}, Pro` : g.name}
                  aria-describedby={`exp-desc-${g.id}`}
                  tabIndex={active ? 0 : -1}
                  ref={(el) => { rowRefs.current[i] = el }}
                  className={`exp-fmt${active ? ' is-active' : ''}`}
                  onClick={() => pickGroup(g.id)}
                  onKeyDown={(e) => onRowKeyDown(e, i)}
                >
                  <span className="exp-fmt-check" aria-hidden="true" />
                  <span className="exp-fmt-text">
                    <span className="exp-fmt-name">{g.name}</span>
                    <span className="exp-fmt-desc" id={`exp-desc-${g.id}`}>{g.desc}</span>
                  </span>
                  {showPro && <ExportProTag />}
                </button>
              </Fragment>
            )
          })}
        </div>

        {/* The chosen row's options, in one region under the list: the file-type
            switch, the preview of a Pro document, the identity and logo fields.
            Keyed by row, so a change of row swaps the region (a 150ms fade, none
            under reduced motion). A row with nothing to choose has no region. */}
        {options}

        {coming && <p className="exp-coming">{coming}</p>}

        {/* The dock sticks to the bottom of the panel, so what an export has to
            say sits right above its buttons and is in view whatever the list's
            scroll position, instead of below the last format row. */}
        <div className="exp-dock">
          {error && <p className="exp-error" role="alert">{error}</p>}
          {/* The live region is mounted empty and stays mounted, so a screen
              reader is already watching it when the text arrives. Empty, it
              adds nothing to the dock. */}
          <div className="exp-live" role="status" aria-live="polite">
            {notice && (
              <p className="exp-notice">
                <span className="exp-notice-lead">{notice.lead}</span>{' '}{notice.detail}
              </p>
            )}
          </div>

          <div className="exp-foot">
            <button type="button" className="btn exp-act" onClick={onClose} disabled={busy}>
              {done ? 'Close' : 'Cancel'}
            </button>
            {/* Every row is built, so there is always a real action. The label
                says what the click will do: unlock, wait for the plan, or the
                file about to be made. */}
            <button type="button" className="btn btn-accent exp-act" ref={exportBtnRef} onClick={startExport} disabled={busy || checking}>
              {busy ? (BUSY_LABEL[stage] || 'Exporting…') : checking ? 'Checking your plan…' : locked ? 'Unlock with Pro' : activeFormat.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
