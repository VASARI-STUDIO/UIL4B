// What the edge pages suggest. Every row is read off the tool tree, the Learn
// index or a project, so nothing here can name a page that does not exist.

import { CREATE_GROUPS, DISCOVER_LIBRARIES, createTools } from '../../data/toolTree.js'
import { LEARN_ARTICLES } from '../../data/learnIndex.js'
import { byRecent, projectStatus } from '../userhome/workspace.js'

const TOOLS = createTools()
const GROUP_LABEL = Object.fromEntries(CREATE_GROUPS.map((g) => [g.id, g.label]))
const FIVE = 5

const suggestTool = (id) => {
  const tool = TOOLS.find((t) => t.id === id && !t.soon)
  if (!tool) throw new Error(`The edge pages suggest "${id}", which is not a live tool in CREATE_GROUPS`)
  return { to: tool.route, label: tool.label, desc: GROUP_LABEL[tool.group] }
}

/** The places a lost visitor is most likely to want. */
export function startRows() {
  return [
    suggestTool('palette'),
    suggestTool('font-pair'),
    suggestTool('type-scale'),
    suggestTool('icons'),
    { to: '/discover', label: 'Discover', desc: `${DISCOVER_LIBRARIES.length} libraries open` },
  ]
}

/** The Learn guides, in the order the index lists them. */
export function guideRows() {
  return LEARN_ARTICLES.slice(0, FIVE).map((a) => ({ to: `/learn/${a.slug}`, label: a.navLabel || a.title, desc: a.topic }))
}

/** Create's own live tools, for a dead link under /create. */
export function createRows() {
  return TOOLS.filter((t) => !t.soon && !t.beta).slice(0, FIVE).map((t) => ({ to: t.route, label: t.label, desc: GROUP_LABEL[t.group] }))
}

/** The Discover libraries that open, for a dead link under /discover. */
export function libraryRows() {
  return DISCOVER_LIBRARIES.slice(0, FIVE).map((r) => ({ to: r.route, label: r.label, desc: 'Library' }))
}

/** What a dead link lists, by the section it was in. */
export function sectionSuggestions(pathname) {
  if (/^\/learn\//.test(pathname)) {
    return { section: 'learn', heading: 'Start with a guide', line: 'That link was for a Learn guide. These are the guides.', rows: guideRows() }
  }
  if (/^\/create\//.test(pathname)) {
    return { section: 'create', heading: 'Start with a tool', line: 'That link was for a Create tool. These are the tools.', rows: createRows() }
  }
  if (/^\/discover\//.test(pathname)) {
    return { section: 'discover', heading: 'Start with a library', line: 'That link was for a Discover library. These are the libraries.', rows: libraryRows() }
  }
  return { section: '', heading: 'Start with a tool', line: '', rows: startRows() }
}

/** The status line a project row prints, in the words the project page uses. */
export function projectLine(project) {
  const status = projectStatus(project)
  if (project?.archived) return `Archived, ${status.has}`
  if (status.ready) return 'Complete and ready to export'
  return `${status.has} filled${status.edited ? `, edited ${status.edited}` : ''}`
}

/** Up to three rows for the newest projects. */
export function projectRows(projects) {
  return [...(projects || [])].sort(byRecent).slice(0, 3).map((p) => ({
    to: `/projects/${encodeURIComponent(p.id)}`,
    label: p.name || 'Untitled project',
    desc: projectLine(p),
    colors: (projectStatus(p).digest.colors || []).slice(0, 4),
  }))
}
