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
  'fontgallery': 'tools.fontGallery',
  'icons': 'tools.iconLibrary',
  'imgconvert': 'tools.imageConverter',
  'alt-text': 'tools.altText',
  'prompts': 'tools.promptLibrary',
  'docs-design': 'tools.docsDesign',
  'docs-social': 'tools.docsSocial',
  'video-frames': 'tools.videoFrames',
  'emoji': 'tools.emojiLibrary',
  'resources': 'tools.externalResources',
  'box-shadow': 'tools.boxShadow',
}

export const TOOLS = [
  { id: 'color-studio', label: 'Colour Studio', path: '/color', category: 'color', description: 'Complete colour system builder with palette, tints, contrast, and gradients.', keywords: ['color', 'colour', 'studio', 'palette', 'tint', 'contrast', 'gradient', 'system'], icon: (<><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 010-20 9 9 0 019 9c0 4-3 4-5 4h-2a2 2 0 00-2 2 2 2 0 01-2 2"/></>) },
  { id: 'fontgallery', label: 'Font Gallery', path: '/fontgallery', category: 'typography', description: 'Visual gallery to browse and preview typefaces.', keywords: ['font', 'gallery', 'browse', 'typeface', 'preview', 'google fonts'], icon: (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>) },
  { id: 'fontpairs', label: 'Font Pair Finder', path: '/fontpairs', category: 'typography', description: 'Curated font pairings for headlines and body.', keywords: ['font', 'pair', 'pairing', 'typography', 'google fonts'], icon: (<><path d="M4 7V4h7v3"/><path d="M7.5 4v16"/><path d="M5.5 20h4"/><path d="M14 12h6"/><path d="M14 16h6"/><path d="M14 20h4"/></>) },
  { id: 'typescale', label: 'Type Scale', path: '/typescale', category: 'typography', description: 'Modular type scale calculator with CSS export.', keywords: ['type', 'scale', 'modular', 'font size'], icon: (<><path d="M3 7V5h10v2"/><path d="M8 5v14"/><path d="M6 19h4"/><path d="M14 13v-2h7v2"/><path d="M17.5 11v8"/><path d="M16 19h3"/></>) },
  { id: 'icons', label: 'Icon Library', path: '/icons', category: 'imagery', description: 'Search thousands of icons via Iconify API.', keywords: ['icon', 'svg', 'symbol', 'iconify'], icon: (<><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/></>) },
  { id: 'emoji', label: 'Emoji Library', path: '/emoji', category: 'imagery', description: 'Browse and copy emojis organised by category.', keywords: ['emoji', 'emoticon', 'smiley', 'unicode', 'copy', 'symbol'], icon: (<><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>) },
  { id: 'imgconvert', label: 'Image Converter', path: '/imgconvert', category: 'imagery', description: 'Convert, compress and resize images locally.', keywords: ['image', 'convert', 'compress', 'resize', 'webp', 'png', 'jpg'], icon: (<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>) },
  { id: 'alt-text', label: 'Alt Text Generator', path: '/alt-text', category: 'imagery', description: 'Generate accessible alt text for images in batch using AI.', keywords: ['alt', 'text', 'accessibility', 'a11y', 'ai', 'description', 'batch'], icon: (<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14l2-5 2 5"/><path d="M7.5 12.5h3"/><path d="M14 14V9h2.5a1.5 1.5 0 010 3H14"/></>) },
  { id: 'video-frames', label: 'Video to Frames', path: '/video-frames', category: 'imagery', description: 'Extract frames from video as images with scaling and compression controls.', keywords: ['video', 'frames', 'extract', 'screenshot', 'capture', 'export'], icon: (<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M2 9h5"/><path d="M2 15h5"/><path d="M17 9h5"/><path d="M17 15h5"/></>) },

  { id: 'box-shadow', label: 'Box Shadow', path: '/box-shadow', category: 'color', description: 'Design layered CSS box shadows with live preview.', keywords: ['box', 'shadow', 'css', 'elevation', 'layer', 'drop shadow', 'neumorphic'], icon: (<><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h14a2 2 0 002-2V7" opacity=".5"/></>) },

  { id: 'prompts', label: 'Prompt Library', path: '/prompts', category: 'documentation', description: 'AI image generation prompts with output previews.', keywords: ['prompt', 'ai', 'midjourney', 'dalle', 'stable diffusion', 'library'], icon: (<><path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M14.5 3.5l4 4L12 14l-4 1 1-4z"/></>) },
  { id: 'docs-design', label: 'Design Principles', path: '/docs-design', category: 'documentation', description: 'Visual hierarchy, balance, and design psychology.', keywords: ['design', 'principles', 'theory', 'documentation'], icon: (<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18"/><circle cx="12" cy="12" r="2.5"/></>) },
  { id: 'docs-social', label: 'Social & Marketing', path: '/docs-social', category: 'documentation', description: 'Social media and marketing best practices.', keywords: ['social', 'marketing', 'content', 'documentation'], icon: (<><path d="M3 11l18-7-7 18-2.5-8.5z"/><path d="M11.5 12.5L21 4"/></>) },
  { id: 'resources', label: 'External Resources', path: '/resources', category: 'documentation', description: 'Curated links to fonts, colours, AI tools, and inspiration.', keywords: ['resources', 'links', 'external', 'google fonts', 'tailwind', 'framer', 'awwwards'], icon: (<><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5"/></>) },
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
  return TOOLS.map(tool => {
    const prefix = TOOL_I18N_MAP[tool.id]
    if (!prefix) return tool
    const label = t(prefix + '.label')
    const description = t(prefix + '.description')
    return {
      ...tool,
      label: (label && label !== prefix + '.label') ? label : tool.label,
      description: (description && description !== prefix + '.description') ? description : tool.description,
    }
  })
}

export function localiseCategories(t) {
  return CATEGORIES.map(cat => {
    const label = t(cat.labelKey)
    const description = t(cat.descKey)
    return {
      ...cat,
      label: (label && label !== cat.labelKey) ? label : cat.label,
      description: (description && description !== cat.descKey) ? description : cat.description,
    }
  })
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
