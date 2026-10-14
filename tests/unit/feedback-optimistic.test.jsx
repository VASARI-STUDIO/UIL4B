// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Feedback from '../../src/pages/Feedback'
import FeedbackModal from '../../src/components/FeedbackModal'
import { SEND_TIMEOUT_MS } from '../../src/utils/supportRequest'

vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userProfile: null }) }))
vi.mock('../../src/contexts/I18nContext', () => ({ useI18n: () => ({ t: key => key }) }))
vi.mock('../../src/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ isPro: false }) }))
vi.mock('../../src/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('../../src/contexts/AppearanceContext', () => ({ useAppearance: () => ({ reducedMotion: false }) }))
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/feedback' }) }))
vi.mock('../../src/data/toolTree', () => ({ resolveTool: () => null }))
vi.mock('../../src/utils/analytics', () => ({ saveFeedback: vi.fn() }))
vi.mock('../../src/hooks/useModalDialog', () => ({ default: () => ({ current: null }) }))
vi.mock('../../src/hooks/useCloseOnBack', () => ({ useCloseOnBack: () => {}, useInertBehind: () => {} }))
vi.mock('../../src/components/tool/MenuSelect', () => ({ default: ({ children, ...props }) => <select {...props}>{children}</select> }))

let root
let container
let fetchMock
const toast = vi.fn()
const MESSAGE = 'The export button did nothing.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

async function fill(selector, value) {
  const input = container.querySelector(selector)
  const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(label) {
  const button = [...container.querySelectorAll('button')].find(el => el.textContent === label)
  expect(button).toBeDefined()
  await act(async () => button.click())
}

function posted() {
  return fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body))
}

const FORMS = [
  { name: 'Feedback', element: <Feedback toast={toast} />, success: 'feedback.thankYou', another: 'Submit another' },
  { name: 'FeedbackModal', element: <FeedbackModal open onClose={() => {}} />, success: 'Thanks — we\'ve got it', another: 'Send another' },
]

describe.each(FORMS)('$name optimistic delivery', ({ element, success, another, name }) => {
  async function start() {
    await act(async () => root.render(element))
    await fill('#fb-subject', 'Export')
    await fill('#fb-message', MESSAGE)
    const form = container.querySelector('form')
    await act(async () => {
      flushSync(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })
      // Before even an already-resolved fetch can settle: every scenario must
      // fail if confirmation is moved behind the network.
      expectSuccess()
    })
  }

  function expectSuccess() {
    expect(container.textContent).toContain(success)
    expect(container.querySelector('form')).toBeNull()
    expect(container.textContent).not.toContain('Sending...')
    expect(container.textContent).not.toContain('Sending…')
  }

  it('shows success within 300 ms before a 2-second fetch resolves, with one POST despite double submit', async () => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    const started = vi.getRealSystemTime()
    await start()
    expectSuccess()
    expect(vi.getRealSystemTime() - started).toBeLessThan(300)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect([...container.querySelectorAll('button')].find(el => el.textContent === another).disabled).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(2000))
    expectSuccess()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve({ ok: true, status: 200 }))
    await click(another)
    expect(container.querySelector('#fb-message').value).toBe('')
    expect(container.querySelector('#fb-subject').value).toBe('')
  })

  it('retries once after 1.5 seconds, then shows an alert; Try again keeps the exact payload and text', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    await start()
    expectSuccess()
    await act(async () => vi.advanceTimersByTimeAsync(1499))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(posted()[1]).toEqual(posted()[0])
    expect(container.querySelector('[role="alert"]').textContent).toBe("Your message didn't send.")
    expect(container.querySelector('textarea').value).toBe(MESSAGE)
    await act(async () => vi.advanceTimersByTimeAsync(30000))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const pending = deferred()
    fetchMock.mockReturnValueOnce(pending.promise)
    const retry = [...container.querySelectorAll('button')].find(el => el.textContent === 'Try again')
    await act(async () => { retry.click(); retry.click() })
    expectSuccess()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(posted()[2]).toEqual(posted()[0])
    await act(async () => pending.resolve({ ok: true, status: 200 }))
  })

  it.each([400, 401, 403, 404, 422])('does not retry HTTP %i and keeps the message', async status => {
    fetchMock.mockResolvedValue({ ok: false, status })
    await start()
    expect(container.querySelector('[role="alert"]').textContent).toBe("Your message didn't send.")
    expect(container.querySelector('textarea').value).toBe(MESSAGE)
    await act(async () => vi.advanceTimersByTimeAsync(30000))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries 429 once, then shows rate-limit copy and the same retry button', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 })
    await start()
    expectSuccess()
    await act(async () => vi.advanceTimersByTimeAsync(1500))
    expect(container.querySelector('[role="alert"]').textContent).toBe('Too many messages just now. Try again in a minute.')
    expect(posted()[1]).toEqual(posted()[0])
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    await click('Try again')
    expect(posted()[2]).toEqual(posted()[0])
  })

  it.each(['network', '408', 'timeout'])('retries a %s failure with the same ID and can confirm successfully', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'))
    else if (failure === '408') fetchMock.mockResolvedValueOnce({ ok: false, status: 408 })
    else fetchMock.mockImplementationOnce((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('timeout')))
    }))
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    await start()
    expectSuccess()
    if (failure === 'timeout') await act(async () => vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS))
    await act(async () => vi.advanceTimersByTimeAsync(1500))
    expectSuccess()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(posted()[1]).toEqual(posted()[0])
    await click(another)
    await fill('#fb-message', MESSAGE)
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(posted()[2].requestId).not.toBe(posted()[0].requestId)
  })

  it('continues retrying after unmount without aborting or updating the old form', async () => {
    const pending = deferred()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ok: false, status: 503 })
    await start()
    expectSuccess()
    const signal = fetchMock.mock.calls[0][1].signal
    await act(async () => root.unmount())
    root = null
    expect(signal.aborted).toBe(false)
    await act(async () => pending.resolve({ ok: false, status: 503 }))
    await act(async () => vi.advanceTimersByTimeAsync(1500))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(posted()[1]).toEqual(posted()[0])
  })

  if (name === 'FeedbackModal') {
    it('keeps the pending send on close and reopen, then restores its text on failure', async () => {
      const pending = deferred()
      fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ok: false, status: 503 })
      await start()
      await act(async () => root.render(<FeedbackModal open={false} onClose={() => {}} />))
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false)
      await act(async () => root.render(element))
      expectSuccess()
      await act(async () => pending.resolve({ ok: false, status: 503 }))
      await act(async () => vi.advanceTimersByTimeAsync(1500))
      expect(container.querySelector('textarea').value).toBe(MESSAGE)
      expect(posted()[1]).toEqual(posted()[0])
    })
  }
})
