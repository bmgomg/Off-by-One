# Off by One

*Shift happens.*

A card puzzle for the SHIFT jam: one row or column has slipped out of place. Slide it back.
The lane wraps around, and you get one shift per puzzle.

A SvelteKit app (Svelte 5), built as a static site. The look is "Sleight of Hand": a magician's
velvet-and-gold stage, on a 450 × 800 page that scales to fit the window.

```sh
npm install
npm run dev      # http://localhost:1130
npm test         # the rules, generator, levels and board sizes
npm run build    # static site in build/
```

`prototype/index.html` is the original single-file prototype (no build step); it still has the
playtest extras ("Start at level", rule and size switches in one place).

## Files

- `src/lib/logic.js`: cards, the two rule sets, puzzle generation, levels, scoring, board geometry (tested in `logic.test.js`).
- `src/lib/state.svelte.js`: settings (saved), the puzzle and the run, the timer, and moving a lane.
- `src/lib/Board.svelte`: the cards, dragging with the wrap copy, keyboard, clash marks.
- `src/lib/Game.svelte`, `src/lib/Home.svelte`: the two pages. `src/lib/sound.js`: synthesized effects.
- `src/lib/cards/`: the deck (52 webp faces with transparent backgrounds; the board paints the ivory face).

## Rules

- One row or column has been shifted out of place. Drag it back: rows sideways, columns up or down.
- Any shift that leaves the whole board valid wins, as in Race the Ace.
- **Rank gap** (default): touching cards must differ in rank by at least 2. J = 11, Q = 12, K = 13, A = 14.
- **Suit or rank** (variant): every card must share a suit or a rank with each card it touches.
- Keyboard: arrows pick a card, Shift+arrows slide its lane, Enter commits, Esc cancels.

## Challenge

Five puzzles per level, three strikes end the run, and strikes reset each level. A wrong shift or
running out of time is a strike. Each solve scores **seconds left × level**.

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
in `src/lib/logic.js`. In the app's theme a level is an "act", a puzzle a "trick", the score "applause".

Practice has no timer and a board-size choice; it lets you undo a wrong shift, reveal the answer,
and mark clashes.

## Design notes

Why shifting differs from swapping: a 4×5 board has 31 possible shifts against 190 swaps. A row
shift keeps every pair inside the row except one, where the ends wrap, and replaces all of the
row's up/down neighbors. Clashes pile up along the shifted lane, so finding it is a deduction.

Simulated rule sets (one random shift applied to a valid grid, 200–300 puzzles each):

| Rules | Board | Puzzles with one solving shift | Clashing pairs shown |
|---|---|---|---|
| A's in Place (vowels, consecutive letters) | 4×4 | 12% | usually 1 |
| Race the Ace (rank gap) | 4×5 | 51% | 1–3 |
| Pairanoia / Symbolica (shape or color, not both) | 4×4 | 100% | 2–9, but grids come out striped |
| Suit or rank | 4×5 | 81% | 3–9 |

## Open questions

- Lowest playable time limit, and whether to drop 3 or 5 seconds per level, or a percentage.
- Not yet in the app: music, offline play (PWA), resuming a run after Back, a playtest level jump.
