// Written by scripts/export-templates/generate.mjs from the real export code. Do not edit by hand:
// regenerate with `node scripts/export-templates/generate.mjs`. The files named here are in public/export-templates/.
//
// SHAPE
//   EXPORT_TEMPLATE_THUMBS = {
//     version: 1,
//     dir: '/export-templates/',     public path prefix
//     sample: { project, seed, harmony, colors[], heading, body },   the one example project every tile is drawn from
//     widths: [240, 480, 720],
//     tiles: { <format>: { <template id>: { sourceSha256, files: [Thumb] } } },   one entry for each live template
//   }
//   Thumb = { file, width, height, bytes, sha256 }   smallest to largest; file is relative to dir
//   Every file of a format shares its ratio: book 1:1.414, guidelines 16:9, kit 4:5.

export const EXPORT_TEMPLATE_THUMBS = {
  "version": 1,
  "dir": "/export-templates/",
  "sample": {
    "project": "Ferrule",
    "seed": "Signal",
    "harmony": "analogous",
    "colors": [
      "#E76E62",
      "#C95A8C",
      "#C56D00",
      "#3C0504",
      "#FFCEC2"
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
  "widths": [
    240,
    480,
    720
  ],
  "tiles": {
    "kit": {
      "studio": {
        "sourceSha256": "9e2e00b821c860dccecc2de043b9b9a4675f1b6943286dc67dc8c4bda2ae1f58",
        "files": [
          {
            "file": "kit-studio-240.webp",
            "width": 240,
            "height": 300,
            "bytes": 4828,
            "sha256": "4d2315a683fba1dc6679d3c7b668a33deeb8933444a9bd4424417af13f887a3f"
          },
          {
            "file": "kit-studio-480.webp",
            "width": 480,
            "height": 600,
            "bytes": 10130,
            "sha256": "95a1c290cc020b68ec5d81c013e7dcc26f52a9573ddd3857df89709803bf8ad6"
          },
          {
            "file": "kit-studio-720.webp",
            "width": 720,
            "height": 900,
            "bytes": 15526,
            "sha256": "84dcdacac3d3260eaeaac415ed509bf5a8108726726da38ef113d00509444132"
          }
        ]
      },
      "manual": {
        "sourceSha256": "2f689ca7ea3082f5b6b43e79072f33624bb7f15f60f8d559acd30fcea6ac6bb5",
        "files": [
          {
            "file": "kit-manual-240.webp",
            "width": 240,
            "height": 300,
            "bytes": 5998,
            "sha256": "dbdc5fb0b81a83f74964942bc30143c3929bffa20a330dd8e6468d9e64fc956a"
          },
          {
            "file": "kit-manual-480.webp",
            "width": 480,
            "height": 600,
            "bytes": 14076,
            "sha256": "7ef2235390c38984d279922d9903c4f355ecb748836cf65ea70960d526d6855a"
          },
          {
            "file": "kit-manual-720.webp",
            "width": 720,
            "height": 900,
            "bytes": 21142,
            "sha256": "743ea5b2fb9f78bb084ea5fed720b3040aae4d62a5ff9286141e6ac684519d7e"
          }
        ]
      },
      "showcase": {
        "sourceSha256": "ba17275d5509dad1eaf7284f3f13f698602ae40eaf7426d67cd278fba8e79cbe",
        "files": [
          {
            "file": "kit-showcase-240.webp",
            "width": 240,
            "height": 300,
            "bytes": 7646,
            "sha256": "368f12de22ce17cb4bc10d155363dc82120184a32fd15f1193fb4cf71a6550e2"
          },
          {
            "file": "kit-showcase-480.webp",
            "width": 480,
            "height": 600,
            "bytes": 16620,
            "sha256": "9651a88e0310bb5b387b45233da0569551aa9337788e76a31225fa246344b2d8"
          },
          {
            "file": "kit-showcase-720.webp",
            "width": 720,
            "height": 900,
            "bytes": 25072,
            "sha256": "8a06fc9534ba6945d3c4e0abeeba8d76840891a168d8ec31e76a819ebf491554"
          }
        ]
      }
    },
    "book": {
      "specification": {
        "sourceSha256": "6e916e2021fd1d3b2e48474a32dadd78dc78e8dd4bcde787bf23cf29327bd1e1",
        "files": [
          {
            "file": "book-specification-240.webp",
            "width": 240,
            "height": 339,
            "bytes": 2214,
            "sha256": "d94cdc8ba240533865f4730d25fd584d3c269528bb3f9290bd074621af01c337"
          },
          {
            "file": "book-specification-480.webp",
            "width": 480,
            "height": 679,
            "bytes": 4452,
            "sha256": "a518571b0495271ca4d242f71e246bd200e7a82cb6be609852905142438902de"
          },
          {
            "file": "book-specification-720.webp",
            "width": 720,
            "height": 1018,
            "bytes": 6586,
            "sha256": "d425780c9ad08a4c5c737f746dd985e618677e3d28ff2c0811682a6436caf0ac"
          }
        ]
      },
      "monograph": {
        "sourceSha256": "2fb9be9bf698cf90bece6bc4217149b037b839b27fce8e249186efd7c4eb2572",
        "files": [
          {
            "file": "book-monograph-240.webp",
            "width": 240,
            "height": 339,
            "bytes": 1330,
            "sha256": "0bb5c198fb593e3a213fe8c8c8ecc2ddea60b6be3bb2f82fd60931a0ab870df2"
          },
          {
            "file": "book-monograph-480.webp",
            "width": 480,
            "height": 679,
            "bytes": 2272,
            "sha256": "627606fc706bac83132d7845d98fa697039041143662fed4c64604802a34933d"
          },
          {
            "file": "book-monograph-720.webp",
            "width": 720,
            "height": 1018,
            "bytes": 3276,
            "sha256": "76c997a7feeded8e618cae885444dc85056377a5e34d6a0737a52438dc4a7cb6"
          }
        ]
      },
      "atlas": {
        "sourceSha256": "888783c6ab50289a6dcefca481cfb1337b4ec4d89c511db7bb3e6899b6d39070",
        "files": [
          {
            "file": "book-atlas-240.webp",
            "width": 240,
            "height": 339,
            "bytes": 1350,
            "sha256": "0b278d08e3b7c9f428cd5d46e4c2b3c5b83a71d92d5634aeb72a91facf7f21ec"
          },
          {
            "file": "book-atlas-480.webp",
            "width": 480,
            "height": 679,
            "bytes": 2778,
            "sha256": "baa6909ff332b376308eae3a86e5cbcf33db0e91f67efdbeecdd0457cf4b833d"
          },
          {
            "file": "book-atlas-720.webp",
            "width": 720,
            "height": 1018,
            "bytes": 4552,
            "sha256": "6c7df4bf953c7310d71e1f2affe996a1dd67280fb5268eacd5e51a0fe7c7b41d"
          }
        ]
      }
    },
    "guidelines": {
      "presentation": {
        "sourceSha256": "51eb614c768acee35bbff46585496c30d3df126c03c9db512d0218e56df5c4b0",
        "files": [
          {
            "file": "guidelines-presentation-240.webp",
            "width": 240,
            "height": 135,
            "bytes": 2004,
            "sha256": "40c8cb66c5ab64ddef3e728916d247cf253d38d4211497891839abcea8f7244d"
          },
          {
            "file": "guidelines-presentation-480.webp",
            "width": 480,
            "height": 270,
            "bytes": 3404,
            "sha256": "28f2cfd384c3b5394d36ef067aa142fcc45c5e593803106fe4bdaf338b85304f"
          },
          {
            "file": "guidelines-presentation-720.webp",
            "width": 720,
            "height": 405,
            "bytes": 4574,
            "sha256": "95b3f4ac267b9222f5cbe9a6421177d8205903ac36bef9382a8886b3f40f2163"
          }
        ]
      },
      "poster": {
        "sourceSha256": "ef08e176139094d9f4ebc1bbbbe0eded50212464d96e39f6f356020da90ba5ef",
        "files": [
          {
            "file": "guidelines-poster-240.webp",
            "width": 240,
            "height": 135,
            "bytes": 2244,
            "sha256": "e127e638f311bc72d57e080e7a2effad4f96179a854b3e23900a579db3d1bd9e"
          },
          {
            "file": "guidelines-poster-480.webp",
            "width": 480,
            "height": 270,
            "bytes": 4156,
            "sha256": "96c1cf41910dbac9a9562cd2a538aa2e20b7e9fc41b1ec335ebe479c74762d28"
          },
          {
            "file": "guidelines-poster-720.webp",
            "width": 720,
            "height": 405,
            "bytes": 5924,
            "sha256": "a2004b90e9a78aade11b2ec383bcab5bc17c6b4bbb492de15ea9427972b70448"
          }
        ]
      },
      "grid": {
        "sourceSha256": "b7c538dc23387772ee0dd2b2c2d3fa26ede0919884475c822824be0936ac50a1",
        "files": [
          {
            "file": "guidelines-grid-240.webp",
            "width": 240,
            "height": 135,
            "bytes": 2062,
            "sha256": "c674bb0ca9e9be87912461f3e1a77d40540523016b1ed29956501678c4f10f32"
          },
          {
            "file": "guidelines-grid-480.webp",
            "width": 480,
            "height": 270,
            "bytes": 3746,
            "sha256": "a8a73ada1d81d940bae510cbc0aac733c63b2a149804ce5adc7bd2de17800b61"
          },
          {
            "file": "guidelines-grid-720.webp",
            "width": 720,
            "height": 405,
            "bytes": 5494,
            "sha256": "631d07283097025b0990ba9e800afd70926a669695e2243a37277f1f865c74bc"
          }
        ]
      }
    }
  }
}
