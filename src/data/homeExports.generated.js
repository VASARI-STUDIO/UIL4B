// Written by scripts/home-exports/generate.mjs from the real export code. Do not edit by hand:
// regenerate with `node scripts/home-exports/generate.mjs`. The files named here are in public/home-exports/.
//
// SHAPE
//   HOME_EXPORTS = {
//     version: 1,
//     dir: '/home-exports/',                       public path prefix
//     design: { seed, harmony, colors[5], heading: { family, weight }, body: { family, weight } },
//     totalBytes,                                  all 36 files together
//     counts: { bookPages, deckSlides },           read from the real book and deck (the card's row sublines)
//     plates: [Item, Item, Item],                  tab order: Book, Brand deck, UI kit
//     covers: [Item, Item, Item],                  Northbeam, Halcyon, Ferrule (one tab each)
//   }
//   Item = {
//     id,            'kit-colour' | 'book-colour' | 'guide-palette' | 'cover-northbeam' | 'cover-halcyon' | 'cover-ferrule'
//     kind,          'plate' | 'cover'
//     tab,           the short tab label: 'UI kit' | 'Book' | 'Brand deck', or the project name for a cover
//     tabName,       the tab's full accessible name
//     alt,           the image's alt text
//     sourceSha256,  sha256 of the export HTML the image was rendered from
//     landscape,     Variant for screens 761px and wider; a cover's is the cover beside its contents page, facing
//                    (not drawn now); the deck's is guide-overview: the palette slide over three more whole
//     portrait,      Variant for screens 760px and narrower; for a cover this is the A4 cover on its own
//   }
//   Variant = {
//     master: { w, h },   the uncommitted master this was downscaled from
//     aspect,             width / height of every file in files
//     src, width, height, the default <img> (the middle file)
//     srcset,             'path 800w, path 1600w, path 2400w', ready for an <img srcset> or <source srcset>
//     files: [{ file, w, h, bytes, sha256 }],   smallest to largest; file is relative to public/home-exports/
//   }
//   Plates are drawn on a transparent ground (the page supplies it), each page with a thin outline baked in.
//   File names: landscape <id>-<w>.webp (the deck's: guide-overview-<w>.webp), portrait <id>-p-<w>.webp, covers <id>-<w>.webp, cover spreads <id>-spread-<w>.webp.

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
  "totalBytes": 1204278,
  "counts": {
    "bookPages": 12,
    "deckSlides": 9
  },
  "plates": [
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
            "bytes": 14032,
            "sha256": "03b86241a45cae2d7f533a8876607fd0b0642bbe529cd21c9327da5d162b8dd4"
          },
          {
            "file": "book-colour-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 38086,
            "sha256": "cc589ff1334ab4e837effdb99775d541ee078a5475ef171ba14fbf348d029444"
          },
          {
            "file": "book-colour-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 70644,
            "sha256": "31efb2c24059d01d46e95bacd06edd71bb35a158f2accd8735570dfa81914dfd"
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
            "bytes": 8934,
            "sha256": "96c60d9d01a5ebbfa013b8bfa9785802a1eb8de1873a0fe4aa0b4f55b5e0ad0f"
          },
          {
            "file": "book-colour-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 23386,
            "sha256": "a454a6344789ca6a3d431af1790602a08d5ddb54005134dc3ec0cb2b63119fde"
          },
          {
            "file": "book-colour-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 41186,
            "sha256": "7b281700c1e39263179a446117fff0f167ddd0e3687fe96d24da8c0d1239a8dd"
          }
        ]
      }
    },
    {
      "id": "guide-palette",
      "kind": "plate",
      "tab": "Brand deck",
      "tabName": "Brand guidelines deck, Pro",
      "alt": "Brand guidelines deck, the palette slide with five named colours, over three more slides: In use, Typography and Headline face.",
      "sourceSha256": "ab7bab1079dcb864ddbad62dc13bb7e8db1620bde59acbe2f3eab0c2123752b3",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2492
        },
        "aspect": 1.5409,
        "src": "/home-exports/guide-overview-1600.webp",
        "width": 1600,
        "height": 1038,
        "srcset": "/home-exports/guide-overview-800.webp 800w, /home-exports/guide-overview-1600.webp 1600w, /home-exports/guide-overview-2400.webp 2400w",
        "files": [
          {
            "file": "guide-overview-800.webp",
            "w": 800,
            "h": 519,
            "bytes": 17304,
            "sha256": "45e484fece2aeaab03956fcee48c6a781410260d370bd0ffbf42edbb6bee971b"
          },
          {
            "file": "guide-overview-1600.webp",
            "w": 1600,
            "h": 1038,
            "bytes": 46784,
            "sha256": "95ad80c0744b7b312c9fd468b3623eedbe4fce7f89a86d66380a1aa3f6cdb1ec"
          },
          {
            "file": "guide-overview-2400.webp",
            "w": 2400,
            "h": 1558,
            "bytes": 82694,
            "sha256": "f8282592dba911b1ced409880b711abd171db145280f87ba7843b3521ca70fcf"
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
            "bytes": 9236,
            "sha256": "373c5a8d70484e77b0e4c15c242d4918e942838fc71b4a619b2c1836a65d375e"
          },
          {
            "file": "guide-palette-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 24912,
            "sha256": "5a8f0674194eb9d7a44757b5506dca3817efdcec86aed5c66e1433fb3924b8ac"
          },
          {
            "file": "guide-palette-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 45856,
            "sha256": "30af77a979279551a0bbb4b5c65075f4ab72978b7bedb65eb79eebc243470930"
          }
        ]
      }
    },
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
            "bytes": 29272,
            "sha256": "8cc67ca93b19219a8a8afaac77846974663f3b0f65afd8732a474856ef470f73"
          },
          {
            "file": "kit-colour-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 81964,
            "sha256": "5db1008cc8dd5a1982beb30b39b49dabdbe6d85b650cf8e93f13707ced63c42b"
          },
          {
            "file": "kit-colour-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 145528,
            "sha256": "56e431327e50e6c953fb67d5fa292601573a0f2127f19a7fc356efe45092ae0a"
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
            "bytes": 20292,
            "sha256": "95bc2dafb89587f6417db888bd55c57f0df2cb7cc922fb41f3372ccee6569620"
          },
          {
            "file": "kit-colour-p-800.webp",
            "w": 800,
            "h": 1000,
            "bytes": 55262,
            "sha256": "5e9d663fa90f57c64635b7f27d077d1e927c9e8f7d33a30c3e627ceeaee81183"
          },
          {
            "file": "kit-colour-p-1200.webp",
            "w": 1200,
            "h": 1500,
            "bytes": 93438,
            "sha256": "cefd46ce1846933758e85fa587b0e416200319fdd86fde6fee1aa7b929298c20"
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
      "alt": "Design system book for Northbeam, the cover.",
      "sourceSha256": "4caa29c9da270a4e42c2de3e20b4dea66371875ecc5d00be09500e17906c2f1e",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/cover-northbeam-spread-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/cover-northbeam-spread-800.webp 800w, /home-exports/cover-northbeam-spread-1600.webp 1600w, /home-exports/cover-northbeam-spread-2400.webp 2400w",
        "files": [
          {
            "file": "cover-northbeam-spread-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 11236,
            "sha256": "366b4dd2eb148f2502be1a6dfa1c05e635705c339d1e8c8c5ed70da77ea735d6"
          },
          {
            "file": "cover-northbeam-spread-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 30132,
            "sha256": "6ebeb27a39705cb9793ec034ab8cee04ec6107c27d3db98fb38ef6df9ee3ad51"
          },
          {
            "file": "cover-northbeam-spread-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 56216,
            "sha256": "62dc09b29260b0e7d496b46f3434767493a39a0364a9c6209b56b68ac48af92c"
          }
        ]
      },
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
            "bytes": 4206,
            "sha256": "a9347c9c08666b2a1d6f325e36e3a353cbac2a2266ef75f367b3f1aa28e296f1"
          },
          {
            "file": "cover-northbeam-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 8888,
            "sha256": "5b7645b71a859b3259387a85f9b885866008e21ea8a240deb1a1d0fb8883d231"
          },
          {
            "file": "cover-northbeam-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 14828,
            "sha256": "2cd28bbe8b89f1d7145ff50109fc2c29c93f84be34d461eef529e49baf00f0fc"
          }
        ]
      }
    },
    {
      "id": "cover-halcyon",
      "kind": "cover",
      "tab": "Halcyon",
      "tabName": "Halcyon book cover",
      "alt": "Design system book for Halcyon, the cover.",
      "sourceSha256": "3970b6677a51edd493474db321129ae8db957d00118f41d821ec989066e9f757",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/cover-halcyon-spread-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/cover-halcyon-spread-800.webp 800w, /home-exports/cover-halcyon-spread-1600.webp 1600w, /home-exports/cover-halcyon-spread-2400.webp 2400w",
        "files": [
          {
            "file": "cover-halcyon-spread-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 10320,
            "sha256": "156b97c43b1b53a7cd015e3538fd608731824fe253e146da96f2742e747f0ba8"
          },
          {
            "file": "cover-halcyon-spread-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 28582,
            "sha256": "35e65690121d090da216138afd89bf4fa4bac17d0d5c95b08655031c2ce05923"
          },
          {
            "file": "cover-halcyon-spread-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 53212,
            "sha256": "174057a28566ed2919b18cc674f8ea360a563513da482490b889b8832b520a1f"
          }
        ]
      },
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
            "bytes": 3370,
            "sha256": "e4274dbc30159b489d552b6e4366f83846a33c4ed454b371a7fbddd417438c7f"
          },
          {
            "file": "cover-halcyon-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 7116,
            "sha256": "1a42b1b94e438bf9319c984503372505635f60e3b7fb71df4e0c5be366140cb0"
          },
          {
            "file": "cover-halcyon-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 12936,
            "sha256": "f651d23a018a57be44d48fb8e199d79cd405e7ff6d34c87ced1a90c892ff120b"
          }
        ]
      }
    },
    {
      "id": "cover-ferrule",
      "kind": "cover",
      "tab": "Ferrule",
      "tabName": "Ferrule book cover",
      "alt": "Design system book for Ferrule, the cover.",
      "sourceSha256": "3af3dfcde828df7410d48ff154e659e558dc22eb0784083e6fd12b89e0144a18",
      "landscape": {
        "master": {
          "w": 3840,
          "h": 2715
        },
        "aspect": 1.4142,
        "src": "/home-exports/cover-ferrule-spread-1600.webp",
        "width": 1600,
        "height": 1131,
        "srcset": "/home-exports/cover-ferrule-spread-800.webp 800w, /home-exports/cover-ferrule-spread-1600.webp 1600w, /home-exports/cover-ferrule-spread-2400.webp 2400w",
        "files": [
          {
            "file": "cover-ferrule-spread-800.webp",
            "w": 800,
            "h": 566,
            "bytes": 10182,
            "sha256": "b1789c20b4348f4293cafe4a9388650309b60114cfc9ded90a6c8be515162043"
          },
          {
            "file": "cover-ferrule-spread-1600.webp",
            "w": 1600,
            "h": 1131,
            "bytes": 28180,
            "sha256": "75b654ef0becf998125f2bda45ef8548ec41acbd536bc64e1a35dd4c32adeb53"
          },
          {
            "file": "cover-ferrule-spread-2400.webp",
            "w": 2400,
            "h": 1697,
            "bytes": 52904,
            "sha256": "dda3659e4fdcd8497e01274581ec5e9108dd3c6a878259e17d95fa00d350f6ee"
          }
        ]
      },
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
            "bytes": 3304,
            "sha256": "3edf76e62f0458d75be05f3128cb402cd505d8022179b24487c9214cb0651fde"
          },
          {
            "file": "cover-ferrule-720.webp",
            "w": 720,
            "h": 1018,
            "bytes": 7196,
            "sha256": "5c2f71dc88ca25940883a5b5f3e68e682843ae8734bf304a9427a65b08e7635c"
          },
          {
            "file": "cover-ferrule-1080.webp",
            "w": 1080,
            "h": 1528,
            "bytes": 12660,
            "sha256": "4a2f1c01e887436093b420a5ba0806fdbbda5082dfb27a29197f6f38a4d55b95"
          }
        ]
      }
    }
  ]
}
