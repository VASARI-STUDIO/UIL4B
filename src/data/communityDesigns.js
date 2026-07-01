// Community designs — the shared seed for the Community Hub and the "From the
// community" band on Discover. Extracted from Community.jsx (Slice 2) so Discover
// can import the data without importing the page component.
//
// Shape (identical to the original in Community.jsx):
//   id        stable key (also the localStorage save id)
//   name      display name
//   author    credited creator
//   category  one of COMMUNITY_CATEGORIES (excluding 'All')
//   c1, c2    gradient stops for the generated thumbnail (no external assets)
//   saves     illustrative baseline save count
//   url       outbound credit link (rendered nofollow, new tab)
//   mine      (optional — local submissions only) flags an item the user authored
//             on the Community Hub; absent on the curated seed below
//
// Thumbnails are generated gradients (no external assets / Storage dependency) so
// the gallery renders instantly and offline.

export const COMMUNITY_CATEGORIES = ['All', 'Landing', 'Dashboard', 'Portfolio', 'E-commerce', 'Mobile', 'Branding']

export const COMMUNITY_DESIGNS = [
  { id: 's1', name: 'Aurora Analytics', author: 'Maya R.', category: 'Dashboard', c1: '#3B82F6', c2: '#8B5CF6', saves: 342, url: 'https://dribbble.com' },
  { id: 's2', name: 'Lumen Studio', author: 'Devon K.', category: 'Landing', c1: '#0EA5E9', c2: '#22D3EE', saves: 318, url: 'https://awwwards.com' },
  { id: 's3', name: 'Folio Noir', author: 'Inès B.', category: 'Portfolio', c1: '#111827', c2: '#374151', saves: 287, url: 'https://behance.net' },
  { id: 's4', name: 'Marketplace Mint', author: 'Theo L.', category: 'E-commerce', c1: '#10B981', c2: '#34D399', saves: 264, url: 'https://dribbble.com' },
  { id: 's5', name: 'Pulse Mobile', author: 'Sara W.', category: 'Mobile', c1: '#F43F5E', c2: '#FB7185', saves: 251, url: 'https://mobbin.com' },
  { id: 's6', name: 'Cobalt Brand Kit', author: 'Nikolai V.', category: 'Branding', c1: '#2563EB', c2: '#60A5FA', saves: 233, url: 'https://behance.net' },
  { id: 's7', name: 'Solaris Landing', author: 'Priya N.', category: 'Landing', c1: '#F59E0B', c2: '#FBBF24', saves: 219, url: 'https://awwwards.com' },
  { id: 's8', name: 'Grid Atlas', author: 'Marco D.', category: 'Dashboard', c1: '#6366F1', c2: '#A5B4FC', saves: 198, url: 'https://dribbble.com' },
  { id: 's9', name: 'Verdant Store', author: 'Lena H.', category: 'E-commerce', c1: '#059669', c2: '#6EE7B7', saves: 176, url: 'https://dribbble.com' },
  { id: 's10', name: 'Monochrome Folio', author: 'Otis P.', category: 'Portfolio', c1: '#27272A', c2: '#52525B', saves: 154, url: 'https://behance.net' },
  { id: 's11', name: 'Glass Wallet', author: 'Amara F.', category: 'Mobile', c1: '#7C3AED', c2: '#C4B5FD', saves: 142, url: 'https://mobbin.com' },
  { id: 's12', name: 'Coral Identity', author: 'Hugo S.', category: 'Branding', c1: '#EC4899', c2: '#F9A8D4', saves: 121, url: 'https://behance.net' },
]
