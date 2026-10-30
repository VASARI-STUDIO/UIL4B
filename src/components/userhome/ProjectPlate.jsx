// A project's own colours, drawn as a plate in the frame /tools uses for its tool drawings
// (.spt-art): one column per colour, painted as saved. It is decoration (aria-hidden); the
// words around it carry the meaning, including "Colour not set" when there are no colours.
//
// With no colours the frame is drawn empty. Never the default palette: that would read as the
// person's own.
//
// `thumb` is the row size: a 160 x 100 canvas scaled with the thumb, columns inset 16 units.
// `card` is the lead size: its width follows the card, so the columns are laid out in percent
// of the plate's inner box (the plate's padding is the inset) and a corner keeps its radius.
// Colours are `fill` attributes, so the page sets no custom property and no inline style.
const GAP = 4
const CARD_GAP_PCT = 0.5

export default function ProjectPlate({ colors, size = 'card' }) {
  const list = (colors || []).filter(Boolean)
  const n = list.length
  let art = null
  if (n > 0 && size === 'thumb') {
    const w = (128 - GAP * (n - 1)) / n
    art = (
      <svg viewBox="0 0 160 100">
        {list.map((c, i) => <rect key={`${c}-${i}`} className="spt-step" fill={c} x={16 + i * (w + GAP)} y="16" width={w} height="68" rx="4" />)}
      </svg>
    )
  } else if (n > 0) {
    const w = (100 - CARD_GAP_PCT * (n - 1)) / n
    art = (
      <svg>
        {list.map((c, i) => <rect key={`${c}-${i}`} className="spt-step" fill={c} x={`${(i * (w + CARD_GAP_PCT)).toFixed(3)}%`} y="0" width={`${w.toFixed(3)}%`} height="100%" rx="4" />)}
      </svg>
    )
  }
  return (
    <div className={`spt-art spt-art--${size} uh-plate`} data-hue="none" aria-hidden="true">
      {art}
    </div>
  )
}
