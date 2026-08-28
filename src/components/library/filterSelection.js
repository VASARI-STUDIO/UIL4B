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
