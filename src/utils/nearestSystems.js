// The app's shared nearest-match loader: the generated asset URLs fed to the
// loader. Kept apart from nearestLoader.js so that file has no `?url` import
// and a node test can load it with fake URLs and a fake fetch.
import { NEAREST_URLS } from '../data/nearest/urls.js'
import { createSystemLoader } from './nearestLoader.js'

export const loadSystem = createSystemLoader(NEAREST_URLS).loadSystem
