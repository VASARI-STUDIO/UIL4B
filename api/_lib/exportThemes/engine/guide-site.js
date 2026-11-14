// The guide site's page list: one unit per file, as the engine builds it. The site files themselves are not built by the server export
// (it serves the print HTML and the zips), so a theme's guide-site lane imports only this helper, to name its pages and links.

// nav data: one unit per file
export function siteUnits(ctx) {
  const front = ctx.pages.filter((p) => !p.section);
  const units = [{ id: 'index', file: 'index.html', ids: front.map((p) => p.id), title: 'Cover and contents', ref: null, section: null, front: true }];
  for (const p of ctx.pages.filter((x) => x.section)) units.push({ id: p.id, file: `${p.id}.html`, ids: [p.id], title: p.title, ref: p.ref, section: p.section, front: false });
  const unitOf = (id) => units.find((u) => u.ids.includes(id));
  // a page id (and an anchor) as a relative link
  const href = (id, anchor = '') => {
    const u = unitOf(id); if (!u) throw new Error('guide site: no page ' + id);
    if (anchor) return `${u.file}#${anchor}`;
    return u.front && u.ids[0] !== id ? `${u.file}#${id}` : u.file;
  };
  const sections = ctx.sections.map((s) => ({ n: s.n, title: s.title, units: s.pages.map((p) => unitOf(p.id)) }));
  return { units, unitOf, href, sections };
}
