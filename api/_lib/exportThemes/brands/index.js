// The ten sample brands, keyed by slug. Static imports keep every brand in the module graph the server function traces.
import encoreBrand from './encore/brand.js';
import encoreLogo from './encore/logo.js';
import kerbsideBrand from './kerbside/brand.js';
import kerbsideLogo from './kerbside/logo.js';
import longRoomBrand from './long-room/brand.js';
import longRoomLogo from './long-room/logo.js';
import marginBrand from './margin/brand.js';
import marginLogo from './margin/logo.js';
import northernCurrentBrand from './northern-current/brand.js';
import northernCurrentLogo from './northern-current/logo.js';
import offcutBrand from './offcut/brand.js';
import offcutLogo from './offcut/logo.js';
import plumblineBrand from './plumbline/brand.js';
import plumblineLogo from './plumbline/logo.js';
import saltbushBrand from './saltbush/brand.js';
import saltbushLogo from './saltbush/logo.js';
import shallowEndBrand from './shallow-end/brand.js';
import shallowEndLogo from './shallow-end/logo.js';
import twoShoresBrand from './two-shores/brand.js';
import twoShoresLogo from './two-shores/logo.js';

export const BRANDS = {
  'encore': { data: encoreBrand, logo: encoreLogo },
  'kerbside': { data: kerbsideBrand, logo: kerbsideLogo },
  'long-room': { data: longRoomBrand, logo: longRoomLogo },
  'margin': { data: marginBrand, logo: marginLogo },
  'northern-current': { data: northernCurrentBrand, logo: northernCurrentLogo },
  'offcut': { data: offcutBrand, logo: offcutLogo },
  'plumbline': { data: plumblineBrand, logo: plumblineLogo },
  'saltbush': { data: saltbushBrand, logo: saltbushLogo },
  'shallow-end': { data: shallowEndBrand, logo: shallowEndLogo },
  'two-shores': { data: twoShoresBrand, logo: twoShoresLogo },
};
