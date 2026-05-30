# Bleeding3

An infinite-board take on tic-tac-toe, shipped as a static web app on GitHub
Pages. No backend, no build step.

> **For agents:** this file is the source of truth for the game's rules,
> architecture, and how to operate the site. Read it before changing anything.

---

## The game

Bleeding3 is tic-tac-toe where the 3×3 board is *imaginary* and can slide
("bleed") across an infinite plane.

### Rules

1. The board starts empty.
2. **You may place a piece anywhere**, with one constraint: after the
   placement, **all pieces on the board must still fit inside some 3×3
   window** (their bounding box is at most 3 wide and 3 tall).
3. Each player has **3 pieces**. White (Bone) starts; players alternate.
4. After all 6 pieces are placed, players take turns **moving** one of their
   own pieces to a different empty cell — still respecting the 3×3 rule. The
   imaginary 3×3 board therefore drifts around as pieces move.
5. **Win** by getting your 3 pieces in a row — horizontally, vertically, or
   diagonally (three adjacent, collinear cells), exactly like tic-tac-toe.

### Pieces & players

- **White = "Bone"**: bone-white rounded squares.
- **Black = "Wood"**: warm wood-brown rounded squares.

---

## UI / UX spec

- **Board**: a static 5×5 grid is drawn. The inner 3×3 is rendered lighter to
  emphasise it; the outer ring is greyer and exists so the imaginary 3×3 board
  has one cell of room to slide in any direction.
- **Auto-centering**: pieces are kept centered on the 5×5 grid. The grid lines
  never move — the **pieces** translate smoothly to their new positions after
  every move (CSS `transform` transitions).
- **Pending pieces** are shown in each player's tray, outside the board.
- **Placing**: during the placement phase the active piece is implicit (you
  have unplaced pieces), so you just tap a valid cell.
- **Moving**: tap one of your pieces to select it (it gets an accent outline
  and valid targets light up), then tap a highlighted empty cell. Tap the
  selected piece again to deselect. You can't drop a piece on its own cell.
- **Layout**:
  - Phones (portrait): single column. Wood sits on **top, rotated 180°** (so
    the opponent across the table reads it upright); Bone on the bottom.
  - Wide screens (≥760px): players sit on either side of the board, upright.
- **Scoreboard**: on a win the app asks for the winner's name and stores the
  number of placements (total turns taken in the game) it took to win.
  Persisted in `localStorage` under the key `bleeding3-scores`, sorted by
  fewest placements. Cleared from the Scores dialog.

---

## Architecture

Plain HTML + CSS + vanilla JS. Deliberately no framework or bundler — the game
is small and a senior engineer should find nothing over-engineered here.

```
index.html   markup: topbar, two player panels, board, dialogs
styles.css   all styling + responsive layout (CSS custom props for piece pos)
game.js      rules engine, state, rendering, scoreboard
.nojekyll    tells Pages to serve files as-is
.github/workflows/deploy.yml   builds + deploys to GitHub Pages
```

### State model (`game.js`)

A single `state` object:

```js
state = {
  pieces: [{ id, owner, r, c }],   // logical coords on an infinite grid
  turn: "white" | "black",
  pending: { white, black },       // unplaced piece counts
  selectedId: null | id,           // selected piece during move phase
  moves: 0,                        // total placements+moves -> scoreboard
  winner: null | "white" | "black",
}
```

### Key ideas

- **Logical vs. display coords.** Pieces store infinite-grid coords (`r,c`).
  `centerDelta()` computes an offset that centers the pieces' bounding box on
  the 5×5 display. `display = logical + delta`; clicks convert back with
  `logical = display - delta`.
- **Smooth motion.** Each piece is a persistent DOM node keyed by `id`. Its
  position is set via CSS custom properties `--dr`/`--dc` and a `transform`
  with a transition, so moving a piece *or* recentering the whole board
  animates the squares while the grid stays put.
- **Rules live in pure helpers**: `fits3x3`, `canPlace`, `canMoveTo`,
  `isLine`. Phase is derived (`inPlacePhase()`), not stored.

---

## Run locally

It's static — open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

No dependencies to install.

---

## Deploy / operate the site

Hosting is **GitHub Pages via GitHub Actions** (`.github/workflows/deploy.yml`).

1. In the repo: **Settings → Pages → Build and deployment → Source =
   "GitHub Actions"** (one-time setup).
2. Every push to `main` (and the active dev branch) runs the workflow, which
   uploads the repo root as the Pages artifact and deploys it. The live URL is
   shown in the workflow run's `deploy` job and under Settings → Pages.
3. The dev branch is listed in the workflow `on.push.branches` so changes can
   be previewed before merging. Once merged to `main`, **remove the dev branch
   from that list** to keep deploys clean.

> Note: the GitHub Pages environment may restrict deployments to the default
> branch. If a dev-branch deploy is blocked, merge to `main` to publish.

### Content & config

- All gameplay constants live at the top of `game.js`
  (`PIECES_PER_PLAYER`, `OWNERS`, `LABEL`, `STORE_KEY`).
- Colors/sizing live as CSS variables in `:root` (`--bone`, `--wood`,
  `--cell`, `--accent`, `--move-time`).
- Scores are per-browser (`localStorage`); there is no server-side data.

### Versioning

- Keep changes small and incremental; commit with clear messages.
- Tag releases with `vMAJOR.MINOR` when behaviour changes meaningfully.
- Bust caches for a release by bumping a query string on the asset links in
  `index.html` (e.g. `game.js?v=2`) if needed.

---

## Conventions for contributors / agents

- Prefer the **simplest** implementation; favour minimal edits over refactors.
- Reach for a well-known library before hand-rolling; prefer CDN over vendored
  copies. (Currently zero dependencies — keep it that way unless a feature
  truly warrants one.)
- Use simple data structures and formats.
- Take reasonable decisions and move on; anything can be changed later.
