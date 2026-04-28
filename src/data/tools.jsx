// Central tool registry — single source of truth for Sidebar, TopBar search, and category dashboards.

export const CATEGORIES = [
  {
    id: 'color',
    label: 'Color Studio',
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
    label: 'Imagery',
    path: '/imagery',
    description: 'Convert images, extract prompts, structure prompt JSON.',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
  },
  {
    id: 'components',
    label: 'Components',
    path: '/components',
    description: 'Buttons, layouts and icons for fast prototyping.',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    id: 'documentation',
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
]

export const TOOLS = [
  // Color Studio
  {
    id: 'palette',
    label: 'Palette Builder',
    path: '/palette',
    category: 'color',
    description: 'Generate harmonised five-tone color systems.',
    keywords: ['palette', 'color', 'harmony', 'theme', 'brand'],
  },
  {
    id: 'tints',
    label: 'Tint Generator',
    path: '/tints',
    category: 'color',
    description: 'Twelve-step tonal scales from any seed colour.',
    keywords: ['tint', 'shade', 'scale', 'tone', 'gradient', 'tailwind'],
  },
  {
    id: 'contrast',
    label: 'Contrast Checker',
    path: '/contrast',
    category: 'color',
    description: 'WCAG contrast validation with suggestions.',
    keywords: ['contrast', 'wcag', 'accessibility', 'a11y'],
  },
  {
    id: 'gradients',
    label: 'Gradient Tool',
    path: '/gradients',
    category: 'color',
    description: 'Build linear and radial gradients with presets.',
    keywords: ['gradient', 'linear', 'radial', 'mesh'],
  },

  // Typography
  {
    id: 'typescale',
    label: 'Type Scale',
    path: '/typescale',
    category: 'typography',
    description: 'Modular type scale calculator with CSS export.',
    keywords: ['type', 'scale', 'modular', 'font size'],
  },
  {
    id: 'fontpairs',
    label: 'Font Pair Finder',
    path: '/fontpairs',
    category: 'typography',
    description: 'Curated font pairings for headlines and body.',
    keywords: ['font', 'pair', 'pairing', 'typography', 'google fonts'],
  },

  // Imagery
  {
    id: 'imgconvert',
    label: 'Image Converter',
    path: '/imgconvert',
    category: 'imagery',
    description: 'Convert, compress and resize images locally.',
    keywords: ['image', 'convert', 'compress', 'resize', 'webp', 'png', 'jpg'],
  },
  {
    id: 'prompt-to-json',
    label: 'Prompt to JSON',
    path: '/prompt-to-json',
    category: 'imagery',
    description: 'Structure natural language prompts into JSON.',
    keywords: ['prompt', 'json', 'midjourney', 'stable diffusion', 'ai'],
  },

  // Components
  {
    id: 'buttons',
    label: 'Button Catalogue',
    path: '/buttons',
    category: 'components',
    description: 'Button styles with copy-ready CSS.',
    keywords: ['button', 'cta', 'component'],
  },
  {
    id: 'layouts',
    label: 'Section Layouts',
    path: '/layouts',
    category: 'components',
    description: 'Responsive section and grid templates.',
    keywords: ['layout', 'section', 'grid', 'flex', 'responsive'],
  },
  {
    id: 'icons',
    label: 'Icon Library',
    path: '/icons',
    category: 'components',
    description: 'Searchable icon set with copy-as-SVG.',
    keywords: ['icon', 'svg', 'symbol'],
  },

  // Documentation
  {
    id: 'docs-design',
    label: 'Design Principles',
    path: '/docs-design',
    category: 'documentation',
    description: 'Visual hierarchy, balance, and design psychology.',
    keywords: ['design', 'principles', 'theory', 'documentation'],
  },
  {
    id: 'docs-social',
    label: 'Social & Marketing',
    path: '/docs-social',
    category: 'documentation',
    description: 'Social media and marketing best practices.',
    keywords: ['social', 'marketing', 'content', 'documentation'],
  },
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
