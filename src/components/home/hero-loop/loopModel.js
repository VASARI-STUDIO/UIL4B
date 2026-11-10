// THE HERO LOOP'S TIMELINE TABLES, from a size's config. Pure, so it runs
// outside the browser.
//
// A size supplies a config; buildLoopModel turns it into the tables that
// useLoop runs.
//
// config:
//   timeline   [[scene, beat, ms, x, y, press], ...]  the last row is the seam
//              that rewinds to the opening frame; press 1 is a click, 2 or 3 a
//              held drag; a row with ms 0 lasts as long as the cursor move.
//   chapters   [{ name, first, end }]  beat names (or indices): `first` is where
//              a jump lands, `end` the finished frame. Listed in timeline order.
//   extraSteps [{ name, beat }]  Next stops that are not chapters.
//   settle     index of the chapter shown finished under reduced motion.
//   moveK      scales cursor-travel time (a size's travel differs); default 1.
//   flat       true: beat length is the row's ms as written (no cursor travel).

export function buildLoopModel(config) {
  const { timeline: TL, chapters, extraSteps = [], settle = chapters.length - 1, moveK = 1, flat = false } = config
  const LAST = TL.length - 1
  const IDX = Object.fromEntries(TL.map((t, k) => [t[1], k]))
  const at = (v) => (typeof v === 'number' ? v : IDX[v])
  const FIRST = chapters.map((c) => at(c.first))
  const END = chapters.map((c) => at(c.end))
  const CHAP_OF = TL.map((t, k) => (k === LAST ? 0 : FIRST.reduce((n, f, i) => (k >= f ? i : n), 0)))
  const steps = [
    ...chapters.slice(1).map((c, i) => ({ name: c.name, k: FIRST[i + 1] })),
    ...extraSteps.map((s) => ({ name: s.name, k: at(s.beat) })),
  ].sort((a, b) => a.k - b.k)
  const nextStep = (k) => steps.find((st) => st.k > (k === LAST ? 0 : k)) || null
  // Cursor travel time grows with distance; a short settle before a click, none after.
  const travel = (k) => {
    const p = TL[(k + LAST) % TL.length]
    return Math.hypot(TL[k][3] - p[3], TL[k][4] - p[4])
  }
  const moveMs = (k) => Math.round(Math.min(900, (320 + travel(k) * 0.6) * moveK))
  const DUR = TL.map((t, k) => {
    if (flat || travel(k) < 8 || t[5] === 2) return t[2]
    return Math.max(t[2], moveMs(k) + (TL[k + 1] && TL[k + 1][5] ? 120 : 100))
  })
  const CH_LEN = chapters.map((c, i) => DUR.reduce((s, d, k) => s + (k !== LAST && CHAP_OF[k] === i ? d : 0), 0))
  const CUM = DUR.map((d, k) => (k === LAST ? 0 : DUR.slice(0, k).reduce((s, v, j) => s + (CHAP_OF[j] === CHAP_OF[k] ? v : 0), 0)))
  return { TL, LAST, IDX, FIRST, END, CHAP_OF, chapters, nextStep, travel, moveMs, DUR, CH_LEN, CUM, settleK: END[settle] }
}
