import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import FontBrowseDialog from '../components/FontBrowseDialog'
import ToolIcon from '../components/tool/ToolIcon'
import { typeToolsBarItems } from '../components/tool/TypeToolsBar'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolPills,
} from '../components/tool/ToolLayout'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import useModalDialog from '../hooks/useModalDialog'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, suggestPairings,
} from '../utils/googleFonts'
import { popPairHistory, pushPairHistory, shufflePair, swapPair } from '../utils/fontPairing'
import {
  bodyFaceWeights, describePairImport, headingFaceWeights, pairImportFamilies,
} from '../utils/fontImport'
import { categoryLabel, categoryWord, weightCount } from '../utils/fontGallery'
import { shortFamilyName } from '../utils/familyLabel'
import { getLenis } from '../hooks/useSmoothScroll.js'
import { consumePairDraft, ownTypeScale, readPairDraft, setScaleDraft } from '../utils/typeHandoff'
// The shared sheets for the font picker, the catalogue notice and the loader,
// then the page's own sheet, scoped under `.fpr-page`, the page root.
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
import '../styles/pages/font-pair.css'
import '../styles/pages/font-pair-board.css'

// Font Pair — the standalone /create/font-pair page. Two families, one specimen, and a
// reason for every suggestion.
//
// The pairing engine (utils/googleFonts → suggestPairings) scores body
// candidates against the heading's category and returns the rationale alongside
// each result, because the failure mode of every font-pairing tool is being a
// slot machine: it shows you six combinations and can't say why any of them is
// there. Here the reason is rendered on the card, so an unconvincing suggestion
// can be dismissed on the merits rather than reshuffled hopefully.
//
// The specimen is the other half of the job. A pairing is a relationship
// between sizes, weights and colour on a page — not two names side by side — so
// the preview is a real article at real sizes, and the preview text is editable
// because brand words behave differently from a pangram.
//
// Murphy's law: the catalogue is the only network dependency, and it degrades to
// the bundled list with a visible notice and a retry (useFontCatalog). Both
// families are always defined, so the specimen can never render empty; when a
// face is blocked the browser's own fallback shows and the notice explains why.

// `short` is the label on a phone, where four segments share the row; the full
// name stays as the accessible name.
const PREVIEW_PRESETS = [
  { id: 'street', label: 'Street' },
  { id: 'article', label: 'Article' },
  { id: 'product', label: 'Product page', short: 'Product' },
  // "Letterforms", not "Specimen". The other two presets
  // name what you are looking AT in plain words, an article and a product page;
  // "specimen" named it in type-trade language, on the one preset that is not a
  // page at all. The id stays `specimen` because it is a stored preference key,
  // not a label.
  { id: 'specimen', label: 'Letterforms', short: 'Letters' },
]

// The Street preset: the pair set on a photograph and the page under it. The
// words are the sample brand's own.
const STREET_PHOTO = '/samples/street-riders.jpg'
const STREET_ALT = 'Two riders waiting at a city intersection, one in an orange jacket'
const STREET_HEAD = 'Across town before lunch.'
const STREET_CAPTION = 'Mai, cargo bike. Picked up at 10:52.'
const STREET_VOICE = 'There at 11:40.'
const STREET_PARA = 'Book a pickup by ten and your parcel is there by twelve. Mai collects from 88 Brunswick Street, rides the lanes you would not drive, and signs it in at 240 Adelaide Street. You see her the whole way.'

// The sample brand's own page, product screen and letterforms copy.
const KS_LINE_A = 'Booked by ten.'
const KS_LINE_B = 'There by twelve.'
const KS_LEDE = 'Kerbside is a bike courier in Melbourne. Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.'
const KS_H2 = 'Say when it arrives'
const KS_BODY = 'You book a pickup, a rider collects it from one address and delivers it to another, and you see where they are the whole way. We say a time, and we keep to it.'
const KS_NAV = ['Track a rider', 'Prices', 'Help']
const KS_ETA = 'There at 11:40'
const KS_PICKUP = 'Picked up at 10:52 from 88 Brunswick Street.'
const KS_STATS = [['$18.50', 'Paid'], ['11:40', 'There at'], ['4 min', 'Rider away']]
const KS_WORD = 'Bikes, not vans.'
const KS_TEST_LINE = 'Hamburgefonstiv 0123456789'
const PHOTO_WIDTH = 1100
const PHOTO_HEIGHT = 670
// One short line of running text for each suggestion row.
const ROW_LINE = 'Pack my box with five dozen liquor jugs.'

// The pair the page opens on when the carried design has no pairing to show: the
// sample brand's own faces, a heavy grotesque over a plain sans body.
const PAIR_FALLBACK = {
  heading: { family: 'Archivo', weight: 800 },
  body: { family: 'IBM Plex Sans', weight: 400 },
}

// The category as the suggestions heading names it: "a sans heading", where the
// running-text word for sans-serif is "sans serif".
const suggestCategory = (category) => (category === 'sans-serif' ? 'sans' : categoryWord(category))

function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [match, setMatch] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return match
}

// Weights per row in the open weight tray; Up and Down move by this many.
const WEIGHT_COLS = 5

// One family of the pair: the label with its actions (Shuffle or Best match,
// then Browse), the name in its own face beside the weight trigger, and a foot
// line with the category and weight count beside Lock. The trigger opens the
// family's weights as a row of pills below the card. `headAction` is the slot's
// own action: Shuffle on the heading, Best match on the body. Weights hold
// nothing but weights.
function FamilyCard({ label, intent, fonts, font, weight, onPickFont, onWeight, headAction, locked, onToggleLock }) {
  const uid = useId()
  const [browsing, setBrowsing] = useState(false)
  const slot = label.split(' ')[0]
  const count = font.variants.length
  // Only the weights this family has are offered, so 100-900 never shows a
  // weight the face cannot draw.
  const weights = font.variants
  const [weightsOpen, setWeightsOpen] = useState(false)
  const triggerRef = useRef(null)
  const trayRef = useRef(null)
  const trayId = `${uid}-weights`
  // Opening moves focus onto the current weight, so the keyboard lands in the
  // list; a pointer open shows no ring because the focus is programmatic.
  useEffect(() => {
    if (weightsOpen) trayRef.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true })
  }, [weightsOpen])
  const closeWeights = () => {
    setWeightsOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }
  // Arrow keys travel the pills (Up and Down jump a row of five); Escape
  // closes just the tray, since an open trigger tells the sheet to stand down.
  const onTrayKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeWeights(); return }
    const pills = [...trayRef.current.querySelectorAll('[role="option"]')]
    const at = pills.indexOf(document.activeElement)
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: WEIGHT_COLS, ArrowUp: -WEIGHT_COLS }[e.key]
    let next = null
    if (step !== undefined) next = Math.min(Math.max(at + step, 0), pills.length - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = pills.length - 1
    if (next === null) return
    e.preventDefault()
    pills[next].focus({ preventScroll: true })
  }
  return (
    <div
      className="fpr-fam"
      role="group"
      aria-labelledby={`${uid}-label`}
      ref={(el) => {
        if (!el) return
        el.style.setProperty('--fpr-fam-ff', fontStack(font))
        el.style.setProperty('--fpr-fam-fw', String(weight))
      }}
    >
      <div className="fpr-fam-head">
        <span className="fpr-label" id={`${uid}-label`}>{label}</span>
        <div className="fpr-fam-acts">
          {headAction}
          <ToolButton className="fpr-browse" aria-haspopup="dialog" aria-label={`Browse ${label.toLowerCase()}`} onClick={() => setBrowsing(true)}>
            Browse
          </ToolButton>
        </div>
      </div>
      <div className="fpr-fam-row">
        <span className="fpr-fam-name">{font.family}</span>
        <button
          ref={triggerRef}
          type="button"
          className="fpr-wmenu"
          aria-haspopup="listbox"
          aria-expanded={weightsOpen}
          aria-controls={weightsOpen ? trayId : undefined}
          aria-label={`${slot} weight: ${weight}`}
          onClick={() => setWeightsOpen((o) => !o)}
        >
          <span>{weight}</span>
          <ToolIcon name="caret-down" size={14} />
        </button>
      </div>
      <div className="fpr-fam-foot">
        <span className="fpr-fam-meta">{categoryLabel(font.category)} · {weightCount(count)}</span>
        <ToolButton
          variant="quiet"
          icon={locked ? 'lock-simple' : 'lock-simple-open'}
          iconSize={14}
          className="fpr-lock"
          aria-pressed={locked}
          aria-label={`Lock ${label.toLowerCase()}`}
          title={locked ? `${font.family} stays when you shuffle. Press to unlock.` : `Keep ${font.family} when you shuffle`}
          onClick={onToggleLock}
        />
      </div>
      {weightsOpen && (
        <div ref={trayRef} id={trayId} className="fpr-wtray" role="listbox" aria-label={`${slot} weight`} onKeyDown={onTrayKey}>
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              role="option"
              data-value={w}
              className="fpr-wopt"
              aria-selected={w === weight}
              tabIndex={w === weight ? 0 : -1}
              onClick={() => { onWeight(w); closeWeights() }}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {browsing && (
        <FontBrowseDialog
          title={label}
          intent={intent}
          fonts={fonts}
          value={font}
          onPick={onPickFont}
          onClose={() => setBrowsing(false)}
        />
      )}
    </div>
  )
}

// A phone's bottom sheet for one family's controls. It locks the page scroll,
// traps focus, closes on Escape and hands focus back (useModalDialog). Portalled
// to <body> like the toolbar's More sheet, so the sticky dock cannot trap it.
function FamilySheet({ title, onClose, children }) {
  const ref = useModalDialog(onClose)
  return createPortal(
    <div className="tl-sheet-layer fpr-sheet-layer">
      <div className="tl-sheet-scrim" aria-hidden="true" onClick={onClose} />
      <div ref={ref} className="tl-sheet fpr-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <span className="tl-sheet-grab" aria-hidden="true" />
        <div className="tl-sheet-head">
          <span className="tl-sheet-title">{title}</span>
          <button type="button" className="tl-sheet-x" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
            <ToolIcon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default function FontMatcher({ onCopy, toast }) {
  const navigate = useNavigate()
  const { design, setFonts, canSaveProjects } = useProject()
  // Below 768 the weights become a menu pill and the docked bar carries Copy CSS;
  // from 1024 the panel sits beside the work and the bar carries the note.
  const phone = useMedia('(max-width: 767px)')
  const desktop = useMedia('(min-width: 1024px)')
  const { fonts: catalog, status, degraded, online, retry, retrying } = useFontCatalog()

  // A selection handed over from the Font Gallery or the Type Scale. Read —
  // never consumed — during render, so a render React throws away can't lose
  // it; the mount effect below empties the slot exactly once.
  const carried = readPairDraft()
  const seedHeading = carried?.heading || design?.fonts?.heading
  const seedBody = carried?.body || design?.fonts?.body

  // A PAIRING TOOL MAY NOT OPEN SHOWING ONE FONT TWICE.
  //
  // designDefaults.js seeds both slots with Inter, so seedHeading?.family was
  // always truthy and always "Inter" — the Playfair Display fallback beside it
  // was unreachable, and the page opened with the masthead reading
  // "Inter + Inter" under a lede that says "Two families". The one thing this
  // tool exists to demonstrate was the one thing its first paint did not show.
  //
  // Keyed on the two being EQUAL rather than on either matching the default:
  // a heading that equals the body is a non-pairing however it got there, and
  // comparing against the default cannot tell "never chose" from "chose Inter".
  // A real choice carried in from another tool still wins, because the only
  // case this rejects is the one with nothing to show; both slots then open on
  // the sample brand's pair.
  const seedPairs = Boolean(seedHeading?.family) && seedHeading.family !== seedBody?.family
  const seed = seedPairs ? { heading: seedHeading, body: seedBody } : PAIR_FALLBACK
  // The pair the page opened on, kept for Reset; `seed` follows the project's
  // fonts and moves with every change.
  const [openingPair] = useState(() => seed)
  const [headingName, setHeadingName] = useState(() => seed.heading.family)
  const [bodyName, setBodyName] = useState(() => seed.body.family)
  const [headingW, setHeadingW] = useState(() => seed.heading.weight || 700)
  const [bodyW, setBodyW] = useState(() => seed.body.weight || 400)
  const [previewText, setPreviewText] = useState('')
  const [preset, setPreset] = useState('street')
  const [ground, setGround] = useState('d')
  const [suggestions, setSuggestions] = useState([])
  const [suggesting, setSuggesting] = useState(true)
  // A locked side survives Shuffle. History is the undo stack of earlier pairs.
  const [locks, setLocks] = useState({ heading: false, body: false })
  const [history, setHistory] = useState([])
  // Which family sheet is open on a phone: 'heading', 'body' or null.
  const [sheet, setSheet] = useState(null)
  const [monoOpen, setMonoOpen] = useState(false)

  useEffect(() => {
    const draft = readPairDraft()
    if (draft?.heading) toast?.(`Pairing from ${draft.heading.family}`)
    consumePairDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A sheet belongs to the phone layout; widening past it closes the sheet.
  useEffect(() => { if (!phone) setSheet(null) }, [phone])

  // With a phone sheet open, the page scrolls so the specimen's headline sits
  // just under the sticky toolbar, clear of the sheet, and goes back to where it
  // was when the sheet closes. A family sheet pins the scroll it opens at, so its
  // button reveals before the sheet mounts; More opens in the toolbar, and
  // reports back through onOverflowOpenChange.
  const [moreOpen, setMoreOpen] = useState(false)
  const savedScroll = useRef(null)
  const scrollPageTo = (top) => {
    const lenis = getLenis()
    // `force`: an open sheet has stopped Lenis.
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
    else window.scrollTo({ top, behavior: 'instant' })
  }
  const revealHeadline = () => {
    const head = document.querySelector('.fpr-specimen :is(h1, h2, h3)') || document.querySelector('.fpr-specimen')
    const bar = document.querySelector('.tl-toolbar')
    if (!head || !bar) return
    savedScroll.current = window.scrollY
    // The page is shorter than the scroll the reveal needs; the class adds room below it while the sheet is up.
    document.documentElement.classList.add('fpr-sheet-room')
    getLenis()?.resize?.()
    const barBottom = (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight
    scrollPageTo(window.scrollY + head.getBoundingClientRect().top - barBottom - 12)
  }
  const sheetShown = phone && (sheet !== null || moreOpen)
  useEffect(() => { if (phone && moreOpen) revealHeadline() }, [phone, moreOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sheetShown) return undefined
    return () => {
      const y = savedScroll.current
      savedScroll.current = null
      document.documentElement.classList.remove('fpr-sheet-room')
      if (y != null) scrollPageTo(y)
    }
  }, [sheetShown])
  const openSheet = (side) => {
    revealHeadline()
    setSheet(side)
  }

  // Resolve names against the catalogue, falling back to the first entry so the
  // specimen always has something real to render — a catalogue that came back
  // short (bundled fallback) must never leave the page blank.
  const headingFont = useMemo(
    () => catalog.find(f => f.family === headingName) || catalog[0] || null,
    [catalog, headingName],
  )
  const bodyFont = useMemo(
    () => catalog.find(f => f.family === bodyName) || catalog[0] || null,
    [catalog, bodyName],
  )

  // Load what the specimen draws, so nothing on it is faux-bolded: the heading
  // weight, and for the body its regular weight and the status pill's. The
  // other role's default weight rides along so a Swap lands on faces that are
  // already there. The copied import asks for more (see importFamilies).
  useEffect(() => {
    if (!headingFont) return
    const { upright } = headingFaceWeights(headingFont, headingW)
    loadFont(headingFont.family, [...upright, bodyWeight(headingFont)])
  }, [headingFont, headingW])
  useEffect(() => {
    if (!bodyFont) return
    const { drawn } = bodyFaceWeights(bodyFont, bodyW)
    loadFont(bodyFont.family, [...drawn, headingWeight(bodyFont)])
  }, [bodyFont, bodyW])

  // Recompute suggestions whenever the heading changes. Guarded against a
  // late-resolving promise from a superseded heading clobbering fresh results.
  useEffect(() => {
    if (!headingFont) return undefined
    let cancelled = false
    setSuggesting(true)
    suggestPairings(headingFont, { limit: 6 }).then(list => {
      if (cancelled) return
      list.forEach(s => loadFont(s.font.family, [bodyWeight(s.font)]))
      setSuggestions(list)
      setSuggesting(false)
    })
    return () => { cancelled = true }
  }, [headingFont])

  // The pair as it stands, for the undo stack. Pushed before any change to a
  // family, never for a weight pill.
  const snapshot = useMemo(
    () => ({ headingName, bodyName, headingW, bodyW }),
    [headingName, bodyName, headingW, bodyW],
  )
  const remember = useCallback(() => setHistory((h) => pushPairHistory(h, snapshot)), [snapshot])

  // Set all four values of the pair at once (shuffle, swap and undo), and keep
  // the project's fonts in step. False when a family is not in the catalogue.
  const applySnapshot = useCallback((next) => {
    const h = catalog.find((f) => f.family === next.headingName)
    const b = catalog.find((f) => f.family === next.bodyName)
    if (!h || !b) return false
    setHeadingName(h.family)
    setBodyName(b.family)
    setHeadingW(next.headingW)
    setBodyW(next.bodyW)
    setFonts({
      heading: { family: h.family, weight: next.headingW, category: h.category },
      body: { family: b.family, weight: next.bodyW, category: b.category },
    })
    return true
  }, [catalog, setFonts])

  // Put the pair back as it stood before a pick or shuffle, and drop that step
  // from the history when it is still the newest, so Undo in More does not
  // repeat it. Applying a snapshot raises no toast: the page change is the answer.
  const restorePair = useCallback((previous) => {
    if (!applySnapshot(previous)) return
    setHistory((h) => {
      const top = h[h.length - 1]
      const same = top && top.headingName === previous.headingName && top.bodyName === previous.bodyName
        && top.headingW === previous.headingW && top.bodyW === previous.bodyW
      return same ? h.slice(0, -1) : h
    })
  }, [applySnapshot])

  // "Using {body} with {heading}" with an Undo button on the toast itself.
  // `previous` is the pair before the change.
  const pairToast = useCallback((previous, heading, body) => {
    toast?.(`Using ${body} with ${heading}`, 'success', {
      action: { label: 'Undo', onAction: () => restorePair(previous) },
    })
  }, [toast, restorePair])

  const chooseHeading = useCallback((font) => {
    const w = font.variants.includes(headingW) ? headingW : headingWeight(font)
    if (font.family !== headingName) remember()
    setHeadingName(font.family)
    setHeadingW(w)
    setFonts({ heading: { family: font.family, weight: w, category: font.category } })
    // The phone has no room to see the pair change under the sheet, so it
    // confirms a new heading the way a new body is confirmed.
    if (phone && font.family !== headingName) pairToast(snapshot, font.family, bodyName)
  }, [headingW, headingName, bodyName, phone, snapshot, remember, setFonts, pairToast])

  const chooseBody = useCallback((font) => {
    const w = font.variants.includes(bodyW) ? bodyW : bodyWeight(font)
    if (font.family !== bodyName) remember()
    setBodyName(font.family)
    setBodyW(w)
    setFonts({ body: { family: font.family, weight: w, category: font.category } })
    if (font.family !== bodyName) pairToast(snapshot, headingName, font.family)
  }, [bodyW, bodyName, headingName, snapshot, remember, setFonts, pairToast])

  // NB: not named `usePair` — a `use…` identifier makes the rules-of-hooks lint
  // treat every call site as a hook call, which it is not.
  const applyPair = useCallback((body) => {
    if (!headingFont) return
    const bw = bodyWeight(body)
    if (body.family !== bodyName) remember()
    setBodyName(body.family)
    setBodyW(bw)
    setFonts({
      heading: { family: headingFont.family, weight: headingW, category: headingFont.category },
      body: { family: body.family, weight: bw, category: body.category },
    })
    if (body.family !== bodyName) pairToast(snapshot, headingFont.family, body.family)
    else toast?.(`Using ${body.family} with ${headingFont.family}`)
  }, [headingFont, headingW, bodyName, snapshot, remember, setFonts, pairToast, toast])

  const lock = locks.heading && locks.body ? 'both' : locks.heading ? 'heading' : locks.body ? 'body' : null
  const toggleLock = (side) => setLocks((l) => ({ ...l, [side]: !l[side] }))

  // Re-roll the unlocked side with the same rules the suggestions use, never
  // landing both slots on one family.
  const shuffle = useCallback(() => {
    if (!headingFont || !bodyFont) return
    if (lock === 'both') { toast?.('Both families are locked. Unlock one to shuffle.'); return }
    const next = shufflePair(catalog, { heading: headingFont, body: bodyFont, lock })
    if (!next) { toast?.('No other pair fits. Unlock a family or pick one by hand.'); return }
    const headingNext = next.heading.family === headingFont.family
      ? headingW
      : (next.heading.variants.includes(headingW) ? headingW : headingWeight(next.heading))
    const bodyNext = next.body.family === bodyFont.family ? bodyW : bodyWeight(next.body)
    remember()
    applySnapshot({
      headingName: next.heading.family, bodyName: next.body.family, headingW: headingNext, bodyW: bodyNext,
    })
    pairToast(snapshot, next.heading.family, next.body.family)
  }, [catalog, headingFont, bodyFont, headingW, bodyW, lock, snapshot, remember, applySnapshot, pairToast, toast])

  // Swap the two families. A lock stays with its family, so it swaps sides too.
  const swap = useCallback(() => {
    const next = swapPair(headingFont, bodyFont)
    if (!next) return
    remember()
    if (applySnapshot(next)) {
      setLocks((l) => ({ heading: l.body, body: l.heading }))
      toast?.(`${next.headingName} now leads, ${next.bodyName} is the body`)
    }
  }, [headingFont, bodyFont, remember, applySnapshot, toast])

  const undo = useCallback(() => {
    const { snapshot: previous, rest } = popPairHistory(history)
    if (!previous) return
    if (applySnapshot(previous)) {
      setHistory(rest)
      toast?.(`Back to ${previous.headingName} with ${previous.bodyName}`)
    }
  }, [history, applySnapshot, toast])

  // Back to the pair the page opened on, with the preview words and both locks
  // cleared. Undo steps back over it.
  const reset = useCallback(() => {
    const next = {
      headingName: openingPair.heading.family,
      bodyName: openingPair.body.family,
      headingW: openingPair.heading.weight || 700,
      bodyW: openingPair.body.weight || 400,
    }
    const same = next.headingName === headingName && next.bodyName === bodyName
      && next.headingW === headingW && next.bodyW === bodyW
    if (same || applySnapshot(next)) {
      if (!same) remember()
      setPreviewText('')
      setLocks({ heading: false, body: false })
      toast?.(`Back to ${next.headingName} with ${next.bodyName}`)
    }
  }, [openingPair, headingName, bodyName, headingW, bodyW, remember, applySnapshot, toast])

  const headingStack = headingFont ? fontStack(headingFont) : 'var(--font)'
  const bodyStack = bodyFont ? fontStack(bodyFont) : 'var(--font)'

  // The copied import and CSS: the heading weight; the body's regular weight,
  // the status pill's weight, bold and italic, so a site built from it has the
  // running-text cuts too. This is a wider set than the page loads for itself.
  // Only cuts the family ships are asked for.
  const importFamilies = useMemo(
    () => (headingFont && bodyFont ? pairImportFamilies(headingFont, headingW, bodyFont, bodyW) : []),
    [headingFont, bodyFont, headingW, bodyW],
  )
  const importUrl = useMemo(
    () => (importFamilies.length ? getFontImportUrl(importFamilies) : null),
    [importFamilies],
  )

  const cssExport = useMemo(() => {
    if (!headingFont || !bodyFont) return ''
    return [
      `@import url('${importUrl}');`,
      '',
      ':root {',
      `  --font-heading: ${headingStack};`,
      `  --font-body: ${bodyStack};`,
      `  --weight-heading: ${headingW};`,
      `  --weight-body: ${bodyW};`,
      '}',
      '',
      'h1, h2, h3, h4, h5, h6 {',
      '  font-family: var(--font-heading);',
      '  font-weight: var(--weight-heading);',
      '}',
      '',
      'body {',
      '  font-family: var(--font-body);',
      '  font-weight: var(--weight-body);',
      '}',
    ].join('\n')
  }, [headingFont, bodyFont, headingStack, bodyStack, headingW, bodyW, importUrl])

  const copyImport = () => {
    if (!importUrl) return
    if (headingFont) trackFontCopy(headingFont.family)
    if (bodyFont && bodyFont.family !== headingFont?.family) trackFontCopy(bodyFont.family)
    onCopy?.(importUrl)
  }

  const openInTypeScale = () => {
    const staged = setScaleDraft({
      heading: headingFont
        ? { family: headingFont.family, weight: headingW, category: headingFont.category }
        : null,
      body: bodyFont
        ? { family: bodyFont.family, weight: bodyW, category: bodyFont.category }
        : null,
      // Only a scale the project really holds travels; otherwise the Type Scale
      // opens on its own default instead of the blank project's seed.
      scale: ownTypeScale(design) ? { base: design.typeScale.base, ratio: design.typeScale.ratio } : undefined,
    })
    if (!staged) { toast?.('Choose a family first — the type scale needs a font to preview.'); return }
    navigate('/create/type-scale')
  }

  const ready = status !== 'loading' && catalog.length > 0 && headingFont && bodyFont

  // The toolbar's actions. They exist in every state so the row keeps its
  // shape while the catalogue loads; each one is disabled until it can act.
  // What Shuffle will re-roll, named for the side it moves.
  const shuffleName = lock === 'heading' ? 'Shuffle the body'
    : lock === 'body' ? 'Shuffle the heading'
      : lock === 'both' ? 'Both families are locked'
        : 'Shuffle the pair'
  const canUndo = history.length > 0
  const bar = typeToolsBarItems({
    current: 'pair',
    heading: headingFont ? { family: headingFont.family, weight: headingW } : null,
    body: bodyFont ? { family: bodyFont.family, weight: bodyW } : null,
    scale: ownTypeScale(design)?.ratio || 1.618,
    headingStack,
    bodyStack,
    projectName: '',
    ground,
    onGround: setGround,
  })
  const groundItem = bar.find((it) => it.id === 'ttb-ground')
  // The preview words: a field in the stage head from 1024, in the panel on a
  // tablet, and in More on a phone. Only one of them is mounted at a time.
  const previewInput = (id, className) => (
    <input
      id={id}
      className={className}
      type="text"
      aria-label="Preview text"
      value={previewText}
      placeholder="Type your own words"
      maxLength={72}
      autoComplete="off"
      spellCheck="false"
      enterKeyHint="done"
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      onChange={e => setPreviewText(e.target.value)}
    />
  )
  const allItems = [
    ...bar.filter((it) => it !== groundItem),
    // Swap and Undo are working features the row does not draw, so they live in
    // More at every width rather than on the row beside Dark/Light and Copy.
    {
      id: 'swap',
      inline: false,
      menu: { label: 'Swap heading and body', icon: 'arrows-left-right', onSelect: swap, disabled: !ready },
    },
    {
      id: 'undo',
      inline: false,
      menu: { label: 'Undo the last change', icon: 'arrow-u-up-left', onSelect: undo, disabled: !canUndo },
    },
    {
      id: 'gallery',
      inline: false,
      menu: { label: 'Browse the Font Gallery', icon: 'swatches', onSelect: () => navigate('/create/font-gallery') },
    },
    {
      id: 'scale',
      inline: false,
      menu: { label: 'Build a type scale from this pair', icon: 'caret-right', onSelect: openInTypeScale, disabled: !ready },
    },
    { id: 'div', divider: true, align: 'end' },
    groundItem,
    {
      id: 'import',
      priority: 3,
      render: () => (
        <ToolButton className="fpr-copy-all" onClick={copyImport} disabled={!importUrl}>Copy font import</ToolButton>
      ),
      menu: { label: 'Copy font import', icon: 'copy', onSelect: copyImport, disabled: !importUrl },
    },
  ]
  // A phone's bar is Back, the switcher and More. Everything else lives in the
  // More sheet, so the row never wraps at any width.
  const phoneItems = [
    {
      id: 'preview',
      inline: false,
      menu: () => (
        <div className="fpr-more-preview">
          <label className="fpr-label" htmlFor="fpr-text-more">Preview text</label>
          {previewInput('fpr-text-more', 'fpr-input')}
          <p className="fpr-hint">Try your real headline before you commit to a face.</p>
        </div>
      ),
    },
    // The Font Gallery link is left out: the switcher on the bar goes there.
    { ...allItems.find((it) => it.id === 'import'), inline: false },
    {
      id: 'shuffle',
      inline: false,
      menu: { label: shuffleName, icon: 'shuffle', onSelect: shuffle, disabled: !ready },
    },
    ...(ready ? [{
      id: 'save',
      inline: false,
      menu: () => <div className="fpr-more-save" onClickCapture={keepPair}>{saveButton}</div>,
    }] : []),
    {
      id: 'reset',
      inline: false,
      menu: { label: 'Reset', icon: 'arrow-counter-clockwise', onSelect: reset, disabled: !ready },
    },
    { ...groundItem, inline: false },
    // After the board's own rows: the working features it does not draw.
    ...allItems.filter((it) => ['swap', 'undo', 'scale'].includes(it.id)).map((it) => ({ ...it, inline: false })),
  ]
  const items = desktop
    ? allItems
    : phone
      ? [
        ...allItems.filter((it) => ['ttb-back', 'ttb-chip', 'ttb-switcher'].includes(it.id)),
        ...phoneItems,
      ]
      : allItems.map((it) => (it.id === 'gallery' || it.id === 'import' ? { ...it, inline: false } : it))
  const primary = (
    <ToolButton variant="accent" icon="copy" iconSize={14} className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)} disabled={!cssExport}>
      Copy CSS
    </ToolButton>
  )
  const layout = (body) => (
    <ToolLayout className="fpr-page" back={false} title="Font Pair" titleId="fpr-title" showTitle={false} items={items} primary={phone ? null : primary} onOverflowOpenChange={setMoreOpen}>
      {body}
    </ToolLayout>
  )

  if (status === 'loading') return layout(<FontCatalogLoading label="Opening Font Pair" />)

  if (!ready) {
    // fetchFontCatalog always resolves to at least the bundled list, so this
    // is unreachable in practice; a genuinely empty catalogue still shows a
    // way forward rather than a blank workbench.
    return layout(
      <div className="typ-loading" role="status">
        <strong>No font catalogue is available right now.</strong>
        <span>Font Pair needs at least a handful of families to work with. Retry the catalogue, or browse the gallery once it&rsquo;s back.</span>
        <button type="button" className="typ-notice-retry" onClick={retry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>,
    )
  }

  // A body already set to the top suggestion leaves Best match nothing to do.
  const bestMatch = suggestions[0] || null
  const bodyIsBestMatch = !!bestMatch && bestMatch.font.family === bodyFont.family

  const sample = previewText.trim()

  const specimenVars = {
    '--fpr-h-ff': headingStack,
    '--fpr-b-ff': bodyStack,
    '--fpr-h-fw': String(headingW),
    '--fpr-b-fw': String(bodyW),
    '--fpr-b-btn': String(bodyFaceWeights(bodyFont, bodyW).buttons),
  }
  const varsRef = (vars) => (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }

  const keepPair = (e) => {
    // Signed out, write the pair into this browser's draft before the account
    // prompt opens; the prompt is the only thing the press opens.
    if (canSaveProjects || !e.target.closest?.('.svt-trigger')) return
    setFonts({
      heading: { family: headingFont.family, weight: headingW, category: headingFont.category },
      body: { family: bodyFont.family, weight: bodyW, category: bodyFont.category },
    })
  }
  // The heading card's own action. Its name says which side it moves.
  const shuffleButton = (
    <ToolButton
      icon="shuffle"
      iconSize={14}
      className="fpr-shuffle"
      onClick={shuffle}
      disabled={!ready}
      aria-label={shuffleName}
      title={shuffleName}
    >
      Shuffle
    </ToolButton>
  )
  const saveButton = (
    <div className="fpr-dock-save" onClickCapture={keepPair}>
      <SaveTypeSystem
        gate="type-save-font-pair"
        label="this pairing"
        summary={`${headingFont.family} ${headingW} for headings, ${bodyFont.family} ${bodyW} for body.`}
        toast={toast}
      />
    </div>
  )

  // The two family cards. The panel (from 768) and the phone's family sheet
  // carry the same ones, so a change to a card lands in both.
  const headingCard = (
    <FamilyCard
      label="Heading family"
      intent="heading"
      fonts={catalog}
      font={headingFont}
      weight={headingW}
      locked={locks.heading}
      onToggleLock={() => toggleLock('heading')}
      onPickFont={chooseHeading}
      onWeight={(w) => {
        setHeadingW(w)
        setFonts({ heading: { family: headingFont.family, weight: w, category: headingFont.category } })
      }}
      headAction={shuffleButton}
    />
  )
  const bodyCard = (
    <FamilyCard
      label="Body family"
      fonts={catalog}
      font={bodyFont}
      weight={bodyW}
      locked={locks.body}
      onToggleLock={() => toggleLock('body')}
      onPickFont={chooseBody}
      onWeight={(w) => {
        setBodyW(w)
        setFonts({ body: { family: bodyFont.family, weight: w, category: bodyFont.category } })
      }}
      headAction={(
        <ToolButton
          variant="quiet"
          icon={bodyIsBestMatch ? undefined : 'magic-wand'}
          iconSize={14}
          className="fpr-wand"
          onClick={() => { if (bestMatch) applyPair(bestMatch.font) }}
          disabled={!bestMatch || bodyIsBestMatch}
          title={bestMatch
            ? `Use ${bestMatch.font.family}, the top suggestion for ${headingFont.family}`
            : 'No suggestions yet'}
          aria-label={bestMatch
            ? (bodyIsBestMatch
              ? `Auto: ${bestMatch.font.family}, the top suggested body face, is in use`
              : `Auto: use the top suggested body face, ${bestMatch.font.family}`)
            : undefined}
        >
          {bodyIsBestMatch ? <><span aria-hidden="true">✓ </span>Auto</> : 'Auto'}
        </ToolButton>
      )}
    />
  )

  // Both cards, and on a tablet the preview text between them and the
  // suggestions. A desktop keeps that field in the stage head, a phone in More.
  const panelWith = (suggestNode) => (
    <ToolPanel label="Font Pair controls" className="fpr-panel fpr-config">
      <div className="fpr-fams">
        {headingCard}
        {bodyCard}
      </div>
      {!desktop && (
        <div className="fpr-text">
          <label className="fpr-label" htmlFor="fpr-text">Preview text</label>
          {previewInput('fpr-text', 'fpr-input')}
          <p className="fpr-hint">
            Your words go in the headings. The body keeps a real paragraph, so you
            can judge the face on running text.
          </p>
        </div>
      )}
      {suggestNode}
    </ToolPanel>
  )

  // A phone sees the pair as two rows under the specimen; each opens its sheet.
  const famRow = (side, label, font, weight) => (
    <button
      type="button"
      className="fpr-frow"
      aria-haspopup="dialog"
      aria-label={`${label}, ${font.family}, weight ${weight}. Change`}
      onClick={() => openSheet(side)}
      ref={varsRef({ '--fpr-fam-ff': fontStack(font), '--fpr-fam-fw': String(weight) })}
    >
      <span className="fpr-frow-t">
        <span className="fpr-label">{label}</span>
        <span className="fpr-frow-n">{font.family}</span>
      </span>
      <span className="fpr-frow-w">{weight}</span>
      <ToolIcon name="caret-right" size={16} className="fpr-frow-chev" />
    </button>
  )
  const famRows = (
    <div className="fpr-fampair" role="group" aria-label="Current font pair">
      {famRow('heading', 'Heading family', headingFont, headingW)}
      {famRow('body', 'Body family', bodyFont, bodyW)}
    </div>
  )

  // The dock's two pills on a phone: the same two sheets, one tap from the Save
  // and Copy CSS they sit beside.
  const dockPill = (side, label, font, weight) => (
    <button
      type="button"
      className="fpr-pill"
      aria-haspopup="dialog"
      aria-label={`${label} family, ${font.family}, weight ${weight}. Change`}
      onClick={() => openSheet(side)}
      ref={varsRef({ '--fpr-fam-ff': fontStack(font), '--fpr-fam-fw': String(weight) })}
    >
      <span className="fpr-pill-l">{label}</span>
      <span className="fpr-pill-n">{shortFamilyName(font.family)}</span>
    </button>
  )

  // The specimen: a real article at real sizes.
  const stage = (
    <section className="fpr-stage" aria-labelledby="fpr-output-title">
      <h2 id="fpr-output-title" className="sr-only">Read the pairing</h2>
      <div className="fpr-stage-head">
        <ToolPills
          label="Preview layout"
          className="fpr-presets"
          options={PREVIEW_PRESETS.map((p) => ({
            value: p.id,
            label: phone && p.short ? p.short : p.label,
            ariaLabel: phone && p.short ? p.label : undefined,
          }))}
          value={preset}
          onChange={setPreset}
        />
        {desktop && previewInput('fpr-text-stage', 'fpr-input fpr-input--stage')}
        {/* The current pair, set in the two families it names. A phone states
            it in the family rows and the dock instead. */}
        {!phone && (
          <div className="fpr-pair" role="group" aria-label="Current font pair" ref={varsRef(specimenVars)}>
            <span>{headingFont.family}</span>
            <i aria-hidden="true">+</i>
            <span>{bodyFont.family}</span>
          </div>
        )}
      </div>

      <div className={preset === 'street' ? 'fpr-specimen fpr-specimen--street' : 'fpr-specimen'} data-ground={ground} ref={varsRef(specimenVars)}>
        {preset === 'street' && (
          <div className="fpr-street">
            <div className="fpr-street-photo">
              <picture>
                <source type="image/avif" srcSet={STREET_PHOTO.replace(/\.jpg$/, '.avif')} />
                <source type="image/webp" srcSet={STREET_PHOTO.replace(/\.jpg$/, '.webp')} />
                <img src={STREET_PHOTO} alt={STREET_ALT} width={PHOTO_WIDTH} height={PHOTO_HEIGHT} />
              </picture>
              <span className="fpr-plate fpr-plate--cap">{STREET_CAPTION}</span>
              <span className="fpr-plate fpr-plate--tag">Sample photo</span>
            </div>
            <div className="fpr-street-page">
              <div className="fpr-street-lead">
                <h3 className="fpr-street-h">{sample || STREET_HEAD}</h3>
                <p className="fpr-street-voice">{STREET_VOICE}</p>
              </div>
              <p className="fpr-street-p">{STREET_PARA}</p>
            </div>
          </div>
        )}

        {preset === 'article' && (
          <article className="fpr-article fpr-page-sample">
            <div className="fpr-pg-masthead">
              <span className="fpr-pg-word"><ToolIcon name="bicycle" size={20} />Kerbside</span>
              <span className="fpr-pg-nav" aria-hidden="true">{KS_NAV.map((n) => <span key={n}>{n}</span>)}</span>
              <span className="fpr-plate fpr-plate--page">Sample page</span>
            </div>
            <div className="fpr-pg-body">
              <h3 className="fpr-h1">
                {sample || <><span className="fpr-hs">{KS_LINE_A}</span><span className="fpr-hs">{KS_LINE_B}</span></>}
              </h3>
              <p className="fpr-lede">{sample || KS_LEDE}</p>
              <p className="fpr-pg-cta" aria-hidden="true"><span>Book a pickup</span></p>
              <div className="fpr-pg-section">
                <h4 className="fpr-h2">{sample || KS_H2}</h4>
                <p className="fpr-body">{sample ? `${sample} ${sample}` : KS_BODY}</p>
              </div>
            </div>
          </article>
        )}

        {preset === 'product' && (
          <div className="fpr-product">
            <p className="fpr-pp-label">Track a rider</p>
            <span className="fpr-pp-status">On the way</span>
            <h3 className="fpr-h1">{sample || KS_ETA}</h3>
            <p className="fpr-lede">{KS_PICKUP}</p>
            <dl className="fpr-pp-stats">
              {KS_STATS.map(([n, l]) => (
                <div key={l}><dt>{n}</dt><dd>{l}</dd></div>
              ))}
            </dl>
            <div className="fpr-product-actions" aria-hidden="true">
              <span className="fpr-product-primary">Book rider</span>
              <span className="fpr-product-secondary">Share tracking link</span>
            </div>
          </div>
        )}

        {preset === 'specimen' && (
          <div className="fpr-specimen-raw">
            <p className="fpr-h1">{sample || KS_WORD}</p>
            <p className="fpr-glyphs fpr-glyphs--heading">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p className="fpr-glyphs fpr-glyphs--heading">abcdefghijklmnopqrstuvwxyz 0123456789</p>
            <p className="fpr-glyphs">{sample || KS_TEST_LINE}</p>
            <p className="fpr-body">{sample ? `${sample} ${sample}` : STREET_PARA}</p>
          </div>
        )}
      </div>
    </section>
  )

  // One compact row per suggestion: the family and the action on one line, then
  // a line of running text in that face. The reason sits once above its group.
  const suggestRow = ({ font }, reasonId) => {
    const active = font.family === bodyFont.family
    return (
      <li
        key={font.family}
        className={active ? 'fpr-card fpr-card--on' : 'fpr-card'}
        ref={varsRef({ '--fpr-b-ff': fontStack(font), '--fpr-b-fw': String(bodyWeight(font)) })}
      >
        <button
          type="button"
          className="fpr-card-apply"
          onClick={() => applyPair(font)}
          aria-pressed={active}
          aria-label={active ? `${font.family} with ${headingFont.family}, in use` : `Use ${font.family} with ${headingFont.family}`}
          aria-describedby={reasonId}
        >
          <span className="fpr-card-line">
            <span className="fpr-card-name">{font.family}</span>
            <span className="fpr-card-cta">
              {active ? <><ToolIcon name="check" size={14} />In use</> : 'Use this pair'}
            </span>
          </span>
          <span className="fpr-card-text">{ROW_LINE}</span>
        </button>
      </li>
    )
  }
  // The pairing engine gives one reason per body category, so rows with the
  // same reason share one line above them.
  const suggestGroups = (list, key) => {
    const groups = []
    list.forEach((s) => {
      const group = groups.find((g) => g.reason === s.reason)
      if (group) group.items.push(s)
      else groups.push({ reason: s.reason, items: [s] })
    })
    return groups.map((g, i) => {
      const reasonId = `fpr-why-${key}-${i}`
      return (
        <div className="fpr-sug-group" key={reasonId}>
          <p className="fpr-reason" id={reasonId}>{g.reason}</p>
          <ul className="fpr-suggest-grid" aria-label={`${categoryLabel(g.items[0].font.category)} body faces`}>
            {g.items.map((s) => suggestRow(s, reasonId))}
          </ul>
        </div>
      )
    })
  }
  const monoBodies = suggestions.filter((s) => s.font.category === 'monospace')
  const plainBodies = suggestions.filter((s) => s.font.category !== 'monospace')

  const suggest = (
    <section className="fpr-suggest" aria-labelledby="fpr-suggest-title">
      <div className="fpr-section-head">
        <h2 id="fpr-suggest-title">Popular bodies for a {suggestCategory(headingFont.category)} heading</h2>
      </div>

      {suggesting ? (
        <div className="fpr-suggest-loading" role="status" aria-live="polite">
          <div className="fg-loader" />
          <span>Scoring body faces against {headingFont.family}&hellip;</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="fpr-suggest-empty" role="status">
          <strong>No suggestions for this family yet.</strong>
          <span>
            The catalogue currently loaded doesn&rsquo;t contain a contrasting body face for a
            {' '}{categoryWord(headingFont.category)} heading. Pick a different heading, or reload the full
            catalogue and try again.
          </span>
          <button type="button" className="typ-picker-clear" onClick={retry} disabled={retrying}>
            {retrying ? 'Reloading…' : 'Reload the catalogue'}
          </button>
        </div>
      ) : (
        <>
          {suggestGroups(plainBodies, 'plain')}
          {monoBodies.length > 0 && (
            <div className="fpr-mono">
              <button
                type="button"
                className="fpr-disc"
                aria-expanded={monoOpen}
                aria-controls="fpr-mono-list"
                onClick={() => setMonoOpen((o) => !o)}
              >
                Mono bodies ({monoBodies.length})
                <ToolIcon name="caret-down" size={16} className="fpr-chev" />
              </button>
              {monoOpen && <div id="fpr-mono-list">{suggestGroups(monoBodies, 'mono')}</div>}
            </div>
          )}
        </>
      )}
    </section>
  )

  const delivery = (
    <details className="fpr-delivery">
      <summary>
        Prepare the handoff
        <ToolIcon name="caret-down" size={16} className="fpr-chev" />
      </summary>
      <p className="fpr-hint">One import and one block of CSS. Weights in the import: {describePairImport(importFamilies)}.</p>
      <pre id="fpr-export" className="tl-code fpr-export" tabIndex={0} aria-label="CSS for this pair"><code>{cssExport}</code></pre>
    </details>
  )

  return layout(
    <>
      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      <ToolGrid className="fpr-grid">
        {phone ? (
          <>
            {/* A phone opens on the specimen, then the two family rows; each
                row opens a sheet with that family's controls. */}
            <ToolMain className="fpr-output">
              {stage}
              {famRows}
              {delivery}
            </ToolMain>
          </>
        ) : desktop ? (
          <>
            {/* From 1024 the work leads in the source as well as on the left, so
                Tab reaches the presets and the preview field before the panel.
                The grid places the panel in the right-hand column. */}
            <ToolMain className="fpr-output">
              {stage}
              {delivery}
            </ToolMain>
            {panelWith(suggest)}
          </>
        ) : (
          <>
            {/* A tablet reads the families, then the preview text, then the
                specimen, so the panel comes first. */}
            {panelWith(suggest)}
            <ToolMain className="fpr-output">
              {stage}
              {delivery}
            </ToolMain>
          </>
        )}
      </ToolGrid>

      {/* The docked bar: one stack above the tab bar on a phone. */}
      <div className="fpr-dock" role="group" aria-label="Pair actions">
        {!phone && (
          <p className="fpr-dock-note">
            {canSaveProjects ? 'Keeps both families with your project' : 'Kept in this browser. Log in to save it to a project.'}
          </p>
        )}
        {phone && dockPill('heading', 'Heading', headingFont, headingW)}
        {phone && dockPill('body', 'Body', bodyFont, bodyW)}
        {saveButton}
        {phone && (
          <ToolButton variant="accent" icon="copy" iconSize={14} className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)} disabled={!cssExport}>
            Copy CSS
          </ToolButton>
        )}
      </div>

      {phone && sheet && (
        <FamilySheet title={sheet === 'heading' ? 'Heading family' : 'Body family'} onClose={() => setSheet(null)}>
          {sheet === 'heading' ? headingCard : <>{bodyCard}{suggest}</>}
        </FamilySheet>
      )}

      {/* Step 2 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="fonts" />
    </>,
  )
}
