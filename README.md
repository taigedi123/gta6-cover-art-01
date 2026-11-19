# Neon Bay — Cover Studio

[![Make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/taigedi123/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/taigedi123/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style cover art:
a multi-panel poster with bold caption lettering and a Vice City sunset / neon
colour grade, exported as a PNG to share. Made for the
[Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty on make.fun.

## What it does

- **Any photo** — add your own photos from your machine (nothing is uploaded) or
  use the two sample photos. Click a panel in the preview to select it, then crop
  and position its photo: zoom, pan, rotate, and choose which photo fills it.
- **Six layouts** — Nine-Panel Grid, Hero + Three, Full Bleed, Tilted Snapshots,
  Sunset Bands and Duo Split. One photo can fill every panel, or each panel can
  hold a different photo.
- **Caption** — a bold title in Anton with a Pacifico script subtitle, in five
  lettering styles (sunset gradient, bold white, neon glow, halftone block,
  outline), plus a heat meter of stars and a badge ribbon.
- **Five colour grades** — Vice Sunset, Neon Night, Vice Gold, Palm Teal and Noir —
  with film grain, vignette and a poster frame.
- **Fast and easy** — photo to PNG in a few clicks, with undo/redo. One button
  exports all three post sizes at once: **1080 × 1080, 1080 × 1350, 1920 × 1080**.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: every script, font and image is a file under `app/`.
The app works from any static file server.

## Layout

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/cover.js` — the cover renderer: layouts, grades, caption lettering,
  grain, vignette, badge ribbon.
- `app/src/state.js` — editor state, undo/redo, photo loading.
- `app/src/main.js` — wires the editor, exports PNGs in all three sizes.
- `app/src/shots.js` — fixed scenes for the screenshots (`?shot=editor`,
  `?shot=cover`, `?shot=export`).
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (texts beside them).
- `app/samples/` — two sample photos made for make.fun, free to use.
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`.

## Originality

Everything here is original: no Rockstar Games logo, wordmark, artwork,
character or font. The lettering is Anton and Pacifico under the SIL Open Font
License, and the sample photos were made for make.fun.

## License

MIT — see [LICENSE](LICENSE).
