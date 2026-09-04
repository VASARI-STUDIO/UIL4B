// Publicly documented brand colour palettes for the Palette Builder's "Brands"
// panel. These are public identity colours, not proprietary data. `free` marks
// the rows visible without Pro (the rest render locked). `system` is the colour
// system a brand's palette expresses — applied wholesale when a Pro user loads
// the brand (free users get the colours on the default free system).
//
// PROVENANCE. Audited 2026-09-04 against PRIMARY sources only — the brand's own
// logo asset, design system or press site. Never a colour-aggregator site: they
// copy each other, which is how a superseded hex outlives the rebrand that
// retired it. Five swatches are a RECOGNISABLE SAMPLE of an identity, not a
// brand system — the claim this file makes is "these hexes are current and the
// brand publishes them", nothing more.
//
// Corrected in that pass: Material 3 surface/on-surface, Spotify green, Airbnb
// Rausch, GitHub Primer, LEGO red/yellow/black, PayPal blues. Sources are
// recorded per value in the PR, not per row here — a `source` + `verified`
// field on 37 rows is maintenance surface that goes stale silently, and a date
// nobody re-checks reads as a guarantee the file cannot keep.
//
// NOT VERIFIED: `pepsi`. PepsiCo's own newsroom confirms a 2023 identity change
// (electric blue + black added), but no primary source publishes the hexes, so
// the pre-rebrand values are LEFT IN PLACE rather than guessed from aggregators.
// Backlog: [brand-palette-provenance].
//
// RE-CHECKED 2026-09-04, still unresolved. Recorded so the third attempt starts
// where this one stopped instead of re-running it:
//   BLOCKED to every fetcher tried - plain curl, the agent fetch tool, AND a
//   real headless Chromium with a browser UA: pepsico.com (403),
//   design.pepsico.com (403), contact.pepsico.com, investor.pepsico.com,
//   pepsico.co.uk, pepsi.co.uk, pepsico.de, pepsicobeveragefacts.com. It is a
//   WAF on the edge, not a user-agent check, so a better UA will not fix it.
//   pepsi.com answers 400 to curl and geo-redirects a real browser to a
//   Facebook page - there is no asset behind it to read.
//   REACHABLE, and the useful find: digitalassets.pepsico.com, PepsiCo's own
//   DAM, serves 200 directly. But every asset reachable from it via the
//   archived corporate pages is the PEPSICO CORPORATE mark, not the Pepsi cola
//   brand logo, and PepsiCo refreshed the corporate identity separately in
//   2025 - so those files answer a different question. Start there next time
//   and look for a Pepsi-brand asset id.
//   ALSO REACHABLE but NOT usable: pepsicojobs.com, pepsicopartners.com and
//   pepsicorecycling.com all answer 200 and all serve #0065C3 in their site
//   chrome - which is one of this row's current values. That is a coincidence
//   worth naming, because it is the Shopify trap from the method above: a
//   marketing or portal theme is not the brand's logo palette, and matching an
//   existing value does not verify it.
//   Domain-restricted search against pepsico.com surfaces the 2023 announcement
//   in PepsiCo's own words ("electric blue and the black of Pepsi Zero Sugar")
//   and publishes NO hex.
// The row therefore still asserts a palette nobody here has confirmed. Whether
// a row we cannot substantiate should keep shipping under the bare name "Pepsi"
// is a product call, not a data one - see [brand-palette-provenance].
//
// NAMING RULE, learned the hard way. A row named after a COMPANY must hold that
// company's identity colours. `material` held Material 3's default purple under
// the name "Material (Google)" — correct hexes, wrong promise, since nobody
// reading "Google" expects purple. It is now "Material 3 Baseline" (a design
// SYSTEM) and `google` carries the four-colour logo palette. Keep them separate.

export const BRAND_PALETTES = [
  { id: 'apple', name: 'Apple', free: true, system: 'custom', colors: ['#1D1D1F', '#F5F5F7', '#0071E3', '#86868B', '#2997FF'] },
  { id: 'material', name: 'Material 3 Baseline', free: true, system: 'custom', colors: ['#6750A4', '#625B71', '#7D5260', '#FEF7FF', '#1D1B20'] },
  { id: 'google', name: 'Google', free: false, system: 'custom', colors: ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#202124'] },
  { id: 'netflix', name: 'Netflix', free: true, system: 'custom', colors: ['#E50914', '#221F1F', '#F5F5F1', '#B81D24', '#000000'] },
  { id: 'discord', name: 'Discord', free: true, system: 'custom', colors: ['#5865F2', '#EB459E', '#FEE75C', '#57F287', '#23272A'] },
  { id: 'stripe', name: 'Stripe', free: true, system: 'custom', colors: ['#635BFF', '#0A2540', '#00D4FF', '#F6F9FC', '#425466'] },
  { id: 'spotify', name: 'Spotify', free: true, system: 'custom', colors: ['#1ED760', '#191414', '#FFFFFF', '#535353', '#B3B3B3'] },
  { id: 'slack', name: 'Slack', free: false, system: 'custom', colors: ['#4A154B', '#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'] },
  { id: 'airbnb', name: 'Airbnb', free: false, system: 'custom', colors: ['#FF385C', '#00A699', '#FC642D', '#484848', '#767676'] },
  { id: 'twitch', name: 'Twitch', free: false, system: 'custom', colors: ['#9146FF', '#772CE8', '#F0F0FF', '#18181B', '#EFEFF1'] },
  { id: 'figma', name: 'Figma', free: false, system: 'custom', colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'] },
  { id: 'github', name: 'GitHub', free: false, system: 'custom', colors: ['#1F2328', '#0969DA', '#1F883D', '#F6F8FA', '#CF222E'] },
  { id: 'dropbox', name: 'Dropbox', free: false, system: 'custom', colors: ['#0061FF', '#1E1919', '#F7F5F2', '#B4DC19', '#FF8C19'] },
  { id: 'duolingo', name: 'Duolingo', free: false, system: 'custom', colors: ['#58CC02', '#89E219', '#1CB0F6', '#FF9600', '#4B4B4B'] },
  { id: 'linear', name: 'Linear', free: false, system: 'custom', colors: ['#5E6AD2', '#222326', '#F4F5F8', '#8A8F98', '#26282D'] },
  { id: 'notion', name: 'Notion', free: false, system: 'custom', colors: ['#000000', '#FFFFFF', '#F7F6F3', '#EB5757', '#2EAADC'] },
  { id: 'vercel', name: 'Vercel', free: false, system: 'custom', colors: ['#000000', '#FFFFFF', '#0070F3', '#7928CA', '#FF0080'] },
  { id: 'reddit', name: 'Reddit', free: false, system: 'custom', colors: ['#FF4500', '#FF8717', '#0079D3', '#1A1A1B', '#DAE0E6'] },
  { id: 'snapchat', name: 'Snapchat', free: false, system: 'custom', colors: ['#FFFC00', '#000000', '#FFFFFF', '#F23C57', '#02ADFF'] },
  { id: 'tiktok', name: 'TikTok', free: false, system: 'custom', colors: ['#000000', '#FE2C55', '#25F4EE', '#FFFFFF', '#161823'] },
  { id: 'uber', name: 'Uber', free: false, system: 'custom', colors: ['#000000', '#FFFFFF', '#276EF1', '#05A357', '#E8E8E8'] },
  { id: 'ikea', name: 'IKEA', free: false, system: 'custom', colors: ['#0058A3', '#FFDB00', '#FFFFFF', '#111111', '#F5F5F5'] },
  { id: 'lego', name: 'LEGO', free: false, system: 'custom', colors: ['#E3000B', '#FFED00', '#006CB7', '#00AF4D', '#181716'] },
  { id: 'mcdonalds', name: "McDonald's", free: false, system: 'custom', colors: ['#FFC72C', '#DA291C', '#27251F', '#FFFFFF', '#264F36'] },
  { id: 'pepsi', name: 'Pepsi', free: false, system: 'custom', colors: ['#004B93', '#E32934', '#FFFFFF', '#0065C3', '#28458E'] },
  { id: 'firefox', name: 'Firefox', free: false, system: 'custom', colors: ['#FF9500', '#FF3B6B', '#9059FF', '#20123A', '#00DDFF'] },
  { id: 'x', name: 'X (Twitter)', free: false, system: 'custom', colors: ['#000000', '#FFFFFF', '#1D9BF0', '#71767B', '#16181C'] },
  { id: 'instagram', name: 'Instagram', free: false, system: 'custom', colors: ['#E1306C', '#F56040', '#FCAF45', '#833AB4', '#405DE6'] },
  { id: 'youtube', name: 'YouTube', free: false, system: 'custom', colors: ['#FF0000', '#282828', '#FFFFFF', '#606060', '#0F0F0F'] },
  { id: 'whatsapp', name: 'WhatsApp', free: false, system: 'custom', colors: ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#ECE5DD'] },
  { id: 'linkedin', name: 'LinkedIn', free: false, system: 'custom', colors: ['#0A66C2', '#004182', '#FFFFFF', '#000000', '#70B5F9'] },
  { id: 'microsoft', name: 'Microsoft', free: false, system: 'custom', colors: ['#F25022', '#7FBA00', '#00A4EF', '#FFB900', '#737373'] },
  { id: 'amazon', name: 'Amazon', free: false, system: 'custom', colors: ['#FF9900', '#146EB4', '#232F3E', '#000000', '#FFFFFF'] },
  { id: 'pinterest', name: 'Pinterest', free: false, system: 'custom', colors: ['#E60023', '#BD081C', '#FFFFFF', '#111111', '#EFEFEF'] },
  { id: 'shopify', name: 'Shopify', free: false, system: 'custom', colors: ['#95BF47', '#5E8E3E', '#004C3F', '#FFFFFF', '#212326'] },
  { id: 'adobe', name: 'Adobe', free: false, system: 'custom', colors: ['#FF0000', '#EC1C24', '#000000', '#FFFFFF', '#FA0F00'] },
  { id: 'paypal', name: 'PayPal', free: false, system: 'custom', colors: ['#003087', '#0070E0', '#012169', '#FFFFFF', '#001C64'] },
]
