import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import FontBrowseDialog from '../components/FontBrowseDialog'
import MenuSelect from '../components/tool/MenuSelect'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolPills,
} from '../components/tool/ToolLayout'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, suggestPairings,
} from '../utils/googleFonts'
import { popPairHistory, pushPairHistory, shufflePair, swapPair } from '../utils/fontPairing'
import {
  bodyFaceWeights, describePairImport, headingFaceWeights, pairImportFamilies,
} from '../utils/fontImport'
import { categoryLabel, categoryWord, weightCount } from '../utils/fontGallery'
import { consumePairDraft, readPairDraft, setScaleDraft } from '../utils/typeHandoff'
// The shared sheets for the font picker, the catalogue notice and the loader,
// then the page's own sheet, scoped under `.fpr-page`, the page root.
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
import '../styles/pages/font-pair.css'

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

const PREVIEW_PRESETS = [
  { id: 'article', label: 'Article' },
  { id: 'product', label: 'Product page' },
  // "Letterforms", not "Specimen" — founder, 2026-09-14. The other two presets
  // name what you are looking AT in plain words, an article and a product page;
  // "specimen" named it in type-trade language, on the one preset that is not a
  // page at all. The id stays `specimen` because it is a stored preference key,
  // not a label.
  { id: 'specimen', label: 'Letterforms' },
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
// The body copy carries one bold and one italic phrase, so the specimen shows
// the cuts the exported import loads (see bodyFaceWeights).
const BODY_COPY = (
  <>
    Pack my box with five dozen liquor jugs. How <em>vexingly</em> quick daft zebras jump — the five
    boxing wizards jump quickly, and the <strong>rhythm of the line</strong> holds all the way to the
    end of the measure.
  </>
)
const LEDE_COPY = 'A heading face sets the tone; the body face has to survive four hundred words of it.'
const SUB_HEAD = 'Where the pairing earns its keep'
const HEAD_COPY = 'Typography that carries the whole page'
// One short line of running text for each suggestion row.
const ROW_LINE = 'Pack my box with five dozen liquor jugs.'
const ROW_HEAD_MAX = 40

// The heading the pair page opens on when the carried design has no pairing to
// show. A serif against the Inter body, so the first paint demonstrates the
// contrast the tool is for.
const PAIR_FALLBACK_HEADING = 'Playfair Display'

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

// One family of the pair: its name in its own face, the category and weight
// count on a second line so nothing is cut, then the actions on the name's row.
// `headAction` is the body family's Best match button, drawn on the label line
// so it never reads as one of the weights. Weights are a pill row (a menu pill
// on a phone) and never hold anything but weights.
function FamilyCard({ label, intent, fonts, font, weight, onPickFont, onWeight, phone, headAction, locked, onToggleLock }) {
  const uid = useId()
  const [browsing, setBrowsing] = useState(false)
  const slot = label.split(' ')[0]
  const count = font.variants.length
  const weights = font.variants.map((w) => ({ value: w, label: String(w) }))
  return (
    <div className="fpr-fam" role="group" aria-labelledby={`${uid}-label`}>
      <div className="fpr-fam-head">
        <span className="fpr-label" id={`${uid}-label`}>{label}</span>
        {headAction}
      </div>
      <div className="fpr-fam-row">
        <div
          className="fpr-fam-id"
          ref={(el) => {
            if (!el) return
            el.style.setProperty('--fpr-fam-ff', fontStack(font))
            el.style.setProperty('--fpr-fam-fw', String(weight))
          }}
        >
          <span className="fpr-fam-name">{font.family}</span>
          <span className="fpr-fam-meta">{categoryLabel(font.category)} · {weightCount(count)}</span>
        </div>
        <div className="fpr-fam-acts">
          {phone && (
            <MenuSelect className="fpr-wmenu" value={weight} options={weights} onChange={onWeight} ariaLabel={`${slot} weight`} />
          )}
          <ToolButton
            icon={locked ? 'lock-simple' : 'lock-simple-open'}
            iconSize={14}
            className="fpr-lock"
            aria-pressed={locked}
            aria-label={`Lock ${label.toLowerCase()}`}
            title={locked ? `${font.family} stays when you shuffle. Press to unlock.` : `Keep ${font.family} when you shuffle`}
            onClick={onToggleLock}
          >
            {locked ? 'Locked' : 'Lock'}
          </ToolButton>
          <ToolButton className="fpr-browse" aria-haspopup="dialog" aria-label={`Browse ${label.toLowerCase()}`} onClick={() => setBrowsing(true)}>
            Browse
          </ToolButton>
        </div>
      </div>
      {!phone && (
        <ToolPills label={`${slot} weight`} className="fpr-weights" options={weights} value={weight} onChange={onWeight} />
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
  // case this rejects is the one with nothing to show.
  const seedPairs = Boolean(seedHeading?.family) && seedHeading.family !== seedBody?.family
  const [headingName, setHeadingName] = useState(() => (seedPairs ? seedHeading.family : PAIR_FALLBACK_HEADING))
  const [bodyName, setBodyName] = useState(() => seedBody?.family || 'Inter')
  const [headingW, setHeadingW] = useState(() => seedHeading?.weight || 700)
  const [bodyW, setBodyW] = useState(() => seedBody?.weight || 400)
  const [previewText, setPreviewText] = useState('')
  const [preset, setPreset] = useState('article')
  const [suggestions, setSuggestions] = useState([])
  const [suggesting, setSuggesting] = useState(true)
  // A locked side survives Shuffle. History is the undo stack of earlier pairs.
  const [locks, setLocks] = useState({ heading: false, body: false })
  const [history, setHistory] = useState([])

  useEffect(() => {
    const draft = readPairDraft()
    if (draft?.heading) toast?.(`Pairing from ${draft.heading.family}`)
    consumePairDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Load what the specimen draws, so nothing on it is faux-bolded or slanted:
  // the heading weight, and for the body its regular, button and bold weights
  // and its italic. The other role's default weight rides along so a Swap
  // lands on faces that are already there.
  useEffect(() => {
    if (!headingFont) return
    const { upright } = headingFaceWeights(headingFont, headingW)
    loadFont(headingFont.family, [...upright, bodyWeight(headingFont)])
  }, [headingFont, headingW])
  useEffect(() => {
    if (!bodyFont) return
    const { upright, italic } = bodyFaceWeights(bodyFont, bodyW)
    loadFont(bodyFont.family, [...upright, headingWeight(bodyFont)], italic)
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

  const chooseHeading = useCallback((font) => {
    const w = font.variants.includes(headingW) ? headingW : headingWeight(font)
    if (font.family !== headingName) remember()
    setHeadingName(font.family)
    setHeadingW(w)
    setFonts({ heading: { family: font.family, weight: w, category: font.category } })
  }, [headingW, headingName, remember, setFonts])

  const chooseBody = useCallback((font) => {
    const w = font.variants.includes(bodyW) ? bodyW : bodyWeight(font)
    if (font.family !== bodyName) remember()
    setBodyName(font.family)
    setBodyW(w)
    setFonts({ body: { family: font.family, weight: w, category: font.category } })
  }, [bodyW, bodyName, remember, setFonts])

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
    toast?.(`Using ${body.family} with ${headingFont.family}`)
  }, [headingFont, headingW, bodyName, remember, setFonts, toast])

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
    toast?.(`${next.heading.family} with ${next.body.family}`)
  }, [catalog, headingFont, bodyFont, headingW, bodyW, lock, remember, applySnapshot, toast])

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

  const headingStack = headingFont ? fontStack(headingFont) : 'var(--font)'
  const bodyStack = bodyFont ? fontStack(bodyFont) : 'var(--font)'

  // Every weight and style the specimen draws, so the site built from the
  // import matches the page: the heading weight; the body's regular weight, the
  // button weight, bold and italic. Only cuts the family ships are asked for.
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
      scale: {
        base: design?.typeScale?.base || 16,
        ratio: design?.typeScale?.ratio || 1.25,
      },
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
  const allItems = [
    {
      id: 'shuffle',
      priority: 1,
      render: () => (
        <ToolButton icon="shuffle" collapse onClick={shuffle} disabled={!ready} title={shuffleName}>
          Shuffle
        </ToolButton>
      ),
      menu: { label: shuffleName, icon: 'shuffle', onSelect: shuffle, disabled: !ready },
    },
    {
      id: 'swap',
      priority: 5,
      render: () => (
        <ToolButton icon="arrows-left-right" collapse onClick={swap} disabled={!ready} title="Swap the heading and body families">
          Swap
        </ToolButton>
      ),
      menu: { label: 'Swap heading and body', icon: 'arrows-left-right', onSelect: swap, disabled: !ready },
    },
    {
      id: 'undo',
      priority: 6,
      render: () => (
        <ToolButton icon="arrow-u-up-left" collapse onClick={undo} disabled={!canUndo} title="Undo the last change to the pair">
          Undo
        </ToolButton>
      ),
      menu: { label: 'Undo the last change', icon: 'arrow-u-up-left', onSelect: undo, disabled: !canUndo },
    },
    {
      id: 'gallery',
      priority: 0,
      render: () => (
        <ToolButton as={NavLink} to="/create/font-gallery" icon="swatches" aria-label="Browse the Font Gallery">
          Font Gallery
        </ToolButton>
      ),
      menu: { label: 'Browse the Font Gallery', icon: 'swatches', onSelect: () => navigate('/create/font-gallery') },
    },
    {
      id: 'scale',
      priority: 2,
      render: () => (
        <ToolButton icon="caret-right" className="fpr-handoff" onClick={openInTypeScale} disabled={!ready} aria-label="Build a type scale from this pair">
          Build a type scale
        </ToolButton>
      ),
      menu: { label: 'Build a type scale from this pair', icon: 'caret-right', onSelect: openInTypeScale, disabled: !ready },
    },
    { id: 'div', divider: true, align: 'end' },
    {
      id: 'import',
      priority: 3,
      render: () => (
        <ToolButton className="fpr-copy-all" onClick={copyImport} disabled={!importUrl}>Copy font import</ToolButton>
      ),
      menu: { label: 'Copy font import', icon: 'copy', onSelect: copyImport, disabled: !importUrl },
    },
  ]
  // Below 1024 Shuffle lives in the docked bar, and the Font Gallery link and
  // the import copy fold into More.
  const items = desktop
    ? allItems
    : allItems
      .filter((it) => it.id !== 'shuffle')
      .map((it) => (it.id === 'gallery' || it.id === 'import' ? { ...it, inline: false } : it))
  const primary = (
    <ToolButton variant="accent" icon="copy" iconSize={14} className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)} disabled={!cssExport}>
      Copy CSS
    </ToolButton>
  )
  const layout = (body) => (
    <ToolLayout className="fpr-page" title="Font Pair" titleId="fpr-title" items={items} primary={phone ? null : primary}>
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
  // The typed words go in the heading slots only. The body slots keep their
  // paragraph, because a body face is judged on running text.
  const headline = sample || HEAD_COPY
  const rowHead = sample ? sample.slice(0, ROW_HEAD_MAX) : 'Typography that carries the page'

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
  const shuffleButton = (
    <ToolButton
      icon="shuffle"
      variant={phone ? 'square' : 'quiet'}
      className="fpr-dock-shuffle"
      onClick={shuffle}
      disabled={!ready}
      aria-label={phone ? shuffleName : undefined}
      title={shuffleName}
    >
      {!phone && 'Shuffle'}
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

  // The families, the preview text, and the lock/best-match controls.
  const panel = (
    <ToolPanel label="Font Pair controls" className="fpr-panel fpr-config">
      <div className="fpr-fams">
        <FamilyCard
          label="Heading family"
          intent="heading"
          fonts={catalog}
          font={headingFont}
          weight={headingW}
          phone={phone}
          locked={locks.heading}
          onToggleLock={() => toggleLock('heading')}
          onPickFont={chooseHeading}
          onWeight={(w) => {
            setHeadingW(w)
            setFonts({ heading: { family: headingFont.family, weight: w, category: headingFont.category } })
          }}
        />
        <FamilyCard
          label="Body family"
          fonts={catalog}
          font={bodyFont}
          weight={bodyW}
          phone={phone}
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
                  ? `Best match for ${headingFont.family} is in use: ${bestMatch.font.family}`
                  : `Use the best match for ${headingFont.family}: ${bestMatch.font.family}`)
                : undefined}
            >
              {bodyIsBestMatch ? <><span aria-hidden="true">✓ </span>Best match</> : 'Best match'}
            </ToolButton>
          )}
        />
      </div>
      <div className="fpr-text">
        <label className="fpr-label" htmlFor="fpr-text">Preview text</label>
        <input
          id="fpr-text"
          className="fpr-input"
          type="text"
          value={previewText}
          placeholder="Type your own words"
          maxLength={90}
          spellCheck="false"
          onChange={e => setPreviewText(e.target.value)}
        />
        <p className="fpr-hint">
          Your words go in the headings. The body keeps a real paragraph, so you
          can judge the face on running text.
        </p>
      </div>
    </ToolPanel>
  )

  // The specimen: a real article at real sizes.
  const stage = (
    <section className="fpr-stage" aria-labelledby="fpr-output-title">
      <h2 id="fpr-output-title" className="sr-only">Read the pairing</h2>
      <div className="fpr-stage-head">
        <ToolPills
          label="Preview layout"
          options={PREVIEW_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          value={preset}
          onChange={setPreset}
        />
        {/* The current pair, set in the two families it names: the one
            place on the page that states it. */}
        <div className="fpr-pair" role="group" aria-label="Current font pair" ref={varsRef(specimenVars)}>
          <span>{headingFont.family}</span>
          <i aria-hidden="true">+</i>
          <span>{bodyFont.family}</span>
        </div>
      </div>

      <div className="fpr-specimen" ref={varsRef(specimenVars)}>
        {preset === 'article' && (
          <article className="fpr-article">
            <h3 className="fpr-h1">{headline}</h3>
            <p className="fpr-lede">{LEDE_COPY}</p>
            <h4 className="fpr-h2">{sample || SUB_HEAD}</h4>
            <p className="fpr-body">{BODY_COPY}</p>
          </article>
        )}

        {preset === 'product' && (
          <div className="fpr-product">
            <h3 className="fpr-h1">{headline}</h3>
            <p className="fpr-body">Short body copy, buttons and labels — the register most interfaces actually live in.</p>
            <div className="fpr-product-actions">
              <span className="fpr-product-primary">Get started</span>
              <span className="fpr-product-secondary">See how it works</span>
            </div>
          </div>
        )}

        {preset === 'specimen' && (
          <div className="fpr-specimen-raw">
            <p className="fpr-h1">{sample || 'Aa Bb Cc'}</p>
            <p className="fpr-glyphs fpr-glyphs--heading">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p className="fpr-glyphs fpr-glyphs--heading">abcdefghijklmnopqrstuvwxyz 0123456789</p>
            <p className="fpr-glyphs">{sample || PANGRAM}</p>
            <p className="fpr-body">{BODY_COPY}</p>
          </div>
        )}
      </div>
    </section>
  )

  // Each row is one tap target: the pair drawn in both faces, and the reason
  // under it in plain view.
  const suggest = (
    <section className="fpr-suggest" aria-labelledby="fpr-suggest-title">
      <div className="fpr-section-head">
        <h2 id="fpr-suggest-title">Bodies that suit {headingFont.family}</h2>
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
        <ul className="fpr-suggest-grid">
          {suggestions.map(({ font, reason }) => {
            const active = font.family === bodyFont.family
            const reasonId = `fpr-why-${font.family.replace(/[^a-z0-9]+/gi, '-')}`
            return (
              <li
                key={font.family}
                className={active ? 'fpr-card fpr-card--on' : 'fpr-card'}
                ref={varsRef({
                  '--fpr-b-ff': fontStack(font),
                  '--fpr-b-fw': String(bodyWeight(font)),
                  '--fpr-h-ff': headingStack,
                  '--fpr-h-fw': String(headingW),
                })}
              >
                <button
                  type="button"
                  className="fpr-card-apply"
                  onClick={() => applyPair(font)}
                  aria-pressed={active}
                  aria-label={active ? `${font.family} with ${headingFont.family}, in use` : `Use ${font.family} with ${headingFont.family}`}
                  aria-describedby={reasonId}
                >
                  <span className="fpr-card-head">{rowHead}</span>
                  <span className="fpr-card-text">{ROW_LINE}</span>
                  <span className="fpr-card-line">
                    <span className="fpr-card-name">{font.family}</span>
                    <span className="fpr-card-cta">
                      {active ? <><span aria-hidden="true">✓ </span>In use</> : 'Use this pair'}
                    </span>
                  </span>
                  <span className="fpr-card-reason" id={reasonId}>{reason}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )

  const delivery = (
    <details className="fpr-delivery">
      <summary>Prepare the handoff</summary>
      <p className="fpr-hint">One import and one block of CSS. Weights loaded: {describePairImport(importFamilies)}.</p>
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
            {/* A phone opens on the specimen, then the controls, then the
                suggestions. DOM order is the reading and focus order. */}
            <ToolMain className="fpr-output fpr-output--stage">{stage}</ToolMain>
            {panel}
            <ToolMain className="fpr-output fpr-output--rest">
              {suggest}
              {delivery}
            </ToolMain>
          </>
        ) : (
          <>
            {/* The controls first from 768, so a tablet reads the families, then
                the preview text, then the specimen. From 1024 the grid puts the
                panel on the right. */}
            {panel}
            <ToolMain className="fpr-output">
              {stage}
              {suggest}
              {delivery}
            </ToolMain>
          </>
        )}
      </ToolGrid>

      {/* The docked bar: one stack above the tab bar on a phone. */}
      <div className="fpr-dock" role="group" aria-label="Pair actions">
        {desktop && <p className="fpr-dock-note">Keeps both families with your project</p>}
        {!desktop && !phone && shuffleButton}
        {saveButton}
        {phone && shuffleButton}
        {phone && (
          <ToolButton variant="accent" icon="copy" iconSize={14} className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)} disabled={!cssExport}>
            Copy CSS
          </ToolButton>
        )}
      </div>

      {/* Step 2 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="fonts" />
    </>,
  )
}
