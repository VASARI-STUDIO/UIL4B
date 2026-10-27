# Switzer licence

Switzer (the product's UI typeface) is designed by Jeremie Hornus and published
by the Indian Type Foundry through Fontshare:
https://www.fontshare.com/fonts/switzer

It is licensed under the **ITF Free Font License (FFL) v2.0**. The full text is
`License/FFL.txt` inside the official download
(`https://api.fontshare.com/v2/fonts/download/switzer`). It is not copied into
this repository.

## What we do, and why

- `scripts/fetch-switzer.mjs` downloads the official zip at build time and
  extracts the two unmodified `.woff2` files into `public/fonts/switzer/`.
- That folder is **gitignored**. The font is never committed, because the licence
  does not allow it to sit in a public repository or to be passed on.
- The files are served from our own origin through `@font-face` (the licence
  allows self-hosting on our own websites).

## Rules for anyone changing this

- Do not commit anything from `public/fonts/switzer/`.
- Do not subset, convert, rename or otherwise edit the font files.
- Switzer is the site interface face only. It must never become a selectable
  font in a tool, and it must never be embedded in, or offered with, anything a
  user downloads (UI kit exports keep their own face: Geist, in
  `src/utils/kitFonts.js` and `src/utils/uiKitExport.js`).
- Images made with the font (a palette PNG, a share card) are fine; the font
  files are not.
