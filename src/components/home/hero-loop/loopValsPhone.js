import {
  ADDED, ALT_KEYS, ALT_WORDS, BIKE, EASE, FIELD_KEYS_PHONE, FONTS, GRID, NAMES, PALS, PICK,
  PK_FROM, PK_HUE, PK_TO, ROLES, RESULTS, SEARCH_KEYS_PHONE, fgFor, hsvHex, lerp3,
} from './loopData'

// WHAT THE PHONE PANEL DRAWS AT A BEAT. The phone's counterpart of deriveVals
// (loopVals.js): the same job on the phone's own scenes and layout. A finger
// stands in for the cursor, so a tap is a touch beat rather than a cursor press.
//
//   geo.pos   [x, y] per beat: where the finger last touched (touchPositions)

const INK = '#EFEEEA'
const dim = (a) => `rgba(239,238,234,${a})`

// The three type scales offered on the phone: [ratio, name, label].
const RATIOS = [[1.25, 'Major third', '1.25'], [1.5, 'Perfect fifth', '1.5'], [1.618, 'Golden ratio', '1.618']]
const STEPS = [['text-3xl', 4], ['text-2xl', 3], ['text-xl', 2], ['text-base', 0]]
// The first four of the six exports, with the export dialog's names; six do not fit at 358x444.
const FORMATS = [['UI kit', ''], ['Style guide', ''], ['Code', ''], ['Book', 'Pro']]
const SG = 1
const TOOLS = ['Palette', 'Export', 'Icon Library', 'Font Pair', 'Type Scale', 'Alt Text']
const GENERIC = GRID.slice(0, 10)
const RING = '0 0 0 2px #0B0C0E, 0 0 0 3.5px #EFEEEA'
// The colour picker sheet: the pad is 326 wide and 96 tall, the hue bar sits below it.
const PAD = { x: 16, y: 58, w: 326, h: 96 }

/** Where the finger last touched at every beat: beats without a touch keep it there while it fades. */
export const touchPositions = (TL) => TL.reduce((out, t, k) => [...out, t[5] ? [t[3], t[4]] : out[k - 1] || [t[3], t[4]]], [])

export function derivePhoneVals(loop, model, geo) {
  const { TL } = model
  const { k, playing, done, say, reduced, rewound, scene: s, beat, press: touch, P, at } = loop
  const layer = (n) => (s === n ? 1 : 0)
  // Scene change: the old body leaves in 120 ms, the new one arrives in 220 ms; the header's tool name crossfades with them.
  const trn = (n) => (rewound ? (n === 0 ? `opacity 260ms ${EASE} 140ms` : 'opacity 240ms ease-out') : s === n ? `opacity 220ms ${EASE} 130ms` : 'opacity 120ms linear')
  const textAt = (prefix, keys) => keys.reduce((t, [txt], i) => (P(prefix + i) ? txt : t), '')

  // Palette
  const pal = !rewound && P('pR2') ? PALS[2] : !rewound && P('pR1') ? PALS[1] : PALS[0]
  const locked = !rewound && P('pLock')
  const rows = [...pal, ADDED].map((c, i) => {
    const isLock = i === 0
    const delay = `${(isLock && locked ? 0 : i * 40)}ms`
    const fg = fgFor(c)
    return {
      bg: c, fg, hex: c, role: (pal === PALS[2] && NAMES[c]) || ROLES[i],
      tr: rewound ? 'none' : `background-color 260ms ${EASE} ${delay}, color 260ms ${EASE} ${delay}`,
      lockOp: isLock && locked ? 1 : 0.5, lockBg: isLock && locked ? (fg === '#1A1A1A' ? 'rgba(26,26,26,.12)' : 'rgba(255,255,255,.18)') : 'transparent',
      lockScale: beat === 'pLock' && isLock ? 0.97 : 1, openOp: isLock && locked ? 0 : 1, shutOp: isLock && locked ? 1 : 0,
    }
  })

  // Export
  const fmt = P('pSG') ? SG : 0
  // Export keeps its finished frame through the closing rewind, so the sheet never drops while it fades out.
  const exporting = at('prog')
  const exported = P('saved')
  const opened = P('pOpen')

  // Icons and the colour picker
  const searched = textAt('sk', SEARCH_KEYS_PHONE)
  const filtered = P('q0')
  const searching = P('pSrch') && !P('pCup')
  const picked = P('pCup')
  const stepOf = (prefix, n, a, b) => {
    for (let i = n - 1; i >= 0; i--) if (P(prefix + i)) return lerp3(a, b, (i + 1) / n)
    return a
  }
  const pk = !P('dh0') ? PK_FROM : !P('dp0') ? stepOf('dh', 2, PK_FROM, PK_HUE) : stepOf('dp', 2, PK_HUE, PK_TO)
  const pkHex = P('dh0') ? hsvHex(pk) : INK
  const dragStep = /^d[ph](\d)$/.exec(beat)
  const dragN = dragStep ? 2 : 0
  const dEase = !dragStep ? EASE : +dragStep[1] === 0 ? 'cubic-bezier(.5,0,1,1)' : +dragStep[1] === dragN - 1 ? 'cubic-bezier(0,0,.3,1)' : 'linear'
  const pkOpen = s === 2 && P('pSw') && !P('pDone')
  const flipped = P('pFlip')
  const glyph = (r, d) => (r
    ? { d: r[0], vb: r[1], fill: r[2] === 'fill' ? INK : 'none', stroke: r[2] === 'fill' ? 'none' : INK, sw: r[3] || 0, fr: r[4] }
    : { d, vb: '0 0 24 24', fill: 'none', stroke: INK, sw: 1.6, fr: 'nonzero' })

  // Type
  const sansUp = P('pS')
  const headName = sansUp ? 'Archivo' : 'Bricolage Grotesque'
  const [headFont, headWeight, headMeta] = FONTS[headName]
  const typed = textAt('k', FIELD_KEYS_PHONE)
  const focused = s === 3 && P('pF')
  const ratioI = P('pRat') ? 2 : 1
  const ratio = RATIOS[ratioI][0]

  // Alt text
  const generating = P('shim') && !P('w0')
  const showWords = P('w0')
  const words = ALT_WORDS.filter((w, i) => P(`w${i}`))

  // Chapter strip: the current chapter's bar fills, linear, over that chapter's real length.
  const ci = loop.chap
  const strip = model.chapters.map((c, j) => {
    const { cur, fill, ms } = loop.chapterFill(j)
    return {
      i: j, n: c.name, on: cur ? 'true' : 'false', aria: `${c.name}, chapter ${j + 1} of ${model.chapters.length}`,
      sim: beat === `pN${j - 1}` ? 'press' : '',
      color: cur ? INK : dim('.62'),
      track: !reduced && !done && j < ci ? dim('.36') : dim('.14'),
      fill: (loop.armed || done ? (cur ? fill : 0) : 0).toFixed(3), ms,
    }
  })

  const tapAction = /^pR\d$/.test(beat)
  return {
    rootClass: '', say,
    // Past Palette the dot is the kit's primary, Signal. At the seam the bar changes with the scene, not before it.
    toolLabels: TOOLS.map((name, n) => ({ name, op: layer(n), tr: trn(n), hid: s === n ? 'false' : 'true' })),
    toolDot: s === 0 ? pal[0] : '#FF5A1F', dotDelay: rewound ? '140ms' : '0ms', actionDelay: rewound ? '140ms' : '0ms',
    actionOp: s === 0 ? 1 : 0, actionBg: tapAction ? dim('.14') : 'transparent', actionScale: tapAction ? 0.97 : 1,
    exportBg: beat === 'pExp' ? dim('.14') : 'transparent', exportScale: beat === 'pExp' ? 0.97 : 1,
    // Hidden until the last tool is done.
    exportOp: !rewound && P('hAlt') ? 1 : 0,

    op0: layer(0), tr0: trn(0), rows,

    op1: layer(1), tr1: trn(1),
    formats: FORMATS.map(([n, tag], i) => ({
      n, tag, bg: i === fmt ? dim('.1') : 'transparent', c: tag ? dim('.72') : INK,
      dot: i === fmt ? 1 : 0, ring: i === fmt ? INK : dim('.4'), sc: beat === 'pSG' && i === SG ? 0.97 : 1,
      mt: i === 3 ? 6 : 0, swDisp: i === SG ? 'flex' : 'none', swOp: i === fmt ? 1 : 0,
    })),
    kitOp: fmt === 0 ? 1 : 0, sgOp: fmt === SG ? 1 : 0,
    kitTr: fmt === SG ? 'opacity 90ms ease-out' : `opacity 200ms ${EASE} 100ms`, sgTr: fmt === SG ? `opacity 200ms ${EASE} 100ms` : 'opacity 90ms ease-out',
    goLabel: exporting ? 'Exporting…' : fmt === SG ? 'Export style guide' : 'Export UI kit',
    goScale: beat === 'pGo' ? 0.97 : 1, goOp: exported ? 0 : 1, prog: exporting ? 1 : 0, progMs: exporting ? 760 : 0,
    doneOp: exported ? 1 : 0, openBg: beat === 'pOpen' ? dim('.14') : 'transparent', openScale: beat === 'pOpen' ? 0.97 : 1,
    guideY: opened ? '0%' : '100%', guideTr: opened ? `transform 320ms ${EASE}` : 'none',
    // One slow pan across the three pages once they are in, then it holds on page 3 with page 2's edge at the left.
    // Reduced motion keeps the cover in view.
    panX: !reduced && P('guide') ? -301 : 0,
    panTr: !reduced && P('guide') ? 'transform 2600ms cubic-bezier(.65,0,.35,1) 700ms' : 'none',
    gOp: opened ? 1 : 0, gY: opened ? '0px' : '8px', gD0: opened ? '160ms' : '0ms', gD1: opened ? '230ms' : '0ms', gD2: opened ? '300ms' : '0ms',

    op2: layer(2), tr2: trn(2),
    searchText: searched || (searching ? '' : 'Search icons…'), searchC: searched ? INK : dim('.62'), searchCaret: searching ? 1 : 0,
    searchBorder: searching ? INK : dim('.16'),
    // A result paints as its pack draws it, stroked or filled; the browse grid before the search is stroked.
    tiles: GENERIC.map((d, i) => ({
      // Once one is picked the editor takes the second row's place, so that row steps out.
      ...glyph(filtered && RESULTS[i], d),
      op: filtered && (i >= RESULTS.length || (picked && i >= 5)) ? 0 : 1, delay: picked ? '0ms' : filtered ? `${i * 20}ms` : '0ms',
      border: picked && i === PICK ? INK : dim('.12'), sc: beat === 'pCup' && i === PICK ? 0.97 : 1,
    })),
    custOp: picked ? 1 : 0, cupPath: BIKE, custColour: pkHex,
    whiteRing: P('pSw') ? 'none' : RING, customRing: P('pSw') ? RING : 'none', customScale: beat === 'pSw' ? 0.97 : 1,
    customBg: P('dh0') ? pkHex : 'conic-gradient(from 0deg, #E8503A, #F2B33D, #5CB85C, #3AA5C9, #8E6CE0, #E8503A)',
    flipDeg: flipped ? 180 : 0,
    flipHBg: flipped ? INK : 'transparent', flipHC: flipped ? '#0B0C0E' : dim('.72'), flipHBorder: flipped ? INK : dim('.12'), flipHScale: beat === 'pFlip' ? 0.97 : 1,
    copyLabel: P('pCopy') ? 'Copied!' : 'Copy SVG', copyScale: beat === 'pCopy' ? 0.97 : 1,
    pkOp: pkOpen ? 1 : 0, pkY: pkOpen ? '0px' : '270px', doneScale: beat === 'pDone' ? 0.97 : 1,
    pkHex, pkHue: `hsl(${pk[0].toFixed(1)} 100% 50%)`, pkMs: dragStep ? TL[k][2] : 240, dEase,
    pdX: (PAD.x + pk[1] * PAD.w).toFixed(1), pdY: (PAD.y + (1 - pk[2]) * PAD.h).toFixed(1), hX: (PAD.x + pk[0] / 360 * PAD.w).toFixed(1),

    op3: layer(3), tr3: trn(3),
    headFont, headWeight, headName, headMeta, famBg: beat === 'pS' ? dim('.08') : 'transparent', famScale: beat === 'pS' ? 0.97 : 1,
    specimen: typed || 'Typography that carries the page',
    fieldText: typed || (focused ? '' : 'Your own words…'), fieldC: typed ? INK : dim('.62'),
    fieldBorder: focused ? INK : dim('.16'), caretOp: focused ? 1 : 0,

    op4: layer(4), tr4: trn(4),
    ratioName: RATIOS[ratioI][1],
    segs: RATIOS.map(([, , n], i) => ({ n, bg: i === ratioI ? INK : 'transparent', c: i === ratioI ? '#0B0C0E' : dim('.72'), sc: beat === 'pRat' && i === 2 ? 0.97 : 1 })),
    ladder: STEPS.map(([tag, n]) => { const px = Math.round(15 * Math.pow(ratio, n)); return { tag, px, sx: Math.min(1, px / 110).toFixed(3) } }),
    hScale: (Math.round(15 * Math.pow(ratio, 2)) / 24).toFixed(3),

    op5: layer(5), tr5: trn(5),
    genScale: beat === 'pGen' ? 0.97 : 1,
    genLabel: generating ? 'Generating…' : showWords ? 'Regenerate' : 'Generate alt text',
    resBorder: showWords ? dim('.24') : dim('.12'),
    emptyOp: !generating && !showWords ? 1 : 0, shimOp: generating ? 1 : 0, resOp: showWords ? 1 : 0,
    resWords: words.map((w, i) => {
      const stem = w.replace(/[,.]$/, '')
      const key = ALT_KEYS.has(stem) && P('hAlt')
      return {
        w: stem, tail: w.slice(stem.length), sp: i < words.length - 1 ? ' ' : '',
        bg: key ? 'rgba(201,214,226,.16)' : 'transparent', ring: key ? '0 0 0 2px rgba(201,214,226,.16)' : 'none',
        c: key || !P('hAlt') ? INK : dim('.72'),
      }
    }),

    // The finger shows on an approach, taps, and stays down along a drag.
    tx: geo.pos[k][0], ty: geo.pos[k][1], dotOp: touch ? 1 : 0, dotMs: dragStep ? TL[k][2] : 0,

    chapters: strip,
    pauseDisplay: reduced ? 'none' : 'flex', toggleText: done ? 'Replay' : playing ? 'Pause' : 'Play',
    showPause: playing && !done ? 1 : 0, showPlay: !playing && !done ? 1 : 0, showReplay: done ? 1 : 0,
    toggleLabel: done ? 'Replay the animation' : playing ? 'Pause the animation' : 'Play the animation',
  }
}
