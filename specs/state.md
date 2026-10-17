# Cascade — Game state

The build owns the shape of the game's state entirely.

The one contract fixed over the state is the debugging and automation surface
specified for this build. Every operation that surface carries is a read or a
pose of the running game, so the state holds what those operations read, honors
what they write, and returns to its title-screen values when the surface's
`reset` is called. Beyond satisfying that surface, how the state is organized is
yours to decide.

Whatever its shape, the state carries the following.

## The screen

- The screen the game is showing, one of `title`, `howto`, `playing`, and `won`.
- The selected item on the menu the current screen shows, reported as
  `menuIndex`.
- The title entry last confirmed, reported as `titleIndex`. It is `0` until a
  title item is activated, and returning to the title selects that entry again,
  as `specs/screens.md` states.

## The thirteen piles

- The stock, the waste, each of the four foundations, and each of the seven
  columns, every one of them an ordered list of cards from its bottom card to its
  top card.
- Each card: a distinct id, its suit, its rank, and whether it is face-up.
- The waste's set memory: the number of cards on each set the stock turned, from
  the oldest set to the newest, as `specs/stock.md` states.

## The pointer and the hand

- The run currently in hand, or nothing when nothing is held. A held run carries
  its cards in order from the leading card, the pile and slot it was lifted from,
  and the top-left of its leading card.
- The pile the held run would land on, when there is one.
- The pointer's position and whether it is down.
- The most recent press: its position and the game time it arrived at, which the
  double-click rule in `specs/controls.md` is measured against.

## The faculty gates

- Whether the automatic turning of an exposed card runs, whether win detection
  runs, whether the cascade's launching runs, and whether the trail's painting
  runs. All four are on when a game begins, and the debugging surface poses them.

## The victory cascade

- The seconds accumulated toward the next launch.
- The number of cards the cascade has launched, which is counted up as cards
  launch rather than derived from the foundations.
- Every card in flight, each with a distinct id, its suit, its rank, its top-left
  position, and its velocity.
- Whether the cascade has finished.
- The number of stamps the painted layer has taken since it was last cleared.

## The rest

- The simulation time, in seconds, which every update adds its delta to whatever
  the screen.
- Whether sound is muted, refreshed from the runtime's mute bit in every update.
- Whatever the game needs to hand a fresh id to the next card or flyer it
  creates, so no two entities live at one moment share an id.
