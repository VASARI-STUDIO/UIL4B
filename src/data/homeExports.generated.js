// Written by scripts/home-exports/generate.mjs from the real export code. Do not edit by hand:
// regenerate with `node scripts/home-exports/generate.mjs`. The files named here are in public/home-exports/.
//
// SHAPE
//   HOME_EXPORTS = {
//     version: 1,
//     dir: '/home-exports/',                       public path prefix
//     design: { seed, harmony, colors[5], heading: { family, weight }, body: { family, weight } },
//     totalBytes,                                  all 27 files together
//     plates: [Item, Item, Item],                  tab order: UI kit, Book, Brand deck
//     covers: [Item, Item, Item],                  Northbeam, Halcyon, Ferrule (one tab each)
//   }
//   Item = {
//     id,            'kit-colour' | 'book-colour' | 'guide-palette' | 'cover-northbeam' | 'cover-halcyon' | 'cover-ferrule'
//     kind,          'plate' | 'cover'
//     tab,           the short tab label: 'UI kit' | 'Book' | 'Brand deck', or the project name for a cover
//     tabName,       the tab's full accessible name
//     alt,           the image's alt text
//     sourceSha256,  sha256 of the export HTML the image was rendered from
//     landscape,     Variant for screens 761px and wider; null for a cover
//     portrait,      Variant for screens 760px and narrower; for a cover this is the A4 cover at EVERY width
//   }
//   Variant = {
//     master: { w, h },   the uncommitted master this was downscaled from
//     aspect,             width / height of every file in files
//     src, width, height, the default <img> (the middle file)
//     srcset,             'path 800w, path 1600w, path 2400w', ready for an <img srcset> or <source srcset>
//     files: [{ file, w, h, bytes, sha256 }],   smallest to largest; file is relative to public/home-exports/
//   }
//   Plates are drawn on a transparent ground (the page supplies it); covers are the A4 page edge to edge.
//   File names: landscape <id>-<w>.webp, portrait <id>-p-<w>.webp, covers <id>-<w>.webp.

export const HOME_EXPORTS = {
  "version": 1,
  "dir": "/home-exports/",
  "design": {
    "seed": "Cobalt",
    "harmony": "analogous",
    "colors": [
      "#5B98F2",
      "#0097C7",
      "#8972D7",
      "#011B42",
      "#BFEAFF"
    ],
    "heading": {
      "family": "Schibsted Grotesk",
      "weight": 700
    },
    "body": {
      "family": "Literata",
      "weight": 400
    }
  },
  "totalBytes": 889126,
  "plates": [
    {
      "id": "kit-colour",
      "kind": "plate",
      "tab": "UI kit",
      "tabName": "UI kit, Free",
      "alt": "UI kit export, colour page, Cobalt palette.",
      "sourceSha256": "8b3a71276f05eefc81d768c9e0dd265d4939efdd7d599f2e3730663e513b5f63",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/kit-colour-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/kit-colour-800.webp 800w, /home-exports/kit-colour-1600.webp 1600w, /home-exports/kit-colour-2400.webp 2400w",
        "files": [
          {
            "file": "kit-colour-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 28874,
            "sha256": "c2b4f5bcd9614357971ec5ffef990ed48ce5758b58e421bc24163ae637d3e153"
          },
          {
            "file": "kit-colour-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 81968,
            "sha256": "1c784737b51827bbecf64b9a6dad71a03cc3b1a9469d94b0a2234659458606e2"
          },
          {
            "file": "kit-colour-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 143154,
            "sha256": "75ec7b4170056f1188ae1e58581945ab98e4da60eecddf1a7c5dba51c5b32296"
          }
        ]
      },
      "portrait": {
        "master": {
          "w": 3840,
          "h": 4800
        },
        "aspect": 0.8,
        "src": "/home-exports/kit-colour-p-800.webp",
        "width": 800,
        "height": 1000,
        "srcset": "/home-exports/kit-colour-p-400.webp 400w, /home-exports/kit-colour-p-800.webp 800w, /home-exports/kit-colour-p-1200.webp 1200w",
        "files": [
          {
            "file": "kit-colour-p-400.webp",
            "w": 400,
            "h": 500,
            "bytes": 20560,
            "sha256": "fa6a30733e71aeb8374effffabe6e4ded63deeb5bc95a10231a8ffcff272b50e"
          },
          {
            "file": "kit-colour-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 56190,
            "sha256": "26ed3dd56fd26d76b446033d51f61ae6bafc7e49f1090625085ac7e499c20ca5"
          },
          {
            "file": "kit-colour-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 95096,
            "sha256": "491faf400fd9d62451f854b2ba99586f0b89008712da4efcdff1d5cc900e282c"
          }
        ]
      }
    },
    {
      "id": "book-colour",
      "kind": "plate",
      "tab": "Book",
      "tabName": "Design system book, Pro",
      "alt": "Design system book, colour opening and palette bands, Cobalt palette.",
      "sourceSha256": "4caa29c9da270a4e42c2de3e20b4dea66371875ecc5d00be09500e17906c2f1e",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/book-colour-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/book-colour-800.webp 800w, /home-exports/book-colour-1600.webp 1600w, /home-exports/book-colour-2400.webp 2400w",
        "files": [
          {
            "file": "book-colour-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 13644,
            "sha256": "93b0a4d6f015cb9a0b7959080758dff0adcbfcdc9cc8703bc51732a297147550"
          },
          {
            "file": "book-colour-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 37454,
            "sha256": "552f22e218af381135d3178c1d42c2a9f6f3612611841547cf330b7a2ecd2a9d"
          },
          {
            "file": "book-colour-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 69928,
            "sha256": "13b47044ab8427be00c43c290deeb22a44cdb03c36c005ad971cb6e6a0531657"
          }
        ]
      },
      "portrait": {
        "master": {
          "w": 3840,
          "h": 4800
        },
        "aspect": 0.8,
        "src": "/home-exports/book-colour-p-800.webp",
        "width": 800,
        "height": 1000,
        "srcset": "/home-exports/book-colour-p-400.webp 400w, /home-exports/book-colour-p-800.webp 800w, /home-exports/book-colour-p-1200.webp 1200w",
        "files": [
          {
            "file": "book-colour-p-400.webp",
            "w": 400,
            "h": 500,
            "bytes": 8896,
            "sha256": "4a9d96d6fac77cf6e425084b294d6286f33d5a3ea0ed8171f12a930f4aeb6adc"
          },
          {
            "file": "book-colour-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 22984,
            "sha256": "3ca9937641aa6f3b53707dccb56f1646e4ed2da29335da91322d826ce48a260e"
          },
          {
            "file": "book-colour-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 40744,
            "sha256": "f3112c56caeea1a797c9a2db1b1a15ecfb85bf0a10c051435f56b14c71e83213"
          }
        ]
      }
    },
    {
      "id": "guide-palette",
      "kind": "plate",
      "tab": "Brand deck",
      "tabName": "Brand guidelines deck, Pro",
      "alt": "Brand guidelines deck, palette page with five named colours.",
      "sourceSha256": "ab7bab1079dcb864ddbad62dc13bb7e8db1620bde59acbe2f3eab0c2123752b3",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/guide-palette-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/guide-palette-800.webp 800w, /home-exports/guide-palette-1600.webp 1600w, /home-exports/guide-palette-2400.webp 2400w",
        "files": [
          {
            "file": "guide-palette-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 13256,
            "sha256": "aed7a103e6328d8d6fa66c80d7c41721e61e72dd24c779b4d230d634cb285ee6"
          },
          {
            "file": "guide-palette-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 37008,
            "sha256": "45a542de072378ef122c0ccd4abcaa836fddfce2312fe9bf0af67338411d612c"
          },
          {
            "file": "guide-palette-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 66702,
            "sha256": "1f37382efb4d8b9d4417826e1a102b4ea82ee4832e3a3f769cf229e159a90eb5"
          }
        ]
      },
      "portrait": {
        "master": {
          "w": 3840,
          "h": 4800
        },
        "aspect": 0.8,
        "src": "/home-exports/guide-palette-p-800.webp",
        "width": 800,
        "height": 1000,
        "srcset": "/home-exports/guide-palette-p-400.webp 400w, /home-exports/guide-palette-p-800.webp 800w, /home-exports/guide-palette-p-1200.webp 1200w",
        "files": [
          {
            "file": "guide-palette-p-400.webp",
            "w": 400,
            "h": 500,
            "bytes": 9116,
            "sha256": "cfbc8001efd7ef6bb099ba7a43dde2af49e96092b95d87b31636f3390826b974"
          },
          {
            "file": "guide-palette-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 24702,
            "sha256": "2d3c54968ddabe2d937498a0a26e9106268a49c219abe8c0e64c954eb353069a"
          },
          {
            "file": "guide-palette-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 46018,
            "sha256": "174ecc2bd39a213d4c93a904744a80e974bd9d9d35370a9ec13d6f05a8dbffb2"
          }
        ]
      }
    }
  ],
  "covers": [
    {
      "id": "cover-northbeam",
      "kind": "cover",
      "tab": "Northbeam",
      "tabName": "Northbeam book cover",
      "alt": "Design system book cover for Northbeam.",
      "sourceSha256": "4caa29c9da270a4e42c2de3e20b4dea66371875ecc5d00be09500e17906c2f1e",
      "landscape": null,
      "portrait": {
        "master": {
          "w": 1600,
          "h": 2263
        },
        "aspect": 0.7071,
        "src": "/home-exports/cover-northbeam-720.webp",
        "width": 720,
        "height": 1018,
        "srcset": "/home-exports/cover-northbeam-360.webp 360w, /home-exports/cover-northbeam-720.webp 720w, /home-exports/cover-northbeam-1080.webp 1080w",
        "files": [
          {
            "file": "cover-northbeam-360.webp",
            "w": 360,
            "h": 509,
            "bytes": 4098,
            "sha256": "999c67fbb1a88dcbcd78dec1c7e696d7ce6302c76d32a8ac30c36c78ce971cb9"
          },
          {
            "file": "cover-northbeam-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 8706,
            "sha256": "fc83e0d12d00c121524746e657e0baeb6113f7996bede97e4a738d44b3f2de15"
          },
          {
            "file": "cover-northbeam-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 14502,
            "sha256": "95122b0885dc1e7735189516bd75d9a779bc1db8a4dafacae176107312f4f38e"
          }
        ]
      }
    },
    {
      "id": "cover-halcyon",
      "kind": "cover",
      "tab": "Halcyon",
      "tabName": "Halcyon book cover",
      "alt": "Design system book cover for Halcyon.",
      "sourceSha256": "3970b6677a51edd493474db321129ae8db957d00118f41d821ec989066e9f757",
      "landscape": null,
      "portrait": {
        "master": {
          "w": 1600,
          "h": 2263
        },
        "aspect": 0.7071,
        "src": "/home-exports/cover-halcyon-720.webp",
        "width": 720,
        "height": 1018,
        "srcset": "/home-exports/cover-halcyon-360.webp 360w, /home-exports/cover-halcyon-720.webp 720w, /home-exports/cover-halcyon-1080.webp 1080w",
        "files": [
          {
            "file": "cover-halcyon-360.webp",
            "w": 360,
            "h": 509,
            "bytes": 3236,
            "sha256": "71abb178fddde108e07a5a00f6ba163a884acc55da30c6fccb1cba5dba88f6de"
          },
          {
            "file": "cover-halcyon-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 7142,
            "sha256": "21e24afd1413af02c3da16ac5053c8380ac6a3375571d8be8b9e7c24bc9c5976"
          },
          {
            "file": "cover-halcyon-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 12528,
            "sha256": "cf230e5115c8ce7cc91a5a45abb06d32177f6a6cbbe50ddc5ae80ec09e5555a4"
          }
        ]
      }
    },
    {
      "id": "cover-ferrule",
      "kind": "cover",
      "tab": "Ferrule",
      "tabName": "Ferrule book cover",
      "alt": "Design system book cover for Ferrule.",
      "sourceSha256": "3af3dfcde828df7410d48ff154e659e558dc22eb0784083e6fd12b89e0144a18",
      "landscape": null,
      "portrait": {
        "master": {
          "w": 1600,
          "h": 2263
        },
        "aspect": 0.7071,
        "src": "/home-exports/cover-ferrule-720.webp",
        "width": 720,
        "height": 1018,
        "srcset": "/home-exports/cover-ferrule-360.webp 360w, /home-exports/cover-ferrule-720.webp 720w, /home-exports/cover-ferrule-1080.webp 1080w",
        "files": [
          {
            "file": "cover-ferrule-360.webp",
            "w": 360,
            "h": 509,
            "bytes": 3250,
            "sha256": "3803cc3150b040851154da512547a2fec36b6a1298655c5c388dd15eef618ad0"
          },
          {
            "file": "cover-ferrule-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 7056,
            "sha256": "278e3f7a3d11ecd44f3597fcad2ed2ea700dd93229ec23bba0d568da5154418e"
          },
          {
            "file": "cover-ferrule-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 12314,
            "sha256": "b7c403fa8d734fcba7f79f05e1e81a4166c88015bed8a4c335cf7628068ba6d3"
          }
        ]
      }
    }
  ]
}
