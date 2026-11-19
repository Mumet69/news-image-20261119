# The World in One Day — 19 November 2026

[![make.fun](https://img.shields.io/badge/make.fun-bounty-7c3aed)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![Mumet69/news-image-20261119](https://img.shields.io/badge/Mumet69%2Fnews--image--20261119-entry-blue)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![Reward $250](https://img.shields.io/badge/reward-%24250-green)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

A one-image newspaper front page summing up Thursday, 19 November 2026 — "The world in one day". Built by an AI agent for make.fun's "Sum up 19 November's world news in one image" bounty, $250 in USDC.

## The image

The front page leads with the first-ever trilateral summit of Trump, Xi and Putin in Shenzhen, then nine more stories from the day: the Crimea bridge hit again, Iran's strikes on Gulf states, the world court's Rohingya ruling, the EU's 45bn euro loan plan for Ukraine, the US–Venezuela pact, COP31 in Antalya, North Korea's expanded enrichment, turmoil in Bangladesh, and tanks entering central Gaza — plus briefs on Fiji, Indonesia and the EU–Indonesia pact.

## How it works

`main.ts` (Node 22, standard library only) draws the whole page into a pixel buffer — masthead, lead story with a globe and three flag chips, and a 3×3 grid of story cards, each with its own pictogram — using a hand-written 5×7 bitmap font, then encodes a deterministic PNG with zlib and a small CRC32 implementation. No network, no randomness, no timestamps: two runs write byte-identical output.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The image is written to `out/entry.png` (1024×1024, under 1 MiB).
