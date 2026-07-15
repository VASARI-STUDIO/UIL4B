// Publicly documented brand colour palettes for the Palette Builder's "Brands"
// panel. Every value comes from the brand's own published guidelines or press
// kit — these are public identity colours, not proprietary data. `free` marks
// the rows visible without Pro (the rest render locked). `system` is the colour
// system a brand's palette expresses — applied wholesale when a Pro user loads
// the brand (free users get the colours on the default free system).

export const BRAND_PALETTES = [
  { id: 'apple', name: 'Apple', free: true, system: 'custom', colors: ['#1D1D1F', '#F5F5F7', '#0071E3', '#86868B', '#2997FF'] },
  { id: 'material', name: 'Material (Google)', free: true, system: 'custom', colors: ['#6750A4', '#625B71', '#7D5260', '#FFFBFE', '#1C1B1F'] },
  { id: 'netflix', name: 'Netflix', free: true, system: 'custom', colors: ['#E50914', '#221F1F', '#F5F5F1', '#B81D24', '#000000'] },
  { id: 'discord', name: 'Discord', free: true, system: 'custom', colors: ['#5865F2', '#EB459E', '#FEE75C', '#57F287', '#23272A'] },
  { id: 'stripe', name: 'Stripe', free: true, system: 'custom', colors: ['#635BFF', '#0A2540', '#00D4FF', '#F6F9FC', '#425466'] },
  { id: 'spotify', name: 'Spotify', free: true, system: 'custom', colors: ['#1DB954', '#191414', '#FFFFFF', '#535353', '#B3B3B3'] },
  { id: 'slack', name: 'Slack', free: false, system: 'custom', colors: ['#4A154B', '#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'] },
  { id: 'airbnb', name: 'Airbnb', free: false, system: 'custom', colors: ['#FF5A5F', '#00A699', '#FC642D', '#484848', '#767676'] },
  { id: 'twitch', name: 'Twitch', free: false, system: 'custom', colors: ['#9146FF', '#772CE8', '#F0F0FF', '#18181B', '#EFEFF1'] },
  { id: 'figma', name: 'Figma', free: false, system: 'custom', colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'] },
  { id: 'github', name: 'GitHub', free: false, system: 'custom', colors: ['#24292F', '#0969DA', '#2DA44E', '#F6F8FA', '#CF222E'] },
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
  { id: 'lego', name: 'LEGO', free: false, system: 'custom', colors: ['#D01012', '#FFCF00', '#006CB7', '#00AF4D', '#000000'] },
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
  { id: 'paypal', name: 'PayPal', free: false, system: 'custom', colors: ['#003087', '#009CDE', '#012169', '#FFFFFF', '#0070BA'] },
]
