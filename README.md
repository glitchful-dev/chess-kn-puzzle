# Knight puzzle

A queen sits on D5. Starting on H8, move a knight to every square she doesn't attack, in order:
H8 to A8, then H7 to A7, and on down to A1. Never land on an attacked square, and leave the
queen alone. The fewest moves that solve it (par) is 158.

Live at **https://chess-kn-puzzle.glitchful.dev** once home-lab pins an image (see Deploy).

## UI

Built on the Glitchful design system ([ds.glitchful.dev](https://ds.glitchful.dev),
`@glitchful-dev/ds-css` and `@glitchful-dev/ds-ui` 0.1.4) with Preact: `AppShell`, `StatusBar`,
`Card`, `Switch`, `SegmentedControl`, `Dialog`, `ProgressBar`, `Kbd`, `Badge`. App CSS in
`src/app.css` uses `var(--ds-*)` tokens only, so light and dark themes both work and follow the OS
unless the header's theme switch says otherwise.

Keyboard: arrows move the cursor over the board, Enter moves the knight, typing a square (`g6`)
moves straight there, and `R` restarts. Options and best scores are kept in `localStorage`.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # typecheck, unit tests (src/game.test.ts), build
```

`pnpm build` writes one self-contained `dist/index.html`, with the script and styles inlined.
The three servers update a few minutes apart, so a page that loads separate hashed assets can
get its HTML from an updated server and a 404 for the new asset from one that hasn't updated
yet. With nothing else to load, a visitor gets the old page or the new one.

To take a new design system release: `pnpm add https://ds.glitchful.dev/pkg/ds-css-<ver>.tgz https://ds.glitchful.dev/pkg/ds-ui-<ver>.tgz`.

## Deploy

This repo builds the image and glitchful-dev/home-lab runs it, under home-lab's
`docs/08-app-image-standard.md`.

1. Merge to `master`. `.github/workflows/image.yml` builds `ghcr.io/glitchful-dev/site-chess-kn-puzzle`,
   tagged with the commit SHA, and prints the full reference in the run summary.
2. In home-lab, put that reference on the `image:` line of `apps/site-chess-kn-puzzle/compose.yaml`
   and merge. All three servers pick it up within about 5 minutes.

The image is static-web-server running as `65534` on port 8080, configured by `sws.toml`. Everything
is served `no-cache`, `/healthz` answers `ok`, and missing paths are real 404s.

The `node` and `static-web-server` digests in the `Dockerfile` are pinned by hand. Nothing updates
them automatically, so bump them now and then.
