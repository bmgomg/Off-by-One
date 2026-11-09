import { APP_STATE, MAX_STRIKES, SIZES, TASKS_PER_LEVEL } from './const';
import { RULES, applyMove, badPairs, geometry, levelInfo, makePuzzle, mod, moveText, points } from './logic';
import { setSound, sfx } from './sound';
import { reducedMotion, tween } from './utils';

const KEY = APP_STATE;

/** Settings and records that persist; loadSettings fills them in from the save. */
export const app = $state({
	page: 'home',
	mode: 'practice',
	rule: 'gap',
	size: '4x5',
	sound: true,
	best: {}
});

// Called once Home is up, after the splash, so a tap on the splash (which wipes the save) comes first.
let loaded = false;

export function loadSettings() {
	if (loaded) return;
	loaded = true;
	let saved = {};
	try {
		saved = JSON.parse(localStorage.getItem(KEY)) || {};
	} catch {
		// nothing saved, or storage unavailable
	}
	app.rule = RULES[saved.rule] ? saved.rule : 'gap';
	app.size = SIZES[saved.size] ? saved.size : '4x5';
	app.sound = saved.sound !== false;
	app.best = saved.best || {};
	setSound(app.sound);
}

export function save() {
	try {
		localStorage.setItem(KEY, JSON.stringify({ rule: app.rule, size: app.size, sound: app.sound, best: app.best }));
	} catch {
		// storage can be unavailable (private mode); settings then last for the session
	}
}

/**
 * The puzzle and the run. phase: ready | play | wrong | solved | failed | revealed | over.
 * wrong: a shift that left clashes, awaiting Reset; failed: a challenge trick lost to the clock.
 */
export const game = $state({
	R: 4,
	C: 5,
	grid: [],
	puzzle: [],
	solutions: [],
	phase: 'play',
	msg: { text: '', tone: '' },
	busy: false,
	running: false,
	left: 0,
	showClashes: false,
	reviewing: false,
	flash: '',
	practice: { solved: 0, played: 0 },
	run: { level: 1, tasks: 0, strikes: 0, score: 0, solved: 0, pendingLevel: false, newBest: false }
});

/** The lane being moved: axis row | col | null, its index, its offset in board px. */
export const lane = $state({ axis: null, idx: 0, d: 0, steps: 0, answer: false });

export const ok = (a, b) => RULES[app.rule].ok(a, b);
export const geo = () => geometry(game.R, game.C);
export const pitch = (axis) => (axis === 'row' ? geo().p : geo().pY);
export const laneLen = (axis) => (axis === 'row' ? game.C : game.R);
export const levelSecs = () => levelInfo(game.run.level).secs;
export const clashes = () => badPairs(game.grid, game.R, game.C, ok);
export const canMove = () => game.phase === 'play' && !game.busy && (app.mode === 'practice' || game.running);

const say = (text, tone = '') => {
	game.msg = { text, tone };
};

const flash = (kind) => {
	game.flash = kind;
	setTimeout(() => (game.flash = ''), 900);
};

// ---------- timer ----------

let running = false;
let runStart = 0;
let elapsed = 0;

const elapsedMs = () => elapsed + (running ? performance.now() - runStart : 0);

function startTimer() {
	elapsed = 0;
	running = true;
	game.running = true;
	runStart = performance.now();
	requestAnimationFrame(frame);
}

// on from where it stopped, after a Reset
function resumeTimer() {
	running = true;
	game.running = true;
	runStart = performance.now();
	requestAnimationFrame(frame);
}

function stopTimer() {
	if (!running) return;
	elapsed += performance.now() - runStart;
	running = false;
	game.running = false;
}

function frame() {
	if (!running) return;
	const left = levelSecs() * 1000 - elapsedMs();
	game.left = Math.max(0, left);
	if (left <= 0) {
		onTimeout();
		return;
	}
	requestAnimationFrame(frame);
}

// ---------- flow ----------

function deal() {
	const size = app.mode === 'challenge' ? levelInfo(game.run.level).size : app.size;
	[game.R, game.C] = SIZES[size];
	const { puzzle, solutions } = makePuzzle(game.R, game.C, app.rule);
	game.puzzle = puzzle;
	game.grid = puzzle.slice();
	game.solutions = solutions;
	game.reviewing = false;
	clearLane();
}

export function startPractice() {
	stopTimer();
	app.mode = 'practice';
	app.page = 'game';
	newDeal();
}

export function newDeal() {
	if (game.busy) return;
	deal();
	game.phase = 'play';
	game.practice.played++;
	say('One lane is off. Slide it back.');
	sfx.deal();
}

export function startChallenge() {
	app.mode = 'challenge';
	app.page = 'game';
	newRun();
}

export function newRun() {
	stopTimer();
	game.run = { level: 1, tasks: 0, strikes: 0, score: 0, solved: 0, pendingLevel: false, newBest: false };
	deal();
	game.left = levelSecs() * 1000;
	game.phase = 'ready';
	say('');
}

export function startPlay() {
	game.phase = 'play';
	say('One lane is off. Slide it back.');
	sfx.deal();
	startTimer();
}

export function next() {
	if (game.busy) return;
	if (app.mode === 'practice') return newDeal();
	if (game.run.pendingLevel) {
		game.run.pendingLevel = false;
		game.run.level++;
		game.run.strikes = 0;
		deal();
		game.left = levelSecs() * 1000;
		game.phase = 'ready';
		say('');
		sfx.fanfare();
		return;
	}
	deal();
	startPlay();
}

export function goHome() {
	stopTimer();
	clearLane();
	game.busy = false;
	app.page = 'home';
}

function taskDone() {
	const r = game.run;
	r.tasks++;
	if (r.strikes >= MAX_STRIKES) {
		game.phase = 'over';
		if (r.score > (app.best[app.rule] || 0)) {
			app.best[app.rule] = r.score;
			r.newBest = true;
			save();
		}
		return true;
	}
	if (r.tasks % TASKS_PER_LEVEL === 0) r.pendingLevel = true;
	return false;
}

function commit(m) {
	game.grid = applyMove(game.grid, game.R, game.C, m);
	const bad = clashes().length;
	if (bad === 0) onSolved(m);
	else onWrong(bad);
}

function onSolved(m) {
	stopTimer();
	sfx.win();
	flash('won');
	if (app.mode === 'practice') {
		game.practice.solved++;
		game.phase = 'solved';
		say(`Bravo. That was ${moveText(m, game.R, game.C)}.`, 'good');
		return;
	}
	const secs = Math.round(elapsedMs() / 1000);
	const left = Math.max(0, levelSecs() - secs);
	const pts = points(left, game.run.level);
	game.run.score += pts;
	game.run.solved++;
	game.phase = 'solved';
	taskDone();
	say(`Bravo. ${left}s left × level ${game.run.level} = +${pts}`, 'good');
}

const othersText = () => {
	const k = game.solutions.length - 1;
	return k > 0 ? ` (or ${k} other${k > 1 ? 's' : ''})` : '';
};

// A wrong shift: the board waits for Reset. In a challenge it's a strike, and the clock stops till then; the third
// strike ends the run.
function onWrong(n) {
	stopTimer();
	sfx.lose();
	flash('lost');
	const clash = `That leaves ${n} clash${n > 1 ? 'es' : ''}.`;
	if (app.mode === 'challenge') {
		game.run.strikes++;
		if (game.run.strikes >= MAX_STRIKES) {
			taskDone();
			say(`${clash} One fix: ${moveText(game.solutions[0], game.R, game.C)}${othersText()}.`, 'bad');
			return;
		}
		say(`${clash} That's a strike.`, 'bad');
	} else {
		say(clash, 'bad');
	}
	game.phase = 'wrong';
}

function onTimeout() {
	stopTimer();
	clearLane();
	game.busy = false;
	sfx.lose();
	flash('lost');
	strike("Time's up.");
}

function strike(reason) {
	game.run.strikes++;
	const over = taskDone();
	if (!over) game.phase = 'failed';
	say(`${reason} One fix: ${moveText(game.solutions[0], game.R, game.C)}${othersText()}.`, 'bad');
}

/** After a wrong shift: the board as dealt, to try again; a challenge's clock runs on from where it stopped. */
export function reset() {
	if (game.busy || game.phase !== 'wrong') return;
	game.grid = game.puzzle.slice();
	game.phase = 'play';
	if (app.mode === 'challenge') {
		say('Back as it was. The clock runs on.');
		resumeTimer();
	} else {
		say('Back as it was. You still get one shift.');
	}
}

export function review() {
	game.reviewing = true;
}

export function showAnswer() {
	if (game.busy || !game.solutions.length) return;
	const m = game.solutions[0];
	const n = laneLen(m.axis);
	const steps = m.steps > n / 2 ? m.steps - n : m.steps;
	game.grid = game.puzzle.slice();
	game.busy = true;
	setTimeout(
		() => {
			Object.assign(lane, { axis: m.axis, idx: m.idx, d: 0, steps: 0, answer: true });
			tween(0, steps * pitch(m.axis), 650, (v) => (lane.d = v), () => {
				clearLane();
				game.grid = applyMove(game.grid, game.R, game.C, m);
				game.busy = false;
				if (game.phase !== 'over') game.phase = 'revealed';
				say(`The trick: ${moveText(m, game.R, game.C)}${othersText()}.`);
			});
		},
		reducedMotion() ? 0 : 250
	);
}

// ---------- moving a lane ----------

export function clearLane() {
	Object.assign(lane, { axis: null, idx: 0, d: 0, steps: 0, answer: false });
}

/** Begins dragging a lane. */
export function grab(axis, idx) {
	Object.assign(lane, { axis, idx, d: 0, steps: 0, answer: false });
}

/** Snaps the lane to the nearest whole shift and commits it, unless it ends where it began. */
export function settle() {
	if (!lane.axis || game.busy) return;
	const { axis, idx, d } = lane;
	const P = pitch(axis);
	const steps = Math.round(d / P);
	game.busy = true;
	tween(d, steps * P, 140, (v) => (lane.d = v), () => {
		clearLane();
		game.busy = false;
		const s = mod(steps, laneLen(axis));
		if (s && game.phase === 'play') commit({ axis, idx, steps: s });
	});
}

/** Keyboard: slides the chosen lane one step further; false if another lane is already moving. */
export function nudge(axis, idx, dir) {
	if (!canMove()) return false;
	if (lane.axis && (lane.axis !== axis || lane.idx !== idx)) return false;
	if (!lane.axis) grab(axis, idx);
	const from = lane.d;
	lane.steps += dir;
	sfx.tick();
	game.busy = true;
	tween(from, lane.steps * pitch(axis), 110, (v) => (lane.d = v), () => (game.busy = false));
	return true;
}

export function cancelLane() {
	if (!lane.axis || game.busy) return;
	game.busy = true;
	tween(lane.d, 0, 140, (v) => (lane.d = v), () => {
		clearLane();
		game.busy = false;
	});
}

export function toggleSound() {
	app.sound = !app.sound;
	setSound(app.sound);
	save();
	if (app.sound) sfx.tick();
}

export function setRule(rule) {
	app.rule = rule;
	save();
}

export function setSize(size) {
	if (game.busy || size === app.size) return;
	app.size = size;
	save();
	newDeal();
}
