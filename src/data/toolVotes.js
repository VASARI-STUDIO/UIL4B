// Held off until the toolVotes rules are in: against the old rules every vote
// write is refused. `npm run apply:gated` flips it to true together with the
// rules patch (docs/design/tool-votes-rules.patch, scripts/gated-patches.mjs).
export const TOOL_VOTES_ENABLED = false

// What the rest of the app reads. A test-mode build (or a Node script) can turn
// it on with VITE_FORCE_TOOL_VOTES=1 to render the surfaces locally; in any other
// Vite mode `import.meta.env.MODE` is not 'test', so this is just the flag above.
const forced = import.meta.env
  ? import.meta.env.MODE === 'test' && import.meta.env.VITE_FORCE_TOOL_VOTES === '1'
  : globalThis.process?.env?.VITE_FORCE_TOOL_VOTES === '1'
export const TOOL_VOTES_ON = TOOL_VOTES_ENABLED || forced
