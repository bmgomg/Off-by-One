// the prefix of every key this game saves under; a tap on the splash wipes them all
export const APP_STATE = 'BMG • Off by One';
// the page is designed at DX × DY and scales to fit the window
export const DX = 450;
export const DY = 800;

export const TITLE = 'Off by One';
export const TAGLINE = 'Just a slide of hand.';

// the splash slides off to the left as the page slides in from the right, pushing it, in this long
export const SPLASH_SLIDE_MS = 700;
// One page pushes another the same way, in this long. They stand in a row, Home then a game, so going on pushes to the
// left and Back to the right.
export const PAGE_SLIDE_MS = 500;
// A new puzzle pushes the old off the table, and the act and final-curtain panels and the message and buttons under the
// board change by a push too, all in this long: the page stays, so it's quicker.
export const STRIP_SLIDE_MS = 400;
// Face-down cards turn up with a flip, each in this long (half to fold the back to its edge, half to open the face),
// in a wave from the top-left corner, each diagonal this much after the one before
export const FLIP_MS = 360;
export const FLIP_WAVE_MS = 40;
// Reset slides the wrongly shifted lane back where it was dealt, in this long
export const RESET_SLIDE_MS = 400;

export const SIZES = { '4x4': [4, 4], '4x5': [4, 5], '5x5': [5, 5] };

// Challenge: the board grows first, then the clock shrinks. Past the table each level loses
// DECAY_SECS more, down to MIN_SECS, so every run ends eventually.
export const LEVELS = [
	{ size: '4x4', secs: 60 },
	{ size: '4x5', secs: 60 },
	{ size: '5x5', secs: 60 },
	{ size: '5x5', secs: 50 },
	{ size: '5x5', secs: 40 },
	{ size: '5x5', secs: 30 }
];
export const DECAY_SECS = 3;
export const MIN_SECS = 3;
export const TASKS_PER_LEVEL = 5;
export const MAX_STRIKES = 3;

// The board's area on the 450 × 800 page: wide enough to leave the felt some room inside the page's frame (only 4×5
// fills it; the others run out of height first), as tall as the room
// between the stats and the message (the Game Page's .table, less the felt's border and padding). Cards keep the deck's
// aspect, and the gap between them is a share of the pitch, as in Race the Ace (6 px in 86).
export const BOARD_W = 390;
export const BOARD_H = 491;
export const CARD_RATIO = 0.72;
export const CARD_GAP = 0.07;
