<script>
	import '@fontsource/limelight';
	import '@fontsource/cormorant-garamond/500.css';
	import '@fontsource/cormorant-garamond/700.css';
	import '@fontsource/cormorant-garamond/500-italic.css';
	import '@fontsource/cormorant-sc/600.css';

	let { children } = $props();
</script>

{@render children()}

<style>
	:global {
		:root {
			--velvet: #2b0b13;
			--velvet-hi: #5a1626;
			--velvet-lo: #17050a;
			--night: #0d0306;
			--gold: #d8b464;
			--gold-hi: #e6c677;
			--gold-pale: #f3dc9c;
			--gold-line: rgba(216, 180, 100, 0.6);
			--gold-faint: rgba(216, 180, 100, 0.3);
			--ivory: #f4ead5;
			--cream: #eadfc6;
			--label: #c8a96a;
			--card: #fffaf0;
			--red: #a01d2d;
			--bad: #ff6b6b;
			--good: #9fdc9a;
			--display: 'Limelight', 'Georgia', serif;
			--text: 'Cormorant Garamond', 'Georgia', serif;
			--caps: 'Cormorant SC', 'Georgia', serif;
		}

		html,
		body {
			margin: 0;
			height: 100%;
			background: var(--night);
			color: var(--ivory);
			font-family: var(--text);
			-webkit-tap-highlight-color: transparent;
			overscroll-behavior: none;
		}

		button {
			font: inherit;
			color: inherit;
		}

		button:focus-visible,
		[tabindex]:focus-visible {
			outline: 2px solid var(--gold-pale);
			outline-offset: 3px;
		}

		@media (prefers-reduced-motion: reduce) {
			* {
				transition-duration: 0s !important;
				animation-duration: 0s !important;
			}
		}
	}
</style>
