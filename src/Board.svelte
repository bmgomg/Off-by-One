<script>
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { cardImage, cardName } from './cards';
	import { FLIP_MS, FLIP_WAVE_MS } from './const';
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
		pitch,
		settle
	} from './shared.svelte';
	import { reducedMotion } from './utils';

	let boardEl = $state();

	// Face-down cards turning up (Curtain up, Continue, Resume) flip: the back narrows to its edge, then the face opens
	// out from it. The squash goes after the card's place in its transform, so it's about the card's own middle (the
	// `scale` property would come first, and squash its place too). They go in a wave from the top-left corner, a card's
	// turn by its row plus column.
	const wave = (i) => (Math.floor(i / game.C) + (i % game.C)) * FLIP_WAVE_MS;
	const half = () => (reducedMotion() ? 0 : FLIP_MS / 2);
	const squash = ({ x, y }) => (s) => `transform: translate(${x}px, ${y}px) scaleX(${s})`;
	const fold = (node, t) => ({ delay: reducedMotion() ? 0 : wave(t.i), duration: half(), easing: cubicIn, css: squash(t) });
	const unfold = (node, t) => ({
		delay: reducedMotion() ? 0 : wave(t.i) + half(),
		duration: half(),
		easing: cubicOut,
		css: squash(t)
	});
	// the card the player took the lane by, under the pointer
	let taken = $state([0, 0]);
	let drag = null;

	const g = $derived(geo());
	const veiled = $derived(game.phase === 'ready' || !!game.paused);

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
			!game.paused &&
			(game.phase === 'wrong' ||
				game.phase === 'failed' ||
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

	// Where the player's lane started: the card they took it by gets a
	// gold rim, and a dashed frame stays at its first place, lighting up when the card is back in it, which is the whole
	// lane back as it was.
	const anchor = $derived.by(() => {
		if (!lane.user || lane.axis === null) return null;
		const [r, c] = taken;
		if ((lane.axis === 'row' ? r : c) !== lane.idx) return null;
		const P = pitch(lane.axis);
		const off = mod(lane.d, laneLen(lane.axis) * P);
		const [x, y] = base(r * game.C + c);
		return { i: r * game.C + c, x, y, home: Math.min(off, laneLen(lane.axis) * P - off) < P * 0.15 };
	});

	// the card the lane was taken by is lifted, grown a little about its middle (after its place in the transform)
	const LIFT = ' scale(1.04)';

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
		taken = [r, c];
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
			if (mod(step, laneLen(drag.axis)) === 0) sfx.home();
			else sfx.tick();
		}
	}

	function onpointerup(e) {
		if (!drag || e.pointerId !== drag.id) return;
		const moved = drag.axis;
		drag = null;
		if (moved && lane.axis) settle();
	}

	// Esc, the one key: the move is called off, the lane sliding back as it was, mid-drag too
	function onkeydown(e) {
		if (e.key !== 'Escape' || !lane.user || !lane.axis) return;
		e.preventDefault();
		drag = null;
		cancelLane();
	}
</script>

<svelte:window {onkeydown} />

<div
	class="board"
	class:veiled
	class:live={canMove()}
	class:dragging={lane.user && lane.axis !== null}
	bind:this={boardEl}
	style="width: {g.W}px; height: {g.H}px; --cw: {g.cw}px; --ch: {g.ch}px"
	role="group"
	aria-label="Drag a row sideways or a column up or down. Escape cancels."
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
>
	{#if band}
		<div class="band" class:answer={lane.answer} style="transform: translate({band.x}px, {band.y}px); width: {band.w}px; height: {band.h}px"></div>
	{/if}

	{#each tiles as t (t.code)}
		{#if veiled}
			<div class="card back" style="transform: translate({t.x}px, {t.y}px)" out:fold={t}></div>
		{:else}
			<img
				in:unfold={t}
				class="card"
				class:moving={t.moving}
				class:bad={badCells.has(t.i)}
				class:anchor={anchor?.i === t.i}
				src={cardImage(t.code)}
				alt={cardName(t.code)}
				draggable="false"
				style="transform: translate({t.x}px, {t.y}px){anchor?.i === t.i ? LIFT : ''}"
			/>
		{/if}
	{/each}

	{#each tiles.filter((t) => t.ghost) as t (t.code)}
		<img
			class="card moving"
			class:anchor={anchor?.i === t.i}
			src={cardImage(t.code)}
			alt=""
			aria-hidden="true"
			draggable="false"
			style="transform: translate({t.ghost[0]}px, {t.ghost[1]}px){anchor?.i === t.i ? LIFT : ''}"
		/>
	{/each}

	{#if anchor}
		<div class="home-frame" class:home={anchor.home} style="transform: translate({anchor.x}px, {anchor.y}px)"></div>
	{/if}

	{#each marks as m, n (n)}
		<span class="mark" style="transform: translate({m.x}px, {m.y}px); width: {m.w}px; height: {m.h}px"></span>
	{/each}
</div>

<style>
	.board {
		position: relative;
		overflow: hidden;
		touch-action: none;
	}

	/* the hand only while a lane can be moved (not on a solved, waiting or face-down board), closed while one is */
	.board.live {
		cursor: grab;
	}

	.board.dragging {
		cursor: grabbing;
	}

	.card,
	.band,
	.mark,
	.home-frame {
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

	/* the card the lane was taken by, as it travels: lifted a little (LIFT), with a gold ring, a glow and a deeper shadow;
	   above its neighbours, which it overlaps. (Between a faint pale rim, lost against the ivory cards, and a lift of 8%
	   with a dark gap inside a thick ring, which was too much.) */
	.card.moving.anchor {
		z-index: 1;
		box-shadow:
			0 0 0 3px var(--gold),
			0 0 16px 3px rgba(216, 180, 100, 0.5),
			0 12px 22px rgba(0, 0, 0, 0.75);
	}

	/* its first place, over whatever card passes through it; solid and glowing once it's back */
	.home-frame {
		z-index: 2;
		width: var(--cw);
		height: var(--ch);
		box-sizing: border-box;
		border: 2px dashed rgba(230, 198, 119, 0.75);
		border-radius: 6px;
		pointer-events: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.home-frame.home {
		border-style: solid;
		border-color: var(--gold-pale);
		box-shadow: 0 0 14px rgba(243, 220, 156, 0.7);
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
