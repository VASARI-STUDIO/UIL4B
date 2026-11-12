// Shared set-up for the specs that drive the error cards (224, 366): making a
// page crash or fail to load, moving inside the app without a page load, and
// taking the connection away the way the app reads it.
//
//   crash       the page's chunk is served as a module that throws
//   load-failed the chunk request is aborted
//   in-app      a real history PUSH through the router's own history object,
//               found on the React tree: a pushState with a dispatched popstate
//               is a POP, which the 404 treats differently
//   spent       the one automatic reload is already used (sessionStorage guard),
//               so the failure lands on the first try
import { expect } from '@playwright/test'
import { go } from './helpers.js'

export const PROBE = 'probe crash for the error cards'
export const CREDITS_CHUNK = '**/assets/Credits-*.js'
export const SETTINGS_CHUNK = '**/assets/Settings-*.js'
export const PALETTE_CHUNK = '**/assets/PaletteBuilder-*.js'
export const COMMAND_PALETTE_CHUNK = '**/assets/CommandPalette-*.js'
export const TITLE_CRASH = 'This page stopped working'
export const TITLE_LOAD = 'This page didn’t load'

/** The router's own history object, found on the React tree, pushed to. */
export function pushInApp(page, to) {
  return page.evaluate((target) => {
    const root = document.getElementById('root')
    const key = Object.keys(root).find((k) => k.startsWith('__reactContainer'))
    const stack = [root[key]]
    const seen = new Set()
    let navigator = null
    while (stack.length && !navigator) {
      const node = stack.pop()
      if (!node || seen.has(node)) continue
      seen.add(node)
      const value = node.memoizedProps && node.memoizedProps.value
      if (value && value.navigator && typeof value.navigator.push === 'function') navigator = value.navigator
      stack.push(node.child, node.sibling)
    }
    if (!navigator) throw new Error('the router history was not found on the React tree')
    navigator.push(target)
  }, to)
}

/** The state right after the one automatic reload: a second failure must not reload again. */
export function spendReload(page) {
  return page.evaluate(() => sessionStorage.setItem('vs-chunk-reload', String(Date.now())))
}

/** Serve `glob` as a module that throws; the count is how often it was asked for. */
export async function crashChunk(page, glob) {
  const asked = { count: 0 }
  await page.route(glob, (route) => {
    asked.count += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `throw new Error(${JSON.stringify(PROBE)})`,
    })
  })
  return asked
}

/** Fail `glob`; the count is how often it was asked for. */
export async function failChunk(page, glob) {
  const asked = { count: 0 }
  await page.route(glob, (route) => { asked.count += 1; return route.abort() })
  return asked
}

/** Pin the connection state the way the app reads it, and take the context offline to match. */
export async function setConnection(page, context, online) {
  await context.setOffline(!online)
  await page.evaluate((on) => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on })
    window.dispatchEvent(new Event(on ? 'online' : 'offline'))
  }, online)
}

/** The home page itself (`/` or `/home`): the command palette's file throws when it opens. */
export async function landHomeCrash(page, path = '/') {
  await crashChunk(page, COMMAND_PALETTE_CHUNK)
  await go(page, path)
  await spendReload(page)
  await page.keyboard.press('/')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_CRASH)
  return { card }
}

/** In-app to /settings, which crashes inside the app shell. */
export async function landShellCrash(page) {
  await go(page, '/privacy')
  await spendReload(page)
  const asked = await crashChunk(page, SETTINGS_CHUNK)
  await pushInApp(page, '/settings')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_CRASH)
  return { card, asked }
}

/** In-app to /create/palette, which crashes on a route that returns before the shell. */
export async function landChromelessCrash(page) {
  await go(page, '/privacy')
  await spendReload(page)
  const asked = await crashChunk(page, PALETTE_CHUNK)
  await pushInApp(page, '/create/palette')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_CRASH)
  return { card, asked }
}

/** In-app to /credits with its file aborted: the page that did not download. */
export async function landLoadFailed(page) {
  await go(page, '/privacy')
  await spendReload(page)
  const asked = await failChunk(page, CREDITS_CHUNK)
  await pushInApp(page, '/credits')
  const card = page.locator('.error-boundary--load')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_LOAD)
  return { card, asked }
}
