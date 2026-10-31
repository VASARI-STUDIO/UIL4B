// The rules behind the palette row's "paint in order": a press paints the
// target stop, then the target moves on, so two presses make a whole gradient.
// Kept pure (stops in, indices and stops out) so the page and the unit tests
// share one definition. A stop's `lockColour` flag means "Random keeps this colour";
// here it only decides where the target may move next.

// Stop indices in left-to-right order (ties keep the list order).
export const orderByPosition = (stops) => stops
  .map((s, i) => i)
  .sort((a, b) => (stops[a].position - stops[b].position) || (a - b))

// True when every stop's colour is locked, so a colour press has nowhere to land.
export const allColoursLocked = (stops) => stops.length > 0 && stops.every((s) => s.lockColour)

// The stop the target moves to after `from` is painted: the next one to the right
// whose colour is not locked, wrapping to the left end. When no other stop is
// free the target stays where it is.
export function nextPaintTarget(stops, from) {
  const order = orderByPosition(stops)
  const at = order.indexOf(from)
  if (at < 0) return from
  for (let k = 1; k < order.length; k++) {
    const cand = order[(at + k) % order.length]
    if (!stops[cand].lockColour) return cand
  }
  return from
}
