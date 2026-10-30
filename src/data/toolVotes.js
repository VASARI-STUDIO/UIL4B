// Held off until the toolVotes rules are in: against the old rules every vote
// write is refused. `npm run apply:gated` flips it to true together with the
// rules patch (docs/design/tool-votes-rules.patch, scripts/gated-patches.mjs).
export const TOOL_VOTES_ENABLED = false
