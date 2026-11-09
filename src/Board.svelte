<script>
	import { cardImage, cardName } from './cards';
	import { mod } from './logic';
	import { sfx } from './sound';
	import {
		app,
		canMove,
		cancelLane,
		clashes,
		game,
		geo,
		grab,
		lane,
		laneLen,
		nudge,
		pitch,
		settle
	} from './shared.svelte';

	let boardEl = $state();
	let cursor = $state([0, 0]);
	let drag = null;

	const g = $derived(geo());
	const veiled = $derived(game.phase === 'ready');

	const base = (i) => [(i % game.C) * g.p + g.gap / 2, Math.floor(i / game.C) * g.pY + g.gap / 2];
	const laneOf = (i) => (lane.axis === 'row' ? Math.floor(i / game.C) : i % game.C);
	const posInLane = (i) => (lane.axis === 'row' ? i % game.C : Math.floor(i / game.C));

	// Each card's place, and for the moving lane a second copy that shows the wrap at the far edge.
	const tiles = $derived(
		game.grid.map((code, i) => {
			let [x, y] = base(i);
			let ghost = null;
			const moving = lane.axis !== null && laneOf(i) === lane.idx;
			if (moving) {
				const P = pitch(lane.axis);
				const L = laneLen(lane.axis) * P;
				const pos = mod(posInLane(i) * P + lane.d, L) + g.gap / 2;
				if (lane.axis === 'row') {
					x = pos;
					ghost = [pos - L, y];
				} else {
					y = pos;
					ghost = [x, pos - L];
				}
			}
			return { code, i, x, y, ghost, moving };
		})
	);

	const showClashes = $derived(
		lane.axis === null &&
			!game.busy &&
			(game.phase === 'failed' ||
				game.phase === 'over' ||
				(app.mode === 'practice' && game.showClashes && game.phase === 'play'))
	);

	const bad = $derived(showClashes ? clashes() : []);
	const badCells = $derived(new Set(bad.flat()));

	const marks = $derived(
		bad.map(([i, j]) => {
			const [x, y] = base(i);
			const th = Math.max(5, Math.round(g.gap * 0.8));
			const len = Math.round(g.cw * 0.42);
			return j === i + 1
				? { x: x + g.cw + g.gap / 2 - th / 2, y: y + g.ch / 2 - len / 2, w: th, h: len }
				: { x: x + g.cw / 2 - len / 2, y: y + g.ch + g.gap / 2 - th / 2, w: len, h: th };
		})
	);

	const band = $derived(
		lane.axis === 'row'
			? { x: 0, y: lane.idx * g.pY, w: g.W, h: g.pY }
			: lane.axis === 'col'
				? { x: lane.idx * g.p, y: 0, w: g.p, h: g.H }
				: null
	);

	function onpointerdown(e) {
		if (!canMove() || lane.axis) return;
		const rect = boardEl.getBoundingClientRect();
		const s = rect.width / g.W;
		const c = Math.min(game.C - 1, Math.max(0, Math.floor((e.clientX - rect.left) / s / g.p)));
		const r = Math.min(game.R - 1, Math.max(0, Math.floor((e.clientY - rect.top) / s / g.pY)));
		drag = { x0: e.clientX, y0: e.clientY, r, c, s, axis: null, last: 0, id: e.pointerId };
		cursor = [r, c];
		boardEl.setPointerCapture(e.pointerId);
	}

	function onpointermove(e) {
		if (!drag || e.pointerId !== drag.id) return;
		const dx = (e.clientX - drag.x0) / drag.s;
		const dy = (e.clientY - drag.y0) / drag.s;
		if (!drag.axis) {
			if (Math.hypot(dx, dy) < 7) return;
			if (!canMove()) {
				drag = null;
				return;
			}
			drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'row' : 'col';
			grab(drag.axis, drag.axis === 'row' ? drag.r : drag.c);
		}
		if (lane.axis !== drag.axis) {
			drag = null; // the lane was dropped meanwhile (time ran out)
			return;
		}
		lane.d = drag.axis === 'row' ? dx : dy;
		const step = Math.round(lane.d / pitch(drag.axis));
		if (step !== drag.last) {
			drag.last = step;
			sfx.tick();
		}
	}

	function onpointerup(e) {
		if (!drag || e.pointerId !== drag.id) return;
		const moved = drag.axis;
		drag = null;
		if (moved && lane.axis) settle();
	}

	function onkeydown(e) {
		const k = e.key;
		if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(k)) return;
		e.preventDefault();
		const [r, c] = cursor;
		if (k.startsWith('Arrow')) {
			const across = k === 'ArrowLeft' || k === 'ArrowRight';
			const dir = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
			if (e.shiftKey) nudge(across ? 'row' : 'col', across ? r : c, dir);
			else if (!lane.axis) cursor = across ? [r, Math.min(game.C - 1, Math.max(0, c + dir))] : [Math.min(game.R - 1, Math.max(0, r + dir)), c];
		} else if (k === 'Escape') cancelLane();
		else if (lane.axis) settle();
	}

	$effect(() => {
		// keep the cursor on the board when its size changes
		if (cursor[0] >= game.R || cursor[1] >= game.C) cursor = [0, 0];
	});
</script>

<div
	class="board"
	class:veiled
	bind:this={boardEl}
	style="width: {g.W}px; height: {g.H}px; --cw: {g.cw}px; --ch: {g.ch}px"
	tabindex="0"
	role="application"
	aria-roledescription="card grid"
	aria-label="Drag a row sideways or a column up or down. Keyboard: arrows pick a card, Shift and arrows slide its lane, Enter sets it, Escape cancels."
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	{onkeydown}
>
	{#if band}
		<div class="band" class:answer={lane.answer} style="transform: translate({band.x}px, {band.y}px); width: {band.w}px; height: {band.h}px"></div>
	{/if}

	{#each tiles as t (t.code)}
		{#if veiled}
			<div class="card back" style="transform: translate({t.x}px, {t.y}px)"></div>
		{:else}
			<img
				class="card"
				class:moving={t.moving}
				class:bad={badCells.has(t.i)}
				class:cursor={cursor[0] * game.C + cursor[1] === t.i}
				src={cardImage(t.code)}
				alt={cardName(t.code)}
				draggable="false"
				style="transform: translate({t.x}px, {t.y}px)"
			/>
		{/if}
	{/each}

	{#each tiles.filter((t) => t.ghost) as t (t.code)}
		<img class="card moving" src={cardImage(t.code)} alt="" aria-hidden="true" draggable="false" style="transform: translate({t.ghost[0]}px, {t.ghost[1]}px)" />
	{/each}

	{#each marks as m, n (n)}
		<span class="mark" style="transform: translate({m.x}px, {m.y}px); width: {m.w}px; height: {m.h}px"></span>
	{/each}
</div>

<style>
	.board {
		position: relative;
		overflow: hidden;
		touch-action: none;
		cursor: grab;
		outline: none;
	}

	.board:focus-visible {
		box-shadow: 0 0 0 2px var(--gold-pale);
	}

	.card,
	.band,
	.mark {
		position: absolute;
		left: 0;
		top: 0;
	}

	.card {
		width: var(--cw);
		height: var(--ch);
		box-sizing: border-box;
		border-radius: 6px;
		background: var(--card);
		box-shadow: 0 3px 6px rgba(0, 0, 0, 0.55);
		will-change: transform;
		pointer-events: none;
	}

	.card.moving {
		box-shadow:
			0 0 16px rgba(216, 180, 100, 0.45),
			0 10px 18px rgba(0, 0, 0, 0.7);
	}

	.card.bad {
		box-shadow:
			0 0 0 3px var(--bad),
			0 3px 6px rgba(0, 0, 0, 0.55);
	}

	.board:focus-visible .card.cursor {
		box-shadow:
			0 0 0 3px var(--gold-pale),
			0 3px 6px rgba(0, 0, 0, 0.55);
	}

	.back {
		background: repeating-linear-gradient(45deg, #6e1a2a 0 4px, #4a0f1c 4px 8px);
		box-shadow:
			inset 0 0 0 3px var(--card),
			inset 0 0 0 4px #c9a24f,
			0 3px 6px rgba(0, 0, 0, 0.55);
	}

	.band {
		box-sizing: border-box;
		background: rgba(216, 180, 100, 0.1);
		box-shadow:
			inset 0 1px 0 rgba(216, 180, 100, 0.65),
			inset 0 -1px 0 rgba(216, 180, 100, 0.65);
	}

	.band.answer {
		background: rgba(159, 220, 154, 0.12);
		box-shadow: inset 0 0 0 1px rgba(159, 220, 154, 0.7);
	}

	.mark {
		z-index: 2;
		box-sizing: content-box;
		margin: -2px 0 0 -2px;
		border: 2px solid #120609;
		border-radius: 999px;
		background: var(--bad);
		pointer-events: none;
	}
</style>
