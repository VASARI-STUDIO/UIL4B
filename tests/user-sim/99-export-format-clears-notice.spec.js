// The Export popup keeps what a finished export said in its dock, right beside
// the button. That line belongs to the file that produced it: once someone
// picks another file, "Downloaded <the kit>." must not sit beside an
// "Export CSS" button that has not been pressed.
import { chooseFormat, exportPanel, primaryButton, dockStatus, fileGroup, typeRadio } from './export-rows.js'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { mockThemeApi } from './export-theme-mock.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'

test('choosing another format clears the finished-export notice', async ({ page }) => {
  watch(page, 'a free account who exported the UI kit and then looks at the token formats')
  // The kit comes from the export route as a zip; a stand-in answers it.
  await mockThemeApi(page)
  await signIn(page, { plan: 'free' })
  await go(page, BOARD)

  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  // The header Export opens on the Brand book, so the kit is a pick like any other.
  await chooseFormat(panel, 'kit')
  await expect(typeRadio(panel, 'UI kit')).toHaveAttribute('aria-checked', 'true')

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    primaryButton(panel).click(),
  ])
  // A free kit is named for the project, not the product. This board has no saved
  // project, so the file is filed as untitled, in the theme the dialog opened on.
  expect(download.suggestedFilename()).toBe('untitled-ui-kit-04-standards.zip')
  await expect(dockStatus(panel)).toHaveText('Downloaded untitled-ui-kit-04-standards.zip.')
  await expect(dockStatus(panel).locator('strong')).toHaveText('Downloaded')
  // With the message on screen the button finishes with Done.
  await expect(primaryButton(panel)).toHaveText('Done')

  await chooseFormat(panel, 'css')

  await expect(fileGroup(panel, 'Code').getByRole('radio', { name: 'CSS stylesheet', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(primaryButton(panel), 'the button is back to naming the new file').toHaveText('Export CSS')
  await expect(primaryButton(panel)).toBeEnabled()
  await expect(dockStatus(panel), 'the kit confirmation is gone once another file is chosen').not.toContainText('Downloaded')
  await expect(dockStatus(panel).locator('strong'), 'and the dock now speaks for the CSS pick').toHaveText('Free.')
})
