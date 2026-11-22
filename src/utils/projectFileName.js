// The name an export carries: the preview's brand, the request's projectName and the file's name all come from here, so a
// file is never called one thing on screen and another on disk.
//
// The project's name lives on the project record, never on the design (`design.name` is not a field the studio writes).
// A design knows its project only by `design.source.projectId`, which the project context sets on open and save. The dialog
// is opened from a tool page as often as from the project's own page, and only the second hands over a `projectId`, so the
// name is read through the first id that finds a project: the one handed in, the design's own, the working design's.
//
// Plain functions with no React or DOM, so the dialog, the runner and node tests read it.

const named = (projects, id) => {
  if (id === undefined || id === null || id === '' || !Array.isArray(projects)) return null
  return projects.find((p) => String(p?.id) === String(id)) || null
}

const text = (v) => (typeof v === 'string' ? v : '')

/**
 * The project's name as typed, or '' when it has none (the caller says what an unnamed project prints as).
 * `projectId` is the open project's id if the dialog was given one; `design` is the design being exported; `working` is the
 * working design in the project context, which carries the project it was opened from even when `design` is a tool's own.
 */
export function exportProjectName({ projects, projectId, design, working } = {}) {
  const project = named(projects, projectId) || named(projects, design?.source?.projectId) || named(projects, working?.source?.projectId)
  return text(project?.name) || text(design?.name)
}

/** What a document prints for a project with no name. The file names have no stand-in (an unnamed project is just "design"). */
export const UNNAMED_PROJECT = 'Design System'

/**
 * The project name the documents print: the one `exportProjectName` found, or the stand-in for the unnamed. The preview, the
 * download and the clipboard copy all read it through here, so a page is never headed one thing on screen and another on disk.
 */
export const documentProjectName = (name) => text(name) || UNNAMED_PROJECT
