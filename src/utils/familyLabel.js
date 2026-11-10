// A family name for a phone label that has room for about nine characters:
// the foundry prefix goes ("IBM Plex Sans" reads "Plex Sans"). Any other name
// is returned whole, and the label's own ellipsis handles the rest; the full
// name stays in the control's accessible name.
export function shortFamilyName(family) {
  const name = String(family || '').trim()
  const short = name.replace(/^IBM\s+(?=\S)/i, '')
  return short || name
}
