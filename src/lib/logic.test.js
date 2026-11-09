import { describe, expect, it } from 'vitest';
import {
	ALL,
	RULES,
	SIZES,
	allMoves,
	applyMove,
	badPairs,
	geometry,
	levelInfo,
	makePuzzle,
	moveText,
	points
} from './logic.js';

// A small seeded generator so the tests are repeatable.
const seeded = (seed) => () => {
	seed = (seed * 1664525 + 1013904223) % 4294967296;
	return seed / 4294967296;
};

describe('cards', () => {
	it('has 52 distinct cards', () => {
		expect(new Set(ALL).size).toBe(52);
	});
});

describe('moves', () => {
	it('counts every distinct shift', () => {
		expect(allMoves(4, 5)).toHaveLength(4 * 4 + 5 * 3);
	});

	it('wraps a row and a column', () => {
		const g = [1, 2, 3, 4, 5, 6];
		expect(applyMove(g, 2, 3, { axis: 'row', idx: 0, steps: 1 })).toEqual([3, 1, 2, 4, 5, 6]);
		expect(applyMove(g, 2, 3, { axis: 'col', idx: 2, steps: 1 })).toEqual([1, 2, 6, 4, 5, 3]);
	});

	it('names a shift by its shorter direction', () => {
		expect(moveText({ axis: 'row', idx: 2, steps: 4 }, 4, 5)).toBe('row 3 left by 1');
		expect(moveText({ axis: 'col', idx: 0, steps: 1 }, 4, 5)).toBe('col 1 down by 1');
	});
});

describe('puzzles', () => {
	for (const ruleId of Object.keys(RULES)) {
		for (const size of Object.keys(SIZES)) {
			it(`${ruleId} ${size}: scrambled, with every listed shift solving it`, () => {
				const [R, C] = SIZES[size];
				const ok = RULES[ruleId].ok;
				const rand = seeded(7);
				for (let n = 0; n < 5; n++) {
					const { puzzle, solutions } = makePuzzle(R, C, ruleId, rand);
					expect(new Set(puzzle).size).toBe(R * C);
					expect(badPairs(puzzle, R, C, ok).length).toBeGreaterThan(0);
					expect(solutions.length).toBeGreaterThan(0);
					for (const m of solutions) expect(badPairs(applyMove(puzzle, R, C, m), R, C, ok)).toEqual([]);
				}
			});
		}
	}
});

describe('levels', () => {
	it('grows the board, then shrinks the clock to an impossible floor', () => {
		expect(levelInfo(1)).toEqual({ size: '4x4', secs: 60 });
		expect(levelInfo(3)).toEqual({ size: '5x5', secs: 60 });
		expect(levelInfo(7)).toEqual({ size: '5x5', secs: 27 });
		expect(levelInfo(15).secs).toBe(3);
		expect(levelInfo(40).secs).toBe(3);
	});

	it('scores seconds left times level', () => {
		expect(points(20, 4)).toBe(80);
		expect(points(-3, 4)).toBe(0);
	});
});

describe('geometry', () => {
	it('fits every board in the page area', () => {
		for (const [R, C] of Object.values(SIZES)) {
			const g = geometry(R, C);
			expect(g.W).toBeLessThanOrEqual(370);
			expect(g.H).toBeLessThanOrEqual(420);
		}
	});
});
