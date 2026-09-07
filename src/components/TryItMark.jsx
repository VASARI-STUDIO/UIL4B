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
// The letters are STROKES, not a font. Two families are self-hosted (Manrope and
// JetBrains Mono) and adding a third for eleven characters would cost a webfont
// request and a FOUT for an aside. Drawing them also means the mark cannot fall
// back to something generic on a machine that lacks the face.
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
        <g
          className="tim-ink"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* give */}
          <path d="M20 30c-4-3-10-1-11 4s3 9 8 8c3-1 4-4 4-7v-7" />
          <path d="M21 28v20c0 6-4 9-9 8" />
          <path d="M30 42V29" />
          <path d="M30 22v.6" />
          <path d="M37 28l5 14 5-14" />
          <path d="M52 36c5-1 8-1 9-3 0-3-3-5-6-4-4 1-6 6-4 10 2 3 6 3 9 1" />
          {/* it */}
          <path d="M75 42V29" />
          <path d="M75 22v.6" />
          <path d="M83 19v19c0 4 3 5 6 3" />
          <path d="M78 28h10" />
          {/* a */}
          <path d="M112 31c-3-3-8-2-9 3s1 9 5 9c3 0 4-3 4-6v-8" />
          <path d="M112 29v13" />
          {/* try */}
          <path d="M131 19v19c0 4 3 5 6 3" />
          <path d="M126 28h10" />
          <path d="M142 42V29c2-2 5-3 8-2" />
          <path d="M155 29l5 13 5-13" />
          <path d="M165 29l-8 22c-2 5-6 6-10 4" />
        </g>
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
