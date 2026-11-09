<script>
	import { fade } from 'svelte/transition';
	import Game from '$lib/Game.svelte';
	import Home from '$lib/Home.svelte';
	import { wakeAudio } from '$lib/sound.js';
	import { app } from '$lib/state.svelte.js';

	// The page is designed at 450 × 800 and scales to fit the window.
	const W = 450;
	const H = 800;
	let ww = $state(W);
	let wh = $state(H);
	const scale = $derived(Math.min(ww / W, wh / H));
</script>

<svelte:window bind:innerWidth={ww} bind:innerHeight={wh} onpointerdown={wakeAudio} onkeydown={wakeAudio} />

<div class="stage">
	<div class="frame" style="width: {W * scale}px; height: {H * scale}px">
		<main class="page" style="transform: scale({scale})">
			<div class="border outer" aria-hidden="true"></div>
			<div class="border inner" aria-hidden="true"></div>
			{#key app.page}
				<div class="view" in:fade={{ duration: 260, delay: 120 }} out:fade={{ duration: 120 }}>
					{#if app.page === 'home'}
						<Home />
					{:else}
						<Game />
					{/if}
				</div>
			{/key}
		</main>
	</div>
</div>

<style>
	.stage {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		overflow: hidden;
	}

	.frame {
		position: relative;
	}

	.page {
		position: absolute;
		left: 0;
		top: 0;
		width: 450px;
		height: 800px;
		transform-origin: 0 0;
		overflow: hidden;
		background: radial-gradient(ellipse at 30% 0%, var(--velvet-hi) 0%, var(--velvet) 58%, var(--velvet-lo) 100%);
		box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
		user-select: none;
		-webkit-user-select: none;
	}

	.border {
		position: absolute;
		pointer-events: none;
		z-index: 1;
	}

	.outer {
		inset: 12px;
		border: 1px solid var(--gold-line);
	}

	.inner {
		inset: 17px;
		border: 1px solid var(--gold-faint);
	}

	.view {
		position: absolute;
		inset: 0;
	}
</style>
