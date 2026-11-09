<script>
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
			--display: LM, Georgia, serif;
			--text: CG, Georgia, serif;
			--caps: CSC, Georgia, serif;
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

		.nohi {
			-webkit-tap-highlight-color: transparent;
			-webkit-touch-callout: none;
			-webkit-user-select: none;
			user-select: none;
		}

		/* titles and big numbers */
		@font-face {
			font-family: LM;
			font-display: swap;
			src: url('$lib/fonts/Limelight.woff2') format('woff2');
		}

		/* text, and its italic for messages and asides */
		@font-face {
			font-family: CG;
			font-weight: 500;
			font-display: swap;
			src: url('$lib/fonts/Cormorant Garamond Medium.woff2') format('woff2');
		}

		@font-face {
			font-family: CG;
			font-weight: 700;
			font-display: swap;
			src: url('$lib/fonts/Cormorant Garamond Bold.woff2') format('woff2');
		}

		@font-face {
			font-family: CG;
			font-weight: 500;
			font-style: italic;
			font-display: swap;
			src: url('$lib/fonts/Cormorant Garamond Medium Italic.woff2') format('woff2');
		}

		/* labels and the toolbar */
		@font-face {
			font-family: CSC;
			font-weight: 600;
			font-display: swap;
			src: url('$lib/fonts/Cormorant SC SemiBold.woff2') format('woff2');
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
