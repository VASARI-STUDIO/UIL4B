// The tool lists on /info, read from the Create tree so the page cannot name a
// tool the product does not have or leave one out.
//
// Plain JS, no JSX: the unit tests import this in bare Node.
import { CREATE_GROUPS, isListedTool } from './toolTree.js'

/**
 * A Create group as /info shows it: the group's own label, and the tools a
 * visitor can open today (not Soon, not hidden). A group that is itself Soon
 * has no live tools.
 */
export function infoToolGroup(groupId) {
  const group = CREATE_GROUPS.find((g) => g.id === groupId)
  if (!group) throw new Error(`infoToolGroup: "${groupId}" is not a Create group`)
  return {
    id: group.id,
    label: group.label,
    tools: group.soon ? [] : group.tools.filter((t) => isListedTool(t) && !t.soon),
  }
}
