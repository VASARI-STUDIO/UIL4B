import { createContext, useContext } from 'react'

// While a LibraryToolbar decides a filter group's form, the group reads it
// from here. 'auto' is the historical behaviour (the group decides for
// itself), 'collapse' forces the one-line trigger, and 'expand' forces chips —
// inside the Filters panel, or a phone's quick row, where there is room to lay
// them out. Outside any toolbar the default is 'auto', so a group used on its
// own (PaletteBuilder) behaves exactly as before.
export const ToolbarModeContext = createContext('auto')
export const useToolbarMode = () => useContext(ToolbarModeContext)
