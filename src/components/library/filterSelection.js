// The selection rules behind LibraryFilterGroup's opt-in multi-select.
//
// Pure, and in their own module for two reasons: the collapse rules are the
// fiddly part and deserve direct assertions (tests/unit/library-filters.test.js),
// and exporting a non-component from a component file costs a
// react-refresh/only-export-components warning the build gate holds at a fixed
// count.

// True when this option should read as selected, for either shape of `value`.
export function isOn(value, id) {
  return Array.isArray(value) ? value.includes(id) : value === id
}

/**
 * The next selection after an additive (shift/ctrl/cmd) press.
 *
 * Pure and exported so the collapse rules can be asserted directly — they are
 * the fiddly part, and every one of them is a case somebody hits by accident:
 * deselecting the last option, selecting every option one by one, or
 * shift-pressing the reset option itself.
 */
export function toggleSelection(current, id, { options, resetId }) {
  if (id === resetId) return [resetId]
  const selectable = options.map(o => o.id).filter(o => o !== resetId)
  const base = (Array.isArray(current) ? current : [current]).filter(v => v !== resetId && selectable.includes(v))
  const next = base.includes(id) ? base.filter(v => v !== id) : [...base, id]
  // Nothing selected, or everything selected, are the same view of the data —
  // and "everything" dressed up as three lit pills claims a narrowing that is
  // not happening. Both collapse to the reset option.
  if (next.length === 0 || next.length === selectable.length) return [resetId]
  // Keep the options' own order rather than click order, so the pills do not
  // reorder under the pointer.
  return selectable.filter(o => next.includes(o))
}

/**
 * What the collapsed trigger says it is filtering by.
 *
 * The whole risk of collapsing a tray into one control is that the selection
 * stops being visible, so this string is the feature rather than a label: a
 * trigger reading only "Mood" has hidden state, where "Mood · Warm" has saved
 * space. Deel's filter chips carry a count for the same reason.
 *
 * Pure and here rather than inline in the component so the three cases can be
 * asserted without a browser — and the third one is the case that is easy to
 * get wrong. Naming several selections individually is what a reader expects
 * and it does not fit: four option labels overflow a 46px control, and a list
 * truncated mid-word reports the selection LESS clearly than a count does.
 *
 * `emptyLabel` is the no-selection wording. It is a parameter because "Any" is
 * right for a filter and wrong for a sort, and a surface that needs the other
 * one should not have to reimplement the function to get it.
 */
export function selectionSummary(value, options, emptyLabel = 'Any') {
  const on = options.filter(o => isOn(value, o.id))
  if (on.length === 1) return on[0].label
  if (on.length > 1) return `${on.length} selected`
  return emptyLabel
}
