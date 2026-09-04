import { useProModal } from '../../contexts/ProModalContext'

// The locked end of a library: a few placeholder rows, then one call to action.
//
// These components are deliberately incapable of showing a locked item's real
// values — they accept a preview from utils/lockedPreview (id, label, slots)
// and have nowhere to put a payload. See that module for why a CSS blur over
// real values is not a paywall.
//
// ── References ──────────────────────────────────────────────────────────────
//
// Mobbin's own paywall (mobbin.com/screens/f79ec3da-191c-4020-8c1b-8f9f7de2c001)
//   drove two decisions. Its locked screens are rasterised past the point of
//   legibility — there is nothing textual to lift — and its flow tree keeps the
//   COUNTS beside each locked group. Counts are the honest tease: the headline
//   is "Access all 511,089 screens", not half a million blurred thumbnails.
//   Hence `slots` shapes and a real remaining count in the CTA.
//
// Zapier Interfaces (mobbin.com/screens/4416ef5f-67ca-4600-9ab5-b44d4ce22cba)
//   drove the card itself. Its locked component tiles do not blur the preview,
//   they REPLACE it: "Embed is pro", one line of what it does, one Upgrade
//   button. The locked card is simply a different card. That is the pattern
//   here — a placeholder, not an obscured original.
//
// Savee (mobbin.com/screens/b0be19d3-a34b-4c5f-8930-73ca3bdbd101) drove the
//   placement: the wall sits AFTER the teased content, full width, so the
//   reading order is "what you have → a glimpse of more → how to get it".
//
// Uxcel (mobbin.com/screens/1b347563-d7e8-41ad-8d54-55148c4f07aa) is the
//   counter-example. Its wall carries "25% OFF" and "over 500K+ learners" —
//   invented urgency and social proof. This product has never had customers,
//   testimonials or metrics, so the CTA states what Pro opens and the true
//   remaining count, and nothing else.

// Padlock. Decorative everywhere it is used — the surrounding copy already says
// the row is locked, so announcing it again is noise.
function LockGlyph() {
  return (
    <svg className="lockt-glyph" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// One placeholder standing in for a locked palette.
//
// Non-interactive by construction: no button, no link, no tabindex. There is
// nothing here to copy, open or hand off, so a control would be a control that
// does nothing — and the CTA below is the one focus stop this group needs.
//
// `slots` draws that many neutral bands from the surface tokens. They carry no
// colour information about the palette they stand for; every locked card in the
// library draws the identical ramp, which is the point.
export function LockedPaletteCard({ preview }) {
  const slots = Math.max(1, Number(preview.slots) || 1)
  return (
    <div className="lockt-card">
      <div className="lockt-stripes" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => (
          <span key={i} className="lockt-stripe" data-step={i % 4} />
        ))}
        <span className="lockt-badge"><LockGlyph /></span>
      </div>
      <div className="lockt-foot">
        <span className="lockt-name">{preview.label}</span>
        <span className="lockt-tag">Pro</span>
      </div>
    </div>
  )
}

// The same placeholder in the Palette Builder's gallery popup, where the brand
// list is a row rather than a card. Non-interactive for the same reason: the
// real row's only action is "load this brand", which is exactly what is being
// withheld, so a disabled-looking button that raises a modal would be a second
// gate competing with the one below.
export function LockedPaletteRow({ preview }) {
  const slots = Math.max(1, Number(preview.slots) || 1)
  return (
    <div className="plb-varrow lockt-row">
      <span className="plb-strip lockt-rowstrip" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => (
          <span key={i} className="plb-strip-c lockt-rowcell" data-step={i % 4} />
        ))}
      </span>
      <span className="plb-varrow-name">{preview.label}</span>
      <span className="lockt-tag"><LockGlyph /> Pro</span>
    </div>
  )
}

// One placeholder standing in for a locked prompt.
//
// A prompt's TITLE is the idea being sold, so unlike a brand palette no label is
// passed and none is rendered. What is left is the tag set — already public, it
// is the library's own filter facet — and a skeleton sized by `slots`.
export function LockedPromptCard({ preview }) {
  const slots = Math.max(1, Number(preview.slots) || 1)
  return (
    <div className="lockt-card lockt-card--prompt">
      <div className="lockt-lines" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => (
          <span key={i} className="lockt-line" data-step={i % 3} />
        ))}
      </div>
      <div className="lockt-foot">
        {preview.tags?.length
          ? <span className="lockt-tags">{preview.tags.slice(0, 2).map(t => <span key={t} className="lockt-tagchip">{t}</span>)}</span>
          : <span className="lockt-name lockt-name--muted">Community prompt</span>}
        <span className="lockt-tag"><LockGlyph /> Pro</span>
      </div>
    </div>
  )
}

// The wall. One heading, one honest sentence, one button.
//
// `gate` is required and is passed straight to openProModal, which is where
// trackUpgradeGate fires — so this wall is measured as itself rather than
// falling back to the modal title.
export function LockedTeaseCta({ gate, heading, body, action, modal }) {
  const { openProModal } = useProModal()
  return (
    <div className="lockt-cta">
      <div className="lockt-cta-copy">
        <p className="lockt-cta-head">{heading}</p>
        <p className="lockt-cta-body">{body}</p>
      </div>
      <button
        type="button"
        className="btn btn-accent lockt-cta-btn"
        onClick={() => openProModal({ gate, ...modal })}
      >
        {action}
      </button>
    </div>
  )
}
