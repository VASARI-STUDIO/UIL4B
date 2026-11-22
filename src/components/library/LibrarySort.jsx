import { useMemo } from 'react'
import MenuSelect from '../tool/MenuSelect'
import { sortOptions, useLibrarySort } from '../../utils/librarySort'

// The sort menu the Icon and Emoji libraries share (see utils/librarySort.js for
// the choice it edits). It is the same listbox the pack menu is, in the same
// `lbry-select` skin: a keyboard path (Enter or arrows to open, arrows and
// typeahead to move, Escape to close), a bottom sheet under 768px, and the
// toolbar's 44px touch height. At the default the trigger reads just "Sort", and
// on the filter row it shows only its icon (library.css, `lbry-sort--default`), so
// the 1024 row keeps its groups; once changed it reads "Sort: Name A–Z". The
// accessible name always carries the current choice ("Sort: Recommended").
export default function LibrarySort({ searching = false, packLabel = 'Pack' }) {
  const [sort, setSort] = useLibrarySort()
  const options = useMemo(() => sortOptions(searching, packLabel), [searching, packLabel])
  const label = options.find((option) => option.value === sort)?.label ?? options[0].label
  return (
    <MenuSelect
      className={`lbry-select lbry-sort${sort === 'recommended' ? ' lbry-sort--default' : ''}`}
      value={sort}
      onChange={setSort}
      ariaLabel="Sort"
      options={options}
      triggerLabel={sort === 'recommended' ? 'Sort' : `Sort: ${label}`}
    />
  )
}
