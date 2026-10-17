# Cascade

## Overview

Cascade is a single-player patience game for the browser, a Klondike solitaire
played on a felt table. Twenty-eight cards are dealt into seven tableau columns,
and the player builds four foundations up from Ace to King, one suit each, by
moving cards between the columns, turning cards off the stock, and freeing the
buried cards underneath.

Cascade's defining idea is its ending. The moment the fifty-second card reaches a
foundation the table gives way: every card on the foundations launches off in
turn, arcs under gravity, bounces along the floor, and paints itself onto the
table as it goes, until the felt is buried under overlapping cards and the last
flyer has drifted off a side edge.

The table is played with a pointer, and a mouse and a touchscreen stand on the
same footing; the menus over the screens take the keyboard as well. Cascade has
its own name, look, and rules, and its branding and design are original to it.

The specification spans several files under `specs/`. `specs/table.md` gives the
geometry of the table and every pile on it; `specs/deal.md` the deck and the
deal; `specs/foundations.md` what a foundation accepts; `specs/tableau.md` what a
column accepts and how a run of cards moves; `specs/stock.md` the stock, the
waste, and this build's deal mode; `specs/controls.md` the pointer, the controls,
and the menus; `specs/victory.md` the win and the victory cascade;
`specs/screens.md` the four screens and the HUD; `specs/audio.md` the cues;
`specs/state.md` what the game's state carries; `specs/instrumentation.md` the
debug and automation surface; and `specs/showcase.md` the showcase the finished
build ships. Read all of them and build the game they describe as one cohesive
whole.

## The runtime

This game stands on no engine, so the runtime under it is yours to write: the
frame loop and the delta time it measures, the canvas fit, pointer and keyboard
input, audio cues, and the debug overlay. Where this specification speaks of the
runtime it means that layer, and it states only what Cascade needs from it. How
the layer is structured is yours to decide.

## The project you build in

The project at the root of this repository is already wired up, and its
`README.md` describes it. It is a TypeScript project built with Vite, tested with
Vitest, linted with ESLint, and formatted with Prettier. That toolchain is fixed
and supplied.

### What you implement

Everything under `src/`. The directory does not exist yet.

`index.html` loads `/src/main.ts` as its entry point, so that module is where
your build starts. Beyond that the structure is yours: the frame loop and the
canvas fit, pointer and keyboard input, audio, the debug overlay, the debug and
automation surface, the figures this specification fixes, and the game itself.

The game's state is yours to shape. `specs/state.md` states what it must carry,
and `specs/instrumentation.md` states the one contract fixed over it.

### What stays as it is

- `index.html`, the page and the canvas the stage is fitted into.
- The configuration: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, and `.gitignore`.

`package.json` takes one kind of change: a dependency you genuinely need, added
along with the updated `package-lock.json`. Its existing entries and scripts stay
as they are.

### Every figure comes from this specification

Every number, identifier, cue name, and piece of screen copy this specification
fixes is stated here under a name. Anything this specification does not name is
yours to decide.

### Your own tests

Write unit tests for what you build, beside your sources as `src/**/*.test.ts`.
`npm test` runs them in process with Vitest, in Node, with coverage measured over
`src/`. `@napi-rs/canvas` is installed for a test that wants a real 2D context.

### The checks the repository passes

Four commands run over the finished repository before it is reviewed:

| Command | Checks |
| --- | --- |
| `npx tsc --noEmit` | The code type-checks. A repository that does not compile is not reviewed. |
| `npx eslint .` | The code is lint-clean. |
| `npx prettier --check .` | The code is formatted. |
| `npx vitest run --coverage` | Your tests pass. |

They run on the repository as you leave it. `npm run typecheck`, `npm run lint`,
`npm run format`, and `npm test` run the same four locally.

### The build interface

`npm ci` followed by `npm run build` produces the complete static site into
`dist/` at the repository root, with an `index.html` at the root of that
directory as the entry point. That directory runs correctly when served as-is
from any static file server, at the root or at a sub-path. The scripts that do
this are already in `package.json`.

## Goal of this build

Produce a complete, polished, playable game that runs entirely in a browser. Aim
for a game a person would enjoy playing: unhurried, readable, and satisfying to
finish.

The build ships the whole game: the deal, the thirteen piles and every rule over
them, the pointer that plays them, the four screens and the HUD, the ten audio
cues, and the victory cascade. Every other spec file states one part of it.

### Hard requirements

- Write the runtime the game stands on: the frame loop and its delta time, the
  canvas fit, pointer and keyboard input, audio, and the debug overlay.
- Render real graphics on the canvas, drawn as shapes and text. Every card face,
  every card back, the table, and every screen is drawn in code.
- Draw everything in code. The build ships no art or audio files and fetches
  nothing at runtime.
- Play with a pointer, with a mouse and a touchscreen on the same footing, and
  drive every menu with the keyboard as well, as `specs/controls.md` states.
- Run in the browser with no backend. Everything needed to play is
  self-contained, and no API key or credential is needed to build, run, or play.
- Expose the debug and automation surface `specs/instrumentation.md` specifies,
  and the read-only debug overlay it describes, backed by the render-free core
  that file requires. This is a required part of the build.
- Ship the showcase `specs/showcase.md` describes, at the root of this
  repository.
- Replace the starter `README.md` with one explaining what the game is, how to
  install dependencies, how to run it in development, how to produce the static
  production build, and the controls.

### Out of scope

- Other patience games. This build is the Klondike this specification describes.
- A score, a timer, statistics, hints, an auto-solver, and undo.
- Persistence of a game or a setting between sessions. Each session starts fresh.
- Network, online, or multiplayer play, and gamepad input.

## Code quality

The code is fit for a long-lived codebase shared with human developers. The
type-check, lint, and format checks pass, and unit tests cover the rules.

## Coordinate system and presentation

All positions and sizes in this specification are given in the game's own logical
units on a fixed stage of `STAGE_W x STAGE_H` (`1280 x 720`, 16:9). The origin
`(0, 0)` is the top-left; `x` increases to the right and `y` increases downward.

A card's position is its **top-left corner**. Wherever a card, a card in hand, or
a card in flight is given, taken, or reported as an `(x, y)` pair, that pair is
the top-left of its `CARD_W x CARD_H` footprint rather than its center. Every
pile anchor `specs/table.md` fixes is a top-left in the same way.

- `STAGE_W x STAGE_H` is the game's logical design size. Fitting it to the
  browser window is the runtime's work: the uniform scale that preserves the
  aspect ratio, the letterboxed centering, and the device pixel ratio. The
  complete stage is therefore on screen at every window size, on load and at any
  pixel density.
- The letterbox bars around the stage carry the stage's background color.
- Draw in logical units, and take the canvas element's own size from the runtime
  alone.
- Game logic operates in logical units, independent of the rendered scale. The
  pointer position the game is given is in those same units, so a hit test
  against a pile needs no conversion.

Every rate in this specification is per second and every duration is in seconds,
integrated against the delta time the runtime hands each update. The game runs on
no fixed timestep, and the cascade's motion is integrated against that same delta
as `specs/victory.md` states.

## The screens the build has

The build carries four screens, and the game is on exactly one of them at a time:
`title`, `howto`, `playing`, and `won`. `specs/screens.md` defines what each one
shows and where each one leads.

## What the table shows

While the game is being played, the table carries all thirteen piles: the stock,
the waste, the four foundations, and the seven tableau columns, each at the
anchor `specs/table.md` fixes. A run held in hand is drawn above the piles it
passes over, and a legal drop target under it is drawn as highlighted. The HUD
strip along the bottom carries the three controls and the deal-mode label.
`specs/table.md` gives every pile's extent and `specs/screens.md` the HUD.

## Visual design

Choose the colors and the typography, decide how a card face, a card back, an
empty pile, and the table behind them are drawn, and decide how a held run and a
highlighted target read against the rest.

Whatever look you choose, a player reads all of the following at a glance.

| What a player reads | Requirement |
| --- | --- |
| A card face | A face-up card's rank and its suit are drawn on it and legible at the logical stage size. |
| Suit color | Hearts and diamonds are drawn in one color and spades and clubs in another, and the two are told apart at a glance. |
| A card back | A face-down card reads apart from a face-up card and from the table behind it. |
| The table | A card of either face reads apart from the table it sits on. |
| An empty pile | A pile holding no cards reads as an empty slot at its anchor, apart from the bare table. |
| A run in hand | A card or run being dragged reads as lifted above the piles it passes over. |
| The drop target | A legal drop target under a held run reads apart from the same pile drawn without the highlight. |
| Text | Every screen's text, and the label of every HUD control, is legible against its background at the logical stage size. |

The palette, the type, and every other aspect of the look are yours.
