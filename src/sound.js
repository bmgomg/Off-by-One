// Small synthesized effects; the audio context starts on the first tap or key, as browsers require.
// And the music, Race the Ace's track, managed as in Dark Matter: see the end.
import { Howl } from 'howler/dist/howler.core.min';
import track from '$lib/sounds/music.mp3';

// All the effects' volumes are scaled by this, keeping their balance: 3 is about 9.5 dB up from the levels below, which
// were too quiet beside the music. The loudest moment (the fanfare's overlapping notes) stays near 0.4, clear of
// clipping at 1.
const SFX_VOLUME = 3;

let ac = null;
let enabled = true;

export const setSound = (on) => {
	enabled = on;
};

export function wakeAudio() {
	if (!ac) {
		try {
			ac = new (window.AudioContext || window.webkitAudioContext)();
		} catch {
			ac = null;
		}
	}
	if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

function tone(freq, dur, type = 'sine', vol = 0.06, when = 0) {
	if (!enabled || !ac) return;
	const t = ac.currentTime + when;
	const o = ac.createOscillator();
	const g = ac.createGain();
	o.type = type;
	o.frequency.value = freq;
	g.gain.setValueAtTime(vol * SFX_VOLUME, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g).connect(ac.destination);
	o.start(t);
	o.stop(t + dur + 0.02);
}

export const sfx = {
	tick: () => tone(2100, 0.025, 'square', 0.018),
	// a button press whose action has no sound of its own: a soft, short click
	tap: () => {
		tone(1600, 0.03, 'triangle', 0.035);
		tone(1050, 0.04, 'triangle', 0.02, 0.012);
	},
	// a checkbox: two notes, up when ticked, down when not
	toggle: (on) => {
		tone(on ? 740 : 990, 0.04, 'triangle', 0.035);
		tone(on ? 990 : 740, 0.05, 'triangle', 0.03, 0.045);
	},
	// a moving lane passing back through where it started: softer and lower than a step's tick, two notes up
	home: () => {
		tone(880, 0.05, 'triangle', 0.05);
		tone(1320, 0.08, 'triangle', 0.04, 0.035);
	},
	deal: () => {
		for (let i = 0; i < 5; i++) tone(700 + i * 110, 0.035, 'triangle', 0.03, i * 0.045);
	},
	win: () => {
		tone(523, 0.18, 'triangle', 0.08);
		tone(784, 0.3, 'triangle', 0.08, 0.12);
	},
	lose: () => {
		tone(196, 0.28, 'sawtooth', 0.04);
		tone(147, 0.35, 'sawtooth', 0.035, 0.12);
	},
	fanfare: () => {
		[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.11));
	}
};

// ---------- music ----------

// As in Dark Matter: the loop starts on the first Practice or Challenge (a tap, which browsers ask before sound), and
// then keeps playing, only its volume changing. It fades up from silence whenever it starts or comes back (Music On,
// back in the window); it goes quiet at once (Music Off, out of the window).
const MUSIC_VOLUME = 0.3;
const MUSIC_FADE_MS = 5000;

// Silent until it plays: Howler queues calls made before the file has loaded, and a queued fade would hold up a queued
// "off" till it ended, so the first fade waits for the first play event (the only one: Howler emits another at every
// rewind of the loop, which mustn't fade).
const loop = new Howl({ src: [track], loop: true, volume: 0 });

let musicOn = true;
let away = false;
let started = false;

const level = () => {
	if (musicOn && !away) loop.fade(0, MUSIC_VOLUME, MUSIC_FADE_MS);
	else loop.volume(0);
};

const relevel = () => {
	if (started && loop.playing()) level();
};

/** Starts the loop, the first time, if music is on. */
export function startMusic() {
	if (started || !musicOn) return;
	started = true;
	loop.once('play', level);
	loop.play();
}

/** Music On or Off (the setting). Turned on, it starts if it hasn't yet, unless `start` is false (the saved setting
 *  read at load, before any tap: the first Practice or Challenge starts it then). */
export function setMusic(on, start = true) {
	musicOn = on;
	if (on && !started) {
		if (start) startMusic();
	} else relevel();
}

/** Out of the window, or back in it. */
export function setAway(isAway) {
	if (away === isAway) return;
	away = isAway;
	relevel();
}
