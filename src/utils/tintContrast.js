// The contrast notes on a tint step: how its colour reads against white and
// against black, the two poles every step is measured on. The tint is the
// background and the text is white or black, so a step either carries white
// text, black text, both (a mid step) or neither (a rare pale-mid).
//
// WCAG 2 ratios, from utils/colors.contrastRatio. Grades follow WCAG 1.4.3 and
// 1.4.6: 4.5 is AA for body text, 3 is AA for large text, 7 is AAA.
import { contrastRatio } from './colors.js'

export const POLES = [
  { key: 'white', label: 'White text', hex: '#FFFFFF' },
  { key: 'black', label: 'Black text', hex: '#000000' },
]

/** 'AAA' (7+), 'AA' (4.5+), 'large' (3+, large text only) or 'fail'. */
export function contrastGrade(ratio) {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'large'
  return 'fail'
}

// A ratio is shown cut down to one decimal, never rounded up: 4.49 reads 4.4,
// not 4.5, so a number on screen never claims a pass the grade does not give.
const shown = (ratio) => (Math.floor(ratio * 10 + 1e-9) / 10).toFixed(1)

/**
 * The note for one hex: a row per pole with the ratio, its shown text, the grade,
 * and `pass` (true for AA body text or better) which draws the tick.
 */
export function contrastNotes(hex) {
  return POLES.map(({ key, label, hex: pole }) => {
    const ratio = contrastRatio(hex, pole)
    const grade = contrastGrade(ratio)
    return { key, label, ratio, text: `${shown(ratio)}:1`, grade, pass: grade === 'AA' || grade === 'AAA' }
  })
}

/** What a grade says in words, so a tick is never the only signal. */
export const GRADE_WORDS = {
  AAA: 'Passes AAA',
  AA: 'Passes AA',
  large: 'Large text only',
  fail: 'Fails',
}

/**
 * The ToolIcon each grade draws. A tick is only for a pass; large-text-only gets
 * a dash so it never reads as a pass for body text, and a fail gets a cross.
 */
export const GRADE_MARKS = {
  AAA: 'check',
  AA: 'check',
  large: 'minus',
  fail: 'x',
}

/**
 * The text colour that reads best on a tint, and how well: `{ key, color, grade,
 * word }`, e.g. "White AAA" or "Black AA". The better of white and black is always
 * at least 4.58:1, so the grade here is only ever AAA or AA; a tie goes to white.
 */
export function bestPole(hex) {
  const best = contrastNotes(hex).reduce((a, n) => (n.ratio > a.ratio ? n : a))
  const color = best.label.replace(' text', '')
  return { key: best.key, color, grade: best.grade, word: `${color} ${best.grade}` }
}
