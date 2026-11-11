// The shared masthead for every Library browse surface (palettes, gradients,
// icons + emoji, …). One implementation, one CSS block (`dgh-` in global.css) —
// the pages pass in only what differs: eyebrow, title, description, the numeric
// mark or a control cluster, and an optional inline action.
//
// It is deliberately presentational: no data, no state, no router coupling
// beyond whatever `action` / `aside` node the caller hands it. That keeps it
// usable from any browse page without dragging that page's concerns in.
//
// `descriptionShort` is optional. When a page passes it, both lines are real
// text: the short one is what a phone shows and the full one is what 768px and
// up shows, swapped by CSS (a media query, not script), so neither width
// flashes the other or shifts the layout. Pages that omit it render the one
// paragraph they always did.
//
// THE EYEBROW AND THE COUNTER ARE GONE. Both motifs read as AI-generated on the
// Font Gallery masthead, so they are removed from every header that matches.
// This one matched twice:
//
//   • `eyebrow` rendered a taxonomy path (“Discover / Colour”) in letter-spaced
//     mono caps directly above an <h1> that said the same thing. No browse
//     catalogue on Mobbin carries one — GoDaddy’s Font Library opens on a real
//     back control plus the title; Hume AI’s and ElevenLabs’ voice libraries
//     open on the title and their tabs. Hierarchy is a control you can press,
//     not a label you cannot.
//
//   • `mark` was the one-up cousin of the Font Gallery’s three-up figure strip:
//     a 92px display numeral counting the catalogue. It was ALREADY
//     `aria-hidden` and ALREADY dropped below 720px, and the old comment here
//     said losing it “costs nothing”. A figure that costs nothing to lose on a
//     phone costs nothing to lose on a desktop. The live, announced count still
//     exists where it does work — DiscoverResultHead’s aria-live region.
//
// `aside` STAYS and is unchanged: it holds real controls (the Icon/Emoji
// surface puts its library tablist there), so it is never aria-hidden and never
// dropped at any width. That was always the load-bearing half of the old
// mark/aside distinction, and removing `mark` is what makes it plain.
export default function DiscoverGalleryHero({
  title,
  description,
  descriptionShort,
  action,
  aside,
}) {
  return (
    <header className={`dgh-hero${aside ? ' dgh-hero--controls' : ''}`}>
      <div className="dgh-copy">
        <h1>{title}</h1>
        {description && <p className={descriptionShort ? 'dgh-desc-full' : undefined}>{description}</p>}
        {description && descriptionShort && <p className="dgh-desc-short">{descriptionShort}</p>}
        {action && <div className="dgh-action">{action}</div>}
      </div>
      {aside && <div className="dgh-aside">{aside}</div>}
    </header>
  )
}
