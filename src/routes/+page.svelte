<script>
	import GamePage from '../Game Page.svelte';
	import Home from '../Home.svelte';
	import Splash from '../Splash.svelte';
	import { DX, DY, PAGE_SLIDE_MS, SPLASH_SLIDE_MS } from '../const';
	import { app, saveGame } from '../shared.svelte';
	import { setAway, wakeAudio } from '../sound';
	import { post, slideX } from '../utils';

	// the page is designed at DX × DY and scales to fit the window
	let ww = $state(DX);
	let wh = $state(DY);
	const scale = $derived(Math.min(ww / DX, wh / DY));

	let splash = $state(true);
	post(() => (splash = false), 2000);

	// the pages stand in a row, Home then a game: Home leaves to the left and comes back from there, a game the other way
	const push = (from) => ({ from, unit: '%', duration: PAGE_SLIDE_MS });

	// the game in play is saved as the app is hidden or closed, with the clock's time to the moment
	const saveNow = () => {
		if (app.page === 'game') saveGame();
	};
</script>

<svelte:window bind:innerWidth={ww} bind:innerHeight={wh} onpointerdown={wakeAudio} onkeydown={wakeAudio} onpagehide={saveNow} onblur={() => setAway(true)} onfocus={() => setAway(false)} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && saveNow()} />

<div id="app" class="nohi">
	{#if splash}
		<Splash />
	{:else}
		<div id="app-content" in:slideX={{ from: 100, duration: SPLASH_SLIDE_MS }} style="width: {DX * scale}px; height: {DY * scale}px">
			<main class="page" style="width: {DX}px; height: {DY}px; transform: scale({scale})">
				<div class="border outer" aria-hidden="true"></div>
				<div class="border inner" aria-hidden="true"></div>
				{#if app.page === 'home'}
					<div class="view" transition:slideX={push(-100)}><Home /></div>
				{:else}
					<div class="view" transition:slideX={push(100)}><GamePage /></div>
				{/if}
			</main>
		</div>
	{/if}
</div>

<style>
	#app {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		overflow: hidden;
	}

	#app-content {
		position: relative;
	}

	.page {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: 0 0;
		/* the page waiting off to the side, and one sliding in or out, show only within it */
		overflow: hidden;
		background: radial-gradient(ellipse at 30% 0%, var(--velvet-hi) 0%, var(--velvet) 58%, var(--velvet-lo) 100%);
		box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
	}

	.border {
		position: absolute;
		pointer-events: none;
		z-index: 1;
	}

	.outer {
		inset: 6px;
		border: 1px solid var(--gold-line);
	}

	.inner {
		inset: 10px;
		border: 1px solid var(--gold-faint);
	}

	.view {
		position: absolute;
		inset: 0;
	}
</style>
