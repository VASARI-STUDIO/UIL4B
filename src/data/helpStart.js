// Everything /learn/help asserts about the product, in one place, derived from the
// registries that decide it.
//
// WHY THIS IS A MODULE AND NOT COPY INSIDE HelpCentre.jsx. The page it replaced
// carried a ten-question FAQ typed out by hand, and by the time it was read on
// 2026-09-06 three of its answers were false — not arguably, mechanically:
//
//   · "Video to Frames extractor" and "Image Converter" were listed as two
//     separate tools. There is one tool, /create/file-converter, and frames is
//     a MODE inside it (FileConverter.jsx: `mode === 'frames'`). The old names
//     were retired in #335 along with "Design Reference guides", which the same
//     answer also advertised and which has no route at all.
//   · "There are no third-party analytics trackers" — src/main.jsx mounts
//     `<Analytics />` from @vercel/analytics on every page.
//   · The tool inventory was a prose list, so it went stale the moment a tool
//     shipped and nothing could notice.
//
// The rule this file exists to enforce is the one src/config/exportFormats.js
// already enforces for the export panel: a surface may not advertise a
// capability except through the flag that decides whether the capability is
// there. So every count below is COUNTED, every route is a key another module
// owns, and tests/unit/help-and-principles-claims.test.js fails the build if a
// route named here is retired, private, or still in the workshop.
//
// Plain JS, no JSX: the guard test imports this in bare Node.
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans.js'
import { proOnlyFormats } from '../config/exportFormats.js'
import { CREATE_GROUPS, isListedTool } from './toolTree.js'

/** Every Create tool a visitor can actually open today. */
export const LIVE_TOOLS = CREATE_GROUPS.flatMap((group) => (
  group.soon ? [] : group.tools.filter((tool) => isListedTool(tool) && !tool.soon)
))

/** Every Create tool that is still in the workshop, group-level Soon included. */
export const SOON_TOOLS = CREATE_GROUPS.flatMap((group) => (
  group.tools.filter((tool) => isListedTool(tool) && (group.soon || tool.soon))
))

/**
 * The first moves, in the order a colour system is actually built.
 *
 * `opensWith` is the load-bearing half and the reason this section exists at
 * all: the getting-started question on this product is not "how do I use it",
 * it is "what do I have to bring". The answer is nothing, and each row names
 * the specific thing the tool puts on screen before the visitor types.
 */
export const HELP_STARTS = Object.freeze([
  Object.freeze({
    id: 'colour',
    label: 'Colour',
    to: '/create/palette',
    opensWith: 'a generated palette',
    // PaletteBuilder opens on initialPaletteBoard(), whose draw is
    // randomSystemPalette() at DEFAULT_DESIGN's free settings, and every tint,
    // gradient and contrast reading downstream reads the active colour.
    body: 'Opens on a palette it drew for you. Change the base and the tints, the gradient and the contrast readings all move with it.',
  }),
  Object.freeze({
    id: 'type',
    label: 'Type',
    to: '/create/type-scale',
    opensWith: 'a working scale',
    // buildFluidScale() renders the ladder from base × ratio^step; #386
    // replaced the generated furniture with the scale itself.
    body: 'Opens on the ladder, not a form. Set a base size and a ratio and the steps come out, with the clamp() that carries them between two viewports.',
  }),
  Object.freeze({
    id: 'icons',
    label: 'Icons',
    to: '/create/icons',
    opensWith: 'the whole library',
    // What is free and what is capped is stated the same way /plans states it,
    // from the same constant, so the two surfaces cannot disagree.
    body: `Search the whole library and copy the SVG signed out. Saving your own custom icons is the part that needs an account. The free plan allows ${FREE_SAVE_LIMITS.customIcons}.`,
  }),
  Object.freeze({
    id: 'files',
    label: 'Files',
    to: '/create/file-converter',
    opensWith: 'an empty drop zone',
    // The one row that does NOT open with content, flagged rather than described
    // so the heading above it can COUNT the difference instead of asserting it.
    // Claiming otherwise would be the exact failure this file was written to stop.
    empty: true,
    body: 'The one that does need something from you. Drop an image or a video; conversion and frame extraction run in your browser.',
  }),
])

/**
 * The answers, one sentence each, with every figure read from the module that
 * owns it. `AI_LIMITS` and `FREE_SAVE_LIMITS` are mirrors of api/_lib/plans.js
 * and are held to it by tests/unit/plan-limits.test.js, so quoting them here
 * cannot drift from what the server actually grants.
 */
export const HELP_ANSWERS = Object.freeze([
  Object.freeze({
    id: 'account',
    q: 'Do I need an account?',
    // Using a tool is never metered; what the free plan caps is how much you
    // can SAVE. /plans makes the same distinction from the same constants.
    a: `No. Every tool opens and runs signed out, and using one is never metered. An account lets you save and carry settings to another device. The free plan allows ${FREE_SAVE_LIMITS.projects} projects and ${FREE_SAVE_LIMITS.customIcons} custom icons.`,
  }),
  Object.freeze({
    id: 'cost',
    q: 'What costs money?',
    a: `Nothing you have read about so far. Pro raises the AI allowance and adds ${proOnlyFormats().length} export documents; the plans page has the current price.`,
    to: '/plans',
    linkLabel: 'See the plans',
  }),
  Object.freeze({
    id: 'ai',
    q: 'Why are the AI allowances small?',
    // The arithmetic and its reason are both in api/_lib/plans.js: generation
    // runs on free provider tiers metered per PROJECT, so every visitor draws
    // from one shared bucket. Both plans resolve to the same model (MODELS.free
    // and MODELS.pro are the same string), so Pro buys capacity, not output.
    a: `They are shared, not per person: generation runs on a free provider tier metered across the whole site. Free gets ${AI_LIMITS.free.daily} a day, Pro gets ${AI_LIMITS.pro.daily}, and both run the same model.`,
  }),
  Object.freeze({
    id: 'data',
    q: 'Where does my work live?',
    a: 'In this browser, until you sign in. Signed in it syncs to your account, and Settings can export or delete all of it.',
    to: '/privacy',
    linkLabel: 'Read what is stored',
  }),
  Object.freeze({
    id: 'soon',
    // Admin-only: HelpCentre skips it for everyone else, because unfinished
    // pages are hidden from them and this answer would promise a list they
    // cannot see.
    adminOnly: true,
    q: 'What is not built yet?',
    a: `${SOON_TOOLS.length} tools carry a Soon badge and do not open. The site map marks every one of them, so nothing is advertised that you cannot use.`,
    to: '/sitemap',
    linkLabel: 'See the site map',
  }),
])

const startOf = (id) => HELP_STARTS.find((s) => s.id === id)
const answerOf = (id) => HELP_ANSWERS.find((a) => a.id === id)

/**
 * The jobs the Help page routes by: one row per thing a visitor came to do,
 * each opening its own answer. Built from HELP_STARTS and HELP_ANSWERS, so a
 * route, a limit or a count is still owned by the module that decides it.
 *
 *   start    the HELP_STARTS row this job opens with (route, "opens with")
 *   more     HELP_ANSWERS ids carried under the answer as a question and reply
 *   to/cta   the one destination the job ends on
 *
 * Every figure in `heading` and `lede` is read from FREE_SAVE_LIMITS,
 * proOnlyFormats() or the tool lists. The money job does not claim that
 * nothing costs money: the palette tool has paid colour systems and Pro adds
 * export documents, so the claim that holds is that using the tools costs
 * nothing.
 */
export const HELP_JOBS = Object.freeze([
  Object.freeze({
    id: 'colour',
    label: 'Pick colours for a project',
    start: startOf('colour'),
    heading: 'The palette tool opens with a palette already drawn.',
    lede: 'Change the base and the tints, the gradient and the contrast readings all move with it.',
    to: startOf('colour').to,
    cta: 'Open the palette builder',
  }),
  Object.freeze({
    id: 'type',
    label: 'Set a type scale',
    start: startOf('type'),
    heading: 'Two numbers set every size: a base and a ratio.',
    lede: 'The Type Scale tool opens on the ladder, not a form, and exports the clamp() that carries it between two viewports.',
    to: startOf('type').to,
    cta: 'Open Type Scale',
  }),
  Object.freeze({
    id: 'icons',
    label: 'Find an icon',
    start: startOf('icons'),
    heading: 'Search the whole library and copy the SVG, signed out.',
    lede: `Saving your own custom icons needs an account. The free plan allows ${FREE_SAVE_LIMITS.customIcons}.`,
    to: startOf('icons').to,
    cta: 'Open the Icon Library',
  }),
  Object.freeze({
    id: 'files',
    label: 'Convert an image or video',
    start: startOf('files'),
    heading: 'Drop a file. It converts in your browser.',
    lede: 'Images change format; videos give up their frames. Conversion and frame extraction run in your browser.',
    to: startOf('files').to,
    cta: 'Open the File Converter',
  }),
  Object.freeze({
    id: 'save',
    label: 'Save my work',
    heading: 'Your work stays in this browser until you sign in.',
    lede: answerOf('data').a,
    more: Object.freeze(['account']),
    to: answerOf('data').to,
    cta: answerOf('data').linkLabel,
  }),
  Object.freeze({
    id: 'cost',
    label: 'Know what costs money',
    heading: 'Using the tools costs nothing.',
    lede: `Pro raises the AI allowance and adds ${proOnlyFormats().length} export documents. The plans page has the current price.`,
    more: Object.freeze(['ai']),
    to: answerOf('cost').to,
    cta: answerOf('cost').linkLabel,
  }),
  Object.freeze({
    id: 'soon',
    label: 'See what isn\'t built yet',
    adminOnly: true,
    heading: answerOf('soon').q,
    lede: answerOf('soon').a,
    to: answerOf('soon').to,
    cta: answerOf('soon').linkLabel,
  }),
  Object.freeze({
    id: 'report',
    label: 'Report something broken',
    heading: 'One report form, from anywhere.',
    lede: 'It is the same form the app uses everywhere. It reaches the same place whether you send it from here or from the tool that broke.',
    to: '/feedback',
    cta: 'Report it',
  }),
])

/** URL hashes that open a job, for links that predate the router. */
export const HELP_JOB_HASHES = Object.freeze({ contact: 'report' })

/** How many of the first moves put something on screen before you type. */
export const STARTS_WITH_CONTENT = HELP_STARTS.filter((s) => !s.empty).length

/** Routes this surface promises. The guard test resolves every one of them. */
export const HELP_ROUTES = Object.freeze([
  ...HELP_STARTS.map((s) => s.to),
  ...HELP_ANSWERS.filter((a) => a.to).map((a) => a.to),
  ...HELP_JOBS.map((j) => j.to),
])
