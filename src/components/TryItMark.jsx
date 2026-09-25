import '../styles/pages/spectrum-chrome.css'

// The handwritten "give it a try" annotation — `UIL4B - Spectrum.dc.html`
// lines 269-275, with its responsive rule at 166-170.
//
// The design draws it as live Caveat text at 27px, rotated -5°, over a 150x52 stroked arrow that
// sweeps right into the search bar, the pair hanging 186px to the LEFT of the
// 660px bar and 30px above it. Below 1180px there is no margin to hang it in,
// and the design's answer is not to hide it: it drops into the flow ABOVE the
// bar, left-aligned, with the arrow shrunk to 104x34 and turned 12° so it
// points down into the field. That is what this renders, at every width.
//
// Caveat is the `--hand` token, self-hosted and deliberately not preloaded
// (global.css line 62): an aside must not compete with the hero's faces for the
// first paint. The mark is aria-hidden — it points at the bar, and the bar has
// its own label.
export default function TryItMark() {
  return (
    <span className="tim" aria-hidden="true">
      <span className="tim-word">give it a try</span>
      <svg
        className="tim-arrow"
        viewBox="0 0 150 52"
        width="150"
        height="52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="presentation"
      >
        <path d="M6 6C10 27 34 43 128 42" />
        <path d="M118 35l11 7-11 7" />
      </svg>
    </span>
  )
}
