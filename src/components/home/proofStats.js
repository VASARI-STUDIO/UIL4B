import { TOOL_COUNT } from '../spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT } from './bookmarkFolders.js'

// The first three figures are placeholders, not measurements. They sit in this
// one array so real counts replace them in a single edit.
export const STATS = [
  { n: 186, label: 'people have opened a tool since launch' },
  { n: 540, label: 'palettes, type scales and icon sets exported' },
  { n: 72, label: 'projects saved to come back to' },
]

// The fourth figure is a fact about the product, derived from the tool list and
// from the bookmark folders the bookmarks section draws.
export const TOOLS_FOR_BOOKMARKS = { n: TOOL_COUNT, label: `tools in place of ${BOOKMARK_COUNT} bookmarks` }

// The rows in the order the bar prints them.
export const PROOF_ROWS = [...STATS, TOOLS_FOR_BOOKMARKS]
