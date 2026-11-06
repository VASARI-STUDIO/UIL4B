// Which step each line of the Type Scale page set uses. The page and the ladder
// both read it, so the ladder can say whether a step it lists appears on the page.

// The page's steps counted down from the top of the scale: a short scale reuses
// its top step for the lines above it.
export function pickSteps(steps, up) {
  const bottom = steps[steps.length - 1]
  const pick = (exp, fallback) => steps.find(s => s.exp === exp) || fallback
  return {
    eta: pick(Math.min(4, up), steps[0]),
    head: pick(Math.min(3, up), steps[0]),
    stat: pick(Math.min(2, up), steps[0]),
    lede: pick(Math.min(1, up), steps[0]),
    base: pick(0, bottom),
    caption: pick(-1, bottom),
  }
}

// The step names the page uses. The big time line is the sample screen's only.
export function usedStepNames(steps, up, mine) {
  const p = pickSteps(steps, up)
  const used = [p.head, p.stat, p.lede, p.base, p.caption]
  if (!mine) used.push(p.eta)
  return new Set(used.map(s => s.name))
}

// The ladder's note above its rows: it says where a step is used, and says so
// plainly when the step pressed is one this screen never sets.
export function ladderNote(steps, up, mine, lit) {
  const pressed = steps.find(s => s.name === lit)
  if (pressed && !usedStepNames(steps, up, mine).has(pressed.name)) return `${pressed.name} isn’t used on this screen.`
  return 'Press a step to see where it’s used.'
}

// What names the screen: Kerbside's own tracking screen signed out, a neutral
// "Sample content" screen in the project's families signed in.
export function screenCopy(mine) {
  return mine
    ? { label: 'A sample screen set on this scale', caption: 'Sample content', brand: null }
    : { label: 'Kerbside’s Track a rider screen, set on this scale', caption: null, brand: 'Kerbside' }
}
