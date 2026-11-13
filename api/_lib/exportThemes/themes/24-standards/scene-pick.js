// Theme 24, Standards: which sign scene a brand is photographed in, and which of its lines the sign carries (12 Nov fix round).
// The library gives theme 24 the wharf board (anchor), a bus shelter and a lit tram panel. A river-ferry brand's sign goes on the wharf
// board; a street brand's goes in the shelter. The brand's own sign string decides, so a swapped-in brand needs no code change.
// The line on the sign is the one the brand's sign string quotes, so the caption and the board never name different lines.
const WHARF = /\b(wharf|pier|jetty|dock|ferry|ferries|boat)\b/i;

// the scene id for the sign
export function signScene(ctx) {
  return WHARF.test((ctx.brand.applications && ctx.brand.applications.signage) || '') ? 'kerb-wharf-board' : 'kerb-shelter-morning';
}
// the share of a scene's width a crop may reach: the bus-shelter photograph has a cyclist cut by its own right edge (from x 0.91), so no crop
// of it runs past 0.9 and no person is cut in a mock-up
const CLEAR_X = { 'kerb-shelter-morning': 0.9 };
export const sceneClearX = (sceneId) => CLEAR_X[sceneId] || 1;
// the scenes the signage page shows: the brand's own first, then the one that fits a street brand
export function signScenes(ctx) {
  const first = signScene(ctx);
  if (first === 'kerb-wharf-board') return [{ id: first, where: 'On the wharf board.' }];
  return [{ id: first, where: 'In a bus shelter, morning.' }, { id: 'late-tram-panel', where: 'On a lit panel at a tram stop, night.' }];
}
// a brand's own scene override is honoured only when it names a scene from the new library; an old photo id (wharf-sign, phone-kerb...) falls back to the pick
const NEW_LIB = /^(kerb|late|room|counter|bench)-/;
export const libScene = (id) => (id && NEW_LIB.test(id) ? id : null);
// where the first scene is, in words for a caption
export const signWhere = (ctx) => (signScene(ctx) === 'kerb-wharf-board' ? 'on the wharf board' : 'in a bus shelter');

// the brand line the sign string quotes (checked against every line the brand has), else the primary line
export function signLine(ctx) {
  const B = ctx.brand, s = (B.applications && B.applications.signage) || '';
  const all = [B.lines.primary, ...(B.lines.others || []), ...((B.applications && B.applications.social) || [])].filter(Boolean);
  return all.filter((l) => s.includes(l)).sort((a, b) => b.length - a.length)[0] || B.lines.primary;
}
