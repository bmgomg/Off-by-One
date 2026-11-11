// Pure game rules: cards, neighbor rules, puzzle generation, levels and board geometry.
import { BOARD_H, BOARD_W, CARD_GAP, CARD_RATIO, DECAY_SECS, LEVELS, MIN_SECS } from './const';

// A card is suit * 100 + rank: suits 1 clubs, 2 diamonds, 3 hearts, 4 spades; ranks 2–14 (J 11, Q 12, K 13, A 14).
export const ALL = [];
for (let s = 1; s <= 4; s++) for (let r = 2; r <= 14; r++) ALL.push(s * 100 + r);

export const suit = (c) => Math.floor(c / 100);
export const rank = (c) => c % 100;
export const mod = (a, n) => ((a % n) + n) % n;

// The rule: touching cards share a suit or a rank. The first one, Race the Ace's (touching cards differ in rank by at
// least two), stays for playtesting, picked by ?rule=gap in the address (a reload to change it).
export const RULES = {
	gap: { ok: (a, b) => Math.abs(rank(a) - rank(b)) >= 2, text: 'Touching cards must differ in rank by at least two.' },
	match: { ok: (a, b) => suit(a) === suit(b) || rank(a) === rank(b), text: 'Touching cards must share a suit or a rank.' }
};
export const RULE =
	typeof location !== 'undefined' && new URLSearchParams(location.search).get('rule') === 'gap' ? 'gap' : 'match';
export const ok = RULES[RULE].ok;
export const RULE_TEXT = RULES[RULE].text;

export const levelInfo = (L) => {
	if (L <= LEVELS.length) return LEVELS[L - 1];
	const last = LEVELS[LEVELS.length - 1];
	return { size: last.size, secs: Math.max(MIN_SECS, last.secs - DECAY_SECS * (L - LEVELS.length)) };
};

export const points = (secsLeft, level) => Math.max(0, secsLeft) * level;

const shuffle = (a, rand) => {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

/** A valid R × C grid of distinct cards, or null. */
export function genGrid(R, C, ok, rand = Math.random) {
	for (let attempt = 0; attempt < 60; attempt++) {
		const g = new Array(R * C).fill(0);
		const used = new Set();
		let nodes = 0;
		const bt = (i) => {
			if (i === R * C) return true;
			if (++nodes > 20000) return false;
			const r = Math.floor(i / C), c = i % C;
			for (const x of shuffle(ALL.slice(), rand)) {
				if (used.has(x)) continue;
				if (c > 0 && !ok(g[i - 1], x)) continue;
				if (r > 0 && !ok(g[i - C], x)) continue;
				g[i] = x;
				used.add(x);
				if (bt(i + 1)) return true;
				used.delete(x);
			}
			g[i] = 0;
			return false;
		};
		if (bt(0)) return g;
	}
	return null;
}

/** Index pairs of touching cards that break the rule. */
export function badPairs(g, R, C, ok) {
	const out = [];
	for (let i = 0; i < R * C; i++) {
		const r = Math.floor(i / C), c = i % C;
		if (c < C - 1 && !ok(g[i], g[i + 1])) out.push([i, i + 1]);
		if (r < R - 1 && !ok(g[i], g[i + C])) out.push([i, i + C]);
	}
	return out;
}

/** Every distinct shift: steps is 1..n-1, right for a row, down for a column. */
export function allMoves(R, C) {
	const ms = [];
	for (let r = 0; r < R; r++) for (let s = 1; s < C; s++) ms.push({ axis: 'row', idx: r, steps: s });
	for (let c = 0; c < C; c++) for (let s = 1; s < R; s++) ms.push({ axis: 'col', idx: c, steps: s });
	return ms;
}

export function applyMove(g, R, C, m) {
	const out = g.slice();
	if (m.axis === 'row') for (let c = 0; c < C; c++) out[m.idx * C + mod(c + m.steps, C)] = g[m.idx * C + c];
	else for (let r = 0; r < R; r++) out[mod(r + m.steps, R) * C + m.idx] = g[r * C + m.idx];
	return out;
}

// Under suit-or-rank, grids where every pair one way matches the same way read as plain stripes.
export function striped(g, R, C) {
	let hS = true, hR = true, vS = true, vR = true;
	for (let i = 0; i < R * C; i++) {
		const r = Math.floor(i / C), c = i % C;
		if (c < C - 1) {
			if (suit(g[i]) !== suit(g[i + 1])) hS = false;
			if (rank(g[i]) !== rank(g[i + 1])) hR = false;
		}
		if (r < R - 1) {
			if (suit(g[i]) !== suit(g[i + C])) vS = false;
			if (rank(g[i]) !== rank(g[i + C])) vR = false;
		}
	}
	return hS || hR || vS || vR;
}

/** A scrambled grid one shift away from valid, with every shift that solves it (any of them wins). */
export function makePuzzle(R, C, rand = Math.random, rule = RULE) {
	const ok = RULES[rule].ok;
	const ms = allMoves(R, C);
	for (let t = 0; t < 300; t++) {
		const sol = genGrid(R, C, ok, rand);
		if (!sol) continue;
		if (rule === 'match' && striped(sol, R, C)) continue;
		const p = applyMove(sol, R, C, ms[Math.floor(rand() * ms.length)]);
		if (badPairs(p, R, C, ok).length === 0) continue;
		const solutions = ms.filter((m) => badPairs(applyMove(p, R, C, m), R, C, ok).length === 0);
		return { puzzle: p, solutions };
	}
	throw new Error('Could not make a puzzle');
}

export function moveText(m, R, C) {
	const n = m.axis === 'row' ? C : R;
	const fwd = m.steps <= n / 2;
	const k = fwd ? m.steps : n - m.steps;
	const dir = m.axis === 'row' ? (fwd ? 'right' : 'left') : fwd ? 'down' : 'up';
	return `${m.axis} ${m.idx + 1} ${dir} by ${k}`;
}

// The largest cards that fit: p is the column pitch, pY the row pitch, each a card and a gap.
export function geometry(R, C) {
	for (let p = Math.floor(BOARD_W / C); ; p--) {
		const gap = Math.max(4, Math.round(p * CARD_GAP));
		const cw = p - gap;
		const ch = Math.round(cw / CARD_RATIO);
		const pY = ch + gap;
		if (R * pY <= BOARD_H) return { p, pY, gap, cw, ch, W: C * p, H: R * pY };
	}
}
