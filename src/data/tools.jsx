// Central tool registry — single source of truth for Sidebar, TopBar search, and category dashboards.

export const CATEGORIES = [
  {
    id: 'color',
    labelKey: 'categories.color.label',
    descKey: 'categories.color.description',
    label: 'Colour Studio',
    path: '/color',
    description: 'Build palettes, scales, gradients and verify accessibility.',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
        <circle cx="8" cy="14" r="1.5" fill="currentColor" />
        <circle cx="16" cy="14" r="1.5" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'typography',
    labelKey: 'categories.typography.label',
    descKey: 'categories.typography.description',
    label: 'Typography',
    path: '/typography',
    description: 'Type scales and font pairings tuned for readability.',
    icon: (
      <>
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </>
    ),
  },
  {
    id: 'imagery',
    labelKey: 'categories.imagery.label',
    descKey: 'categories.imagery.description',
    label: 'Imagery',
    path: '/imagery',
    description: 'Icons, image tools, and prompt structuring.',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
  },
  {
    id: 'documentation',
    labelKey: 'categories.documentation.label',
    descKey: 'categories.documentation.description',
    label: 'Documentation',
    path: '/docs',
    description: 'Design principles, marketing references, and external resources.',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </>
    ),
  },
]

const TOOL_I18N_MAP = {
  'color-studio': 'tools.colorStudio',
  'typescale': 'tools.typeScale',
  'fontpairs': 'tools.fontPairs',
  'icons': 'tools.iconLibrary',
  'imgconvert': 'tools.imageConverter',
  'prompts': 'tools.promptLibrary',
  'docs-design': 'tools.docsDesign',
  'docs-social': 'tools.docsSocial',
  'design-reference': 'tools.designReference',
  'video-frames': 'tools.videoFrames',
  'resources': 'tools.externalResources',
}

export const TOOLS = [
  { id: 'color-studio', label: 'Colour Studio', path: '/color', category: 'color', description: 'Complete colour system builder with palette, tints, contrast, and gradients.', keywords: ['color', 'colour', 'studio', 'palette', 'tint', 'contrast', 'gradient', 'system'] },
  { id: 'typescale', label: 'Type Scale', path: '/typescale', category: 'typography', description: 'Modular type scale calculator with CSS export.', keywords: ['type', 'scale', 'modular', 'font size'] },
  { id: 'fontpairs', label: 'Font Pair Finder', path: '/fontpairs', category: 'typography', description: 'Curated font pairings for headlines and body.', keywords: ['font', 'pair', 'pairing', 'typography', 'google fonts'] },
  { id: 'icons', label: 'Icon Library', path: '/icons', category: 'imagery', description: 'Search thousands of icons via Iconify API.', keywords: ['icon', 'svg', 'symbol', 'iconify'] },
  { id: 'imgconvert', label: 'Image Converter', path: '/imgconvert', category: 'imagery', description: 'Convert, compress and resize images locally.', keywords: ['image', 'convert', 'compress', 'resize', 'webp', 'png', 'jpg'] },
  { id: 'video-frames', label: 'Video to Frames', path: '/video-frames', category: 'imagery', description: 'Extract frames from video as images with scaling and compression controls.', keywords: ['video', 'frames', 'extract', 'screenshot', 'capture', 'export'] },
  { id: 'prompts', label: 'Prompt Library', path: '/prompts', category: 'imagery', description: 'Save AI image generation prompts with output previews.', keywords: ['prompt', 'ai', 'midjourney', 'dalle', 'stable diffusion', 'library'] },
  { id: 'docs-design', label: 'Design Principles', path: '/docs-design', category: 'documentation', description: 'Visual hierarchy, balance, and design psychology.', keywords: ['design', 'principles', 'theory', 'documentation'] },
  { id: 'docs-social', label: 'Social & Marketing', path: '/docs-social', category: 'documentation', description: 'Social media and marketing best practices.', keywords: ['social', 'marketing', 'content', 'documentation'] },
  { id: 'design-reference', label: 'Design Reference', path: '/design-reference', category: 'documentation', description: 'Spacing, shadows, radii, font scales, and design token reference.', keywords: ['tailwind', 'spacing', 'shadow', 'radius', 'tokens', 'reference', 'cheat sheet'] },
  { id: 'resources', label: 'External Resources', path: '/resources', category: 'documentation', description: 'Curated links to fonts, colours, AI tools, and inspiration.', keywords: ['resources', 'links', 'external', 'google fonts', 'tailwind', 'framer', 'awwwards'] },
]

export function toolsByCategory(categoryId) {
  return TOOLS.filter(t => t.category === categoryId)
}

export function getCategory(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId)
}

export function searchTools(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return TOOLS.filter(t => {
    if (t.label.toLowerCase().includes(q)) return true
    if (t.description.toLowerCase().includes(q)) return true
    if (t.keywords.some(k => k.includes(q))) return true
    return false
  })
}

export function localiseTools(t) {
  return TOOLS.map(tool => ({
    ...tool,
    label: t(TOOL_I18N_MAP[tool.id] + '.label') || tool.label,
    description: t(TOOL_I18N_MAP[tool.id] + '.description') || tool.description,
  }))
}

export function localiseCategories(t) {
  return CATEGORIES.map(cat => ({
    ...cat,
    label: t(cat.labelKey) || cat.label,
    description: t(cat.descKey) || cat.description,
  }))
}

export function searchToolsLocalised(query, t) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const tools = localiseTools(t)
  return tools.filter(tool => {
    if (tool.label.toLowerCase().includes(q)) return true
    if (tool.description.toLowerCase().includes(q)) return true
    if (tool.keywords.some(k => k.includes(q))) return true
    return false
  })
}
