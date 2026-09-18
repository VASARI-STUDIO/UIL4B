// THE MENU ROW'S SECOND LINE — one implementation, two navs.
//
// This table and the function under it moved out of PillNav.jsx when the
// Spectrum marketing nav (SpectrumNav.jsx) started rendering the same tool
// tree in its full-screen menu. Both surfaces have to answer the same
// question the same way, and the two rules below are subtle enough that a
// second copy would have drifted the first time a tool shipped.

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
  // The two Learn rows that stopped saying Soon on 2026-09-18. While they were
  // Soon, menuDescription returned '' for them on the first line and the
  // question never arose; live, they fell through to their LEARN_GROUPS `desc`
  // — "The rules behind interfaces that work." and "Everything to get
  // productive fast." — which is landing-page copy in a 180px menu column, the
  // exact fall-through the note above this table warns about. '' rather than a
  // new sentence, for the same reason as the seven below it: the label already
  // is the sentence. Design Principles is the principles; Help & Getting
  // Started is the help.
  principles: '',
  help: '',
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
export function menuDescription(section, tool) {
  if (tool.soon) return ''
  if (tool.id in MENU_TOOL_COPY) return MENU_TOOL_COPY[tool.id]
  return section.groups?.find((group) => group.id === tool.id)?.desc || ''
}
