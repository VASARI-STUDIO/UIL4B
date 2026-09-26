// The word-by-word reveal — Spectrum's signature type moment.
//
// Each word gets a clipping wrapper and an inner span that starts pushed a full
// line-height BELOW the clip and slides up to zero. Staggered, that reads as a
// line of type being set rather than as a block fading in, which is the whole
// point: this is a design-tools product and the hero should look like type doing
// something only type can do.
//
// ── WHY THE SPLIT HAPPENS HERE AND NOT IN CSS ───────────────────────────────
// There is no CSS that can clip and offset individual words of a text node, so
// the words have to become elements. Splitting on whitespace is safe for these
// four headlines because every one of them is a fixed English sentence from
// positioning.js or the design source — no interpolation, no user content, no
// locale where whitespace is not the word boundary. If a headline ever becomes
// translatable this component is the thing that has to change, not the caller.
//
// ── ACCESSIBILITY: THE SENTENCE MUST SURVIVE THE SPLIT ──────────────────────
// Wrapping every word in two spans turns one accessible name into N, and some
// screen readers will then read the headline one word per line with a pause.
// So the visible split is `aria-hidden` and the real sentence is carried once in
// a visually-hidden span. That is the arrangement the repo already uses for the
// "(opens in a new tab)" affordance — `.sr-only` in global.css — rather than a
// second mechanism.
//
// ── AND IT MUST BE READABLE WITHOUT THE MOTION EVER RUNNING ─────────────────
// `transform: translateY(112%)` inside `overflow: hidden` is INVISIBLE TEXT
// until something moves it. That is the exact failure `useReveal`'s own comment
// records costing /learn 1,659 characters of unreadable copy: a reveal whose
// resting state is hidden, with nothing guaranteeing the reveal runs.
//
// So the resting state here is the FINAL state. `.sp-w` carries no transform of
// its own; spectrum.css puts the movement in `@keyframes sp-word-up`, which only
// exists under an ancestor's `.is-in`. Three consequences, all of them the
// point: the prerendered shell (no JS) reads correctly, a motion-off visitor
// reads correctly, and a runtime with no IntersectionObserver reads correctly.
// The reduced-motion companions in spectrum.css then remove the animation
// outright, and `tests/unit/spectrum-structure.test.js` fails the build if
// either the visible resting state or those companions is lost.
//
// The delay is `--fl-stagger` (55ms) from global.css — the same cascade step the
// rest of the app uses, and the same 55ms the design source hard-codes into
// every `transition-delay` in its hero.

import { Fragment } from 'react'


// A word, or — with `joinMark` — the whole marked run as ONE word. The hero's
// design writes "one place." as a single revealed unit (`<span data-w><em>one
// place</em>.</span>`), so the accent run can never break across two lines and
// rises as one piece; its full stop stays in the ink colour, outside the
// accent. `tail` is that trailing punctuation.
function Word({ text, index, mark, tail }) {
  return (
    <span className="sp-wm" data-sp-wm="">
      <span
        className={mark ? 'sp-w sp-w--mark' : 'sp-w'}
        data-sp-w=""
        style={{ '--sp-wi': index }}
      >
        {text}
        {tail ? <span className="sp-w-tail">{tail}</span> : null}
      </span>
    </span>
  )
}

/**
 * @param {string} text   the sentence, split on whitespace
 * @param {string} [mark] a contiguous run inside `text` to paint in the accent.
 *                        Matched as whole words, so it can never highlight half
 *                        of one. Unmatched, nothing is marked and the headline
 *                        still renders.
 * @param {boolean} [joinMark] render the marked run as one word, with its
 *                        trailing punctuation outside the accent (the hero).
 */
// Always a <span>. The headline element belongs to the section that owns the
// heading level, not to the thing that splits words.
export default function SpectrumWords({ text, mark, joinMark = false, className = '' }) {
  const words = text.split(/\s+/).filter(Boolean)
  const markWords = mark ? mark.split(/\s+/).filter(Boolean) : []

  let markStart = -1
  if (markWords.length) {
    for (let i = 0; i + markWords.length <= words.length; i += 1) {
      // Punctuation is stripped from the END of the last word only: "one place"
      // has to match "…place." in a sentence that ends on it.
      const window = words.slice(i, i + markWords.length)
      const ok = window.every((w, j) => {
        const isLast = j === markWords.length - 1
        const cleaned = isLast ? w.replace(/[.,;:!?]+$/, '') : w
        return cleaned === markWords[j]
      })
      if (ok) { markStart = i; break }
    }
  }

  // The render list: one item per word, except that a joined mark is one item.
  const items = []
  for (let i = 0; i < words.length; i += 1) {
    const inMark = markStart > -1 && i >= markStart && i < markStart + markWords.length
    if (inMark && joinMark) {
      const run = words.slice(markStart, markStart + markWords.length).join(' ')
      const tail = /[.,;:!?]+$/.exec(run)?.[0] || ''
      items.push({ text: tail ? run.slice(0, -tail.length) : run, mark: true, tail })
      i = markStart + markWords.length - 1
    } else {
      items.push({ text: words[i], mark: inMark, tail: '' })
    }
  }

  return (
    <span className={`sp-words ${className}`.trim()}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="sp-words-visual">
        {items.map((item, i) => (
          // THE SPACE IS A REAL TEXT NODE, AND IT HAS TO BE. `.sp-wm` is an
          // inline-block with overflow:hidden, so two wrappers with nothing
          // between them render "Buildandexport". Outside the clip, so the gap
          // does not ride up with the word during the reveal.
          <Fragment key={`${item.text}-${i}`}>
            <Word text={item.text} index={i} mark={item.mark} tail={item.tail} />
            {i < items.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </span>
  )
}
