# Cascade

Cascade is a browser-native Draw One Klondike solitaire game played on a deep
felt table. Build the four foundations from Ace to King, move alternating-color
runs through the tableau, and send playable cards home by double-clicking. When
the last card reaches a foundation, the table becomes the victory cascade: all
52 cards launch, bounce, and paint the felt as they drift away.

## Run it

Install the supplied dependencies and start the development server:

```sh
npm ci
npm run dev
```

To create the static production site in `dist/`:

```sh
npm run build
```

The output is self-contained and can be served from any static file server.

## Controls

Drag a face-up card or a valid run to another tableau column or foundation.
Click the stock to turn one card; click it again when empty to recycle the
waste. Double-click the playable waste or tableau card to send it to a
foundation. The bottom bar starts a new game, returns to the title screen, and
toggles sound. The title and help menus also accept Arrow keys, W/S, Enter,
Space, and Escape. Press the backtick key to show diagnostics.
