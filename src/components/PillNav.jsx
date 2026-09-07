import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
import { localiseTools } from '../data/tools'
import { searchHints } from '../data/toolIndex'
// The menu shows the product's real contents, so it reads the same gallery
// data the tools themselves read. This costs NOTHING at the bar's first
// paint: both modules are already in the main bundle today (verified by
// grepping the built asset for a known palette id and a known gradient id --
// paletteLibrary.js and SurfaceLanding.jsx already pull them in), so this is
// a second consumer of bytes that ship regardless, not new weight.
import { GALLERY_PALETTES } from '../data/paletteGallery'
import { GALLERY_GRADIENTS, gradientCss } from '../data/gradientGallery'
import usePopover from '../hooks/usePopover'
import { BRAND_KIT_STEPS, guideEntry, isGuideActive, startGuide } from '../utils/brandKitGuide'
import { getRecentIcons } from '../utils/recentIcons'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { useI18n } from '../contexts/I18nContext'
import { ADMIN_EMAILS } from '../utils/constants'
import NavIcon from './NavIcon'
import ThemeChoice from './ThemeChoice'

// Overlays are code-split: the command palette and the export shell only load
// the first time a visitor actually opens them, so they never weigh on the nav's
// first paint.
const CommandPalette = lazy(() => import('./CommandPalette'))
const ExportPanel = lazy(() => import('./ExportPanel'))

// The marketing / app nav: a fixed, full-width standard-SaaS top bar with three
// mega-menus (Create / Discover / Learn) driven entirely by src/data/toolTree.js,
// so the menu can never drift from the router. One shared panel morphs width per
// section — sized to what that menu actually holds instead of a fixed dropdown
// width — and carries a right-hand promo card; on mobile
// it becomes a full-screen sheet with accordions. The centre holds the search
// field (reusing the CommandPalette index); the right cluster holds the Export
// shell, the auth/upgrade CTAs and the Avatar account popover. Auth +
// subscription are read ONLY — to decide account vs. upgrade CTA and to gate the
// admin link's *visibility* — never written here.
//
// State is set exclusively from user events (click / hover / scroll / key), never
// synchronously inside an effect, so we stay clear of the `set-state-in-effect`
// advisory. Effects only attach/detach listeners.

// Marketing / conversion routes where there's nothing to export — the resting
// bar drops the Export shell and leads with the "Get Pro" conversion pill
// instead (matches the sales-page nav reference).
const SALES_PATHS = new Set(['/', '/home', '/plans', '/pricing'])

const MENU_TOOL_COPY = {
  palette: 'Build a usable palette from one seed.',
  gradient: 'Compose and copy production CSS.',
  contrast: 'Check WCAG pairs and repair failures.',
  tint: 'Tune a complete 50–950 scale.',
  semantic: 'Map intent across light and dark modes.',
  'font-gallery': '',
  'font-pair': '',
  'type-scale': '',
  'component-designer': 'Shape components and their states.',
  'box-shadow': 'Build deliberate depth systems.',
  // Says what comes OUT, because that is the only honest way to describe a
  // generator: the old line promised 'a connected UI foundation', which is
  // three abstractions and no artefact.
  'auto-builder': 'Describe it; get a palette, fonts and a scale.',
  // '' is deliberate and is NOT the same as deleting the key -- see
  // menuDescription. These seven labels are already the sentence: a gallery of
  // fonts, a pairing of fonts, a scale of type, a library of icons, a library of
  // emoji, a calculator of aspect ratios, the text of an alt attribute. The
  // Discover row for the same icon page keeps ITS line because "200k+" is a
  // count, not a restatement.
  icons: '',
  // The Discover surface lists the same page under its own group id, and a menu
  // row is one line — without this it would fall back to the group's full
  // sentence and run three lines deep beside its one-line neighbours.
  'icon-library': 'Search and copy 200k+ SVG icons.',
  emoji: '',
  'file-converter': 'Convert and compress files locally.',
  ratio: '',
  'ai-prompt': 'Structure production-ready image prompts.',
  'landing-prompts': 'Plan a page around a clear outcome.',
  'alt-text': '',
  prompts: 'Reuse prompts proven by the community.',
  // Discover rows. Without these the row falls back to the group's `desc` in
  // toolTree.js, which is page copy — a full sentence written for the card on
  // /discover, not for a menu row. Measured in the browser at 1440: Gradient
  // Library and Prompt Library each ran THREE lines, making an 84px row next to
  // a 54px neighbour and pushing the panel past the bottom of a 768px screen.
  // A menu row is one line (the Higgsfield and Hers mega-menus on Mobbin are
  // both strictly one), so these are the one-line forms of the same promise.
  'palette-library': 'Copy a curated colour system.',
  'gradient-gallery': 'Production-ready CSS gradients.',
  'community-prompts': 'Proven by the community, not scraped.',
  inspiration: 'Community UI systems, curated.',
  curated: 'External tools that earn a tab.',
  collections: 'Save and organise what you find.',
}

// A row's second line has to EARN its place. Two rules decide it, and both
// read data the row already carries rather than adding an eighth hand-kept list.
//
// ONE: A SOON ROW GETS NO DESCRIPTION. Describing what an unbuilt tool will do
// is a sentence about something that does not exist -- the same fault #352 took
// out of the card, where a drawing of a UI stood in for a UI. Withholding the
// line is also what makes live and unbuilt read apart straight down a column
// without hunting for a badge, which is the reasoning that already governs
// Learn getting no preview. It keys off `t.soon`, so a tool shipping is the
// only edit needed to give its line back -- the copy below stays put meanwhile.
//
// TWO: AN EXPLICIT '' MEANS THE LABEL ALREADY SAYS IT. Note the `in` test and
// not a truthy one: DELETING a key would not drop the line, it would fall
// through to the group's `desc` -- page copy written for a card on /discover,
// which is exactly how "Reuse prompts proven by the community." came to be
// clipped mid-phrase to "...proven by the" in a 196px column.
function menuDescription(section, tool) {
  if (tool.soon) return ''
  if (tool.id in MENU_TOOL_COPY) return MENU_TOOL_COPY[tool.id]
  return section.groups?.find((group) => group.id === tool.id)?.desc || ''
}

// Small inline chevron so the nav has zero asset dependencies.
function Chevron() {
  return (
    <svg className="pnav-chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="pnav-search-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.25" />
      <path d="m20 20-3.65-3.65" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MeatballIcon() {
  // Horizontal 3-dot "more" affordance — the resting utility button. Reads as
  // "additional options" and stays crisp at nav size.
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}

function GearIcon() {
  // Canonical Lucide "settings" cog — even, well-formed teeth that stay crisp at
  // nav size (the previous hand-rolled path rendered lumpy/asymmetric).
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8L13.8 21a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.3-2.7 3.8" />
      <circle cx="12" cy="17.3" r=".5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function LoginArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  )
}


// Terms the search placeholder cycles through on hover.
//
// THEY ARE SELECTED FROM THE REGISTRY, never written down. This used to be a
// hand-kept array — ['palette builder', 'gradients', 'font pairing',
// 'contrast checker', 'type scale', 'emoji library'] — and by 2026-09-03 half
// of it was already false: typing "palette builder" or "contrast checker" into
// the search it advertises returned "No results", and "gradients" landed on the
// colour sales page rather than the Gradient Generator. In the PERSISTENT NAV,
// on EVERY page. A term that finds nothing when typed is a lie, and a list a
// human has to remember to update is one rename away from telling it.
//
// searchHints() is the same rule #320 gave the homepage hero (/create/ only,
// nothing still in the workshop, labels short enough not to truncate), reading
// the same derived index. The two surfaces now cycle the same words because
// they read the same source, not because someone kept two lists matching.
//
// The RENDER still differs, and only the render: the hero drives a real
// <input placeholder>, while this "field" is a <button> with no placeholder to
// animate, so the characters go into a <span>. Same data, different element.
function useSearchHints() {
  const { t } = useI18n()
  return useMemo(() => searchHints(localiseTools(t).filter((tl) => !tl.soon)), [t])
}

// Milliseconds per character typed / deleted, and the hold at a completed word.
const TYPE_MS = 55
const ERASE_MS = 28
const HOLD_MS = 1100

// The nav search placeholder. At rest it reads "Search tools…"; while the field
// is hovered or focused it types the terms above one character at a time,
// holds, erases, and moves on.
//
// THREE THINGS THIS DELIBERATELY DOES NOT DO.
//
// It does not run at load. The timer only exists while `active` is true, so a
// signed-out homepage does no work for it until the pointer arrives — which is
// what keeps it clear of the LCP/CLS budgets recorded on `homepage-field-metrics`.
//
// It does not animate under reduced motion. A character-by-character reveal is
// animation whether it is done in CSS or in JS, and the global
// `transition-duration: 0.01ms` rule cannot reach a setState loop. `active` is
// false whenever motion is reduced, so the static text simply stays.
//
// It is not read by assistive technology. The button already has a fixed
// accessible name ("Search UIL4B"); a live stream of half-typed words on top of
// that is noise, so the animated span is aria-hidden and the static label is
// what a screen reader gets.
function SearchPlaceholder({ active }) {
  const hints = useSearchHints()
  const [typed, setTyped] = useState('')
  const [term, setTerm] = useState(0)

  // Every setState below happens inside a timer callback, never synchronously
  // in the effect body — the first character is scheduled rather than written,
  // and the reset on deactivation happens in the cleanup. That is what keeps
  // this off the `react-hooks/set-state-in-effect` warning count, which the
  // build gate holds at a fixed number.
  useEffect(() => {
    if (!active || !hints.length) return undefined
    let cancelled = false
    let timer
    const word = hints[term % hints.length]
    const step = (i, erasing) => {
      if (cancelled) return
      setTyped(word.slice(0, i))
      if (!erasing && i < word.length) timer = setTimeout(() => step(i + 1, false), TYPE_MS)
      else if (!erasing) timer = setTimeout(() => step(i, true), HOLD_MS)
      else if (i > 0) timer = setTimeout(() => step(i - 1, true), ERASE_MS)
      else setTerm(t => t + 1)
    }
    timer = setTimeout(() => step(0, false), TYPE_MS)
    return () => { cancelled = true; clearTimeout(timer); setTyped('') }
  }, [active, term, hints])

  if (!active) return <span className="pnav-search-ph">Search tools&hellip;</span>
  return (
    <span className="pnav-search-ph pnav-search-ph--typing" aria-hidden="true">
      {typed}
      <i className="pnav-search-caret" />
    </span>
  )
}

// The Light / Dark / System control, shared by the account popover (signed in),
// the compact menu popover (signed out) and the mobile sheet, so the theme reads
// identically wherever it is reached. The buttons themselves live in
// ThemeChoice.jsx, which /settings renders too — one implementation, because the
// last arrangement had the control in exactly one popover that is display:none
// below 768px and nowhere else at all.
function ThemeSeg() {
  return (
    <div className="pnav-pop-row">
      <span className="pnav-pop-row-label">Theme</span>
      <ThemeChoice />
    </div>
  )
}

// Initials for the avatar fallback when a user has no profile photo.
function initials(profile, user) {
  const src = profile?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// What the card shows is the product's REAL contents, not a drawing of them.
//
// PromoMock, which this replaces, drew grey <rect> bars standing in for text and
// coloured rectangles standing in for swatches -- a picture of a UI that does not
// exist. At the card's 260px that reads as a component which failed to load, and
// it is the single loudest generic tell in the panel: the menu that leads to 64
// real palettes and 100 real gradients was showing none of them.
//
// #340 already proved the fix on this exact product. The eight /discover cards
// were eight identical white rectangles; they now lead with three actual
// palettes, three actual gradients at their STORED angles and a real specimen,
// read from the gallery data the tools use. This is that same move, applied to
// the last surface still showing the fake version. Keyed by section here rather
// than in NAV_SECTIONS because it is presentation, which also keeps it clear of
// [handkept-tool-lists-remaining] -- the same reasoning SurfaceLanding.jsx uses.
//
// LEARN DELIBERATELY GETS NOTHING. It is honestly coming-soon, and #340
// established that withholding the preview is what makes live and unbuilt read
// apart without hunting for a badge. A drawing of a book is a picture of content
// that has not been written, which is the one claim this pass exists to remove.
//
// This component owns its own frame and returns null when there is nothing
// honest to show, so "which sections have a preview" is stated exactly once. A
// caller-side list would be a second copy free to drift from these branches, and
// Learn would end up rendering an empty bordered box.
function MenuPreview({ section }) {
  const inner = previewFor(section)
  if (!inner) return null
  return <div className="pnav-editorial-visual" aria-hidden="true">{inner}</div>
}

function previewFor(section) {
  if (section === 'create') {
    // The artefacts the guided flow actually produces: a real palette, and the
    // two families that are genuinely installed. A third specimen is impossible
    // to do honestly here -- --display resolves to 'Manrope', the same value as
    // --font, so it would render a duplicate and pass it off as variety. That is
    // the trap the Font Gallery preview hit first; see serif-token-is-not-a-serif.
    const palette = GALLERY_PALETTES[0]
    return (
      <div className="pnav-prev pnav-prev--create">
        <div className="pnav-prev-swatches">
          {palette.colors.map((c, i) => (
            <span className="pnav-prev-swatch" key={`${c}-${i}`} style={{ background: c }} />
          ))}
        </div>
        <div className="pnav-prev-type">
          <span className="pnav-prev-ag">Ag</span>
          <span className="pnav-prev-mono">0123 abc</span>
        </div>
      </div>
    )
  }
  if (section === 'discover') {
    // At their stored angles, so a gradient in the nav is the same object the
    // gallery renders rather than a flat approximation of it.
    return (
      <div className="pnav-prev pnav-prev--discover">
        {GALLERY_GRADIENTS.slice(0, 3).map((g) => (
          <span
            className="pnav-prev-grad"
            key={g.id}
            style={{ backgroundImage: gradientCss(g.type, g.angle, g.stops) }}
          />
        ))}
      </div>
    )
  }
  return null
}

export default function PillNav() {
  const { user, userProfile, logout, knownAccounts, switchAccount } = useAuth()
  const { openLogin } = useLoginPrompt()
  const { isPro } = useSubscription()
  const { reducedMotion } = useAppearance()
  // The saved design is what the brand-kit walkthrough measures its
  // progress against, so the nav's own CTA can say whether it starts or
  // resumes. Same object the tools write and the project cards read.
  const { design } = useProject()
  // Hover/focus on the search field. Drives both the width expansion and the
  // typing placeholder; the CSS could do the width on its own, but the timer
  // needs to know too, and one source beats two that can disagree.
  const [searchHot, setSearchHot] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // THE FRONT DOOR. Founder instruction, 2026-09-05: the navigation entry
  // “should start a guided walkthrough to build a full system”, and “build a
  // brand kit should go straight into step 1”.
  //
  // IT USED TO GO TO `/create/color`, WHICH IS NOT A STEP AND NOT A TOOL. That
  // route renders ColorLanding, the compressed colour sales page, and the only
  // page rendering the guide's colour step moved to `/create/semantic-color`.
  // So this button set a flag and dropped the visitor on a page of links with no
  // step bar and no popup — the walkthrough was unreachable from its own front
  // door. Step one is now `/create/palette`, the route SYSTEM_PARTS and
  // FIRST_WINS already name as the colour tool.
  //
  // A FRESH start always opens step one, which is the founder's instruction. If
  // the flow is ALREADY RUNNING the same control RESUMES instead, landing on the
  // first step with no work in it — a setup checklist you come back to shows you
  // what is left rather than restarting you (Klaviyo's "Set up your account").
  // `guideEntry` decides; nothing about it lives in this component.
  //
  // A plain <button>, deliberately. Staging state and then navigating from a
  // <Link onClick> is the defect utils/handoffSlot.js documents — React Router
  // runs the handler on a Ctrl/Cmd/Shift-click too and only then declines to
  // navigate, arming the flow in a tab that never enters it. A button has no
  // modified-click navigation to lose, so there is nothing to strand.
  //
  // Read straight rather than memoised: `guideEntry` is pure arithmetic over an
  // object already in context, and the two storage reads behind it are a flag
  // and a <=20-item list. PillNav re-renders on route change and menu state, not
  // per scroll event, so this is a handful of reads per navigation.
  const brandKitEntry = guideEntry(design, {
    active: isGuideActive(),
    iconsTouched: getRecentIcons().length > 0,
  })
  const launchBrandKit = () => {
    closeAll()
    startGuide()
    navigate(brandKitEntry.path)
  }
  // On marketing/sales routes there's nothing to export, so the bar leads with
  // the conversion pill instead of the Export shell.
  const isSalesPage = SALES_PATHS.has((location.pathname || '/').replace(/\/+$/, '') || '/')
  const [open, setOpen] = useState(null) // active mega-menu section id, or null
  const [menu, setMenu] = useState(null) // 'account' | null (merged profile + settings popover)
  const [sheet, setSheet] = useState(false) // mobile sheet open
  const [sheetSection, setSheetSection] = useState('create') // expanded accordion
  const [scrolled, setScrolled] = useState(false)
  // Sales pages hide the signed-out "Start for Free" pill until the visitor has
  // scrolled down to section 2 (the homepage mini-workbench, #workbench; older
  // sales sections use #create); routes without that section show it straight away.
  //
  // "Straight away" has to mean the FIRST PAINT, which is why this seeds from
  // isSalesPage instead of a flat `false`. Seeded false everywhere, the pill
  // mounted in .is-waiting on every route — 0fr grid track, opacity 0,
  // aria-hidden, tabIndex -1 — and the scroll effect below then corrected it one
  // tick later, so an app-shell route played the whole 280ms reveal (grid track,
  // padding, margin, opacity, transform) for a gate that does not exist there.
  // MEASURED at 768px on /settings: the track ran 0 → 87.55px over ~280ms and
  // only settled at load+310ms on an idle machine, load+440ms under a 4× CPU
  // throttle. Two costs, one cause: the primary CTA arrives late and shifts on a
  // slow device, and for that whole window it is aria-hidden + untabbable while
  // being painted, so a keyboard visitor tabbing at load skips a control they can
  // see. It also made the rendered geometry a function of hydration timing, which
  // is what tests/user-sim/24-mobile-overhaul.spec.js S15 was reading.
  // isSalesPage is a SUPERSET of the gated routes (only Home renders #workbench),
  // so this can seed "hidden" on a sales page that has no gate — the effect then
  // reveals it exactly as before — but it can never seed "shown" on a page that
  // does gate, which would be the bad direction: a visible pill collapsing away.
  const [ctaReady, setCtaReady] = useState(!isSalesPage)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [switchingUid, setSwitchingUid] = useState(null)
  const [switchStatus, setSwitchStatus] = useState('')
  const switchLockRef = useRef(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)
  const sheetRef = useRef(null)
  const mobileBtnRef = useRef(null)
  const closeTimer = useRef(null)
  // If opening/closing the menu ever shifts layout under a stationary cursor,
  // Chrome re-fires mouseenter for whichever trigger lands there, flipping the
  // menu the user never pointed at. Arm this lock on any open/close and ignore
  // hover-opens until a real mousemove proves the cursor actually travelled.
  const hoverLock = useRef(false)
  // How the current mega-menu got opened ('hover' | 'click') — a click on a
  // hover-opened trigger must pin the menu, not toggle it shut (see toggle()).
  const openedBy = useRef(null)
  // Section-trigger elements, so Escape can return focus to the control that
  // owns the layer it just closed (WCAG 2.4.3 / APG disclosure).
  const triggerRefs = useRef({})
  // The account / compact-menu popover runs on the shared popover contract:
  // focus in on open, Escape closes and returns focus here, an outside press
  // closes, tabbing off either end closes rather than trapping, and the panel
  // flips when it would otherwise be clipped by the viewport edge. Only one of
  // the two buttons that claim accountBtnRef is ever mounted at a time.
  const closeAccountMenu = useCallback(() => setMenu(null), [])
  // arrowNav: the panel stays a disclosure (see the trigger's comment below),
  // but Up/Down/Home/End walk its controls, so reaching "Sign out" from the top
  // of a fourteen-control panel is one keypress rather than thirteen tabs.
  const { triggerRef: accountBtnRef, popRef: accountPopRef } = usePopover(menu === 'account', closeAccountMenu, { arrowNav: true })
  // Latest open/menu mirrored into a ref so the once-bound key handler reads the
  // current layer without re-subscribing. Written in an effect (never during
  // render) to satisfy React's rules-of-refs.
  const stateRef = useRef({ open: null, menu: null, sheet: false })
  useEffect(() => {
    stateRef.current.open = open
    stateRef.current.menu = menu
    stateRef.current.sheet = sheet
  }, [open, menu, sheet])

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  // All three section menus (Create / Discover / Learn) are visible to everyone.
  // Not-ready tools inside them carry their own "Soon" badge, so nothing here is
  // gated — the desktop bar and the mobile sheet both render the full set.
  const visibleSections = NAV_SECTIONS
  const avatarUrl = userProfile?.photoURL || ''
  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Account'
  const accountEmail = userProfile?.email || user?.email || ''
  const initialsStr = initials(userProfile, user)

  // Firm up the bar (opaque glass + shadow) once the page scrolls; listener
  // only, no state-in-effect.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
      const sec = document.getElementById('workbench') || document.getElementById('create')
      setCtaReady(!sec || window.scrollY + window.innerHeight * 0.6 >= sec.offsetTop)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  // Close the desktop mega-menu and the gear/avatar popovers on outside pointer
  // or Escape. The popovers live inside the nav, so an inside pointer is ignored.
  useEffect(() => {
    const onPointer = (e) => {
      if (navRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(null)
      setMenu(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const { open: wasOpen, sheet: wasSheet } = stateRef.current
        setOpen(null); setSheet(false); setMenu(null)
        // Return focus to the control that owns the layer we just closed, so
        // keyboard/AT users aren't dropped onto <body> (WCAG 2.4.3 / APG).
        // The account popover is NOT handled here: usePopover owns Escape for
        // that layer, listens in the capture phase and stops propagation, so
        // this listener never sees the key. Keeping a second restore here would
        // be dead code that looks live.
        if (wasOpen) triggerRefs.current[wasOpen]?.focus()
        else if (wasSheet) mobileBtnRef.current?.focus()
      }
      // "/" opens search — but never while the visitor is typing in a field.
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
        if (!typing) {
          e.preventDefault()
          setOpen(null); setMenu(null); setSheet(false); setSearchOpen(true)
        }
      }
    }
    // Any genuine cursor movement releases the hover lock (see hoverLock above).
    const onMove = () => { hoverLock.current = false }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = sheetRef.current
    const focusable = () => [...(panel?.querySelectorAll('button:not([disabled]),a[href]') || [])]
    focusable()[0]?.focus()
    const trap = (event) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    panel?.addEventListener('keydown', trap)
    return () => {
      panel?.removeEventListener('keydown', trap)
      document.body.style.overflow = prev
    }
  }, [sheet])

  const clearClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const hoverOpen = (id) => {
    clearClose()
    if (hoverLock.current) return
    if (open === null) hoverLock.current = true
    openedBy.current = 'hover'
    setMenu(null)
    setOpen(id)
  }
  const hoverLeave = () => { clearClose(); closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const toggle = (id) => {
    hoverLock.current = true
    setMenu(null)
    setOpen((cur) => {
      // Hover already opened this menu, so the user's click means "open it" —
      // closing here makes the menu flash shut under the click. Pin it open
      // instead; the NEXT click (now 'click'-owned) toggles it closed.
      if (cur === id && openedBy.current === 'hover') {
        openedBy.current = 'click'
        return cur
      }
      openedBy.current = 'click'
      return cur === id ? null : id
    })
  }
  const toggleMenu = (which) => { setOpen(null); setMenu((cur) => (cur === which ? null : which)) }
  const closeAll = () => { setOpen(null); setSheet(false); setMenu(null) }
  // Auth from the nav opens the popup OVER the current page. These used to be
  // <Link to="/login">, which navigated away before any popup existed: the URL
  // became /login, the page under it unmounted (losing scroll and in-page
  // state), and closing the popup ran LoginRoute's `from` fallback — /home —
  // so the X dropped the user on the dashboard instead of back where they were.
  // /login survives as a route for bookmarks and RequireAuth redirects.
  const startLogin = () => { closeAll(); openLogin() }
  // "Start for Free" opens the SIGN-UP form. It shared startLogin with the
  // "Log in" control, so a first-time visitor clicking the primary CTA was met
  // with "Welcome Back / Sign In" and had to find a small text link to do the
  // thing the button said. Same popup, different opening form.
  const startSignup = () => { closeAll(); openLogin({ signup: true }) }
  const openSearch = () => { closeAll(); setSearchOpen(true) }
  const openExport = () => { closeAll(); setExportOpen(true) }
  const onSignOut = () => { setMenu(null); logout() }
  // Only items that are actually RENDERED belong in the keyboard ring.
  // querySelectorAll happily returns elements inside a display:none subtree,
  // and .focus() on one of those is a silent no-op -- so an unfiltered list
  // would make ArrowDown appear to do nothing. That is not hypothetical now:
  // .pnav-editorial is display:none below 1240px and it carries menu items,
  // so between 769 and 1240 the ring would have started with a dead entry.
  // getClientRects() is the canonical is-rendered test and, unlike
  // offsetParent, stays correct inside a position:fixed panel.
  const megaItems = () => [...(menuRef.current?.querySelectorAll('[data-pnav-menuitem]') || [])]
    .filter((el) => el.getClientRects().length > 0)
  // The mega panel is rendered AFTER </nav> in the DOM, because one shared node
  // serves all three sections. That is the right structure — the founder asked
  // to keep this navigation — but it means a keyboard user who opens "Create"
  // and presses Tab lands on "Discover" rather than in the panel they just
  // opened. These two handlers bridge the gap without moving any markup:
  // forward-Tab off an open trigger enters the panel, Shift+Tab off the panel's
  // first item comes back to the trigger, and forward-Tab off its last item
  // closes the menu and continues along the bar. Nothing traps.
  const focusAfterTrigger = (id) => {
    const index = visibleSections.findIndex((s) => s.id === id)
    const next = visibleSections[index + 1]
    const target = next ? triggerRefs.current[next.id] : accountBtnRef.current || mobileBtnRef.current
    target?.focus()
  }
  const onTriggerKeyDown = (event, id, index) => {
    if (event.key === 'Tab' && !event.shiftKey && open === id) {
      const first = megaItems()[0]
      if (first) { event.preventDefault(); first.focus(); return }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const next = visibleSections[(index + delta + visibleSections.length) % visibleSections.length]
      triggerRefs.current[next.id]?.focus()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openedBy.current = 'click'
      setMenu(null)
      setOpen(id)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // megaItems(), not a raw querySelectorAll: this path used the unfiltered
        // list, which was harmless only while every menu item was always
        // visible. It is not any more -- .pnav-editorial is display:none below
        // 1240px and now carries the first item, so a raw list would hand
        // ArrowDown a hidden button and .focus() would silently do nothing.
        const items = megaItems()
        const target = event.key === 'ArrowDown' ? items[0] : items[items.length - 1]
        target?.focus()
      }))
    }
  }
  const onMenuKeyDown = (event) => {
    if (event.key === 'Tab') {
      const items = megaItems()
      if (!items.length || !open) return
      const active = document.activeElement
      if (event.shiftKey && active === items[0]) {
        event.preventDefault()
        triggerRefs.current[open]?.focus()
      } else if (!event.shiftKey && active === items[items.length - 1]) {
        event.preventDefault()
        const id = open
        setOpen(null)
        focusAfterTrigger(id)
      }
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = megaItems()
    if (!items.length) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement)
    if (event.key === 'Home') items[0].focus()
    else if (event.key === 'End') items[items.length - 1].focus()
    else {
      const delta = event.key === 'ArrowDown' ? 1 : -1
      items[(current + delta + items.length) % items.length].focus()
    }
  }

  // Other accounts previously signed in on this device (display data only —
  // switching re-authenticates through Firebase, see AuthContext).
  const otherAccounts = (knownAccounts || []).filter((a) => a.uid !== user?.uid)
  const closeAccountMenuAndRestoreFocus = () => {
    setMenu(null)
    requestAnimationFrame(() => accountBtnRef.current?.focus())
  }
  const onSwitchAccount = async (acct) => {
    if (switchLockRef.current) return
    switchLockRef.current = true
    setSwitchingUid(acct.uid)
    setSwitchStatus(`Opening sign-in for ${acct.email || 'the selected account'}…`)
    try {
    const res = await switchAccount(acct)
    if (res.outcome === 'requiresPassword') {
      // Password providers use the same in-place prompt, locked to this account.
      setSwitchStatus(`Enter the password for ${res.email}. Your current session stays active until sign-in succeeds.`)
      const switchedUser = await openLogin({
        force: true,
        free: false,
        email: res.email,
        lockEmail: true,
        mode: 'switch',
        reason: `switch to ${res.email}`,
      })
      if (switchedUser?.uid === acct.uid) {
        setSwitchStatus(`Switched to ${acct.email}.`)
        closeAccountMenuAndRestoreFocus()
      } else if (switchedUser) {
        setSwitchStatus(`Signed in as ${switchedUser.email || 'the account you selected'}.`)
        closeAccountMenuAndRestoreFocus()
      } else {
        setSwitchStatus('Account switch cancelled. Your current session is still active.')
      }
    } else if (res.outcome === 'switched') {
      setSwitchStatus(`Switched to ${acct.email || 'the selected account'}.`)
      closeAccountMenuAndRestoreFocus()
    } else if (res.outcome === 'cancelled') {
      setSwitchStatus('Account switch cancelled. Your current session is still active.')
    } else if (res.outcome === 'popupBlocked') {
      setSwitchStatus('Your browser blocked the sign-in popup. Allow popups, then choose the account again.')
    } else if (res.outcome === 'selectedDifferentAccount') {
      setSwitchStatus(`Signed in as ${res.actualUser?.email || 'the account you selected'}.`)
      closeAccountMenuAndRestoreFocus()
    } else {
      setSwitchStatus(res.message || 'Could not switch accounts. Your current session is still active.')
    }
    } catch {
      setSwitchStatus('Could not switch accounts. Check your connection and try again.')
    } finally {
      switchLockRef.current = false
      setSwitchingUid(null)
    }
  }

  const activeSection = NAV_SECTIONS.find((s) => s.id === open) || null
  // Mobile sheet promo = the currently-expanded accordion's promo (or none).
  const sheetPromo = NAV_SECTIONS.find((s) => s.id === sheetSection)?.promo || null

  return (
    <>
      <nav
        ref={navRef}
        className={'pnav' + (scrolled ? ' is-scrolled' : '') + (open || menu ? ' is-expanded' : '') + (isSalesPage ? ' pnav--sales' : '')}
        aria-label="Primary"
        onMouseLeave={hoverLeave}
      >
        <div className="pnav-inner">
          <div className="pnav-lead">
            <Link className="pnav-logo" to="/home" onClick={closeAll} aria-label="UIL4B home">
              <span className="pnav-word">UIL4B</span>
            </Link>

            {/* Search — lives beside the logo so the three section menus can sit
                dead-centre in the bar. Clicking it opens the full command
                palette, which reuses the same search index. On sales routes the
                field hides on desktop (the bar leads with the three menus +
                Get Pro); the / shortcut still works. */}
            <div className={searchHot ? 'pnav-search is-hot' : 'pnav-search'}>
              <button
                type="button"
                className="pnav-search-field"
                aria-haspopup="dialog"
                aria-expanded={searchOpen}
                aria-label="Search UIL4B"
                onClick={openSearch}
                onPointerEnter={() => setSearchHot(true)}
                onPointerLeave={() => setSearchHot(false)}
                onFocus={() => setSearchHot(true)}
                onBlur={() => setSearchHot(false)}
              >
                <SearchIcon />
                <SearchPlaceholder active={searchHot && !reducedMotion} />
                <kbd className="pnav-search-kbd" aria-hidden="true">/</kbd>
              </button>
            </div>
          </div>

          {/* The three section menus — centred in the bar (grid middle column). */}
          <div className="pnav-items">
            {visibleSections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className="pnav-trigger"
                ref={(el) => { if (el) triggerRefs.current[section.id] = el }}
                aria-expanded={open === section.id}
                // No aria-haspopup. It announces "menu", and what opens is a
                // region of links, not a menu — the APG disclosure-navigation
                // pattern is aria-expanded + aria-controls and nothing else.
                // Claiming "menu" makes a screen reader promise arrow-key menu
                // semantics this panel does not implement.
                aria-controls={open === section.id ? 'pnav-mega' : undefined}
                onClick={() => toggle(section.id)}
                onMouseEnter={() => hoverOpen(section.id)}
                onKeyDown={(event) => onTriggerKeyDown(event, section.id, index)}
              >
                {section.label}
                <Chevron />
              </button>
            ))}
          </div>

          <div className="pnav-actions">
            {/* Right cluster: Saved projects (bookmark) and Export stay as
                always-visible icon buttons rather than tucked behind a menu,
                since both are reached constantly mid-task — ahead of the
                conversion pill and the avatar. On marketing/sales routes
                there's nothing to export, so the Export shell is dropped and
                the bar leads with "Get Pro" instead. */}
            {user && (
              <Link
                className="pnav-iconbtn"
                to="/projects"
                aria-label="Saved projects"
                title="Saved projects"
                onClick={closeAll}
              >
                <BookmarkIcon />
              </Link>
            )}
            {!isSalesPage && (
              <button
                type="button"
                className="pnav-iconbtn pnav-export"
                aria-haspopup="dialog"
                aria-expanded={exportOpen}
                aria-label="Export"
                title="Export"
                onClick={openExport}
              >
                <ExportIcon />
              </button>
            )}

            {/* Conversion + auth CTAs — always visible on the fixed bar. Sales
                pages label the upgrade path "Get Pro" (the primary action there);
                app routes call it "Upgrade". */}
            {user && !isPro && (
              isSalesPage ? (
                <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/plans" onClick={closeAll}>
                  Get Pro
                </Link>
              ) : (
                <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/plans" onClick={closeAll}>
                  Upgrade
                </Link>
              )
            )}

            {!user && (
              <>
                <button type="button" className="ui-pill ui-pill-ghost ui-pill-sm" aria-haspopup="dialog" onClick={startLogin}>
                  Log in
                </button>
                <button
                  type="button"
                  className={'ui-pill ui-pill-accent ui-pill-sm pnav-cta' + (ctaReady ? '' : ' is-waiting')}
                  aria-haspopup="dialog"
                  onClick={startSignup}
                  tabIndex={ctaReady ? undefined : -1}
                  aria-hidden={ctaReady ? undefined : 'true'}
                >
                  <span className="pnav-cta-i">Start for Free</span>
                </button>
              </>
            )}

            {/* Profile — hovering the avatar darkens/blurs the photo and overlays
                a settings cog to signal that account AND preferences live behind
                it. It opens the merged account+settings popover. */}
            {user && (
              <div className="pnav-util">
                <div className="pnav-pop-wrap">
                  <button
                    type="button"
                    className="pnav-avatar-btn"
                    ref={accountBtnRef}
                    // A disclosure, not a menu: the panel holds a segmented
                    // theme control, links and a live status line. Declaring
                    // aria-haspopup="true" told assistive tech to expect menu
                    // semantics — one focusable menuitem at a time, arrow-key
                    // navigation — which is not what a settings panel is.
                    aria-expanded={menu === 'account'}
                    aria-controls={menu === 'account' ? 'pnav-account-pop' : undefined}
                    aria-label="Account and settings"
                    onClick={() => toggleMenu('account')}
                  >
                    {avatarUrl ? (
                      <img className="pnav-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="pnav-avatar" aria-hidden="true">{initialsStr}</span>
                    )}
                    <span className="pnav-avatar-cog" aria-hidden="true">
                      <GearIcon />
                    </span>
                  </button>
                  {menu === 'account' && (
                    <div
                      className="pop pnav-pop pnav-pop--account"
                      ref={accountPopRef}
                      id="pnav-account-pop"
                      aria-label="Account and settings"
                      tabIndex={-1}
                    >
                      <div className="pnav-pop-id">
                        {avatarUrl ? (
                          <img className="pnav-pop-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="pnav-pop-avatar" aria-hidden="true">{initialsStr}</span>
                        )}
                        <span className="pnav-pop-id-text">
                          <span className="pnav-pop-id-name">
                            {displayName}
                            {isPro && <em className="pnav-pop-tag">Pro</em>}
                          </span>
                          {accountEmail && <span className="pnav-pop-id-email">{accountEmail}</span>}
                        </span>
                      </div>
                      <div className="pnav-pop-sep" />
                      <p className="pnav-pop-head">Appearance</p>
                      <ThemeSeg />
                      <div className="pnav-pop-sep" />
                      <Link className="pnav-pop-item" to="/settings" onClick={closeAll}>
                        <GearIcon />
                        <span>Account &amp; settings</span>
                      </Link>
                      <Link className="pnav-pop-item" to={isPro ? '/settings' : '/plans'} state={isPro ? { section: 'support' } : undefined} onClick={closeAll}>
                        <TagIcon />
                        <span>{isPro ? 'Manage plan' : 'Plans & upgrade'}</span>
                      </Link>
                      <Link className="pnav-pop-item" to="/help" onClick={closeAll}>
                        <HelpIcon />
                        <span>Help centre</span>
                      </Link>
                      <Link className="pnav-pop-item" to="/feedback" onClick={closeAll}>
                        <FeedbackIcon />
                        <span>Send feedback</span>
                      </Link>
                      {isAdmin && (
                        <Link className="pnav-pop-item" to="/admin" onClick={closeAll}>
                          Admin dashboard
                        </Link>
                      )}
                      {otherAccounts.length > 0 && (
                        <>
                          <div className="pnav-pop-sep" />
                          <p className="pnav-pop-head">Switch account</p>
                          {otherAccounts.map((acct) => (
                            <button
                              key={acct.uid}
                              type="button"
                              className="pnav-pop-item pnav-pop-acct"
                             
                              onClick={() => onSwitchAccount(acct)}
                              disabled={!!switchingUid}
                              aria-busy={switchingUid === acct.uid}
                            >
                              {acct.photoURL ? (
                                <img className="pnav-pop-acct-avatar" src={acct.photoURL} alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="pnav-pop-acct-avatar" aria-hidden="true">{initials(acct, acct)}</span>
                              )}
                              <span className="pnav-pop-acct-text">
                                <span className="pnav-pop-acct-name">
                                  {switchingUid === acct.uid ? 'Switching…' : (acct.displayName || acct.email.split('@')[0] || 'Account')}
                                </span>
                                {acct.email && <span className="pnav-pop-acct-email">{acct.email}</span>}
                              </span>
                            </button>
                          ))}
                          {switchStatus && (
                            <p className="pnav-switch-status" role="status" aria-live="polite">{switchStatus}</p>
                          )}
                        </>
                      )}
                      <div className="pnav-pop-sep" />
                      <button type="button" className="pnav-pop-item pnav-pop-item--danger" onClick={onSignOut}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compact "more" affordance — signed-out only. Signed-in users get the
                always-visible avatar instead, since it's their one settled entry
                point for account actions; visitors have no account button yet, so
                the meatball here carries the theme toggle + auth links so
                preferences stay reachable for them. */}
            {!user && (
              <div className="pnav-pop-wrap pnav-more-wrap">
                <button
                  type="button"
                  className="pnav-more"
                  ref={accountBtnRef}
                  aria-expanded={menu === 'account'}
                  aria-controls={menu === 'account' ? 'pnav-account-pop' : undefined}
                  aria-label="Menu"
                  onClick={() => toggleMenu('account')}
                >
                  <MeatballIcon />
                </button>
                {menu === 'account' && (
                  <div
                    className="pop pnav-pop"
                    ref={accountPopRef}
                    id="pnav-account-pop"
                    aria-label="Menu"
                    tabIndex={-1}
                  >
                    <p className="pnav-pop-head">Appearance</p>
                    <ThemeSeg />
                    <div className="pnav-pop-sep" />
                    <button type="button" className="pnav-pop-item" onClick={openSearch}>
                      <SearchIcon />
                      <span>Search tools</span>
                      <kbd className="pnav-search-kbd pnav-pop-kbd" aria-hidden="true">/</kbd>
                    </button>
                    <Link className="pnav-pop-item" to="/help" onClick={closeAll}>
                      <HelpIcon />
                      <span>Help centre</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/feedback" onClick={closeAll}>
                      <FeedbackIcon />
                      <span>Send feedback</span>
                    </Link>
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/plans" onClick={closeAll}>
                      <TagIcon />
                      <span>Pricing &amp; plans</span>
                    </Link>
                    <button type="button" className="pnav-pop-item" aria-haspopup="dialog" onClick={startLogin}>
                      <LoginArrowIcon />
                      <span>Log in</span>
                    </button>
                    <button type="button" className="pnav-pop-item pnav-pop-item--accent" aria-haspopup="dialog" onClick={startSignup}>
                      <SparkIcon />
                      <span>Start for Free</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="pnav-mobile"
              ref={mobileBtnRef}
              aria-label={sheet ? 'Close menu' : 'Open menu'}
              aria-expanded={sheet}
              onClick={() => setSheet((s) => !s)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                {sheet ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Desktop mega-menu: one shared panel, morphs width per section, with a
          data-driven promo card on the right. */}
      {activeSection && (
        <div
          ref={menuRef}
          id="pnav-mega"
          className="pnav-menu"
          data-menu={activeSection.id}
          role="region"
          aria-label={`${activeSection.label} menu`}
          onMouseEnter={clearClose}
          onMouseLeave={hoverLeave}
          onKeyDown={onMenuKeyDown}
        >
          <div className="pnav-menu-body">
            <div className="pnav-menu-cols">
              <aside className="pnav-editorial">
                {/* Renders nothing at all where the section has no real
                    contents to show -- frame included. See MenuPreview. */}
                <MenuPreview section={activeSection.id} />
                <span className="pnav-promo-eyebrow">{activeSection.promo?.eyebrow || activeSection.label}</span>
                <p className="pnav-editorial-title">{activeSection.promo?.title}</p>
                <p className="pnav-editorial-blurb">{activeSection.promo?.blurb}</p>
                {/* THE ANSWER TO "WHICH ONE DO I OPEN FIRST".
                    The founder’s complaint was that nothing in the panel says
                    where a new visitor should start. The product already has an
                    opinion and the desktop menu was the one place not stating
                    it: promo.guide + promo.cta are honoured by the MOBILE SHEET
                    (which renders a "Build a brand kit" button calling
                    launchBrandKit) and were dropped on desktop, where the card
                    headed "Build your brand kit, step by step" offered a single
                    link to /sitemap instead.
                    The steps are DERIVED from UIKIT_STEPS, the same exported
                    array the guide itself walks, so this can never drift into an
                    eighth hand-kept copy of an ordered list. Numbers and labels
                    only -- the blurbs are in the guide, and a four-line card in a
                    260px column is a wall. Reference: Retool’s nav sequence
                    (01-05, collapsed to number + label) and Homerun’s "5 steps"
                    rail with step 1 carried forward. */}
                {activeSection.promo?.guide && (
                  // The numeral is aria-hidden because <ol> already conveys the
                  // order; without the label a screen reader would meet a bare
                  // four-item list sitting between a blurb and a button and have
                  // to infer what it enumerates.
                  <ol className="pnav-steps" aria-label={`${activeSection.promo.cta || 'Guided flow'}: steps`}>
                    {BRAND_KIT_STEPS.map((s, i) => (
                      <li className="pnav-step" key={s.id}>
                        <span className="pnav-step-n" aria-hidden="true">{i + 1}</span>
                        <span className="pnav-step-label">{s.label}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {/* Both of these are data-pnav-menuitem, and that is a FIX
                    rather than a side effect: the Tab bridge jumps from the
                    trigger straight to the first TOOL and back again, so the
                    card’s only call to action was unreachable by keyboard for
                    as long as it has existed. In DOM order the card precedes
                    the columns, so the ring now opens on the recommended
                    starting point -- which is what ArrowDown should land on. */}
                <div className="pnav-editorial-actions">
                  {activeSection.promo?.guide && (
                    <button
                      type="button"
                      className="ui-pill ui-pill-accent ui-pill-sm pnav-editorial-cta"
                      onClick={launchBrandKit}
                      data-pnav-menuitem
                    >
                      {/* The label reports which of the two things this button
                          is about to do. A control that says "Build a brand kit"
                          and then drops you three steps in has lied to you. */}
                      {brandKitEntry.resume
                        ? `Resume: ${brandKitEntry.step.label}`
                        : (activeSection.promo.cta || 'Start building')}
                    </button>
                  )}
                  <Link className="pnav-editorial-link" to={activeSection.viewAllHref} onClick={closeAll} data-pnav-menuitem>
                    Explore {activeSection.label} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </aside>
              <div className="pnav-grid">
                {/* Each stack = one grid column; a stack can hold several
                    captioned groups top-to-bottom (Create: Icons above
                    Media & AI) so a small subcategory never forces an extra
                    cramped grid column. */}
                {activeSection.columns.map((stack) => (
                  <div className="pnav-colstack" key={stack[0].label}>
                    {stack.map((col) => (
                      // Six column heads all drew the same --accent rule while the
                      // icons directly beneath them were already hue-coded, so the
                      // panel read as one undifferentiated field. The hue is read
                      // off the column’s own tools -- no new data, and Discover /
                      // Learn (whose rows carry no category hue) fall back to accent.
                      // The RULE takes the hue, never the label text: these tokens
                      // are measured for non-text contrast, and #331 swept small
                      // accent text out of this surface for good reason.
                      <div
                        className="pnav-col"
                        key={col.label}
                        data-hue={col.tools.find((t) => t.hue)?.hue}
                        data-soon={col.tools.length > 0 && col.tools.every((t) => t.soon) ? 'true' : undefined}
                      >
                        <p className="pnav-col-label">{col.label}</p>
                        <ul className="pnav-toollist">
                          {col.tools.map((t) => (
                            <li key={t.id}>
                              <Link
                                className="pnav-tool"
                                to={t.route}
                                data-hue={t.hue}
                                data-soon={t.soon ? 'true' : undefined}
                                aria-label={t.soon ? `${t.label} — coming soon` : t.beta ? `${t.label} — beta` : undefined}
                                onClick={closeAll}
                                data-pnav-menuitem
                              >
                                <span className="pnav-tool-ico" aria-hidden="true"><NavIcon id={t.icon} /></span>
                                <span className="pnav-tool-copy">
                                  {/* Label and badge share a row so "Soon" reads as
                                      part of the tool's name. It used to be a
                                      sibling of this block with margin-left:auto,
                                      which parked it against the far edge of the
                                      column — up to 80px of gap between the word it
                                      qualifies and the badge. Hers, Fiverr and
                                      Higgsfield all set the badge immediately after
                                      the label. */}
                                  <span className="pnav-tool-line">
                                    <span className="pnav-tool-label">{t.label}</span>
                                    {t.soon && <span className="soon-badge">Soon</span>}
                                    {/* Beta and Soon can never both render: a tool
                                        the tree marks Soon is not mounted, so there
                                        is nothing to be in beta. They deliberately
                                        share the badge SHAPE and differ only in
                                        colour -- one is 'not yet', the other is
                                        'yes, with a stated limit'. */}
                                    {!t.soon && t.beta && <span className="beta-badge">Beta</span>}
                                  </span>
                                  {menuDescription(activeSection, t) && <span className="pnav-tool-desc">{menuDescription(activeSection, t)}</span>}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pnav-menu-foot">
            <span className="pnav-menu-foot-note">Every {activeSection.label} tool · one workspace</span>
            <Link className="pnav-menu-foot-link" to="/home" onClick={closeAll} data-pnav-menuitem>
              How UIL4B works &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      {sheet && (
        <div ref={sheetRef} className="pnav-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          {visibleSections.map((section) => {
            const expanded = sheetSection === section.id
            return (
              <div className="pnav-acc" key={section.id}>
                <button
                  type="button"
                  className="pnav-acc-trigger"
                  aria-expanded={expanded}
                  onClick={() => setSheetSection(expanded ? '' : section.id)}
                >
                  {section.label}
                  <Chevron />
                </button>
                {expanded && (
                  <div className="pnav-acc-panel">
                    {section.columns.flat().map((col) => (
                      <div className="pnav-acc-col" key={col.label} data-soon={col.tools.length > 0 && col.tools.every((t) => t.soon) ? 'true' : undefined}>
                        <p className="pnav-acc-colhead">{col.label}</p>
                        {col.tools.map((t) => (
                          <Link
                            key={t.id}
                            className="pnav-acc-link"
                            to={t.route}
                            data-hue={t.hue}
                            data-soon={t.soon ? 'true' : undefined}
                            aria-label={t.soon ? `${t.label} — coming soon` : undefined}
                            onClick={closeAll}
                          >
                            <span className="pnav-acc-ico" aria-hidden="true">
                              <NavIcon id={t.icon} />
                            </span>
                            <span className="pnav-acc-copy">
                              <span className="pnav-tool-line">
                                <span className="pnav-acc-label">{t.label}</span>
                                {t.soon && <span className="soon-badge">Soon</span>}
                              </span>
                              {menuDescription(section, t) && <span className="pnav-acc-desc">{menuDescription(section, t)}</span>}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {sheetPromo && (
            <div className="pnav-sheet-promo">
              <span className="pnav-promo-eyebrow">{sheetPromo.eyebrow}</span>
              <p className="pnav-promo-title">{sheetPromo.title}</p>
              <p className="pnav-promo-blurb">{sheetPromo.blurb}</p>
              <div className="pnav-promo-actions">
                {sheetPromo.guide ? (
                  <>
                    <button type="button" className="ui-pill ui-pill-accent ui-pill-sm" onClick={launchBrandKit}>
                      {brandKitEntry.resume
                        ? `Resume: ${brandKitEntry.step.label}`
                        : (sheetPromo.cta || 'Start building')}
                    </button>
                    <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={sheetPromo.href} onClick={closeAll}>Learn more</Link>
                  </>
                ) : (
                  <>
                    <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={sheetPromo.href} onClick={closeAll}>Learn more</Link>
                    <Link className="ui-pill ui-pill-accent ui-pill-sm" to={sheetPromo.docsHref} onClick={closeAll}>View docs</Link>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Theme. The `.pnav-more-wrap{display:none}` rule below 768px has
              always claimed "theme + auth live in the sheet / Settings" — auth
              did, theme did not, and that is half of why a finished dark theme
              was unreachable on a phone. Same control as the popover. */}
          <div className="pnav-sheet-theme">
            <p className="pnav-pop-head">Appearance</p>
            <ThemeChoice />
          </div>
          <div className="pnav-sheet-cta">
            {user ? (
              <Link className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" to="/settings" onClick={closeAll}>
                Account
              </Link>
            ) : (
              <>
                <button type="button" className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" aria-haspopup="dialog" onClick={startSignup}>
                  Start for Free
                </button>
                <button type="button" className="ui-pill ui-pill-out ui-pill-lg ui-pill-block" aria-haspopup="dialog" onClick={startLogin}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
      {exportOpen && (
        <Suspense fallback={null}>
          <ExportPanel onClose={() => setExportOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
