// The bookmarks section's four folders and the number of bookmarks each holds.
// The section draws the folders from these counts, and the proof bar quotes
// their total, so the two can never disagree.
export const BOOKMARK_FOLDERS = [
  { name: 'Colours', count: 10 },
  { name: 'Fonts', count: 6 },
  { name: 'Icons and emoji', count: 4 },
  { name: 'Image tools', count: 6 },
]

export const BOOKMARK_COUNT = BOOKMARK_FOLDERS.reduce((sum, folder) => sum + folder.count, 0)
