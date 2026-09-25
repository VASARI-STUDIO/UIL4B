import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import FontPicker from '../components/FontPicker'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills,
} from '../components/tool/ToolLayout'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, suggestPairings,
} from '../utils/googleFonts'
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
const BODY_COPY = 'Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump — the five boxing wizards jump quickly, and the rhythm of the line holds all the way to the end of the measure.'

// The catalogue is sorted by popularity, so the shuffle pool is the first slice
// rather than the whole list: a random draw from 1,700 families is almost always
// something nobody would ship, which reads as broken rather than serendipitous.
const SHUFFLE_POOL = 200

// The heading the pair page opens on when the carried design has no pairing to
// show. A serif against the Inter body, so the first paint demonstrates the
// contrast the tool is for.
const PAIR_FALLBACK_HEADING = 'Playfair Display'

export default function FontMatcher({ onCopy, toast }) {
  const navigate = useNavigate()
  const { design, setFonts } = useProject()
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

  useEffect(() => {
    if (headingFont) loadFont(headingFont.family, [headingW, bodyWeight(headingFont)])
  }, [headingFont, headingW])
  useEffect(() => {
    if (bodyFont) loadFont(bodyFont.family, [bodyW, headingWeight(bodyFont)])
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

  const chooseHeading = useCallback((font) => {
    const w = font.variants.includes(headingW) ? headingW : headingWeight(font)
    setHeadingName(font.family)
    setHeadingW(w)
    setFonts({ heading: { family: font.family, weight: w, category: font.category } })
  }, [headingW, setFonts])

  const chooseBody = useCallback((font) => {
    const w = font.variants.includes(bodyW) ? bodyW : bodyWeight(font)
    setBodyName(font.family)
    setBodyW(w)
    setFonts({ body: { family: font.family, weight: w, category: font.category } })
  }, [bodyW, setFonts])

  // NB: not named `usePair` — a `use…` identifier makes the rules-of-hooks lint
  // treat every call site as a hook call, which it is not.
  const applyPair = useCallback((body) => {
    if (!headingFont) return
    const bw = bodyWeight(body)
    setBodyName(body.family)
    setBodyW(bw)
    setFonts({
      heading: { family: headingFont.family, weight: headingW, category: headingFont.category },
      body: { family: body.family, weight: bw, category: body.category },
    })
    toast?.(`${headingFont.family} + ${body.family} saved to your kit`)
  }, [headingFont, headingW, setFonts, toast])

  const shuffle = useCallback(() => {
    if (!catalog.length) return
    const pool = catalog.slice(0, Math.min(SHUFFLE_POOL, catalog.length))
    const next = pool[Math.floor(Math.random() * pool.length)]
    if (next) chooseHeading(next)
  }, [catalog, chooseHeading])

  const headingStack = headingFont ? fontStack(headingFont) : 'var(--font)'
  const bodyStack = bodyFont ? fontStack(bodyFont) : 'var(--font)'

  const importUrl = useMemo(() => {
    if (!headingFont || !bodyFont) return null
    if (headingFont.family === bodyFont.family) {
      return getFontImportUrl([{ family: headingFont.family, weights: [...new Set([headingW, bodyW])] }])
    }
    return getFontImportUrl([
      { family: headingFont.family, weights: [headingW] },
      { family: bodyFont.family, weights: [bodyW] },
    ])
  }, [headingFont, bodyFont, headingW, bodyW])

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
  const items = [
    {
      id: 'shuffle',
      priority: 1,
      render: () => (
        <ToolButton icon="shuffle" collapse onClick={shuffle} disabled={!ready} title="Shuffle the heading face">
          Shuffle
        </ToolButton>
      ),
      menu: { label: 'Shuffle the heading', icon: 'shuffle', onSelect: shuffle, disabled: !ready },
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
        <ToolButton icon="caret-right" className="fpr-handoff" onClick={openInTypeScale} disabled={!ready} aria-label="Build a scale from this pair">
          Build a scale
        </ToolButton>
      ),
      menu: { label: 'Build a scale from this pair', icon: 'caret-right', onSelect: openInTypeScale, disabled: !ready },
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
  const primary = (
    <ToolButton variant="accent" icon="copy" iconSize={14} className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)} disabled={!cssExport}>
      Copy CSS
    </ToolButton>
  )
  const layout = (body) => (
    <ToolLayout className="fpr-page" title="Font Pair" titleId="fpr-title" items={items} primary={primary}>
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

  const sample = previewText.trim()
  const headline = sample || 'Typography that carries the whole page'
  const bodyText = sample ? `${sample} ${sample}` : BODY_COPY

  const specimenVars = {
    '--fpr-h-ff': headingStack,
    '--fpr-b-ff': bodyStack,
    '--fpr-h-fw': String(headingW),
    '--fpr-b-fw': String(bodyW),
  }
  const varsRef = (vars) => (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }

  const weightPills = (font, value, onPick, label) => (
    <ToolPills
      mono
      label={label}
      className="fpr-weights"
      options={font.variants.map((w) => ({ value: w, label: String(w) }))}
      value={value}
      onChange={onPick}
    />
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
        {/* ── The output: the pair set as a page, then what else would pair,
            then the code. First in the source, so a phone opens on it. ── */}
        <ToolMain className="fpr-output">
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
                  <p className="fpr-lede">
                    {sample || 'A heading face sets the tone; the body face has to survive four hundred words of it.'}
                  </p>
                  <h4 className="fpr-h2">{sample || 'Where the pairing earns its keep'}</h4>
                  <p className="fpr-body">{bodyText}</p>
                </article>
              )}

              {preset === 'product' && (
                <div className="fpr-product">
                  <h3 className="fpr-h1">{headline}</h3>
                  <p className="fpr-body">{sample || 'Short body copy, buttons and labels — the register most interfaces actually live in.'}</p>
                  <div className="fpr-product-actions">
                    <span className="fpr-product-primary">Get started</span>
                    <span className="fpr-product-secondary">See how it works</span>
                  </div>
                  <div className="fpr-product-stats">
                    {[['—', 'Teams'], ['—', 'Rating'], ['—', 'Uptime']].map(([n, l]) => (
                      <div key={l}>
                        <strong className="fpr-h2">{n}</strong>
                        <span className="fpr-body">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preset === 'specimen' && (
                <div className="fpr-specimen-raw">
                  <p className="fpr-h1">{sample || 'Aa Bb Cc'}</p>
                  <p className="fpr-glyphs fpr-glyphs--heading">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                  <p className="fpr-glyphs fpr-glyphs--heading">abcdefghijklmnopqrstuvwxyz 0123456789</p>
                  <p className="fpr-glyphs">{sample || PANGRAM}</p>
                  <p className="fpr-body">{bodyText}</p>
                </div>
              )}
            </div>
          </section>

          <section className="fpr-suggest" aria-labelledby="fpr-suggest-title">
            <div className="fpr-section-head">
              <h2 id="fpr-suggest-title">Body faces that work under {headingFont.family}</h2>
              <p>Scored on popularity and weight range, filtered by what actually contrasts with a {headingFont.category} heading.</p>
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
                  {' '}{headingFont.category} heading. Pick a different heading, or reload the full
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
                  return (
                    <li
                      key={font.family}
                      className={active ? 'fpr-card fpr-card--on' : 'fpr-card'}
                      ref={varsRef({
                        '--fpr-h-ff': headingStack,
                        '--fpr-h-fw': String(headingW),
                        '--fpr-b-ff': fontStack(font),
                        '--fpr-b-fw': String(bodyWeight(font)),
                      })}
                    >
                      <p className="fpr-card-heading">{headingFont.family}</p>
                      <p className="fpr-card-body">
                        {font.family} carries the body copy — {PANGRAM.toLowerCase()}.
                      </p>
                      {/* The reason is one click away rather than always on:
                          the card previews the pairing, the details say why. */}
                      <details className="fpr-card-why">
                        <summary>Why this pairs</summary>
                        <p className="fpr-card-reason">{reason}</p>
                      </details>
                      <div className="fpr-card-foot">
                        <span className="fpr-card-name">
                          {font.family}
                          <em>{font.category} · {font.variants.length}w</em>
                        </span>
                        <ToolButton
                          className="fpr-card-apply"
                          onClick={() => applyPair(font)}
                          aria-pressed={active}
                        >
                          {active ? 'In use' : 'Use this pair'}
                        </ToolButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="fpr-delivery" aria-labelledby="fpr-delivery-title">
            <div className="fpr-section-head">
              <h2 id="fpr-delivery-title">Prepare the handoff</h2>
              <p>One import and one block of CSS — both families at the weights you chose.</p>
            </div>
            <pre id="fpr-export" className="tl-code fpr-export" tabIndex={0} aria-label="CSS for this pair"><code>{cssExport}</code></pre>
            {/* Copying is free; keeping the pair in a project is the step
                that asks for an account. */}
            <div className="fpr-keep">
              <SaveTypeSystem
                gate="type-save-font-pair"
                label="this pairing"
                summary={`${headingFont.family} ${headingW} for headings, ${bodyFont.family} ${bodyW} for body.`}
                toast={toast}
              />
              <p className="fpr-keep-note">
                Keeps both families and their weights with the project’s palette and type scale.
              </p>
            </div>
          </section>
        </ToolMain>

        {/* ── Controls ── */}
        <ToolPanel label="Font Pair controls" className="fpr-panel fpr-config">
          <ToolSection>
            <FontPicker
              label="Heading family"
              intent="heading"
              fonts={catalog}
              value={headingFont}
              onChange={chooseHeading}
            />
            {weightPills(headingFont, headingW, (w) => {
              setHeadingW(w)
              setFonts({ heading: { family: headingFont.family, weight: w, category: headingFont.category } })
            }, 'Heading weight')}
          </ToolSection>

          <ToolSection>
            {/* The wand takes the first suggestion, the same ranking the cards
                show, so the two can never name different winners. Disabled,
                not hidden, until there is a suggestion to apply. */}
            <div className="fpr-bodyrow">
              <FontPicker
                label="Body family"
                fonts={catalog}
                value={bodyFont}
                onChange={chooseBody}
              />
              <ToolButton
                icon="magic-wand"
                className="fpr-wand"
                onClick={() => { if (suggestions[0]) applyPair(suggestions[0].font) }}
                disabled={!suggestions.length}
                title={suggestions.length
                  ? `Use ${suggestions[0].font.family}, the best match for ${headingFont.family}`
                  : 'No suggestions yet'}
                aria-label={suggestions.length
                  ? `Pick a body face automatically: use ${suggestions[0].font.family} with ${headingFont.family}`
                  : 'Pick a body face automatically — no suggestions yet'}
              >
                Auto
              </ToolButton>
            </div>
            {weightPills(bodyFont, bodyW, (w) => {
              setBodyW(w)
              setFonts({ body: { family: bodyFont.family, weight: w, category: bodyFont.category } })
            }, 'Body weight')}
          </ToolSection>

          <ToolSection>
            <label className="tl-sec-label" htmlFor="fpr-text">Preview text</label>
            <input
              id="fpr-text"
              className="fpr-input"
              type="text"
              value={previewText}
              placeholder="Your own words…"
              maxLength={90}
              spellCheck="false"
              onChange={e => setPreviewText(e.target.value)}
            />
            <p className="fpr-hint">
              Brand words behave differently from a pangram — try the real headline
              before you commit to a face.
            </p>
          </ToolSection>
        </ToolPanel>
      </ToolGrid>

      {/* Step 2 of the guided UI-kit flow (colour → fonts → type scale → icons). */}
      <UIKitGuide step="fonts" />
    </>,
  )
}
