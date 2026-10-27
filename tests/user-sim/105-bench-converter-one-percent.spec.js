// THE HOMEPAGE CONVERTER SHOWS ONE RESULT PERCENTAGE: HOW MUCH SMALLER THE FILE GOT.
//
// The AFTER bar's label is plain, and the one RESULT figure on screen is the
// saving line above the bars. A quality figure on the label would contradict a
// bar drawn at the size of the file that is left.
//
// The Quality row now prints its own setting, an <output> reading "75%" (spec
// B6: label at left, value at right). That is an input, not a result, so the
// panel holds at most two % tokens: the saving (exactly one, in .sp-saving) and
// the quality setting (one while the format is lossy, none under PNG). The
// saving is never doubled, and the quality value is never printed as a <b> or
// on a bar label.
//
// Both bars share one scale, the larger of the two files. A result that is not
// smaller is drawn in a plain fill (`is-plain`). PNG output is lossless, so it
// comes out the same size: the line reads "No loss" / "PNG keeps every pixel" in
// plain ink (`is-noloss`) with no % at all, and the quality slider is disabled.
//
// The tabs are Compress, 3D model, Video frames, Aspect ratio. Every pane stays
// mounted and the hidden ones are `visibility: hidden`, so the locators below
// are scoped to the pane that is on.
//
// The oracle is the rendered text of the panel (every `\d+%` token in its
// innerText, which leaves out hidden panes) and the drawn width of the AFTER
// bar against the saving it states.
//
// The saving figure sits on a hidden "00%" pad (`.sp-saving-pad`, visibility
// hidden, aria-hidden) so the line never changes width as the figure changes.
// The pad is in textContent but not in innerText, so every text read of the
// saving line below uses innerText (`useInnerText`); a read of textContent would
// see "00%92%smaller", a second figure that nobody can see.
// Run at 390 / 768 / 1440 in both themes, in the settled state and across a
// quality change, a format change and a switch to the lossless format.
import zlib from 'node:zlib'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [390, 768, 1440]
const THEMES = ['light', 'dark']
const PERCENT = /\d+\s*%/g

const panelOf = (page) => page.locator('.sp-panel-body:has(.sp-modes)')

/** Every % token in the saving line alone. */
const savingTokens = (page) => compressPane(page).locator('.sp-saving').evaluate((el) => el.innerText.match(/\d+\s*%/g) || [])

/** Every % token in the converter panel's visible text. */
const percentTokens = (page) => panelOf(page).evaluate((el) => el.innerText.match(/\d+\s*%/g) || [])

// The pane that is on. Every locator below hangs off it, so a hidden pane's
// copy of the same class can never satisfy an assertion.
const compressPane = (page) => panelOf(page).locator('.sp-cv-pane.is-on')

/** Wait for the saving line to state a result, i.e. a conversion has finished. */
const settled = (page) => expect(
  compressPane(page).locator('.sp-saving'),
  'the converter never finished measuring the photograph',
).toHaveText(/^(\d+%\s*(smaller|larger)|No loss)/, { timeout: 15000, useInnerText: true })

/** Drawn width of each bar's fill as a percentage of its track. */
const barWidths = (page) => compressPane(page).locator('.sp-bar').evaluateAll((bars) => bars.map((bar) => {
  const fill = bar.querySelector('.sp-bar-fill').getBoundingClientRect().width
  return (fill / bar.querySelector('.sp-bar-track').getBoundingClientRect().width) * 100
}))

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`the converter panel shows one percentage, the saving (${theme}, ${width})`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'a visitor trying the homepage converter')
      await go(page, '/')

      // At 1000px and below the bench is a tool switcher and only the selected
      // window can be touched, so pick the Converter tab first.
      const switcherTab = page.getByRole('tab', { name: 'Converter', exact: true })
      if (await switcherTab.count()) await switcherTab.click()

      const panel = panelOf(page)
      await panel.locator('.sp-modes').scrollIntoViewIfNeeded()

      // Record the number of % tokens on every change to the panel, so a
      // transient second figure between settled states is caught too.
      await panel.evaluate((el) => {
        window.__pctCounts = []
        window.__savingCounts = []
        const read = () => {
          window.__pctCounts.push((el.innerText.match(/\d+\s*%/g) || []).length)
          const saving = el.querySelector('.sp-cv-pane.is-on .sp-saving')
          window.__savingCounts.push(saving ? (saving.innerText.match(/\d+\s*%/g) || []).length : 0)
        }
        new MutationObserver(read).observe(el, { subtree: true, childList: true, characterData: true, attributes: true })
        read()
      })

      // TABS: one Compress, no Convert, 3D model second. Named by aria-label.
      const tabs = await panel.getByRole('tab').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
      expect.soft(tabs, 'the mode tabs are not Compress / 3D model / Video frames / Aspect ratio').toEqual(['Compress', '3D model', 'Video frames', 'Aspect ratio'])
      await expect(panel.getByRole('tab', { name: 'Compress', exact: true })).toHaveAttribute('aria-selected', 'true')
      // The mode tabs are words only: no icon in any of them.
      expect.soft(await panel.locator('.sp-modes :is(svg, img, i)').count(), 'a mode tab carries an icon again').toBe(0)

      // The shared footer: the window's own sibling, one text link and one pill.
      const foot = panel.locator('xpath=..').locator('.sp-tool-foot')
      await expect(foot, 'the converter has no shared .sp-tool-foot').toHaveCount(1)
      await expect.soft(foot.locator('.sp-tool-link'), 'the footer text link is not the aspect tool').toHaveText('Aspect & Resolution')
      await expect.soft(foot, 'the footer pill does not offer the file converter').toContainText('Open File Converter')

      await settled(page)

      // AFTER LABEL: no figure on it.
      const afterLabel = (await compressPane(page).locator('.sp-bar').nth(1).locator('small').innerText()).trim()
      expect.soft(afterLabel, 'the After label carries something besides the word After').toBe('After')

      // TWO TOKENS: the saving line, and the Quality row's own setting.
      const row = (await compressPane(page).locator('.sp-saving').innerText()).replace(/\s+/g, ' ').trim()
      const tokens = await percentTokens(page)
      expect.soft(tokens, `panel % tokens: ${JSON.stringify(tokens)}`).toHaveLength(2)
      expect.soft(await savingTokens(page), 'the saving line does not hold exactly one %').toHaveLength(1)
      await expect.soft(compressPane(page).locator('.sp-quality output'), 'the Quality row does not print its setting').toHaveText('75%')
      expect.soft(row, 'the saving line is not a figure and its words').toMatch(/^\d+% (smaller|larger)/)
      expect.soft(await compressPane(page).locator('.sp-quality b').count(), 'the Quality row prints its value as a result figure').toBe(0)
      // The "00%" pad that holds the figure's width is there, and is invisible to eyes and readers.
      const pad = compressPane(page).locator('.sp-saving-pad')
      await expect.soft(pad, 'the saving figure lost its width pad').toHaveText('00%')
      await expect.soft(pad, 'the width pad is exposed to assistive tech').toHaveAttribute('aria-hidden', 'true')
      expect.soft(await pad.evaluate((el) => getComputedStyle(el).visibility), 'the width pad is drawn').toBe('hidden')

      // BAR vs LABEL: both bars use the larger file as 100%, so with a saving the
      // BEFORE bar is full and the AFTER bar is as wide as the file that is left.
      const saved = parseInt(row, 10) * (/larger/.test(row) ? -1 : 1)
      expect(saved, 'the photograph did not compress to WebP at the default quality').toBeGreaterThan(0)
      // The fill eases to its width, so read it once it has stopped moving.
      await expect.poll(async () => {
        const [b, a] = await barWidths(page)
        return Math.max(Math.abs(b - 100), Math.abs(a - (100 - saved)))
      }, {
        message: `the bars are not drawn to one scale (a saving of ${saved}%)`,
        timeout: 3000,
      }).toBeLessThan(2.5)
      await expect(compressPane(page).locator('.sp-bar').nth(1).locator('.sp-bar-fill'), 'a smaller result is drawn in the plain fill').not.toHaveClass(/is-plain/)
      await expect(compressPane(page).locator('.sp-saving-num'), 'a saving is not drawn as a win').not.toHaveClass(/is-(plain|noloss)/)
      await expect(compressPane(page).locator('.sp-quality input[type="range"]'), 'the slider is disabled for a lossy format').toBeEnabled()

      // A QUALITY CHANGE: the old saving stays until the new one lands, so the
      // saving line still shows exactly one % straight after the change and once
      // settled, and the Quality row follows the slider at once.
      const slider = compressPane(page).locator('.sp-quality input[type="range"]')
      await slider.focus()
      await page.keyboard.press('ArrowLeft')
      expect.soft(await savingTokens(page), 'a second saving % appeared straight after a quality change').toHaveLength(1)
      expect.soft(await percentTokens(page), 'the panel holds other than saving + quality straight after a quality change').toHaveLength(2)
      await expect.soft(compressPane(page).locator('.sp-quality output'), 'the Quality row did not follow the slider').toHaveText('70%')
      await page.waitForTimeout(700)
      await settled(page)
      expect.soft(await savingTokens(page), 'a second saving % after a quality change settled').toHaveLength(1)
      expect.soft(await percentTokens(page), 'the panel holds other than saving + quality once settled').toHaveLength(2)

      // A FORMAT CHANGE.
      await panel.getByRole('button', { name: 'JPEG', exact: true }).click()
      await page.waitForTimeout(700)
      await settled(page)
      expect.soft(await savingTokens(page), 'a second saving % under JPEG').toHaveLength(1)
      expect.soft(await percentTokens(page), 'the panel holds other than saving + quality under JPEG').toHaveLength(2)

      // Lossless: PNG comes out the size of the original, so the line says
      // "No loss" in plain ink, the panel shows no % at all, the quality slider is
      // disabled, and both bars are drawn full with the AFTER bar plain.
      await panel.getByRole('button', { name: 'PNG', exact: true }).click()
      const saving = compressPane(page).locator('.sp-saving')
      await expect(saving.locator('.sp-saving-num'), 'PNG output does not read "No loss"').toHaveText('No loss', { timeout: 15000, useInnerText: true })
      await expect(saving.locator('.sp-saving-num'), 'the "No loss" figure is not in plain ink').toHaveClass(/is-noloss/)
      await expect(saving.locator('.sp-saving-word'), 'the lossless line does not say PNG keeps every pixel').toHaveText('PNG keeps every pixel', { useInnerText: true })
      expect.soft(await percentTokens(page), 'a % is shown under PNG').toHaveLength(0)
      await expect(compressPane(page).locator('.sp-quality input[type="range"]'), 'the quality slider is enabled for PNG').toBeDisabled()
      await expect(compressPane(page).locator('.sp-quality > span'), 'the lossless row does not say quality is not used').toHaveText('Lossless, quality not used')
      await expect(compressPane(page).locator('.sp-bar').nth(1).locator('.sp-bar-fill'), 'a result that is not smaller is not drawn in the plain fill').toHaveClass(/is-plain/)
      await expect(compressPane(page).locator('.sp-bar').nth(0).locator('.sp-bar-fill'), 'the BEFORE bar took the plain fill').not.toHaveClass(/is-plain/)
      await expect.poll(async () => {
        const [b, a] = await barWidths(page)
        return Math.max(Math.abs(b - 100), Math.abs(a - 100))
      }, { message: 'under PNG both bars are not drawn full width', timeout: 3000 }).toBeLessThan(2.5)

      // Back to a lossy format: the slider and the win colour come back.
      await panel.getByRole('button', { name: 'JPEG', exact: true }).click()
      await expect(compressPane(page).locator('.sp-saving-num'), 'the saving did not return after leaving PNG').toHaveText(/^\d+%$/, { timeout: 15000, useInnerText: true })
      await expect(compressPane(page).locator('.sp-quality input[type="range"]'), 'the slider stayed disabled after leaving PNG').toBeEnabled()

      // The whole run never showed more than one.
      const counts = await page.evaluate(() => window.__pctCounts)
      expect.soft(Math.max(...counts), `% tokens seen across the run: ${JSON.stringify([...new Set(counts)])}`).toBeLessThanOrEqual(2)
      expect.soft(counts, 'the run never reached a state showing the saving and the setting').toContain(2)
      const savings = await page.evaluate(() => window.__savingCounts)
      expect.soft(Math.max(...savings), `saving % tokens seen across the run: ${JSON.stringify([...new Set(savings)])}`).toBeLessThanOrEqual(1)
      expect.soft(savings, 'the run never reached a state showing the saving').toContain(1)

      // The other tabs still open their own panes; the rest stay hidden.
      const tab = (name) => panel.getByRole('tab', { name, exact: true })
      const pane = (cls) => panel.locator(`.sp-cv-pane.${cls}`)
      await tab('3D model').click()
      await expect(pane('sp-model'), '3D model no longer opens its stage').toBeVisible()
      await expect.soft(foot.locator('.sp-tool-link'), 'the 3D footer text link is not the file converter').toHaveText('File Converter')
      await expect.soft(foot, 'the 3D footer pill does not offer the 3D converter').toContainText('Open 3D Model Converter')
      await expect(pane('sp-conv')).toBeHidden()
      await tab('Video frames').click()
      await expect(pane('sp-frames'), 'Video frames no longer opens its strip').toBeVisible()
      await expect(pane('sp-model')).toBeHidden()
      await tab('Aspect ratio').click()
      await expect(pane('sp-ratio'), 'Aspect ratio no longer opens its stage').toBeVisible()
      await expect(pane('sp-frames')).toBeHidden()
      await tab('Compress').click()
      await expect(pane('sp-conv'), 'Compress no longer opens the converter').toBeVisible()
      await expect(pane('sp-ratio')).toBeHidden()

      // The page did not grow sideways.
      expect.soft(
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        'the converter pushed the page sideways',
      ).toBe(0)

      await ctx.close()
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A picked file that is not an image, a very long picked filename, and the 3D
// tab's images.
// ─────────────────────────────────────────────────────────────────────────────

/** A real PNG of pseudo-random pixels (size x size), so the encoders give different sizes. */
function makePng(size, seed) {
  const crcTable = (() => {
    const t = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4)
  head[8] = 8; head[9] = 2 // 8-bit RGB
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let x = seed
  for (let i = 0; i < raw.length; i++) {
    x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff
    raw[i] = i % (size * 3 + 1) === 0 ? 0 : (x >>> 16) & 0xff
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const imageFile = (name, seed = 7) => ({ name, mimeType: 'image/png', buffer: makePng(300, seed) })
const barNum = (page, nth) => compressPane(page).locator('.sp-bar').nth(nth).locator('.sp-bar-num')
const barName = (page, nth) => compressPane(page).locator('.sp-bar').nth(nth).locator('.sp-bar-name')

async function openHome(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'a visitor trying the homepage converter')
  await go(page, '/')
  await panelOf(page).locator('.sp-modes').scrollIntoViewIfNeeded()
  return { ctx, page }
}

test('a file that is not an image keeps the photo and its measurements, and a valid image clears the message', async ({ browser }) => {
  const { ctx, page } = await openHome(browser, 1440)
  const input = compressPane(page).locator('input[type="file"]')
  const message = compressPane(page).locator('.sp-saving')

  await input.setInputFiles(imageFile('first-photo.png', 7))
  await expect(barName(page, 0), 'the chosen photo is not named in the BEFORE row').toHaveText('first-photo.png,')
  await settled(page)
  const beforeText = await barNum(page, 0).innerText()
  const afterWebp = await barNum(page, 1).innerText()
  expect(beforeText, 'the BEFORE size is not a figure').toMatch(/\d/)

  await input.setInputFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 example') })
  await expect(message, 'a file that is not an image gets no message').toContainText('That file is not supported')
  await expect(input, 'the earlier photo is no longer the one on offer').toHaveAttribute('aria-label', 'Replace first-photo.png')
  await expect(barName(page, 0)).toHaveText('first-photo.png,')
  await expect(barNum(page, 0), 'the BEFORE size was wiped by the rejected file').toHaveText(beforeText)
  await expect(barNum(page, 1), 'the AFTER size was wiped by the rejected file').toHaveText(afterWebp)
  await expect(compressPane(page).locator('.sp-art-btn'), 'the photo no longer says Replace').toHaveText('Replace')

  // Measuring still works: a format button changes the AFTER size.
  await panelOf(page).getByRole('button', { name: 'JPEG', exact: true }).click()
  await expect(barName(page, 1)).toHaveText('first-photo.jpeg,')
  await expect(barNum(page, 1), 'the AFTER size did not follow the format button after a rejected file').not.toHaveText(afterWebp, { timeout: 15000 })
  await expect(barNum(page, 1)).toHaveText(/\d/)
  await expect(message, 'the message went away on its own').toContainText('That file is not supported')

  await input.setInputFiles(imageFile('second-photo.png', 99))
  await expect(message, 'a valid image did not clear the message').not.toContainText('not supported', { timeout: 15000 })
  await expect(barName(page, 0)).toHaveText('second-photo.png,')
  await settled(page)

  await ctx.close()
})

for (const width of [390, 1440]) {
  test(`a 100-character filename stays inside the BEFORE and AFTER rows (${width})`, async ({ browser }) => {
    const { ctx, page } = await openHome(browser, width)
    const longName = `${'long-file-name-'.repeat(7).slice(0, 96)}.png`
    expect(longName).toHaveLength(100)

    await compressPane(page).locator('input[type="file"]').setInputFiles(imageFile(longName))
    await expect(barName(page, 0)).toHaveText(`${longName},`)
    await settled(page)

    const geometry = await compressPane(page).evaluate((pane) => {
      const edge = pane.getBoundingClientRect().right
      return [...pane.querySelectorAll('.sp-bar-row')].map((row) => {
        const name = row.querySelector('.sp-bar-name')
        const box = row.getBoundingClientRect()
        return {
          rowOverflow: row.scrollWidth - row.clientWidth,
          rowPastPane: Math.round(box.right - edge),
          nameClipped: name.scrollWidth > name.clientWidth,
          nameInside: name.getBoundingClientRect().right <= box.right + 1,
          nameStyle: getComputedStyle(name).textOverflow,
        }
      })
    })
    expect(geometry, 'expected a BEFORE row and an AFTER row').toHaveLength(2)
    for (const [i, g] of geometry.entries()) {
      expect(g.rowOverflow, `row ${i} content is wider than the row`).toBeLessThanOrEqual(0)
      expect(g.rowPastPane, `row ${i} runs past the converter pane`).toBeLessThanOrEqual(1)
      // A narrow window must cut the name short; a wide one (1440 is 7fr of the grid)
      // may hold all 100 characters, in which case it must still sit inside its row.
      expect(g.nameInside, `row ${i}: the 100-character name runs past its row`).toBe(true)
      if (width <= 768) expect(g.nameClipped, `row ${i}: a 100-character name was not cut short`).toBe(true)
      expect(g.nameStyle, `row ${i}: the cut name has no ellipsis`).toBe('ellipsis')
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      'a long filename pushed the page sideways',
    ).toBe(0)

    await ctx.close()
  })
}

test('the 3D model images are requested only after the 3D tab is first opened', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'a visitor trying the homepage converter')
  const asked = new Set()
  page.on('request', (req) => {
    const m = req.url().match(/\/spectrum\/(model-poster|model-turn)\.webp/)
    if (m) asked.add(m[1])
  })
  await go(page, '/')
  const panel = panelOf(page)
  await panel.locator('.sp-modes').scrollIntoViewIfNeeded()
  // The Compress pane has measured the sample photo, so the page has done its
  // lazy work for the panel in view; the 3D images must still be unasked for.
  await settled(page)
  await page.waitForLoadState('load')
  expect([...asked], 'a 3D image was requested before the 3D tab was opened').toEqual([])

  await panel.getByRole('tab', { name: '3D model', exact: true }).click()
  await expect.poll(() => [...asked].sort(), {
    message: 'opening the 3D tab did not request both the poster and the loop',
    timeout: 15000,
  }).toEqual(['model-poster', 'model-turn'])

  await ctx.close()
})
