# UIL4B

UIL4B is a browser-based toolkit for building user-interface foundations:
colour palettes and tint scales, contrast checks, gradients, font pairing, type
scales, icons, image conversion and design-system export. It is a React
single-page application served from Vercel, with serverless functions in
`api/` and Firebase for accounts and storage. The live site is
[uil4b.com](https://uil4b.com).

## Requirements

- Node.js 22 and npm
- For the security-rules tests: the Firebase CLI (installed as a dev dependency)
  and a Java runtime (JDK 21) for the emulator

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values you need
```

The variable names the app and the functions read are listed in
`.env.example`. The client falls back to built-in public Firebase settings, so
the front end runs locally without any of them; server functions that call
third-party services need their keys.

## Run

```bash
npm run dev        # development server on http://localhost:5173
npm run build      # production build to dist/, then prerendered route shells
npm run preview    # serve the production build
```

`npm run build` runs `vite build` followed by `scripts/prerender.mjs`, and
prints `prerender: wrote N route shells + a noindex 404 shell` when it
finishes. Several unit tests read the prerendered shells, so use it rather than
a bare `vite build`.

## Test

```bash
npm run lint         # ESLint
npm run test:unit    # unit tests (node --test, tests/unit/)
npm run test:rules   # Firestore and Storage rules tests against the emulator (tests/rules/)
npm run test:users   # Playwright acceptance suite (tests/user-sim/); builds in test mode first
```

## Layout

```
api/            Vercel serverless functions
api/_lib/       shared server helpers
src/            application source (src/App.jsx holds the routes, src/main.jsx the entry point)
src/locales/    translation files
src/styles/     global stylesheet
public/         static assets, fonts and icon data
scripts/        build and maintenance scripts
tests/          unit, rules and acceptance tests
firestore.rules Firestore security rules
storage.rules   Cloud Storage security rules
```

Key files: `src/App.jsx`, `src/main.jsx`, `src/styles/global.css`,
`api/_lib/`, `scripts/prerender.mjs`, `tests/unit/`, `tests/rules/`,
`tests/user-sim/`, `public/fonts/`, `public/icons-data.js`.

## Licence

Proprietary, source-available. The code is published to be read; it is not open
source. See [LICENSE](LICENSE) for what is and is not permitted.

Third-party components keep their own licences and are not covered by that
notice, including the icon packs in `public/icons-data.js`, the fonts in
`public/fonts/` and the dependencies in `package.json`.

## Credits

The full list of third-party components, with each one's licence and author, is
published at [uil4b.com/credits](https://uil4b.com/credits).
