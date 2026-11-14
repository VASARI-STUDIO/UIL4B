// loadFont(stem) for theme code that measures text outside a ctx (the laned themes' helpers): the parsed .ttf from the bundled fonts folder,
// read through node-loaders like every other engine read. Cached by engine/brand.js.
import { loadFont as loadWith } from './brand.js';
import loaders from '../node-loaders.js';

export const loadFont = (stem) => loadWith(loaders, stem);
