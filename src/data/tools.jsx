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
    description: 'Convert and compress images, extract frames, and work out aspect ratios.',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
  },
  {
    id: 'icons-emoji',
    labelKey: 'categories.iconsEmoji.label',
    descKey: 'categories.iconsEmoji.description',
    label: 'Icons & Emoji',
    path: '/icons-emoji',
    description: 'Search thousands of icons and browse emoji to copy instantly.',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  {
    id: 'ui-builder',
    labelKey: 'categories.uiBuilder.label',
    descKey: 'categories.uiBuilder.description',
    label: 'UI Builder',
    path: '/ui-builder-cat',
    description: 'Design dashboard components with live previews and CSS export.',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </>
    ),
  },
  {
    id: 'ai',
    labelKey: 'categories.ai.label',
    descKey: 'categories.ai.description',
    label: 'AI Tools',
    path: '/ai-tools',
    description: 'AI-powered generators for images, alt text, and more.',
    icon: (
      <>
        <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
  },
  {
    id: 'documentation',
    labelKey: 'categories.documentation.label',
    descKey: 'categories.documentation.description',
    label: 'Documentation',
    path: '/docs',
    description: 'Design principles and marketing references.',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </>
    ),
  },
  {
    id: 'resources',
    labelKey: 'categories.resources.label',
    descKey: 'categories.resources.description',
    label: 'Resources',
    path: '/resources',
    description: 'Curated external tools, fonts, colours, and inspiration.',
    icon: (
      <>
        <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
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
  'alt-text': 'tools.altText',
  'ai-prompt': 'tools.aiPrompt',
  'prompts': 'tools.promptLibrary',
  'docs-design': 'tools.docsDesign',
  'docs-social': 'tools.docsSocial',
  'emoji': 'tools.emojiLibrary',
  'resources': 'tools.externalResources',
  'box-shadow': 'tools.boxShadow',
  'ui-builder': 'tools.uiBuilder',
}

export const TOOLS = [
  { id: 'color-studio', label: 'Colour Studio', path: '/color', category: 'color', description: 'Complete colour system builder with palette, tints, contrast, and gradients.', keywords: ['color', 'colour', 'studio', 'palette', 'tint', 'contrast', 'gradient', 'system'], icon: (<><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 010-20 9 9 0 019 9c0 4-3 4-5 4h-2a2 2 0 00-2 2 2 2 0 01-2 2"/></>) },
  { id: 'fontgallery', label: 'Font Gallery', path: '/fontgallery', category: 'typography', description: 'Visual gallery to browse and preview typefaces.', keywords: ['font', 'gallery', 'browse', 'typeface', 'preview', 'google fonts'], icon: (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>) },
  { id: 'fontpairs', label: 'Font Pair Finder', path: '/fontpairs', category: 'typography', description: 'Curated font pairings for headlines and body.', keywords: ['font', 'pair', 'pairing', 'typography', 'google fonts'], icon: (<><path d="M4 7V4h7v3"/><path d="M7.5 4v16"/><path d="M5.5 20h4"/><path d="M14 12h6"/><path d="M14 16h6"/><path d="M14 20h4"/></>) },
  { id: 'typescale', label: 'Type Scale', path: '/typescale', category: 'typography', description: 'Modular type scale calculator with CSS export.', keywords: ['type', 'scale', 'modular', 'font size'], icon: (<><path d="M3 7V5h10v2"/><path d="M8 5v14"/><path d="M6 19h4"/><path d="M14 13v-2h7v2"/><path d="M17.5 11v8"/><path d="M16 19h3"/></>) },
  { id: 'icons', label: 'Icon Library', path: '/icons', category: 'icons-emoji', description: 'Search thousands of icons via Iconify API.', keywords: ['icon', 'svg', 'symbol', 'iconify'], icon: (<><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/></>) },
  { id: 'emoji', label: 'Emoji Library', path: '/emoji', category: 'icons-emoji', description: 'Browse and copy emojis organised by category.', keywords: ['emoji', 'emoticon', 'smiley', 'unicode', 'copy', 'symbol'], icon: (<><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>) },
  { id: 'ratio', label: 'Aspect Ratio Calculator', path: '/ratio', category: 'imagery', description: 'Calculate aspect ratios from a single dimension with a live shape preview.', keywords: ['ratio', 'aspect', 'calculator', 'dimensions', 'resolution', 'resize', '16:9', '4:3', 'crop'], icon: (<><path d="M4 8V5a1 1 0 011-1h3"/><path d="M16 4h3a1 1 0 011 1v3"/><path d="M20 16v3a1 1 0 01-1 1h-3"/><path d="M8 20H5a1 1 0 01-1-1v-3"/></>) },
  { id: 'alt-text', label: 'Alt Text Generator', path: '/alt-text', category: 'ai', alpha: true, description: 'Generate accessible alt text for images in batch using AI.', keywords: ['alt', 'text', 'accessibility', 'a11y', 'ai', 'description', 'batch'], icon: (<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14l2-5 2 5"/><path d="M7.5 12.5h3"/><path d="M14 14V9h2.5a1.5 1.5 0 010 3H14"/></>) },
  { id: 'ai-prompt', label: 'AI Image Prompt Generator', path: '/ai-prompt', category: 'ai', alpha: true, description: 'Generate detailed AI image prompts from a design brief using DeepSeek.', keywords: ['ai', 'prompt', 'deepseek', 'image', 'generator', 'midjourney', 'dalle', 'stable diffusion'], icon: (<><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="4"/></>) },
  { id: 'landing-prompts', label: 'AI Landing Page Prompts', path: '/landing-prompts', category: 'ai', alpha: true, description: 'Build structured JSON prompts for generating AAA-tier websites with AI builders.', keywords: ['ai', 'landing', 'page', 'website', 'prompt', 'json', 'v0', 'lovable', 'bolt', 'generator'], icon: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>) },
  { id: 'file-converter', label: 'File Converter', path: '/file-converter', category: 'imagery', alpha: true, description: 'Convert between image and video formats — WebP/MP4 to GIF, frames, and more.', keywords: ['convert', 'file', 'converter', 'image', 'compress', 'resize', 'webp', 'gif', 'mp4', 'video', 'frames', 'extract', 'png', 'jpeg', 'avif', 'ezgif'], icon: (<><path d="M4 14V6a2 2 0 0 1 2-2h8"/><path d="M20 10v8a2 2 0 0 1-2 2H6"/><polyline points="14 4 14 8 18 8"/><path d="M4 14l3-3 3 3"/><path d="M20 10l-3 3-3-3"/></>) },

  { id: 'ui-builder', label: 'Component Designer', path: '/ui-builder', category: 'ui-builder', description: 'Design buttons, cards, tables, inputs and more with live previews.', keywords: ['ui', 'builder', 'component', 'button', 'card', 'table', 'input', 'dashboard', 'design'], icon: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>) },
  { id: 'box-shadow', label: 'Box Shadow', path: '/box-shadow', category: 'ui-builder', description: 'Design layered CSS box shadows with live preview.', keywords: ['box', 'shadow', 'css', 'elevation', 'layer', 'drop shadow', 'neumorphic'], icon: (<><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h14a2 2 0 002-2V7" opacity=".5"/></>) },
  { id: 'auto-builder', label: 'UI Auto-Builder', path: '/auto-builder', category: 'ui-builder', alpha: true, description: 'Describe a business and auto-generate brand colours, fonts, and a UI preview.', keywords: ['auto', 'builder', 'generate', 'brand', 'ai', 'palette', 'font', 'logo', 'business'], icon: (<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></>) },

  { id: 'prompts', label: 'Prompt Library', path: '/prompts', category: 'documentation', description: 'AI image generation prompts with output previews.', keywords: ['prompt', 'ai', 'midjourney', 'dalle', 'stable diffusion', 'library'], icon: (<><path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M14.5 3.5l4 4L12 14l-4 1 1-4z"/></>) },
  { id: 'docs-design', label: 'Design Principles', path: '/docs-design', category: 'documentation', subcategory: 'Design & Brand', description: 'Visual hierarchy, balance, and design psychology.', keywords: ['design', 'principles', 'theory', 'documentation'], icon: (<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18"/><circle cx="12" cy="12" r="2.5"/></>) },
  { id: 'docs-social', label: 'Social & Marketing', path: '/docs-social', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Social media and marketing best practices.', keywords: ['social', 'marketing', 'content', 'documentation'], icon: (<><path d="M3 11l18-7-7 18-2.5-8.5z"/><path d="M11.5 12.5L21 4"/></>) },
  { id: 'docs-themes', label: 'UI Design Themes', path: '/docs-themes', category: 'documentation', subcategory: 'Design & Brand', description: 'Reference guide to major UI design trends with visual examples.', keywords: ['themes', 'trends', 'brutalism', 'glassmorphism', 'bento', 'luxury', 'design', 'style'], icon: (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>) },
  { id: 'docs-brand', label: 'Brand Colour Guide', path: '/docs-brand', category: 'documentation', subcategory: 'Design & Brand', description: 'How to choose, build, and maintain a brand colour palette.', keywords: ['brand', 'colour', 'color', 'palette', '60-30-10', 'psychology', 'accessibility', 'guide'], icon: (<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>) },
  { id: 'docs-seo', label: 'SEO for Small Business', path: '/docs-seo', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Practical SEO strategies — Google Business Profile, local SEO, technical foundations.', keywords: ['seo', 'google', 'search', 'local', 'business', 'ranking', 'schema', 'web vitals'], icon: (<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>) },
  { id: 'seo', label: 'SEO Specialist', path: '/seo', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Live SERP + social preview, scored checklist, copy-ready meta tags, and a JSON-LD structured-data generator.', keywords: ['seo', 'meta', 'serp', 'title', 'description', 'snippet', 'preview', 'open graph', 'social', 'score', 'inspector', 'specialist', 'schema', 'json-ld', 'structured data'], icon: (<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>) },
  { id: 'docs-marketing', label: 'Marketing Fundamentals', path: '/docs-marketing', category: 'documentation', subcategory: 'Marketing & SEO', description: 'Positioning, funnels, email, paid ads, and brand voice for small businesses.', keywords: ['marketing', 'funnel', 'email', 'ads', 'brand', 'positioning', 'conversion', 'analytics'], icon: (<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>) },
  { id: 'docs-ai', label: 'AI Coding Assistants', path: '/docs-ai', category: 'documentation', subcategory: 'AI & Workflow', description: 'Claude tips, prompting patterns, subagents, and workflow integration for AI-assisted development.', keywords: ['ai', 'claude', 'cursor', 'copilot', 'prompting', 'subagent', 'coding', 'assistant'], icon: (<><path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></>) },
  { id: 'resources', label: 'External Resources', path: '/resources', category: 'resources', description: 'Curated links to fonts, colours, AI tools, and inspiration.', keywords: ['resources', 'links', 'external', 'google fonts', 'tailwind', 'framer', 'awwwards'], icon: (<><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5"/></>) },
]

export function toolsByCategory(categoryId) {
  return TOOLS.filter(t => t.category === categoryId)
}

// Group an ordered list of tools by their `subcategory` field, preserving the
// original order both of the groups (first appearance wins) and of tools within
// each group. Tools without a `subcategory` are collected into a trailing
// group whose `subcategory` is null, so callers can render them ungrouped.
// Returns [] when no tool in the list declares a subcategory — callers can use
// that as the signal to fall back to flat rendering.
export function groupBySubcategory(tools) {
  if (!tools.some(t => t.subcategory)) return []
  const order = []
  const map = new Map()
  for (const tool of tools) {
    const key = tool.subcategory || null
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key).push(tool)
  }
  // Keep labelled subcategories in first-appearance order, but always sort the
  // unlabelled (null) catch-all group last so general docs trail the named ones.
  order.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0))
  return order.map(key => ({ subcategory: key, tools: map.get(key) }))
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
