<script>
	import NumberFlow, { NumberFlowGroup } from '@number-flow/svelte';
	import { untrack } from 'svelte';
	import Board from './Board.svelte';
	import { MAX_STRIKES, SIZES, STRIP_SLIDE_MS, TASKS_PER_LEVEL } from './const';
	import { RULES, levelInfo } from './logic';
	import {
		app,
		game,
		geo,
		goHome,
		levelSecs,
		newDeal,
		newRun,
		next,
		review,
		setSize,
		showAnswer,
		startPlay,
		toggleSound,
		reset,
		resume,
		saveGame
	} from './shared.svelte';
	import { pushIn, pushOut, slideX } from './utils';

	const challenge = $derived(app.mode === 'challenge');
	const g = $derived(geo());
	const run = $derived(game.run);
	const inLevel = $derived(
		['ready', 'play', 'wrong'].includes(game.phase) ? (run.tasks % TASKS_PER_LEVEL) + 1 : ((run.tasks - 1) % TASKS_PER_LEVEL) + 1
	);
	const total = $derived(levelSecs() * 1000);
	const leftFrac = $derived(Math.max(0, Math.min(1, game.left / total)));
	const leftSecs = $derived(Math.ceil(game.left / 1000));
	const best = $derived(app.best[app.rule] || 0);
	// the message and buttons under the board change as one, by a push; a paused game's wait under its panel
	const strip = $derived(`${game.phase} ${game.reviewing} ${game.msg.text} ${!!game.paused}`);

	// The game is saved whenever it changes, and each second of the clock, so it can be come back to, after a restart
	// too. (Saving reads all of it, the clock's every frame included, hence the untrack.)
	$effect(() => {
		JSON.stringify([game.R, game.C, game.grid, game.phase, game.msg, game.reviewing, game.showClashes, game.paused, game.run, game.practice]);
		void leftSecs;
		untrack(() => saveGame());
	});

	// What the level prompt says changed.
	const prompt = $derived.by(() => {
		const L = run.level;
		const info = levelInfo(L);
		const prev = levelInfo(Math.max(1, L - 1));
		const size = info.size.replace('x', '×');
		if (run.tasks === 0) return { lines: [`The board: ${size}, ${info.secs} seconds per trick.`, 'A wrong shift or running out of time earns a strike. Three strikes end the show.', 'Each solve scores seconds left × level.'], button: 'Curtain up' };
		const lines = ['Your strikes have been reset.'];
		if (prev.size !== info.size) lines.unshift(`The board grows to ${size}.`);
		if (prev.secs !== info.secs) lines.push(`You now have ${info.secs} seconds per trick.`);
		return { lines, button: 'Continue' };
	});
</script>

<div class="game">
	<div class="title">Off <span class="by">by</span> One</div>

	{#if challenge}
		<div class="stats">
			<div class="stat"><span class="lbl">Act</span><span class="val"><NumberFlow value={run.level} /></span></div>
			<div class="stat"><span class="lbl">Trick</span><span class="val"><NumberFlow value={inLevel} suffix="/{TASKS_PER_LEVEL}" /></span></div>
			<div class="stat">
				<span class="lbl">Strikes</span>
				<span class="strikes" aria-label="{run.strikes} of {MAX_STRIKES} strikes">
					{#each { length: MAX_STRIKES } as _, i (i)}
						<span class="strike" class:spent={i < run.strikes}>{i < run.strikes ? '✕' : ''}</span>
					{/each}
				</span>
			</div>
			<div class="stat right"><span class="lbl">Applause</span><span class="val gold"><NumberFlow value={run.score} /></span></div>
		</div>
		<div class="timer" role="img" aria-label="{leftSecs} seconds left">
			<i></i>
			<div class="track"><div class="fill" class:low={game.left < 10000} style="width: {leftFrac * 100}%"></div></div>
			<i></i>
			<span class="secs"><NumberFlow value={leftSecs} /></span>
		</div>
	{:else}
		<div class="stats practice">
			<div class="stat"><span class="lbl">Solved</span><span class="val"><NumberFlowGroup><NumberFlow value={game.practice.solved} /><NumberFlow value={game.practice.played} prefix="/" /></NumberFlowGroup></span></div>
			<div class="sizes" role="group" aria-label="Board size">
				{#each Object.keys(SIZES) as s (s)}
					<button type="button" aria-pressed={app.size === s} onclick={() => setSize(s)}>{s.replace('x', '×')}</button>
				{/each}
			</div>
			<label class="clashes"><input type="checkbox" bind:checked={game.showClashes} /> Clashes</label>
		</div>
	{/if}

	<!-- the felt in the middle of the room; Practice's rule midway between the stats and the felt -->
	<div class="table" class:practice={!challenge}>
		<div class="above">
			{#if !challenge}
				<div class="rule">{RULES[app.rule].text}</div>
			{/if}
		</div>

		<!-- The felt stays, sized to the puzzle on it (easing to a new board size as the cards slide); a new puzzle's
		     cards push the old ones off it to the left, as the message under it is pushed. The old ones, on their way
		     out, no longer update, so they show their own cards to the end. -->
		<div
			class="felt"
			class:won={game.flash === 'won'}
			class:lost={game.flash === 'lost'}
			style="width: {g.W}px; height: {g.H}px; --slide: {STRIP_SLIDE_MS}ms"
		>
			{#key game.deal}
				<div class="deal" in:slideX={pushIn(1, STRIP_SLIDE_MS)} out:slideX={pushOut(1, STRIP_SLIDE_MS)}>
					<Board />
				</div>
			{/key}
		</div>
		<div class="below"></div>

		{#if game.paused}
			<!-- a game come back to, its board face down till Resume, as in Race the Ace -->
			<div class="overlay">
				<div class="panel" in:slideX={pushIn(1, STRIP_SLIDE_MS)} out:slideX={pushOut(1, STRIP_SLIDE_MS)}>
					<h2>{challenge ? 'Show' : 'Puzzle'} in progress</h2>
					<button type="button" class="btn primary" onclick={resume}>Resume</button>
				</div>
			</div>
		{:else if challenge && game.phase === 'ready'}
			<div class="overlay">
				<div class="panel" in:slideX={pushIn(1, STRIP_SLIDE_MS)} out:slideX={pushOut(1, STRIP_SLIDE_MS)}>
					<h2>Act {run.level}</h2>
					<ul>
						{#each prompt.lines as line, n (n)}<li>{line}</li>{/each}
					</ul>
					<button type="button" class="btn primary" onclick={startPlay}>{prompt.button}</button>
				</div>
			</div>
		{:else if game.phase === 'over' && !game.reviewing}
			<div class="overlay">
				<div class="panel" in:slideX={pushIn(1, STRIP_SLIDE_MS)} out:slideX={pushOut(1, STRIP_SLIDE_MS)}>
					<h2>Final curtain</h2>
					<div class="big">{run.score}</div>
					<p>{run.solved} of {run.tasks} tricks solved, reached act {run.level}. {run.newBest ? 'A new best!' : `Best: ${best}.`}</p>
					<div class="row">
						<button type="button" class="btn primary" onclick={newRun}>Encore</button>
						<button type="button" class="btn" onclick={review}>See the board</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- what to do next: a new message and its buttons push the old ones out to the left -->
	<div class="strip" aria-live="polite">
		{#key strip}
			<div class="step" in:slideX={pushIn(1, STRIP_SLIDE_MS)} out:slideX={pushOut(1, STRIP_SLIDE_MS)}>
				<p class="msg {game.msg.tone}">{game.paused ? '' : game.msg.text}</p>

				<div class="actions">
					{#if game.paused}
						<!-- nothing till Resume -->
					{:else if game.phase === 'wrong'}
						<button type="button" class="btn small primary" onclick={reset}>Reset</button>
					{:else if game.phase === 'failed'}
						<button type="button" class="btn small primary" onclick={next}>Next trick</button>
						<button type="button" class="btn small" onclick={showAnswer}>Reveal</button>
					{:else if game.phase === 'solved' || game.phase === 'revealed'}
						<button type="button" class="btn small primary" onclick={next}>Next trick</button>
					{:else if game.phase === 'over' && game.reviewing}
						<button type="button" class="btn small primary" onclick={newRun}>Encore</button>
						<button type="button" class="btn small" onclick={showAnswer}>Reveal</button>
					{/if}
				</div>
			</div>
		{/key}
	</div>

	<nav class="toolbar">
		<button type="button" onclick={goHome}>Back</button>
		{#if challenge}
			<button type="button" onclick={newRun}>New Show</button>
		{:else}
			<button type="button" onclick={newDeal}>New Deal</button>
		{/if}
		<button type="button" onclick={toggleSound}>Sound {app.sound ? 'On' : 'Off'}</button>
	</nav>
</div>

<style>
	.game {
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 18px 12px 0;
		gap: 6px;
	}

	.title {
		font-family: var(--display);
		font-size: 30px;
		line-height: 1;
		color: var(--gold-hi);
	}

	.by {
		display: inline-block;
		font-size: 21px;
		transform: translateY(4px);
		/* off by a little, and on a hover it springs into line, overshooting, as in the prototype */
		transition: transform 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	.title:hover .by {
		transform: translateY(0);
	}

	.stats {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
		padding: 0 14px;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	/* Practice's: the size pills in the middle of the page, whatever the widths on either side */
	.stats.practice {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
	}

	.stats.practice .clashes {
		justify-self: end;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat.right {
		align-items: flex-end;
	}

	.lbl {
		font-family: var(--caps);
		font-weight: 600;
		font-size: 14px;
		letter-spacing: 2px;
		color: var(--label);
	}

	/* NumberFlow pads its digits above and below for the roll's fade (--number-flow-mask-height, 0.25em): held to the
	   text's height here, the padding overflows, and the layout stays as with plain text */
	.val {
		display: flex;
		align-items: center;
		height: 24px;
		font-family: var(--display);
		font-size: 24px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.val.gold {
		color: var(--gold-hi);
	}

	.strikes {
		display: flex;
		gap: 5px;
		padding-top: 4px;
	}

	.strike {
		width: 15px;
		height: 21px;
		border-radius: 2px;
		background: repeating-linear-gradient(45deg, #6e1a2a 0 3px, #4a0f1c 3px 6px);
		box-shadow: inset 0 0 0 1px #c9a24f;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 700;
		line-height: 1;
		color: var(--red);
		transition: background 0.3s;
	}

	.strike.spent {
		background: var(--card);
	}

	.sizes {
		display: flex;
		gap: 4px;
		font-family: var(--caps);
		font-weight: 600;
		font-size: 15px;
	}

	.sizes button,
	.clashes {
		min-height: 34px;
		padding: 0 10px;
		border: 1px solid var(--gold-faint);
		border-radius: 17px;
		background: none;
		color: var(--label);
		cursor: pointer;
	}

	/* Cormorant SC carries more room above its glyphs than below, so centred by its line the label sat 2.5 px low */
	.sizes button {
		padding-bottom: 5px;
	}

	/* the size in play: not a button to press, so no hover, no press, no pointer */
	.sizes button[aria-pressed='true'] {
		border-color: var(--gold);
		color: var(--gold-pale);
		background: rgba(216, 180, 100, 0.12);
		cursor: default;
		pointer-events: none;
	}

	/* a tap presses the pill in, and it springs back out past its size, as the title's "by" springs */
	.sizes button {
		transition:
			border-color 0.2s,
			color 0.2s,
			background-color 0.2s,
			transform 0.35s cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	.sizes button:not([aria-pressed='true']):active {
		transform: scale(0.88);
		transition-duration: 0.2s, 0.2s, 0.2s, 0.08s;
	}

	@media (hover: hover) {
		.sizes button:not([aria-pressed='true']):hover {
			border-color: var(--gold-line);
			color: var(--gold-pale);
			background: rgba(216, 180, 100, 0.07);
		}
	}

	.clashes {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--caps);
		font-weight: 600;
		font-size: 15px;
		box-sizing: border-box;
	}

	/* gold either way: an outline, filled when ticked */
	.clashes input {
		appearance: none;
		width: 16px;
		height: 16px;
		margin: 0;
		box-sizing: border-box;
		border: 1.5px solid var(--gold);
		border-radius: 3px;
		background: transparent;
		display: grid;
		place-content: center;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.clashes input::after {
		content: '';
		width: 8px;
		height: 4px;
		border-left: 2px solid var(--velvet);
		border-bottom: 2px solid var(--velvet);
		transform: translateY(-1px) rotate(-45deg) scale(0);
		transition: transform 0.15s;
	}

	.clashes input:checked {
		background: var(--gold);
	}

	.clashes input:checked::after {
		transform: translateY(-1px) rotate(-45deg) scale(1);
	}

	.clashes input:focus-visible {
		outline: 2px solid var(--gold-pale);
		outline-offset: 2px;
	}

	.rule {
		min-height: 22px;
		font-style: italic;
		font-size: 18px;
		color: var(--label);
	}

	.timer {
		width: 100%;
		min-height: 22px;
		box-sizing: border-box;
		padding: 0 14px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.timer i {
		width: 7px;
		height: 7px;
		background: var(--gold);
		transform: rotate(45deg);
	}

	.track {
		flex: 1;
		height: 3px;
		background: rgba(216, 180, 100, 0.22);
	}

	.fill {
		height: 100%;
		background: var(--gold-hi);
		box-shadow: 0 0 8px rgba(230, 198, 119, 0.6);
	}

	.fill.low {
		background: var(--bad);
		box-shadow: 0 0 8px rgba(255, 107, 107, 0.6);
	}

	.secs {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		height: 18px;
		min-width: 26px;
		font-family: var(--display);
		font-size: 18px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.table {
		position: relative;
		width: 100%;
		/* all the height the rest leaves: see BOARD_H */
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* the room above and below the felt, shared evenly, so the felt is in the middle, unless the rule needs more */
	.above,
	.below {
		flex: 1 1 0;
		width: 100%;
		display: grid;
		place-items: center;
	}

	/* from the stats' foot (taking back the page's gap), with room for the rule */
	.table.practice .above {
		margin-top: -6px;
		min-height: 34px;
	}

	/* Each puzzle's cards on their own over the whole felt, centred, so the outgoing and incoming boards (of different
	   sizes, after a size change) don't share a layout: shared, the bigger one set the cell and the other sat off centre
	   till the old one left. Centred by place-content, so a bigger outgoing board overflows evenly, clipped. */
	.deal {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
	}

	/* one gold line, and little padding: the page's double frame is just outside it */
	.felt {
		flex: none;
		position: relative;
		/* the cards sliding on or off show only within it */
		overflow: hidden;
		padding: 5px;
		background: #120609;
		border: 1px solid var(--gold);
		box-shadow: 0 18px 36px rgba(0, 0, 0, 0.6);
		/* the size as slideX moves: cubicInOut */
		transition:
			width var(--slide) cubic-bezier(0.65, 0, 0.35, 1),
			height var(--slide) cubic-bezier(0.65, 0, 0.35, 1),
			border-color 0.3s,
			box-shadow 0.3s;
	}

	.felt.won {
		border-color: var(--gold-pale);
		box-shadow:
			0 0 34px rgba(243, 220, 156, 0.45),
			0 18px 36px rgba(0, 0, 0, 0.6);
	}

	.felt.lost {
		border-color: var(--bad);
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 5;
	}

	.panel {
		width: 300px;
		box-sizing: border-box;
		padding: 22px 24px;
		background: var(--velvet);
		border: 1px solid var(--gold);
		outline: 1px solid rgba(216, 180, 100, 0.35);
		outline-offset: 4px;
		box-shadow: 0 20px 44px rgba(0, 0, 0, 0.7);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		text-align: center;
	}

	.panel h2 {
		margin: 0;
		font-family: var(--display);
		font-weight: 400;
		font-size: 34px;
		color: var(--gold-hi);
	}

	.panel ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 19px;
		line-height: 1.3;
		color: var(--cream);
	}

	.panel p {
		margin: 0;
		font-size: 19px;
		line-height: 1.3;
		color: var(--cream);
	}

	.big {
		font-family: var(--display);
		font-size: 52px;
		line-height: 1;
		color: var(--gold-pale);
	}

	.row {
		display: flex;
		gap: 12px;
	}

	/* from the board down to the toolbar's divider (the negative margin takes up the page's gap above the toolbar), at
	   a fixed height, so the board's room (BOARD_H) doesn't change with the message */
	.strip {
		width: 100%;
		height: 98px;
		margin-bottom: -6px;
		display: grid;
	}

	/* the message at the top, and its buttons midway between it and the divider */
	.step {
		grid-area: 1/1;
		display: grid;
		grid-template-rows: auto 1fr;
		justify-items: center;
		align-items: center;
	}

	.msg {
		margin: 0;
		max-width: 400px;
		font-style: italic;
		font-size: 20px;
		line-height: 1.2;
		color: var(--cream);
		text-align: center;
	}

	.msg.good {
		color: var(--good);
	}

	.msg.bad {
		color: #ffb3a8;
	}

	.actions {
		min-height: 42px;
		display: flex;
		gap: 12px;
	}

	.btn {
		min-width: 132px;
		height: 50px;
		padding: 0 16px;
		border-radius: 4px;
		border: 1px solid var(--gold);
		outline: 1px solid rgba(216, 180, 100, 0.4);
		outline-offset: 3px;
		background: transparent;
		color: var(--gold-hi);
		font-family: var(--display);
		font-size: 18px;
		cursor: pointer;
		transition: transform 0.12s;
	}

	.btn:active {
		transform: scale(0.97);
	}

	.btn.small {
		height: 42px;
		min-width: 120px;
		font-size: 17px;
	}

	.btn.primary {
		border-color: var(--gold-pale);
		background: linear-gradient(180deg, #e8c97c, #b68c3c);
		color: var(--velvet);
	}

	.toolbar {
		margin-top: auto;
		width: calc(100% - 20px);
		box-sizing: border-box;
		display: flex;
		justify-content: space-around;
		border-top: 1px solid var(--gold-faint);
		padding: 4px 6px 14px;
	}

	.toolbar button {
		min-height: 42px;
		padding: 0 8px;
		background: none;
		border: 0;
		color: #d9c79e;
		font-family: var(--caps);
		font-weight: 600;
		font-size: 17px;
		letter-spacing: 2px;
		cursor: pointer;
	}
</style>
