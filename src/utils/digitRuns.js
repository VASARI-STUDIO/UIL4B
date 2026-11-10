// Splits a comparison value into runs so each number, with its `px` unit, can be
// set in the heavier weight: "16, 20 and 48px" gives 16, ", ", 20, " and ",
// 48px. The split happens at render time on the live strings, so no value is
// ever marked up by hand in the copy. DOM-free, so a test can call it.

const NUMBER_RUN = /(\d+(?:px)?)/

/** `[{ text, num }]` in reading order; `num` is true for a run of digits. */
export function digitRuns(text) {
  return String(text ?? '')
    .split(NUMBER_RUN)
    .filter(Boolean)
    .map((part) => ({ text: part, num: /^\d/.test(part) }))
}
