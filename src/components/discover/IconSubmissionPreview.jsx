import { iconPreviewDataUri } from '../../utils/iconSubmission'

// THE ONE PLACE SUBMITTED ICON MARKUP IS RENDERED, ANYWHERE IN THE PRODUCT.
//
// It exists as a component rather than as ten lines copied into Community.jsx
// and CommunityQueue.jsx because the decision it encodes is a SECURITY decision,
// and a security decision with two copies has one copy that will be forgotten:
//
//   Submitted markup is NEVER inlined. It is always the `src` of an <img>.
//
// An <img> is a replaced element — script inside its source does not execute and
// external subresources are not fetched. That is the browser's rule, not ours,
// which is why it is the primary defence rather than the regex screen in
// utils/iconSubmission.js. Both are on, and this one is the load-bearing half.
// The same reasoning, in the same words, is in utils/brandLogo.js DECISION 1 for
// the user's uploaded logo; this is that decision applied to a second artefact.
//
// ── WHY TWO TILES, AND WHY THEIR COLOURS ARE NOT TOKENS ─────────────────────
//
// Mobbin, Discord "Upload a file" (sticker submission): the artwork is previewed
// on a dark tile AND a light tile, side by side, because Discord has two themes
// and a sticker has to survive both.
// https://mobbin.com/screens/41b172d2-993a-4a77-8e44-39f3fdbc2582
//
// UIL4B has the identical problem and it is sharper for icons, because almost
// every icon worth submitting is drawn in `currentColor` — Lucide, Tabler,
// Phosphor and this app's own NavIcon all are. So the question a submitter and a
// reviewer both need answered is "does this read on BOTH grounds", and a preview
// painted in the viewer's current theme answers it for one.
//
// Which is exactly why these four values are literals and not `var(--card)` /
// `var(--t0)`: the tiles must NOT follow the theme. They are a fixed test rig
// showing the same artwork against the two grounds the product actually has.
// The values are the design's own — SPECTRUM-BRIEF §3, light card #FFFFFF on ink
// #121418, dark ground #0B0C0E on ink #EFEEEA — so they are the real pair, not a
// guessed one. If the design's grounds change, these change with them.
const GROUNDS = [
  { id: 'light', ground: '#FFFFFF', ink: '#121418' },
  { id: 'dark', ground: '#0B0C0E', ink: '#EFEEEA' },
]

/**
 * `size` is the side of each tile in px. The default suits a list row; the
 * submission form passes a larger one.
 *
 * The pair is ONE image to a screen reader: it is the same artwork twice, and
 * the row or card beside it already carries the name. Announcing it twice — or
 * announcing "on light" and "on dark" as though they were two icons — would be
 * the decorative-element-announced defect the review bar names.
 */
export default function IconSubmissionPreview({ svg, name, size = 34 }) {
  if (!svg) return null
  const label = name ? `${name}, shown on a light and a dark ground` : 'Icon shown on a light and a dark ground'
  return (
    <span
      className="ch-iconprev"
      role="img"
      aria-label={label}
      style={{ display: 'inline-flex', flex: '0 0 auto', gap: 2 }}
    >
      {GROUNDS.map(g => (
        <span
          key={g.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            background: g.ground,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-s)',
            overflow: 'hidden',
          }}
        >
          <img
            src={iconPreviewDataUri(svg, g.ink)}
            alt=""
            aria-hidden="true"
            width={Math.round(size * 0.68)}
            height={Math.round(size * 0.68)}
            // A submitted file is the one thing on the page that must never be
            // allowed to lay the page out. Both axes are fixed and the artwork
            // is fitted inside them, so a 4000-unit viewBox cannot push the
            // reviewer's Approve button off screen.
            style={{ width: Math.round(size * 0.68), height: Math.round(size * 0.68), objectFit: 'contain' }}
            draggable={false}
          />
        </span>
      ))}
    </span>
  )
}
