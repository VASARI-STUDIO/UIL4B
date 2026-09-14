import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import FontPicker from '../components/FontPicker'
import ShuffleIcon from '../components/ShuffleIcon'
import UIKitGuide from '../components/UIKitGuide'
import SaveTypeSystem from '../components/SaveTypeSystem'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, suggestPairings,
} from '../utils/googleFonts'
import { consumePairDraft, readPairDraft, setScaleDraft } from '../utils/typeHandoff'
// The `font-pair` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
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

  const [headingName, setHeadingName] = useState(() => seedHeading?.family || 'Playfair Display')
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

  if (status === 'loading') {
    return (
      <div className="sec fpr-page">
        <FontCatalogLoading label="Opening Font Pair" />
      </div>
    )
  }

  if (!catalog.length || !headingFont || !bodyFont) {
    // Belt and braces: fetchFontCatalog always resolves to at least the bundled
    // list, so this is unreachable in practice — but a genuinely empty catalogue
    // must show a way forward rather than a blank workbench.
    return (
      <div className="sec fpr-page">
        <div className="typ-loading" role="status">
          <strong>No font catalogue is available right now.</strong>
          <span>Font Pair needs at least a handful of families to work with. Retry the catalogue, or browse the gallery once it&rsquo;s back.</span>
          <button type="button" className="typ-notice-retry" onClick={retry} disabled={retrying}>
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
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

  return (
    <div className="sec fpr-page">
      {/* The structural twin of the Font Gallery masthead, and it carried the
          same two faults (#surface-headers-read-as-ai): a decorative
          "Create / Typography" taxonomy eyebrow restating the <h1> below it,
          and the page's onward action parked in the top-right corner as an 11px
          underlined text link. Both are gone; the link is now a real button in
          the copy column, under the paragraph that gives it a reason.

          WHAT STAYS, and why it is not the thing the founder marked: the
          `.fpr-hero-pair` readout is the page's LIVE STATE — the two families
          currently selected. It changes as you work and you cannot get it
          anywhere else on screen. That is the opposite of a catalogue counter,
          which is fixed, decorative, and tells you about the product rather
          than about your work. */}
      <header className="fpr-hero fpr-hero--premium" ref={varsRef(specimenVars)}>
        <div className="fpr-hero-copy">
          <div>
            <h1>Font Pair</h1>
            <p className="fpr-hero-signature">Aa</p>
          </div>
          <div className="fpr-hero-intro">
            {/* THE THIRD INSTANCE OF THE LEDE MOTIF, and the worst of them.
                ────────────────────────────────────────────────────────────
                It read: "Pair type like a creative director. Choose a voice
                for the headline, a workhorse for the body, and test the
                relationship in real layouts."

                Two faults in one sentence. The three clauses are the page
                describing its own workflow — choose, choose, test are the
                controls directly below — which is the shape #386 removed from
                the Type Scale and this pass removed from the Tint Scale and
                the Gradient Generator. And "like a creative director" is the
                other named motif: copy that argues for the product instead of
                showing it. It flatters the reader and tells them nothing; the
                specimens below are the only thing that can make that claim.

                What replaces it is the model — two families in two roles, and
                the fact that everything under the fold is those two together.
                That is what a first-time visitor cannot infer from a hero
                that currently reads "Inter + Inter".

                NOT changed here: that this hero fills the whole first screen
                at 390px, so the first control a phone user meets is a link to
                a different tool. That is a layout decision for the founder,
                and it is filed rather than fixed. */}
            <p>
              Two families — one for headings, one for body. Every preview below is
              those two, together.
            </p>
            <div className="fpr-hero-pair" aria-label="Current font pair">
              <span>{headingFont.family}</span>
              <i aria-hidden="true">+</i>
              <span>{bodyFont.family}</span>
            </div>
            <NavLink to="/create/font-gallery" className="btn fpr-hero-cta">
              Browse the Font Gallery <span aria-hidden="true">↗</span>
            </NavLink>
          </div>
        </div>
      </header>

      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      {/* THE FOUR-UP FIGURE STRIP IS GONE (`.fpr-status`), AND THE HERO
          READOUT #382 KEPT IS WHY.
          ------------------------------------------------------------------
          #382 deleted this page's eyebrow and reseated its action, and kept
          `.fpr-hero-pair` on the grounds that the two selected families are
          live state "you cannot get anywhere else on screen". That was true of
          the readout and false of the page: this strip sat 350px under it and
          said the same two families again. Measured at 1440x900, hero pair at
          y=274, strip at y=624.

          The other two figures were the motif itself:

            "N suggestions"  counts the `.fpr-card`s rendered in the panel
                             below it. The eye orders them without help.
            "N families"     the CATALOGUE COUNTER. This is the same figure the
                             founder marked "AI" on the Font Gallery ("1,798
                             text families"), reading off the same catalogue.
                             #382 moved it into the Gallery's search
                             placeholder, where it tells you the size of what
                             you are about to search; here it told you the size
                             of the product. On a degraded catalogue it was also
                             restated 207px ABOVE itself by FontCatalogNotice
                             ("Showing a bundled list of 84 families.").

          `.fpr-hero-pair` stays, and it is now true that it is the only place
          the current pair is stated. */}

      <div className="fpr-grid">
        {/* ── Controls ── */}
        <section className="card fpr-panel fpr-config" aria-labelledby="fpr-config-title">
          {/* THE 01 / 02 / 03 / 04 BADGES ARE GONE FROM ALL FOUR PANELS, AND
              THE REASON IS THE ONE #386 FOUND ON THE TYPE SCALE.
              ------------------------------------------------------------
              THEY READ RIGHT TO LEFT. Measured at 1440x900 before this change:
              "01 Choose the pair" had its badge at x=1087 and "02 Read the
              pairing" at x=79, both on the same line at y=735. `.fpr-grid`
              puts the config rail in the right-hand column at this width, so
              the sequence a reader meets is 02, 01, 03, 04. A numbered
              sequence that has to be read against the reading direction is
              worse than no numbering — which is the identical measurement
              #386 recorded on the Type Scale (01 at x=1079, 02 at x=71) and
              the identical fix.

              AND THEY WERE DECORATION DOING HIERARCHY'S JOB: four panels, two
              of them nested inside a third, ranked by a mono numeral in a
              tinted box rather than by size, position or weight. The headings
              already name the order in words — choose, read, compare, hand
              off — and they still do. */}
          <div className="fpr-section-head">
            <div>
              <h2 id="fpr-config-title">Choose the pair</h2>
              <p>The heading drives the suggestions; the body is yours to override.</p>
            </div>
          </div>

          {/* ONE LINE, NOT THREE. Founder, 2026-09-14: "the choose the pair
              panel should not be scrollable."

              MEASURED at 1440x900 before this: the panel's content was 849px
              against 796px of usable height, so it overflowed by 53px and
              carried its own scrollbar inside the page — a nested scroller in
              a column that is already sticky. This callout was 114px of that,
              the tallest single thing in a panel whose job is the two pickers
              below it, and it is a LINK AWAY from the tool rather than part of
              choosing a pair.

              The second line went: "Browse live specimens, compare families,
              then send one back here" explained a destination that the name of
              the destination and an arrow already name. Dropping it, and
              tightening the mark and the spacing, returns 54px — which is the
              53 the panel was over by. The scroller is then unnecessary rather
              than suppressed, and nothing is clipped. */}
          <NavLink to="/create/font-gallery" className="fpr-gallery-callout">
            <span className="fpr-gallery-callout-mark" aria-hidden="true">Aa</span>
            <strong>Select from the Font Gallery</strong>
            <span aria-hidden="true">↗</span>
          </NavLink>

          <FontPicker
            label="Heading family"
            intent="heading"
            fonts={catalog}
            value={headingFont}
            onChange={chooseHeading}
          />
          <div className="fpr-weights" role="group" aria-label="Heading weight">
            {headingFont.variants.map(w => (
              <button
                key={w}
                type="button"
                className={headingW === w ? 'fpr-weight fpr-weight--on' : 'fpr-weight'}
                aria-pressed={headingW === w}
                onClick={() => {
                  setHeadingW(w)
                  setFonts({ heading: { family: headingFont.family, weight: w, category: headingFont.category } })
                }}
              >
                {w}
              </button>
            ))}
          </div>

          {/* PICK THE BODY FROM THE HEADING. Founder, 2026-09-14: "when
              selecting a second font, show a wand button to pick automatically
              based on the first font."

              IT REUSES THE RANKING THAT IS ALREADY ON THE PAGE rather than
              inventing a second opinion. `suggestions` is what the panel below
              scores and explains; taking its first entry means the wand and the
              cards can never disagree about which body face wins, and the
              reasoning for what it chose is already written and one click away
              under that card.

              It is DISABLED until there is something to apply — no heading yet,
              or the catalogue has not answered — instead of being hidden, so
              the control does not appear and disappear under the pointer. The
              title says what it will do; the visible label is an icon because
              the row it sits in is already two fields deep. */}
          <div className="fpr-bodyrow">
            <FontPicker
              label="Body family"
              fonts={catalog}
              value={bodyFont}
              onChange={chooseBody}
            />
            <button
              type="button"
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
              </svg>
              <span className="fpr-wand-label">Auto</span>
            </button>
          </div>
          <div className="fpr-weights" role="group" aria-label="Body weight">
            {bodyFont.variants.map(w => (
              <button
                key={w}
                type="button"
                className={bodyW === w ? 'fpr-weight fpr-weight--on' : 'fpr-weight'}
                aria-pressed={bodyW === w}
                onClick={() => {
                  setBodyW(w)
                  setFonts({ body: { family: bodyFont.family, weight: w, category: bodyFont.category } })
                }}
              >
                {w}
              </button>
            ))}
          </div>

          <label className="seg-label" htmlFor="fpr-text">Preview text</label>
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
          <p className="typ-hint">
            Brand words behave differently from a pangram — try the real headline
            before you commit to a face.
          </p>

          <button type="button" className="fpr-shuffle" onClick={shuffle}>
            <ShuffleIcon size={14} />
            Shuffle the heading
          </button>
          <button type="button" className="fpr-handoff" onClick={openInTypeScale}>
            Build a scale from this pair &rarr;
          </button>
        </section>

        {/* ── Specimen + suggestions ── */}
        <section className="card fpr-panel fpr-output" aria-labelledby="fpr-output-title">
          {/* THE HEADING AND ITS BLURB ARE GONE FROM SIGHT. Founder, 2026-09-14:
              "remove this text its not needed it takes up space again its
              another AI thing."

              "Read the pairing" + "The two faces together, at the sizes and
              weights they'll actually ship at" sat directly above a preview
              that demonstrates precisely that, with a three-way switch naming
              the three layouts underneath it. Ninety-six pixels explaining a
              picture that is already on screen.

              THE h2 STAYS IN THE DOCUMENT, sr-only, because this <section> is
              aria-labelledby it — deleting it outright would leave the main
              region of the page unnamed, and the page's outline would drop
              from four headings to three with no replacement. Same shape as
              /create/palette. */}
          <h2 id="fpr-output-title" className="sr-only">Read the pairing</h2>

          <div className="fpr-preset-switch" role="group" aria-label="Preview layout">
            {PREVIEW_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className={preset === p.id ? 'fpr-preset-btn fpr-preset-btn--on' : 'fpr-preset-btn'}
                aria-pressed={preset === p.id}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="fpr-specimen" ref={varsRef(specimenVars)}>
            {preset === 'article' && (
              <article className="fpr-article">
                {/* NO KICKER. Founder, 2026-09-14, striking "INTERFACE" off a
                screenshot of this panel: "remove this text its such a common AI
                trait". All three previews carried one — "Long-form", "Interface",
                "Letterforms" — each restating the preset ALREADY SELECTED in the
                switch directly above the panel, and the last one word-for-word.
                A label that repeats the control that produced it is the tell. */}
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
                  {[['12k', 'Teams'], ['4.9', 'Rating'], ['99.9%', 'Uptime']].map(([n, l]) => (
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

          <div className="fpr-suggest">
            <div className="fpr-section-head fpr-section-head--sub">
              <div>
                <h2>Body faces that work under {headingFont.family}</h2>
                <p>Scored on popularity and weight range, filtered by what actually contrasts with a {headingFont.category} heading.</p>
              </div>
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
                      {/* THE REASON IS ON DEMAND, NOT ALWAYS ON. Founder's
                          choice, 2026-09-14: "card previews the pairing, reason
                          on hover/expand".

                          It is what makes this tool more than a font list, so
                          it is NOT deleted — but printed on every card it was
                          the tallest thing in each one, and the grid is the
                          second of three stacked sections under a preview that
                          should dominate. A <details> keeps the words one click
                          away, keeps them in the DOM for a screen reader and
                          for find-in-page, and needs no JavaScript or state.

                          `fpr-card-why` rather than a bare <summary> marker so
                          the affordance reads as a control at 11.5px. */}
                      <details className="fpr-card-why">
                        <summary>Why this pairs</summary>
                        <p className="fpr-card-reason">{reason}</p>
                      </details>
                      <div className="fpr-card-foot">
                        <span className="fpr-card-name">
                          {font.family}
                          <em>{font.category} · {font.variants.length}w</em>
                        </span>
                        <button
                          type="button"
                          className="fpr-card-apply"
                          onClick={() => applyPair(font)}
                          aria-pressed={active}
                        >
                          {active ? 'In use' : 'Use this pair'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="fpr-delivery">
            <div className="fpr-section-head fpr-section-head--sub">
              <div>
                <h2>Prepare the handoff</h2>
                <p>One import and one block of CSS — both families at the weights you chose.</p>
              </div>
            </div>
            <div className="fpr-code-actions">
              <button type="button" className="fpr-copy-all" onClick={copyImport}>Copy font import</button>
              <button type="button" className="fpr-copy-primary" onClick={() => onCopy?.(cssExport)}>Copy CSS</button>
            </div>
            <pre id="fpr-export" className="fpr-export" tabIndex="0"><code>{cssExport}</code></pre>

            {/* Copying is free; keeping is the paid step. Founder decision
                2026-09-05: browsing is free, saving is Pro — and the gate is
                the shared project slot the colour tools already use, not a
                second scheme. Everything above this line works signed out. */}
            <div className="fpr-keep">
              <SaveTypeSystem
                gate="type-save-font-pair"
                label="this pairing"
                summary={headingFont && bodyFont
                  ? `${headingFont.family} ${headingW} for headings, ${bodyFont.family} ${bodyW} for body.`
                  : ''}
                toast={toast}
              />
              <p className="fpr-keep-note">
                Keeps both families and their weights with the project’s palette and type scale.
              </p>
            </div>
          </div>
        </section>
      </div>

      <nav className="fpr-more" aria-label="More typography tools">
        <div>
          <span className="fpr-more-kicker">Continue your typography system</span>
          <strong>Two faces chosen. Now give them sizes that hold up.</strong>
        </div>
        <div className="fpr-more-links">
          <NavLink to="/create/type-scale" className="fpr-more-link">Build a type scale &rarr;</NavLink>
          <NavLink to="/create/font-gallery" className="fpr-more-link">Browse the font gallery &rarr;</NavLink>
          <NavLink to="/create/palette" className="fpr-more-link">Build a colour palette &rarr;</NavLink>
        </div>
      </nav>

      {/* Step 2 of the guided UI-kit flow (colour → fonts → type scale → icons).
          `fonts` is the id in UIKIT_STEPS; the old page passed `fontpairs`,
          which matched nothing and made this look like the last step. */}
      <UIKitGuide step="fonts" />
    </div>
  )
}
