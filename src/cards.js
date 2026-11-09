import { rank, suit } from './logic';

// The deck's faces are transparent apart from the art: the board paints the ivory face behind them.
const files = import.meta.glob('./lib/images/cards/*.webp', { eager: true, import: 'default' });

const SUIT_LETTER = { 1: 'C', 2: 'D', 3: 'H', 4: 'S' };
const SUIT_NAME = { 1: 'clubs', 2: 'diamonds', 3: 'hearts', 4: 'spades' };
const RANK_LETTER = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_NAME = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };

export const cardImage = (code) => files[`./lib/images/cards/${SUIT_LETTER[suit(code)]}${RANK_LETTER[rank(code)] || rank(code)}.webp`];

export const cardName = (code) => `${RANK_NAME[rank(code)] || rank(code)} of ${SUIT_NAME[suit(code)]}`;
