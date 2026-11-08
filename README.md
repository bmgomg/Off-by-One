# Off by One

*Shift happens.*

Prototype for the SHIFT jam. Race the Ace's puzzle with a new move: instead of swapping two
cards, shift one row or column. The lane wraps around, and you get one shift per puzzle.

Open `index.html` in a browser to play. It is a single file with no build step.

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
in `index.html`. "Start at level" in settings is a playtest shortcut.

Practice has no timer, lets you undo a wrong shift, can show the answer, and can mark clashes.

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
- Real Race the Ace card art in place of the drawn faces.
- Port to Svelte on top of the Race the Ace codebase for the jam build.
