// What the Community Hub's forms say when something is wrong (desktop, signed in).
//
// Every message has to say what failed and what to do about it, appear next to
// the field it is about, mark the field invalid, and go away once it is fixed.
//
// Journeys:
//   1. Upload inspiration with nothing filled in names every missing thing and
//      moves focus to the first.
//   2. A file that is the wrong type, or too big, is refused with the reason
//      (and the size it was), and a good file then clears the message.
//   3. "Someone else made this" asks for who and where before it will go.
//   4. The link form refuses a malformed address and the icon form a bad SVG,
//      each beside its field.
//
// MUTATION (restore after each; written, not yet run: see the hand-over):
//   ShareDialogs.jsx: change IMAGE_MAX to `50 * 1024 * 1024`
//       -> "2. a file over 5 MB is refused with its size"
//   ShareDialogs.jsx UploadStep.send: delete `if (!rights) next.rights = ...`
//       -> "1. an empty upload names every missing thing"
//   ShareDialogs.jsx: delete the `aria-invalid={!!errors.title}` on the upload Title
//       -> "1. an empty upload names every missing thing"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const upload = (page) => page.getByRole('dialog', { name: 'Upload inspiration' })
const errors = (scope) => scope.locator('.cm-error')

async function openUpload(page) {
  await signIn(page, { plan: 'free' })
  await go(page, '/community')
  await page.locator('.cm-head').getByRole('button', { name: 'Upload inspiration' }).click()
  await expect(upload(page)).toBeVisible()
  return upload(page)
}

test.describe('Community Hub: form validation', () => {
  test('1. an empty upload names every missing thing and puts focus on the first', async ({ page }) => {
    watch(page, 'a member pressing Upload with nothing filled in')
    const form = await openUpload(page)
    await form.getByRole('button', { name: 'Upload for review' }).click()

    // MUTATION: delete the rights check in UploadStep.send and this fails.
    await expect(errors(form), '1. an empty upload names every missing thing').toHaveCount(3)
    await expect(form.getByText('Choose a JPG, PNG or WebP image.')).toBeVisible()
    await expect(form.getByText('Give your image a title.')).toBeVisible()
    await expect(form.getByText('Tick the box to confirm you can share this.')).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Title' })).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByRole('button', { name: 'Choose image' })).toBeFocused()

    // Fixing one clears only that one.
    await form.getByRole('textbox', { name: 'Title' }).fill('Bus shelter')
    await expect(form.getByText('Give your image a title.')).toHaveCount(0)
    await expect(errors(form)).toHaveCount(2)
    await form.getByRole('checkbox', { name: /right to share/ }).check()
    await expect(errors(form)).toHaveCount(1)
  })

  test('2. a wrong type and a file over 5 MB are each refused with the reason; a good file clears it', async ({ page }) => {
    watch(page, 'a member choosing the wrong file')
    const form = await openUpload(page)
    const input = form.locator('input[type="file"]')

    await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
    await expect(form.getByText('Choose a JPG, PNG or WebP image.')).toBeVisible()

    // MUTATION: change IMAGE_MAX to 50 MB in ShareDialogs.jsx and this fails.
    await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024) })
    await expect(form.getByText('That file is 6.0 MB. Images can be up to 5 MB.'), '2. a file over 5 MB is refused with its size').toBeVisible()
    await expect(form.getByText('Choose a JPG, PNG or WebP image.')).toHaveCount(0)

    await input.setInputFiles({ name: 'poster.png', mimeType: 'image/png', buffer: PNG })
    await expect(errors(form)).toHaveCount(0)
    await expect(form.getByText(/poster\.png/)).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Title' })).toHaveValue('poster')
  })

  test('3. "Someone else made this" asks who made it and where it was found before it will go', async ({ page }) => {
    watch(page, 'a member crediting someone else')
    const form = await openUpload(page)
    await form.locator('input[type="file"]').setInputFiles({ name: 'poster.png', mimeType: 'image/png', buffer: PNG })
    await form.getByRole('checkbox', { name: /right to share/ }).check()
    await form.getByText('Someone else made this', { exact: true }).click()
    await form.getByRole('button', { name: 'Upload for review' }).click()

    await expect(form.getByText('Say who made it.')).toBeVisible()
    await expect(form.getByText('Add the link where you found it.')).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Made by' })).toBeFocused()

    await form.getByRole('textbox', { name: 'Made by' }).fill('Sam Tan')
    await form.getByRole('textbox', { name: 'Where you found it' }).fill('not a link')
    await form.getByRole('button', { name: 'Upload for review' }).click()
    await expect(form.getByText('Add the link where you found it.')).toBeVisible()
    await form.getByRole('textbox', { name: 'Where you found it' }).fill('example.com/poster')
    await form.getByRole('button', { name: 'Upload for review' }).click()
    await expect(page.getByRole('dialog', { name: 'Not sent yet' })).toBeVisible()
  })

  test('4. the link form refuses a malformed address and the icon form a bad SVG, each beside its field', async ({ page }) => {
    watch(page, 'a member submitting a link and an icon')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const pick = async (what) => {
      await page.locator('.cm-head').getByRole('button', { name: 'Share your work' }).click()
      await page.getByRole('dialog', { name: 'Share your work' }).getByRole('radio', { name: new RegExp(what) }).check({ force: true })
      await page.getByRole('dialog', { name: 'Share your work' }).getByRole('button', { name: 'Next' }).click()
    }

    await pick('A link')
    const link = page.getByRole('dialog', { name: 'Submit a design' })
    await link.getByRole('button', { name: 'Submit design' }).click()
    await expect(link.getByText('Give your design a name.')).toBeVisible()
    await link.getByRole('textbox', { name: 'Name', exact: true }).fill('Harbour Dashboard')
    await link.getByRole('textbox', { name: 'Link (optional)' }).fill('not a url')
    await link.getByRole('button', { name: 'Submit design' }).click()
    await expect(link.getByText('That URL doesn’t look right.')).toBeVisible()
    await expect(link.getByRole('textbox', { name: 'Link (optional)' })).toHaveAttribute('aria-invalid', 'true')
    await link.getByRole('button', { name: 'Back' }).click()

    await page.getByRole('dialog', { name: 'Share your work' }).getByRole('radio', { name: /An icon/ }).check({ force: true })
    await page.getByRole('dialog', { name: 'Share your work' }).getByRole('button', { name: 'Next' }).click()
    const icon = page.getByRole('dialog', { name: 'Submit an icon' })
    await icon.getByRole('textbox', { name: 'Name', exact: true }).fill('Plus mark')
    await icon.getByRole('textbox', { name: 'SVG' }).fill('<p>not an svg</p>')
    await expect(errors(icon), 'the reason shows as soon as the code is pasted').toHaveCount(1)
    await expect(errors(icon).first()).not.toBeEmpty()
    await expect(icon.getByRole('button', { name: 'Submit icon' })).toBeVisible()
    await icon.getByRole('button', { name: 'Submit icon' }).click()
    await expect(icon).toBeVisible()
    await expect(icon.getByRole('textbox', { name: 'SVG' })).toHaveAttribute('aria-invalid', 'true')
  })
})
