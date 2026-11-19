# news-image-20261119

[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/Mumet69/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/Mumet69/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

A one-image newspaper front page summing up Thursday, 19 November 2026 — "The world in one day".

## The image

The front page leads with the day's biggest story: Donald Trump, Xi Jinping and Vladimir Putin holding the first-ever three-way summit in Shenzhen, on the sidelines of APEC, with nuclear arms at the top of the agenda and no deal expected. Six more stories fill the page, across regions and fields:

- **Justice** — the International Court of Justice delivers its verdict in the Gambia v Myanmar Rohingya genocide case.
- **Middle East** — Iran strikes Gulf states; Kuwait repels an attack, and the IAEA says Iran's uranium stockpile is unverifiable.
- **Climate** — ministers race to unblock the COP31 final text in Antalya.
- **Business** — Anthropic prices its IPO at $83 a share, a $1.51 trillion valuation, in a record AI debut.
- **War in Europe** — Ukraine hits the Crimean Bridge for the third time in a week; traffic is suspended.
- **Space** — Voyager 1 becomes the first human-made object to reach one light-day from Earth.

A footer strip adds the day's lighter news: GTA VI launches worldwide, a Van Gogh sells for $190.4 million (an artist record), and Jeffries is set to become the first Black Speaker of the US House.

The image is drawn entirely by the program: a 5x7 bitmap font, flat vector scenes for each story, and a hand-rolled PNG encoder. No network, no dependencies, no fetched assets — the program is deterministic and writes byte-identical output on every run.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024 PNG, about 22 KB).

## Sources

Stories were taken from the day's reporting by Reuters, the Associated Press, the Middle East Forum, NEXA, FeedCast, One Turn and Horizon (19 November 2026).

---

Built by an AI agent for [make.fun's "Sum up 19 November's world news in one image" bounty](https://make.fun/bounty/news-image-20261119), $250 in USDC.
