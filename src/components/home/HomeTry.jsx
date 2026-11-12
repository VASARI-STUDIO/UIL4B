import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLenis } from '../../hooks/useSmoothScroll'
import { prefersReducedMotion } from '../spectrum/reducedMotion'
import { TOOL_COUNT, numberWord, route } from '../spectrum/spectrumFacts'
import { COLOUR_SYSTEMS, FREE_COLOUR_SYSTEMS } from '../../config/colourSystems'
import { ICON_PACK_TIERS } from '../../data/iconPackTiers'
import PaletteTool from './try/PaletteTool'
import IconTool from './try/IconTool'
import FontTool from './try/FontTool'
import ConverterTool from './try/ConverterTool'
import '../../styles/pages/home-try.css'

// TRY THE TOOLS. Four tools, each in a fixed 600px frame, so nothing shifts as
// they load. From 1200px the names column is pinned and the tools scroll past on
// the right; under 1200 the same markup is a sticky names row over four chapters.
// The active tool follows the scroll: the tool whose frame is nearest the middle of
// the window (with a margin before it hands over), or, under 1200, the last chapter
// whose top has passed a line a third of the way down. Clicking a name scrolls to
// its tool through Lenis, which owns the scroll on this page.
//
// The pinned column never changes layout: each name is a fixed 72px row, the open
// description is drawn over the space beneath its name, and the names below it are
// moved down by that description's height (--open-h) with a transform. The thin
// progress line follows the scroll between the first tool and the last (--p).

const WIDE = '(min-width: 1200px)'
// Under 1200: the sticky names row is 44px tall, and a chapter lands 16px below it.
const NAMES_H = 44
const CHAPTER_GAP = 16
// How far nearer the next tool must be before it takes over (px).
const HYSTERESIS = 24
// The settle: after the scroll has been idle this long (ms), a tool within this share
// of the window height of its landing spot eases the rest of the way (Lenis, seconds).
const SETTLE_IDLE = 150
const SETTLE_REACH = 0.25
const SETTLE_DURATION = 0.5
// Closer than this (px) counts as landed.
const SETTLE_EPS = 2

// The scroll position that lands a tool: centred from 1200, below the names row under it.
function landingY(el, wide) {
  const r = el.getBoundingClientRect()
  return wide
    ? r.top + window.scrollY - (window.innerHeight - r.height) / 2
    : r.top + window.scrollY - (NAMES_H + CHAPTER_GAP)
}

const FREE_PACKS = Object.values(ICON_PACK_TIERS).filter((p) => p.tier !== 'paid').length
const PRO_PACKS = Object.values(ICON_PACK_TIERS).filter((p) => p.tier === 'paid').length
const FREE_SYSTEMS = FREE_COLOUR_SYSTEMS.length
const PRO_SYSTEMS = COLOUR_SYSTEMS.length - FREE_SYSTEMS

const TOOLS = [
  {
    id: 'palette',
    name: 'Palette Builder',
    short: 'Palette',
    lead: 'Build a full palette from one colour, with tints, shades and accessible pairings.',
    next: `Your five colours open in the full tool, ready to build on. Pull a palette from a photo, try ${numberWord(FREE_SYSTEMS)} colour systems free and ${numberWord(PRO_SYSTEMS)} more with Pro, and grow it further.`,
    body: <PaletteTool />,
  },
  {
    id: 'icons',
    name: 'Icon Library',
    short: 'Icons',
    lead: 'A searchable library of the popular open-source icon packs.',
    next: `In the full tool, search for the same icon, flip it, rotate it and copy it as SVG, or paste in your own. A free account opens ${numberWord(FREE_PACKS)} packs; Pro opens ${numberWord(PRO_PACKS)} more, with brand logos, flags and emoji.`,
    body: <IconTool />,
  },
  {
    id: 'font-gallery',
    name: 'Font Gallery',
    short: 'Fonts',
    lead: 'The Google Fonts catalogue, set in your own words with live specimens.',
    next: 'Open a family in the full tool to see every weight and three suggested pairings, and to copy its import URL. Send it on to Font Pair to choose a heading and body.',
    body: <FontTool />,
    // On phones the Font Pair link sits under the card, as the frame's tray has no room for it.
    after: <Link className="ht-fp" to={route('font-pair')}>Build a font pair</Link>,
  },
  {
    id: 'file-converter',
    name: 'File Converter',
    short: 'Converter',
    lead: 'Convert and compress images and video.',
    // The photo carries over because the converter hands the chosen file to the full tool.
    next: 'Your own photo carries over, ready to convert. In the full tool you can convert many images at once, build animations and edit video. Converting needs no account; downloading needs a free one.',
    body: <ConverterTool />,
  },
]

export default function HomeTry() {
  const [cur, setCur] = useState(0)
  const stages = useRef([])
  const names = useRef([])
  const nav = useRef(null)
  const infos = useRef([])
  const progress = useRef(-1)
  // A name click owns the active tool until the scroll lands (or this long passes).
  const dest = useRef(null)
  const destTimer = useRef(0)
  useEffect(() => () => clearTimeout(destTimer.current), [])

  const isWide = () => typeof window !== 'undefined' && window.matchMedia?.(WIDE).matches

  const track = useCallback(() => {
    const els = stages.current.filter(Boolean)
    if (els.length !== TOOLS.length) return
    // How far the scroll has carried the view from the first tool to the last (0 to 1).
    const tops = els.map((el) => { const r = el.getBoundingClientRect(); return isWide() ? r.top + r.height / 2 : r.top })
    const mark = isWide() ? window.innerHeight / 2 : NAMES_H + window.innerHeight * 0.3
    const span = tops[tops.length - 1] - tops[0]
    const p = span > 0 ? Math.min(1, Math.max(0, (mark - tops[0]) / span)) : 0
    if (nav.current && Math.abs(p - progress.current) > 0.002) {
      progress.current = p
      nav.current.style.setProperty('--p', p.toFixed(3))
    }
    if (dest.current) {
      const r = els[dest.current.i].getBoundingClientRect()
      const there = isWide() ? Math.abs(r.top + r.height / 2 - window.innerHeight / 2) < 3 : Math.abs(r.top - (NAMES_H + CHAPTER_GAP)) < 3
      if (there) dest.current = null
      else return
    }
    setCur((was) => {
      if (isWide()) {
        const mid = window.innerHeight / 2
        const d = els.map((el) => { const r = el.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - mid) })
        let k = 0
        d.forEach((v, i) => { if (v < d[k]) k = i })
        return k !== was && d[k] + HYSTERESIS < d[was] ? k : was
      }
      const line = NAMES_H + window.innerHeight * 0.3
      let at = 0
      els.forEach((el, i) => { if (el.getBoundingClientRect().top <= line) at = i })
      return at
    })
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; track() })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    track()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [track])

  // The open description's height, for the names below it to move down by. Only the
  // pinned column from 1200 draws a description under its name.
  const measure = useCallback((i) => {
    const el = nav.current
    if (!el) return
    const h = isWide() ? (infos.current[i]?.offsetHeight ?? 0) : 0
    el.style.setProperty('--open-h', `${h}px`)
  }, [])
  const open = useRef(0)
  useLayoutEffect(() => { open.current = cur; measure(cur) }, [cur, measure])
  useEffect(() => {
    const again = () => measure(open.current)
    window.addEventListener('resize', again)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(again)
    if (nav.current) ro?.observe(nav.current)
    document.fonts?.ready.then(again)
    return () => { window.removeEventListener('resize', again); ro?.disconnect() }
  }, [measure])

  // A name click scrolls to that tool: centred from 1200, below the names row
  // under it. Lenis owns the scroll on this route and would undo a native scrollTo,
  // so ask it when it is there; the native call covers reduced motion, where it is not.
  const go = (i) => {
    const el = stages.current[i]
    if (!el) return
    dest.current = { i }
    clearTimeout(destTimer.current)
    destTimer.current = setTimeout(() => { dest.current = null }, 900)
    setCur(i)
    const y = landingY(el, isWide())
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    el.focus({ preventScroll: true })
  }

  // A gentle settle: once the scroll has been idle, the tool nearest its landing spot
  // eases onto it, if it is close. Only through Lenis (so never under reduced motion),
  // never while a name click, a held pointer or a Lenis scroll is under way, and never
  // against the way out of the section: past the first tool going up, or the last going down.
  useEffect(() => {
    let timer = 0
    let held = false
    let lastY = window.scrollY
    let dir = 0
    const settle = () => {
      timer = 0
      if (held || dest.current || prefersReducedMotion()) return
      const lenis = getLenis()
      if (!lenis || lenis.isStopped) return
      if (lenis.isScrolling) { arm(); return }
      const els = stages.current.filter(Boolean)
      if (els.length !== TOOLS.length) return
      const wide = isWide()
      let at = 0
      let delta = Infinity
      els.forEach((el, i) => {
        const d = landingY(el, wide) - window.scrollY
        if (Math.abs(d) < Math.abs(delta)) { at = i; delta = d }
      })
      if (Math.abs(delta) < SETTLE_EPS || Math.abs(delta) > window.innerHeight * SETTLE_REACH) return
      if (at === 0 && delta > 0 && dir < 0) return
      if (at === els.length - 1 && delta < 0 && dir > 0) return
      lenis.scrollTo(window.scrollY + delta, { duration: SETTLE_DURATION })
    }
    function arm() {
      clearTimeout(timer)
      timer = setTimeout(settle, SETTLE_IDLE)
    }
    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y }
      arm()
    }
    const hold = () => { held = true }
    const release = () => { held = false; arm() }
    const onMove = (e) => { if (held && e.buttons === 0) release() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', hold, { passive: true })
    window.addEventListener('pointerup', release, { passive: true })
    window.addEventListener('pointercancel', release, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('blur', release)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', hold)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('blur', release)
    }
  }, [])

  // Focus landing anywhere in a tool makes it the active one, so the names follow the keyboard.
  const onStageFocus = (i) => { if (cur !== i && !dest.current) setCur(i) }

  // Escape inside a tool returns to that tool's name.
  const onStageKey = (e, i) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    names.current[i]?.focus()
  }

  return (
    <div className="ht" data-pins>
      <div className="ht-in">
        <header className="ht-head">
          <h2 className="ht-h" id="try-h" tabIndex={-1}>Say hello to UI L4B.</h2>
          <p className="ht-sub">
            Build a palette, find an icon, try a font and shrink a photo, right here with no account.
            Your photo never leaves your browser.
          </p>
        </header>

        <div className="ht-split">
          <div className="ht-left">
            <nav className="ht-names" aria-label="Tools in this section" ref={nav} style={{ '--k': cur }}>
              <i className="ht-prog" aria-hidden="true" />
              <i className="ht-mark" aria-hidden="true" />
              <span className="ht-count" aria-hidden="true">{`0${cur + 1} / 0${TOOLS.length}`}</span>
              {TOOLS.map((t, i) => (
                <div key={t.id} className="ht-it" data-on={cur === i ? 'true' : 'false'} data-after={i > cur ? 'true' : 'false'}>
                  <button
                    type="button"
                    className="ht-n"
                    id={`ht-n-${i}`}
                    ref={(el) => { names.current[i] = el }}
                    aria-current={cur === i ? 'true' : undefined}
                    aria-controls={`ht-s-${i}`}
                    onClick={() => go(i)}
                  >
                    {/* Phones have a quarter of the width each, so they read the short name. */}
                    <span data-l>{t.name}</span><span data-s>{t.short}</span>
                  </button>
                  {/* The same text is the tool's own description (aria-describedby), so it is read once. */}
                  <div className="ht-acc" aria-hidden="true">
                    <div className="ht-acc-in">
                      <div className="ht-info" ref={(el) => { infos.current[i] = el }}><p className="ht-lead">{t.lead}</p><p className="ht-next">{t.next}</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <div className="ht-stages">
            {TOOLS.map((t, i) => (
              <article
                key={t.id}
                className="ht-stage"
                data-on={cur === i ? 'true' : 'false'}
                id={`ht-s-${i}`}
                ref={(el) => { stages.current[i] = el }}
                aria-labelledby={`ht-h3-${i}`}
                aria-describedby={`ht-d-${i}`}
                aria-keyshortcuts="Escape"
                tabIndex={-1}
                onFocus={() => onStageFocus(i)}
                onKeyDown={(e) => onStageKey(e, i)}
              >
                <h3 className="ht-h3" id={`ht-h3-${i}`}><span data-l>{t.name}</span><span data-s>{t.short}</span></h3>
                {/* On phones the lead sits under the name and the next-step text under the link. */}
                <div className="ht-d ht-info" id={`ht-d-${i}`}><p className="ht-lead">{t.lead}</p><p className="ht-next">{t.next}</p></div>
                <div className="ht-fr">{t.body}</div>
                {t.after}
              </article>
            ))}
          </div>
        </div>

        <div className="ht-exit">
          <p className="ht-exit-t">{numberWord(TOOL_COUNT - TOOLS.length).replace(/^./, (c) => c.toUpperCase())} more tools, for colour, type, icons and images.</p>
          <Link className="ht-exit-go" to="/sitemap" onClick={openCreateMenu}>{`See all ${TOOL_COUNT} tools`}</Link>
        </div>
      </div>
    </div>
  )
}

// The page's own link to the tool list: if the header's Create menu answers the
// event the click is handled there, otherwise the sitemap loads.
function openCreateMenu(e) {
  if (!window.dispatchEvent(new CustomEvent('uil4b:open-menu', { detail: { section: 'create' }, cancelable: true }))) e.preventDefault()
}
