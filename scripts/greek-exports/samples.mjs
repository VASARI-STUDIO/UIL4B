import { readFileSync } from 'node:fs';
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js';
import { makeCtx } from '../../api/_lib/exportThemes/engine/pages.js';
import loaders from '../../api/_lib/exportThemes/node-loaders.js';
import * as catalogue from '../../api/_lib/exportThemes/themes/05-specimen/index.js';
import * as blueprint from '../../api/_lib/exportThemes/themes/09-blueprint/index.js';
import * as presentation from '../../api/_lib/exportThemes/themes/01-presentation/index.js';

const editions = { aphrodite: catalogue, athena: blueprint, hermes: presentation };

export function sampleProject(theme) {
  const original = editions[theme];
  const brand = BRANDS[original.meta.brand].data;
  const ctx = makeCtx(original, 'showcase', 'guidelines', loaders);
  const heading = brand.fonts.display, body = brand.fonts.body;
  const logo = ctx.logo.svg('colour', { title: brand.name });
  const screen = brand.ui.screen.content;
  return {
    name: brand.name,
    date: brand.version.date,
    screenTitle: brand.ui.screen.title,
    screenDetail: screen.pickup,
    formLabel: screen.form.pickup,
    formValue: screen.form.pickupValue,
    logoNote: brand.logo.idea,
    colourUses: brand.colours.map(c => c.lands),
    imageryNote: brand.imagery.direction.crop,
    design: {
      palette: { colors: brand.colours.map(c => c.hex), base: brand.colours[0].hex },
      fonts: { heading: { family: heading.family, weight: heading.weights.at(-1) }, body: { family: body.family, weight: body.weights[0] } },
      typeScale: { base: brand.type.scale.find(s => s.token === 'body').size, ratio: 1.25 },
      logo: { src: 'data:image/svg+xml;base64,' + Buffer.from(logo).toString('base64') },
    },
    paletteNames: brand.colours.map(c => c.name),
    headline: brand.lines.primary,
    application: brand.product,
    action: screen.form.book,
    icons: brand.ui.icons,
    ...(theme === 'hermes' ? { photo: 'data:image/webp;base64,' + readFileSync(new URL('../../public/home-exports/kerbside-evening-960.webp', import.meta.url)).toString('base64'), photoAlt: 'Kerbside courier at the end of a shift' } : {}),
  };
}
