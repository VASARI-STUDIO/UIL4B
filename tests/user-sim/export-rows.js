// How a spec reaches one export format in the five-row panel: pick the row, then
// the file type in that row's switch. Read from the same config the panel renders,
// so a format moved to another row is followed here rather than breaking each spec.
import { EXPORT_FORMATS, EXPORT_GROUPS } from '../../src/config/exportFormats.js'

export const exportPanel = (page) => page.getByRole('dialog', { name: /Export your design system/i })

export const formatById = (id) => {
  const format = EXPORT_FORMATS.find((f) => f.id === id)
  if (!format) throw new Error(`no export format "${id}"`)
  return format
}

export const groupOfFormat = (id) => EXPORT_GROUPS.find((g) => g.id === formatById(id).group)

/** The row radio for a group (matches "Design system book, Pro" as well). */
export const rowFor = (panel, groupName) => panel.getByRole('radio', { name: new RegExp(`^${groupName}`) })

/** Choose a format: its row, then its file type where the row has a switch. */
export async function chooseFormat(panelOrPage, id) {
  const panel = typeof panelOrPage.getByRole === 'function' && !panelOrPage.goto ? panelOrPage : exportPanel(panelOrPage)
  const format = formatById(id)
  const group = groupOfFormat(id)
  await rowFor(panel, group.name).click()
  if (format.option) {
    await panel.getByRole('radiogroup', { name: `${group.name} file type` }).getByRole('radio', { name: format.option, exact: true }).click()
  }
}

/** The primary button's label for a format, as the panel words it. */
export const actionLabel = (id) => formatById(id).action
