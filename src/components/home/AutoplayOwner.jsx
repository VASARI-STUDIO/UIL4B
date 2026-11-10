import { useState } from 'react'
import { createAutoplayStore } from './autoplayRules'
import { AutoplayContext, tabHidden, useTabHidden } from './useAutoplaySlot'

// ONE OWNER FOR THE PAGE'S TWO AUTOPLAYS (hero loop, bookmarks tour).
//
// Mount it once around the homepage sections. Each autoplaying section then
// calls `useAutoplaySlot(name, el)` (useAutoplaySlot.js), which reports that
// section's visibility here and returns whether it may play. The page holds one
// store, so the hero loop and the tour can never both be told to run.
export function AutoplayOwner({ children }) {
  const [store] = useState(() => createAutoplayStore(tabHidden()))
  useTabHidden(store)
  return <AutoplayContext.Provider value={store}>{children}</AutoplayContext.Provider>
}
