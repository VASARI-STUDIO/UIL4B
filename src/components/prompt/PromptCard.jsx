import { parseTags } from '../../utils/promptStore'
import { previewDuration } from '../../utils/promptPreview'
import UserName from '../UserName'

// A single prompt tile in the gallery. Presentational — all behaviour is wired
// through props by the parent library.
//
// THE CARD SHOWS THE PROMPT. It used to show a title and three tags, which is a
// filename rather than an artefact; the founder asked the library to "preivew
// the prompts" and pointed at motionsites.com, whose cards play a scrolling
// preview of the real page behind them with the title beneath. See
// utils/promptPreview for why the scroll here plays on hover and focus rather
// than continuously, and for how one pass is timed.
//
// Mobbin drove the layout:
//   WRITER's Prompt Library — mobbin.com/screens/d578541a-ee45-454e-8be8-fed36ba392af
//     is the same product decision already shipped by someone else: each row IS
//     the prompt's own text, running, with the title above it — not a summary of
//     the prompt and not a description of what it does.
//   Sana AI's workflow grid — mobbin.com/screens/ba9690ab-bc14-42ba-bc12-4d96fadde788
//     is the grid form of it: the real prompt text clipped to a few lines, then
//     the row's metadata underneath. Artefact first, caption second — which is
//     also motionsites' own ordering, and is the one used here.
//
// ── THIS COMPONENT HAS NO LOCKED STATE, AND THAT IS THE DESIGN ──────────────
//
// It matters more now than it did, because this card renders `p.text` in full.
// A locked prompt never reaches it: PromptLibrary splits the library through
// utils/lockedPreview BEFORE search and sort can see it, so a locked row is
// replaced by a preview object with no `text` key at all and is drawn by
// LockedPromptCard instead. That preview is not a blurred or clipped version of
// this card — a CSS blur leaves the real text in the DOM, one toggle away from
// being no gate — it is a different card with nothing in it.
//
// The branch that used to live here is worth remembering rather than
// rediscovering. It dimmed the card, removed it from the tab order and printed
// "Pro only" under it — while rendering `p.title || p.text.slice(0, 60)` into
// the title AND the aria-label. For a prompt the title IS the product, so the
// card announced the thing it was charging for. Any future lock state on this
// surface belongs in LockedTease, which is structurally incapable of holding a
// payload, not here.
export default function PromptCard({ p, onOpen, isCommunity, isSaved }) {
  const pTags = parseTags(p.tags)
  const text = p.text || ''
  const name = p.title || text.slice(0, 60)

  const open = () => onOpen(p)

  return (
    <div
      className="pl-card no-img"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      role="button"
      tabIndex={0}
      aria-label={`Open prompt: ${name}`}
      style={{ '--pl-preview-dur': `${previewDuration(text)}s` }}
    >
      {/* THE ARTEFACT. `aria-hidden` because this sits inside a `role="button"`
          that already carries an explicit accessible name: without it, assistive
          technology falling back to element contents would read a
          two-thousand-character prompt, cut off mid-sentence, as the name of a
          button. Nothing is withheld by hiding it — the same text is one
          activation away in the modal as real selectable text with a copy
          action, which is where a screen-reader user wants to meet it.

          `data-preview` is the STABLE hook for tests. The class is a styling
          hook and CSS is free to rename it; what a gate test needs to assert is
          WHICH PROMPT'S TEXT IS ON THIS CARD, and that is this element. */}
      <div className="pl-card-preview" data-preview aria-hidden="true">
        <p className="pl-card-preview-text">{text}</p>
      </div>

      <div className="pl-card-text-hero">
        <div className="pl-card-title">{name}</div>
        {pTags.length > 0 && (
          <div className="pl-card-tags">
            {pTags.slice(0, 3).map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            {pTags.length > 3 && <span className="pl-tag">+{pTags.length - 3}</span>}
          </div>
        )}
        {isCommunity && (
          <div className="pl-card-author">
            <UserName name={p.author} ownerId={p.ownerId} bold={!!p.ownerId} />
            {p.saves > 0 && <span className="pl-card-saves">{p.saves} saves</span>}
            {isSaved && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            )}
          </div>
        )}
        {!isCommunity && <div className="pl-card-date-inline">{p.date}</div>}
      </div>
    </div>
  )
}
