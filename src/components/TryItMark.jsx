// The handwritten "give it a try" annotation.
//
// Founder, 2026-09-05: "use the mobbin MCP to look at sites like buffer for
// slight aleration of the hero and intro to tool section on the main homepage i
// like the Give it try drawn text".
//
// WHY A DRAWN MARK EARNS ITS PLACE HERE, AND WHERE THE PATTERN COMES FROM.
//
// Cake Equity's footer CTA is the exact construction: a hand-drawn arrow curving
// back from a script line ("No credit card required") into the button the line
// is about. The mark is not ornament — it is a person pointing at a control and
// telling you one true thing about it.
// https://mobbin.com/sites/sections/e65a6cfc-57c6-4adc-a49d-ab12d80d11b8
//
// Harvest annotates its own chart the same way, hand-printed labels with drawn
// arrows landing on the segment each one names, which is where the lettering
// style below comes from — printed, not cursive, because a stroke-drawn cursive
// at 13px reads as a squiggle and this has to be legible at a glance.
// https://mobbin.com/sites/sections/98447447-a785-4f66-abc9-fb6c9f0461a6
//
// THE POINTING IS THE WHOLE THING. A drawn phrase floating in the hero would be
// decoration, which is the failure the anti-slop bar names — "icons or abstract
// shapes fill space without strengthening recognition". So this is anchored to
// the ONE element in the hero a visitor can operate before signing up: the
// command bar, which queries the real tool registry through the same index as
// the ⌘K palette. The arrow lands on the `>` prompt, where you type — not on the
// ⌘K badge at the other end, and not on the sign-up button, which is a link out
// rather than something you can try.
//
// The letters were STROKES until 2026-09-18. Both self-hosted families were
// sans, and a third webfont for one aside would have cost a request and a FOUT
// to say something no reader needs. Spectrum paid that cost on purpose: Caveat
// ships in public/fonts as the `--hand` token — one static 500 weight, added
// beside Geist and Geist Mono for this mark and asked for nowhere else. The
// paths below were an imitation of a face the product now serves, so they go,
// and the token is read rather than the family named again.
//
// Caveat is deliberately NOT preloaded (index.html): an aside must not compete
// with the hero's own faces for the first-paint budget. So the phrase is pinned
// with `textLength` to the 158 viewBox units the drawn letters occupied,
// whether Caveat has arrived or the fallback cursive is still standing in — and
// `lengthAdjust="spacing"` moves the tracking and never the glyph shapes, so
// nothing distorts and the swap cannot resize the mark or shift the margin it
// hangs in. 40px against that 158 is the size Caveat sets the phrase at
// naturally, measured rather than guessed, so the pinning is a guard and not a
// squeeze. The arrow stays drawn, because an arrow is not a letter.
//
// aria-hidden, deliberately: the input it points at already carries its own
// accessible name ("Search every tool", the sr-only label in Home.jsx), so a
// screen reader would hear the same affordance twice — once as a labelled search
// box and once as a stray "give it a try". The mark adds emphasis for a sighted
// reader and no information for anyone, which is exactly what should be hidden.
//
// It is also purely additive: it renders beside the command bar and changes no
// headline, no button, no layout and no copy. The hero shape is settled —
// founder, 2026-09-07, retiring the ?hero=a|b|c exploration in favour of the V2
// hero — and that hero keeps the command bar, so the mark still has the control
// it points at. He said he likes the mark; it stays.
export default function TryItMark() {
  return (
    <span className="tim" aria-hidden="true">
      <svg className="tim-svg" viewBox="0 0 196 132" fill="none" role="presentation">
        <text
          className="tim-ink"
          x="12"
          y="42"
          textLength="158"
          lengthAdjust="spacing"
          fill="currentColor"
          style={{ fontFamily: 'var(--hand)', fontSize: 40, fontWeight: 500 }}
        >
          give it a try
        </text>
        {/* The arrow. One unbroken sweep from under the words, bellying down and
            to the right, landing on the left end of the bar — the prompt end,
            where you type, rather than the ⌘K badge at the far end. Drawn as a
            single stroke plus a two-stroke head so it reads as one motion. */}
        <g
          className="tim-arrow"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M46 58C52 92 92 108 186 94" />
          <path d="M172 86l14 8" />
          <path d="M186 94l-13 11" />
        </g>
      </svg>
    </span>
  )
}
