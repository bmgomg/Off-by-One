<script>
	import { onMount } from 'svelte';
	import { cardImage } from './cards';
	import { TAGLINE } from './const';
	import { RULES } from './logic';
	import { app, loadSettings, setRule, startChallenge, startPractice } from './shared.svelte';

	onMount(loadSettings);
</script>

<div class="home">
	<div class="fan" role="img" aria-label="Three fanned cards, seven, eight and nine; the eight is lifted out of line">
		<img class="left" src={cardImage(107)} alt="" draggable="false" />
		<img class="right" src={cardImage(409)} alt="" draggable="false" />
		<img class="lifted" src={cardImage(308)} alt="" draggable="false" />
	</div>

	<div class="titles">
		<h1>Off <span class="by">by</span> One</h1>
		<div class="tagline">{TAGLINE}</div>
	</div>

	<div class="divider" aria-hidden="true"><span></span><i></i><span></span></div>

	<ul class="rules">
		<li>One row or column has slipped out of place.</li>
		<li>Slide it back. Cards that leave one end come round at the other.</li>
		<li>{RULES[app.rule].text}</li>
		<li>Fix it in one shift. Beat the clock.</li>
	</ul>

	<div class="variant" role="group" aria-label="Rules">
		{#each Object.entries(RULES) as [id, r] (id)}
			<button type="button" aria-pressed={app.rule === id} onclick={() => setRule(id)}>{r.name}</button>
		{/each}
	</div>

	<div class="actions">
		<button type="button" class="btn" onclick={() => startPractice()}>Practice</button>
		<button type="button" class="btn primary" onclick={() => startChallenge()}>Challenge</button>
	</div>
</div>

<style>
	.home {
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 56px 40px 44px;
		gap: 20px;
	}

	.fan {
		position: relative;
		width: 240px;
		height: 170px;
		flex: none;
	}

	.fan img {
		position: absolute;
		width: 92px;
		height: 128px;
		border-radius: 8px;
		background: var(--card);
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.55);
	}

	.left {
		left: 34px;
		top: 34px;
		transform: rotate(-16deg);
	}

	.right {
		left: 114px;
		top: 34px;
		transform: rotate(16deg);
	}

	.lifted {
		left: 74px;
		top: 0;
		box-shadow:
			0 0 0 2px var(--gold),
			0 0 28px rgba(216, 180, 100, 0.55),
			0 14px 24px rgba(0, 0, 0, 0.6) !important;
		animation: float 3.2s ease-in-out infinite;
	}

	@keyframes float {
		50% {
			transform: translateY(-6px);
		}
	}

	.titles {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	h1 {
		margin: 0;
		font-family: var(--display);
		font-weight: 400;
		font-size: 60px;
		line-height: 1;
		color: var(--gold-hi);
		text-shadow:
			0 2px 0 #3a0d16,
			0 0 24px rgba(216, 180, 100, 0.25);
	}

	.by {
		display: inline-block;
		font-size: 40px;
		transform: translateY(8px);
		/* off by a little, and on a hover it springs into line, overshooting, as in the prototype */
		transition: transform 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	.titles:hover .by {
		transform: translateY(0);
	}

	.tagline {
		font-style: italic;
		font-size: 24px;
		color: var(--gold);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 220px;
	}

	.divider span {
		flex: 1;
		height: 1px;
		background: var(--gold-line);
	}

	.divider i {
		width: 8px;
		height: 8px;
		background: var(--gold);
		transform: rotate(45deg);
	}

	/* no word alone on a rule's last line */
	.rules {
		text-wrap: pretty;
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		font-size: 20px;
		line-height: 1.3;
		color: var(--cream);
	}

	.rules li {
		display: flex;
		gap: 14px;
		align-items: baseline;
	}

	.rules li::before {
		content: '♦';
		flex: none;
		color: var(--gold);
		font-size: 14px;
	}

	.variant {
		display: flex;
		gap: 6px;
		font-family: var(--caps);
		font-weight: 600;
		font-size: 15px;
		letter-spacing: 1px;
	}

	.variant button {
		min-height: 36px;
		padding: 0 14px;
		border: 1px solid var(--gold-faint);
		border-radius: 18px;
		background: none;
		color: var(--label);
		cursor: pointer;
	}

	.variant button[aria-pressed='true'] {
		border-color: var(--gold);
		color: var(--gold-pale);
		background: rgba(216, 180, 100, 0.12);
	}

	.actions {
		display: flex;
		gap: 18px;
		margin-top: auto;
	}

	.btn {
		width: 168px;
		height: 56px;
		border-radius: 4px;
		border: 1px solid var(--gold);
		outline: 1px solid rgba(216, 180, 100, 0.4);
		outline-offset: 3px;
		background: transparent;
		color: var(--gold-hi);
		font-family: var(--display);
		font-size: 19px;
		letter-spacing: 1px;
		cursor: pointer;
		transition: transform 0.12s;
	}

	.btn:active {
		transform: scale(0.97);
	}

	.btn.primary {
		border-color: var(--gold-pale);
		background: linear-gradient(180deg, #e8c97c, #b68c3c);
		color: var(--velvet);
	}
</style>
