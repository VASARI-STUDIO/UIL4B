// A theme asks for a type token by name. A brand without it (a project brand carries display, headline, title, body, label and
// caption) gets a stand-in built from the token nearest in role, still under the name asked for.
const STAND_IN = {
  nameplate: (by) => by.display || by.headline,
  lead: (by) => by.body && { ...by.body, size: Math.round(by.body.size * 1.25 * 10) / 10 },
  subtitle: (by) => by.title || by.headline,
  time: (by) => by.title || by.headline,
};

export function typeToken(scale, name) {
  const found = scale.find((s) => s.token === name);
  if (found) return found;
  const by = Object.fromEntries(scale.map((s) => [s.token, s]));
  const base = Object.hasOwn(STAND_IN, name) ? STAND_IN[name](by) : undefined;
  return base ? { ...base, token: name } : undefined;
}
