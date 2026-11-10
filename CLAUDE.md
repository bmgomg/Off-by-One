# Off by One

*Just a slide of hand.*

A card puzzle for the SHIFT jam: one row or column has slipped out of place. Slide it back.
The lane wraps around, and you get one shift per puzzle.

A SvelteKit app (Svelte 5), built as a static site, laid out as `C:\git\BMG\Dark Matter` is: splash, Home, Game Page.
The look is "Sleight of Hand": a magician's velvet-and-gold stage, on a 450 × 800 page that scales to fit the window.

```sh
npm install
npm run dev      # http://localhost:1130
npm test         # the rules, generator, levels and board sizes
npm run build    # static site in build/
npm run lint     # eslint and prettier, as in Dark Matter
```

`prototype/index.html` is the original single-file prototype (no build step); it still has the
playtest extras ("Start at level", rule and size switches in one place).

## Files

- `src/const.js`: title, slide timings, board sizes, the challenge's levels and limits, the board's area.
- `src/logic.js`: cards, the rule, puzzle generation, levels, scoring, board geometry (tested in `logic.test.js`).
- `src/shared.svelte.js`: settings (saved under `APP_STATE`, loaded once Home is up), the puzzle and the run, the timer, and moving a lane.
- `src/utils.js`: `tween`, and `slideX` / `pushIn` / `pushOut`, the slide transitions.
- `src/Splash.svelte`, `src/Home.svelte`, `src/Game Page.svelte`, `src/Board.svelte` (the cards, dragging with the wrap copy, keyboard, clash marks).
- `src/sound.js`: synthesized effects. `src/cards.js`: the deck's images and names.
- `src/lib/images/cards/`: the deck, 52 SVG faces from Race the Ace's `svg` branch (transparent backgrounds; the board paints the ivory face).
  `src/lib/images/BMG.webp`: the splash's logo, the template's.
- `src/lib/fonts/`: Limelight (`LM`, titles), Cormorant Garamond (`CG`, text), Cormorant SC (`CSC`, labels), latin subsets, with their OFL texts.

## Splash and slides

The template's BMG splash, as in Dark Matter: a tap on it wipes this game's saves. It goes by a push, not a fade: it slides
off to the left as the page slides in from the right (`SPLASH_SLIDE_MS`, 0.7 s, ease-in-out). Home and the game stand in a
row, so Play pushes Home off to the left and Back brings it back from there (`PAGE_SLIDE_MS`, 0.5 s); the gold frame holds
still. A new puzzle (New Deal, Next trick, a board size, Encore) pushes the old one's cards off the felt to the left (the
felt stays, easing to a new board size meanwhile; each puzzle's cards lie over the whole felt on their own, centred,
so two boards of different sizes don't share a layout); the old cards, on their way out, keep their own faces, since Svelte stops updating an outgoing block (`game.deal` keys it). The act and
final-curtain panels slide in from the right and out to the left, and so does the message under the
board with its buttons, a new one pushing the old out (`STRIP_SLIDE_MS`, 0.4 s). With reduced motion they're instant.

Face-down cards turn up with a flip (Curtain up, Continue, Resume): each back narrows to its edge and the face opens out
from it (`FLIP_MS`, 0.36 s for the two halves), in a wave from the top-left corner, each diagonal `FLIP_WAVE_MS` (40 ms)
after the one before. The squash is put after the card's translate in its transform, since the `scale` property would
apply first and squash the card's place on the board too.

The numbers that change in place roll, by NumberFlow (`@number-flow/svelte`): the act, trick, applause, the clock's
seconds, and Practice's solved / played. Its digits are padded above and below for the roll's fade; `.val` and `.secs`
hold them to the text's height, so the padding overflows and the board's room (`BOARD_H`) is unchanged.

## Rules

- One row or column has been shifted out of place. Drag it back: rows sideways, columns up or down.
- Any shift that leaves the whole board valid wins, as in Race the Ace.
- Touching cards must differ in rank by at least 2 (Race the Ace's rule). J = 11, Q = 12, K = 13, A = 14. A second
  rule, suit or rank, was offered on Home and dropped (the designer's call); the best score kept is the rank gap's.
- Keyboard: arrows pick a card, Shift+arrows slide its lane, Enter commits, Esc cancels.
- While a lane moves, the card it was taken by (under the finger, or the keyboard's cursor) is lifted (4% larger, above its neighbours)
  with a gold ring, and a
  dashed frame marks where it started; the frame turns solid and glows when the card is back in it, i.e. the lane is
  back as it was (letting go there shifts nothing). Passing back through home plays a soft two-note click (`sfx.home`)
  in place of a step's tick.

## Challenge

Five puzzles per level, three strikes end the run, and strikes reset each level. A wrong shift or
running out of time is a strike. A wrong shift stops the clock and shows one button, Reset: the lane slides back as dealt, the shortest way
(`RESET_SLIDE_MS`, 0.4 s),
and the clock runs on from where it stopped, so the trick can still be solved (the designer's call). Running out of time
ends the trick, with Next trick and Reveal. Messages never spell out the fix (the designer's call): Reveal shows it on
the board ("That's the trick."), and goes once the board is right. Each solve scores **seconds left × level** (the act panel: "You score the seconds left on the clock, times the act number.").

| Level | Board | Seconds per puzzle |
|---|---|---|
| 1 | 4×4 | 60 |
| 2 | 4×5 | 60 |
| 3 | 5×5 | 60 |
| 4 | 5×5 | 50 |
| 5 | 5×5 | 40 |
| 6 | 5×5 | 30 |
| 7+ | 5×5 | 3 fewer per level, down to 3 (level 15) |

The clock has no playable floor, so every run ends. Tune `LEVELS`, `DECAY_SECS` and `MIN_SECS`
in `src/const.js`. In the app's theme a level is an "act", a puzzle a "trick", the score "applause".

Practice has no timer and a board-size choice, and lets you mark clashes. A wrong shift shows the same single Reset;
there's no Reveal in Practice any more.

## Icon and offline play

The icons come from one source, `scripts/icon.html`, rendered by `sh scripts/render-icons.sh` (as in Dark Matter): two
neighbouring cards in a row, a heart and a spade, at the cards' own proportions, caught mid-slide in the velvet tile,
whose padding crops them square at either side (more on the left). No gold border (the designer's call). It writes
`static/favicon.svg` and `favicon.png` (32 px), and `static/icons/`: 192 and 512 rounded on transparency, a full-bleed
180 for iOS, and maskable 192 and 512 with the cards shrunk into the safe circle. Bump the `?v=` on their links in
`src/app.html` and `static/manifest.json` after a change, past browser caches. Dropped tries: a dashed home frame between
two cards (a row never has a gap between its cards), squat cards inside a gold frame, and a rounded crop (it read as the
cards' own corners, so the cards looked whole).

A PWA that plays offline: `static/manifest.json` (installable, standalone, portrait) and `src/service-worker.js`, Dark
Matter's, which SvelteKit registers. On install it caches every built file and static file but the music and the
install icons; the music is cached the first time it's fetched, in a cache of its own; the page comes from the network
when it answers within 3 s, else the cache. Tested on a production build with its server stopped: Home, a saved puzzle
resumed, and the cards all came from the cache.

## Toolbar

Back, New Deal (Practice), SFX On/Off, Music On/Off, then Stats in Challenge or Reset Stats in Practice. At 16 px,
Challenge's four labels are on one line; Practice's five each take two lines when they're two words (all but Back),
always, so they keep that size. A toggle's word keeps the room of the longer of On and Off, so nothing moves when one
changes.

## Stats

- **Practice:** the Solved tally (solved / played) is all there is, so its button is Reset Stats, which clears it at
  once, with no card and no confirmation (the designer's call: it's benign). A puzzle under way still counts as played.
- **Challenge:** Stats opens a card over the board (sliding in like the act panel) with Shows, Average applause, Best
  applause and Furthest act, of shows that have ended (`app.stats`, saved with the settings; a best score saved before
  the stats carries over). Tricks solved aren't counted (the designer's call). Two buttons: Reset stats, which also
  closes the card, with no confirmation (the designer's call), and Close. Stats is disabled while the clock runs (a
  card mid-trick would eat the clock or show the board for free), and the clock starting puts the card away. A show
  under way counts when it ends, after a reset too.

## Music

Race the Ace's track (`src/lib/sounds/music.mp3`), played by howler and managed as in Dark Matter (`src/sound.js`): the
loop starts on the first Practice or Challenge (a tap, which browsers require before sound), then keeps playing with
only its volume changing. It fades up from silence over `MUSIC_FADE_MS` (5 s) to `MUSIC_VOLUME` (0.4) whenever it starts
or comes back (Music On, back in the window), and goes quiet at once (Music Off, out of the window). Music On/Off is in
the toolbar and saved with the settings. The effects stay synthesized (`sfx`), with their own SFX On/Off.

The track's source and licence aren't on record: Race the Ace names none, and Dark Matter's notes say the same of the
BMG games' shared tracks. Settle that, and any credit it requires, before release.

## Coming back to a game

Each mode's game is saved in localStorage (`APP_STATE • practice`, `APP_STATE • challenge`) as it changes, each second of
the clock, on Back, and when the app is hidden: the puzzle and where it stands, the clock's time used and whether it was
running, the rules it was dealt under, the shift Reset would undo, and Practice's tally or the run. Going to a mode
again, after a restart too, brings its game back face down under a panel, "Puzzle in progress" or "Show in progress",
with Resume, as in Race the Ace: it doesn't resume by itself (the designer's call), and the clock waits for Resume. In Practice,
New Deal starts afresh instead; a run in Challenge can only be resumed (New Show went, the designer's call). A solved or revealed practice puzzle, a run that's over, or a game dealt under
the other rules isn't brought back; a run waiting at an act's panel comes back to that panel, which is a prompt already.

## itch.io art

`sh scripts/render-cover.sh` writes the stills to `itch/`, as Dark Matter's does, with headless Edge or Chrome:

- `scripts/cover.html`, the cover, 630 × 500: the title over the felt, caught mid-trick. The middle row is half a card
  from home, its King leaving at the right and coming round at the left, the card it was taken by lifted with its gold
  ring over the dashed frame of where it started, as the board draws a move. The board is valid once the row is home,
  so the picture plays fair: change the cards with the rule.
- `scripts/tile.html`, the page's background, a seamless tile, 1024 × 1024: a stage curtain in the game's velvet. Its
  folds are waves a whole number of times across the tile, its nap noise that wraps, and it doesn't change from top to
  bottom.
- `scripts/rules.html`, the rules graphic for the page's description, 900 × 600, in the format of Dark Matter's: its
  wording states the rule, the score and the three strikes, so change it with the game.

Not yet made: the Embed BG, the social media image and a logo (Dark Matter has all three).

## Design notes

Why shifting differs from swapping: a 4×5 board has 31 possible shifts against 190 swaps. A row
shift keeps every pair inside the row except one, where the ends wrap, and replaces all of the
row's up/down neighbors. Clashes pile up along the shifted lane, so finding it is a deduction.

Simulated rule sets, from choosing the rule (one random shift applied to a valid grid, 200–300 puzzles each):

| Rules | Board | Puzzles with one solving shift | Clashing pairs shown |
|---|---|---|---|
| A's in Place (vowels, consecutive letters) | 4×4 | 12% | usually 1 |
| Race the Ace (rank gap) | 4×5 | 51% | 1–3 |
| Pairanoia / Symbolica (shape or color, not both) | 4×4 | 100% | 2–9, but grids come out striped |
| Suit or rank | 4×5 | 81% | 3–9 |

## Open questions

- Lowest playable time limit, and whether to drop 3 or 5 seconds per level, or a percentage.
- Not yet in the app: the itch.io build, a playtest level jump.
