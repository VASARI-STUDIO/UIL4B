import { parseTags } from '../../utils/promptStore'
import { previewDuration } from '../../utils/promptPreview'
import { hasPromptPreview, promptPosterSrc } from '../../data/promptPreviewAssets'
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

  // ── THE OUTPUT, WHERE THERE IS ONE ────────────────────────────────────────
  //
  // The founder, 2026-09-15: "instead of showing a code snippet we can show the
  // actual output in a real preview style."
  //
  // So a prompt that has had its output BUILT shows the output. The rest keep
  // the scrolling text, which is not a fallback so much as the right answer for
  // them: a user-submitted prompt has no output to show, and a card that went
  // blank for it would be worse than a card that shows the prompt.
  //
  // WHY A STILL AND NOT THE LIVE PAGE. Twenty live iframes in one grid is
  // twenty documents, twenty style recalcs and — on c-16 — twenty canvases
  // running a particle simulation. The running page is one click away in the
  // modal, which is the founder's "even better" and is how component libraries
  // do it. See scripts/prompt-posters.mjs for how the still is captured with
  // motion reduced, so the poster is the page's FINISHED state rather than a
  // frame caught mid-entrance.
  const showsOutput = isCommunity && hasPromptPreview(p.id)

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
      {showsOutput ? (
        // `data-preview` stays on whichever element IS the preview, because
        // that is what the gate tests assert against — they ask "which prompt's
        // artefact is on this card", and the answer moved, it did not vanish.
        //
        // aria-hidden for the same reason the text version carries it: the card
        // already has an explicit accessible name, and the alt text of a
        // decorative screenshot inside a role="button" would be read as part of
        // that name. The output is not withheld — it is one activation away,
        // running, in the modal.
        <div className="pl-card-preview pl-card-shot" data-preview data-preview-kind="output" aria-hidden="true">
          <img
            src={promptPosterSrc(p.id)}
            alt=""
            loading="lazy"
            decoding="async"
            width="960"
            height="600"
          />
        </div>
      ) : (
        <div className="pl-card-preview" data-preview data-preview-kind="text" aria-hidden="true">
          <p className="pl-card-preview-text">{text}</p>
        </div>
      )}

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
