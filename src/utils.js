import { cubicInOut } from 'svelte/easing';
import { DX } from './const';

export const post = (fn, ms) => setTimeout(fn, ms);

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Eases a number from `from` to `to` over `ms` (cubic out), calling onFrame with each value, then done.
export function tween(from, to, ms, onFrame, done) {
	if (reducedMotion()) ms = 0;
	const t0 = performance.now();
	const f = (now) => {
		const t = ms ? Math.min(1, (now - t0) / ms) : 1;
		onFrame(from + (to - from) * (1 - Math.pow(1 - t, 3)));
		if (t < 1) requestAnimationFrame(f);
		else done?.();
	};
	requestAnimationFrame(f);
}

// A Svelte transition that slides an element sideways: in from `from` (in `unit`s, vw by default) off to one side, or
// out to it. Two at once, one out and one in, make a push: the splash off to the left as the page comes in from the
// right, and one page for another. With reduced motion it's instant.
export const slideX = (node, { from, unit = 'vw', duration, delay = 0 }) => {
	const at = (t) => `${(1 - t) * from}${unit} 0`;

	return { delay, duration: reducedMotion() ? 0 : duration, easing: cubicInOut, css: (t) => `translate: ${at(t)};` };
};

// A push within the page, by its width, so whatever slides is off it (and clipped) at either end: `way` 1 for on, the
// new one coming in from the right, -1 for back. Spread into an in: and an out: of slideX.
export const pushIn = (way, duration) => ({ from: way * DX, unit: 'px', duration });
export const pushOut = (way, duration) => ({ from: -way * DX, unit: 'px', duration });
