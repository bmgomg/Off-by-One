// Small synthesized effects; the audio context starts on the first tap or key, as browsers require.
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
	g.gain.setValueAtTime(vol, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g).connect(ac.destination);
	o.start(t);
	o.stop(t + dur + 0.02);
}

export const sfx = {
	tick: () => tone(2100, 0.025, 'square', 0.018),
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
