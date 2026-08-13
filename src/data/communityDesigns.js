// Curated inspiration links — the seed for the Community Hub and the "From the
// community" band on Discover, shown until real submissions exist.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS WAS REWRITTEN (docs/audit-2026-08-11.md, P3)
// ─────────────────────────────────────────────────────────────────────────────
// The seed used to be twelve INVENTED designs by INVENTED people — "Aurora
// Analytics by Maya R., 342 saves" — each linking to a stock site's homepage,
// rendered by the same card as real user submissions and with nothing marking
// them apart.
//
// The audit called it "placeholder data on a page presented as a real
// community", which understates it: the names, the designers and the save
// counts were all fabricated, and a visitor had no way to tell. Fake social
// proof is a claim about other people's behaviour, and it was being shown to
// real users. A code comment saying the counts were "illustrative for now" is
// not a disclosure — the reader of that comment is us, not them.
//
// So the entries now say only true things:
//   • `source` is the platform the link actually opens, not a person who does
//     not exist. The card credits the platform.
//   • `name` describes what you will find there, rather than naming a specific
//     design that is not at that URL.
//   • `saves` is 0. Every count on the page is now a real count of real saves —
//     which starts at zero, and that is fine. A visible zero is honest; an
//     invented 342 is not.
//   • `curated: true` marks them, so the UI can distinguish a curated link from
//     a member's submission instead of blending the two.
//
// Shape:
//   id        stable key (also the localStorage save id)
//   name      what the destination is
//   source    the platform the link opens — displayed as the credit
//   category  one of COMMUNITY_CATEGORIES (excluding 'All')
//   c1, c2    gradient stops for the generated thumbnail (no external assets)
//   saves     real saves only; seeds start at 0
//   url       outbound link (rendered nofollow, new tab)
//   curated   true for these; absent on member submissions
//   mine      (optional — local submissions only) flags an item the user authored
//
// Thumbnails are generated gradients (no external assets / Storage dependency)
// so the gallery renders instantly and offline.

export const COMMUNITY_CATEGORIES = ['All', 'Landing', 'Dashboard', 'Portfolio', 'E-commerce', 'Mobile', 'Branding']

// Only the four platform homepages are linked. They are stable and they are
// what the link genuinely opens — a deep link to a category page would be a
// guess at someone else's URL structure, and a guess that 404s is just a
// different kind of dishonesty.
export const COMMUNITY_DESIGNS = [
  { id: 's1', name: 'Dashboard & analytics UI', source: 'Dribbble', category: 'Dashboard', c1: '#3B82F6', c2: '#8B5CF6', saves: 0, url: 'https://dribbble.com', curated: true },
  { id: 's2', name: 'Award-winning landing pages', source: 'Awwwards', category: 'Landing', c1: '#0EA5E9', c2: '#22D3EE', saves: 0, url: 'https://awwwards.com', curated: true },
  { id: 's3', name: 'Portfolio & folio design', source: 'Behance', category: 'Portfolio', c1: '#111827', c2: '#374151', saves: 0, url: 'https://behance.net', curated: true },
  { id: 's4', name: 'E-commerce & storefronts', source: 'Dribbble', category: 'E-commerce', c1: '#10B981', c2: '#34D399', saves: 0, url: 'https://dribbble.com', curated: true },
  { id: 's5', name: 'Mobile app patterns', source: 'Mobbin', category: 'Mobile', c1: '#F43F5E', c2: '#FB7185', saves: 0, url: 'https://mobbin.com', curated: true },
  { id: 's6', name: 'Brand & identity systems', source: 'Behance', category: 'Branding', c1: '#2563EB', c2: '#60A5FA', saves: 0, url: 'https://behance.net', curated: true },
  { id: 's7', name: 'Marketing site inspiration', source: 'Awwwards', category: 'Landing', c1: '#F59E0B', c2: '#FBBF24', saves: 0, url: 'https://awwwards.com', curated: true },
  { id: 's8', name: 'Data-heavy interfaces', source: 'Dribbble', category: 'Dashboard', c1: '#6366F1', c2: '#A5B4FC', saves: 0, url: 'https://dribbble.com', curated: true },
  { id: 's9', name: 'Product & checkout flows', source: 'Mobbin', category: 'E-commerce', c1: '#059669', c2: '#6EE7B7', saves: 0, url: 'https://mobbin.com', curated: true },
  { id: 's10', name: 'Minimal portfolio layouts', source: 'Behance', category: 'Portfolio', c1: '#27272A', c2: '#52525B', saves: 0, url: 'https://behance.net', curated: true },
  { id: 's11', name: 'Finance & wallet apps', source: 'Mobbin', category: 'Mobile', c1: '#7C3AED', c2: '#C4B5FD', saves: 0, url: 'https://mobbin.com', curated: true },
  { id: 's12', name: 'Colour & type in branding', source: 'Dribbble', category: 'Branding', c1: '#EC4899', c2: '#F9A8D4', saves: 0, url: 'https://dribbble.com', curated: true },
]
