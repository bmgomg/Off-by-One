<script>
	import { APP_STATE, SPLASH_SLIDE_MS } from './const';
	import { slideX } from './utils';

	let classes = $state('splash');

	// a tap on the splash wipes this game's saved settings and best scores
	const onPointerDown = () => {
		Object.keys(localStorage)
			.filter((key) => key.startsWith(APP_STATE))
			.forEach((key) => localStorage.removeItem(key));
		classes = 'splash dark';
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={classes} out:slideX={{ from: -100, duration: SPLASH_SLIDE_MS }} onpointerdown={onPointerDown}>
	<div class="bmg"></div>
</div>

<style>
	.splash {
		position: absolute;
		inset: 0;
		background: #8a0000;
		background-image: radial-gradient(transparent, black 100%);
		z-index: 300;
		transition: background-color 0.3s;
	}

	.dark {
		background-color: #500000;
	}

	.bmg {
		width: 100dvw;
		height: 100dvh;
		background-image: url($lib/images/BMG.webp);
		background-size: calc(min(300px, min(100dvh, 100dvw) * 0.6));
		background-repeat: no-repeat;
		background-attachment: fixed;
		background-position: center;
	}
</style>
