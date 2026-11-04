// routeMetaMap.js plus the pages that exist only while the tool-votes flag is on.
// Kept out of routeMetaMap.js on purpose: that file is bundled into the api/
// functions (vercel.json includeFiles), which must not need toolVotes.js. The app
// shell and the build scripts read the titles and descriptions from here; with the
// flag off these are the very same objects routeMetaMap.js exports.
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS as BASE_DESCRIPTIONS, PAGE_TITLES as BASE_TITLES } from './routeMetaMap.js'
import { TOOL_VOTES_ON } from './toolVotes.js'

export const ROADMAP_ROUTE = '/roadmap'

export const PAGE_TITLES = TOOL_VOTES_ON
  ? { ...BASE_TITLES, [ROADMAP_ROUTE]: 'UI L4B | Roadmap' }
  : BASE_TITLES

export const PAGE_DESCRIPTIONS = TOOL_VOTES_ON
  ? {
      ...BASE_DESCRIPTIONS,
      [ROADMAP_ROUTE]: "See which UI L4B tools are in beta or still being built, and vote for the ones you'd use. Shipped tools stay listed for 90 days after they go live.",
    }
  : BASE_DESCRIPTIONS

export { DEFAULT_DESCRIPTION }
