import { useId, useState } from 'react'
import FontBrowseDialog from './FontBrowseDialog'
import { fontStack, headingWeight } from '../utils/googleFonts'
import { specimenSizeCqw } from '../utils/fontGallery'

// Pick one family out of the catalogue. Shared by the Type Scale and Font Pair
// tools so choosing a typeface works identically in both.
//
// This was a native <select> fed by a search box. The reasoning behind that was
// sound as far as it went — a 1,700-entry native listbox gives type-ahead,
// arrow keys, Home/End, the mobile picker and screen-reader support for free —
// but it has one fault no amount of polish reaches: A <SELECT> RENDERS EVERY
// OPTION IN THE UI FONT. Choosing a typeface meant recognising a name in a
// list of names. You could not see a single one of the things you were
// choosing between, in a tool whose entire subject is how type looks.
//
// That is the founder's report — selection "expects the user to remember and
// type font names" — and it is structural, not a discoverability problem.
//
// So the control is now the specimen. The trigger shows the CURRENT family
// rendered in itself, and opens a browsable dialog of specimen cards
// (FontBrowseDialog). The keyboard and assistive-technology support the
// <select> gave for free is re-earned explicitly there: focus trap, Escape,
// focus restored to this trigger, and every card a real button.

export default function FontPicker({
  label,
  // The SLOT this picker fills — 'heading' or nothing. Passed to the dossier
  // so its Examples tab can lead with headline scenes rather than interface
  // ones. Omitted everywhere else, which leaves those callers unchanged.
  intent,
  fonts,
  value,
  onChange,
  hint,
  disabled = false,
}) {
  const uid = useId()
  const [browsing, setBrowsing] = useState(false)

  const current = value ? fonts.find(f => f.family === value.family) : null

  return (
    <div className="typ-picker">
      <span className="seg-label" id={`${uid}-label`}>{label}</span>
      <button
        type="button"
        className="typ-picker-trigger"
        disabled={disabled || !fonts.length}
        aria-labelledby={`${uid}-label ${uid}-value`}
        aria-haspopup="dialog"
        onClick={() => setBrowsing(true)}
      >
        {/* The specimen is the FAMILY NAME set in the family
            (#font-picker-shows-handgloves), for the same reason the browse tiles
            are: "Handgloves" is the same ten letters on every face and tells you
            nothing about which one you picked. Still decorative, so still
            aria-hidden - the accessible name carries the family already, and
            announcing it twice helps nobody.

            ONE LINE HERE, TWO IN THE DIALOG, and the difference is deliberate.
            This face is a fixed 34px row and .typ-picker-name repeats the full
            name in the UI font DIRECTLY BENEATH IT, so a long name clipped here
            loses no information. In the browse grid the specimen IS the
            comparison surface, so it may never be trimmed - see .fbd-sample. */}
        <span
          className="typ-picker-face"
          aria-hidden="true"
          ref={(el) => {
            if (!el || !current) return
            el.style.setProperty('--fbd-ff', fontStack(current))
            el.style.setProperty('--fbd-fw', String(headingWeight(current)))
            el.style.setProperty('--fbd-cap', String(specimenSizeCqw(current.family, 1)))
          }}
        >
          {current ? current.family : '—'}
        </span>
        <span className="typ-picker-id">
          <span className="typ-picker-name" id={`${uid}-value`}>
            {current ? current.family : 'Choose a family…'}
          </span>
          {current && (
            <span className="typ-picker-meta">
              {current.category} · {current.variants.length} weight{current.variants.length === 1 ? '' : 's'}
            </span>
          )}
        </span>
        <span className="typ-picker-cue" aria-hidden="true">Browse</span>
      </button>

      {hint && <p className="typ-hint">{hint}</p>}

      {browsing && (
        <FontBrowseDialog
          title={label}
          intent={intent}
          fonts={fonts}
          value={current}
          onPick={onChange}
          onClose={() => setBrowsing(false)}
        />
      )}
    </div>
  )
}
