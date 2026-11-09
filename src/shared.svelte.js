import { APP_STATE, MAX_STRIKES, RESET_SLIDE_MS, SIZES, TASKS_PER_LEVEL } from './const';
import { applyMove, badPairs, geometry, levelInfo, makePuzzle, mod, moveText, ok, points } from './logic';
import { setMusic, setSound, sfx, startMusic } from './sound';
import { reducedMotion, tween } from './utils';

const KEY = APP_STATE;

/** Settings and records that persist; loadSettings fills them in from the save. */
export const app = $state({
	page: 'home',
	mode: 'practice',
	size: '4x5',
	sound: true,
	music: true,
	// Challenge's record, of shows that have ended: how many, their applause in all, the best, the furthest act
	stats: newStats()
});

export function newStats() {
	return { shows: 0, total: 0, best: 0, furthest: 0 };
}

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
	app.size = SIZES[saved.size] ? saved.size : '4x5';
	app.sound = saved.sound !== false;
	app.music = saved.music !== false;
	// saved per rule while there were two: the rank gap's carries over
	app.stats = { ...newStats(), ...saved.stats };
	// from before the stats: the best score alone (kept per rule while there were two: the rank gap's carries over)
	if (!saved.stats && saved.best) app.stats.best = typeof saved.best === 'number' ? saved.best : saved.best.gap || 0;
	setSound(app.sound);
	setMusic(app.music, false);
}

export function save() {
	try {
		localStorage.setItem(KEY, JSON.stringify({ size: app.size, sound: app.sound, music: app.music, stats: app.stats }));
	} catch {
		// storage can be unavailable (private mode); settings then last for the session
	}
}

/**
 * The puzzle and the run. phase: ready | play | wrong | solved | failed | revealed | over.
 * wrong: a shift that left clashes, awaiting Reset; failed: a challenge trick lost to the clock.
 * paused: a saved game come back to, waiting for Resume (its board face down): { clock } (whether its clock was
 * running), or false.
 */
export const game = $state({
	// counts the puzzles dealt: a new one pushes the old off the table
	deal: 0,
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
	paused: false,
	practice: { solved: 0, played: 0 },
	run: { level: 1, tasks: 0, strikes: 0, score: 0, solved: 0, pendingLevel: false, newBest: false }
});

/** The lane being moved: axis row | col | null, its index, its offset in board px; user: moved by the player (a drag
 *  or the keys), not by Reset or Reveal, so the board shows where it started. */
export const lane = $state({ axis: null, idx: 0, d: 0, steps: 0, answer: false, user: false });

export const geo = () => geometry(game.R, game.C);
export const pitch = (axis) => (axis === 'row' ? geo().p : geo().pY);
export const laneLen = (axis) => (axis === 'row' ? game.C : game.R);
export const levelSecs = () => levelInfo(game.run.level).secs;
export const clashes = () => badPairs(game.grid, game.R, game.C, ok);
export const canMove = () => game.phase === 'play' && !game.busy && !game.paused && (app.mode === 'practice' || game.running);

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
	const { puzzle, solutions } = makePuzzle(game.R, game.C);
	game.puzzle = puzzle;
	game.grid = puzzle.slice();
	game.solutions = solutions;
	game.reviewing = false;
	game.paused = false;
	game.deal++;
	clearLane();
}

/** To the game in Practice: the puzzle saved there, waiting for Resume, or else a new one. */
export function startPractice() {
	startMusic();
	stopTimer();
	app.mode = 'practice';
	app.page = 'game';
	const saved = loadGame();
	if (saved?.tally) game.practice = saved.tally;
	if (restore(saved)) sfx.tap();
	else newDeal();
}

export function newDeal() {
	if (game.busy) return;
	deal();
	game.phase = 'play';
	game.practice.played++;
	say('One lane is off. Slide it back.');
	sfx.deal();
}

/** To the game in Challenge: the run saved there, waiting for Resume, or else a new one. */
export function startChallenge() {
	startMusic();
	stopTimer();
	app.mode = 'challenge';
	app.page = 'game';
	if (!restore(loadGame())) newRun();
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

// ---------- saving the game, and coming back to it ----------

// Each mode's game is saved under a key of its own as it goes (see the Game Page), on Back, and when the app is hidden,
// so it can be come back to, after a restart too: the puzzle and where it stands, the clock's time used and whether it
// was running, the shift Reset would undo, and the mode's tally (Practice) or run
// (Challenge).
const gameKey = () => `${APP_STATE} • ${app.mode}`;
const TABLE = ['R', 'C', 'grid', 'puzzle', 'solutions', 'phase', 'msg', 'left', 'showClashes', 'reviewing'];

/** Saves the game of the mode being played; `clock`, whether its clock is running (or was, before it paused). */
export function saveGame(clock = running || !!game.paused?.clock) {
	if (!game.puzzle.length) return;
	const table = {};
	for (const k of TABLE) table[k] = $state.snapshot(game[k]);
	const tally = $state.snapshot(app.mode === 'practice' ? game.practice : game.run);
	try {
		localStorage.setItem(gameKey(), JSON.stringify({ table, tally, elapsed: elapsedMs(), clock, wrongMove }));
	} catch {
		// storage unavailable: the game lasts as long as the page
	}
}

function loadGame() {
	try {
		return JSON.parse(localStorage.getItem(gameKey()));
	} catch {
		return null;
	}
}

/** Puts a saved game back, if there's one to go back to: a puzzle under way in Practice (not solved or revealed), a run
 *  not over in Challenge. It waits for Resume, its board face down and its
 *  clock stopped, unless it's at an act's panel, which is a prompt of its own. Whether it did. */
function restore(saved) {
	const live = app.mode === 'practice' ? ['play', 'wrong'] : ['ready', 'play', 'wrong', 'solved', 'failed', 'revealed'];
	// (a game saved under the dropped suit-or-rank rule isn't brought back)
	if (!saved?.table || (saved.rule && saved.rule !== 'gap') || !live.includes(saved.table.phase)) return false;
	clearLane();
	Object.assign(game, saved.table, { busy: false, flash: '' });
	if (app.mode === 'challenge') game.run = saved.tally;
	elapsed = saved.elapsed;
	wrongMove = saved.wrongMove;
	game.paused = game.phase === 'ready' ? false : { clock: saved.clock };
	return true;
}

/** Turns a game come back to face up, and its clock on from where it stopped. */
export function resume() {
	if (!game.paused) return;
	const { clock } = game.paused;
	game.paused = false;
	sfx.deal();
	if (clock) resumeTimer();
}

export function goHome() {
	const clock = running || !!game.paused?.clock;
	stopTimer();
	saveGame(clock);
	clearLane();
	game.busy = false;
	game.paused = false;
	app.page = 'home';
}

// whether an animation that was started on this puzzle may still finish it: not once the player has left it
const stillOn = (puzzle) => app.page === 'game' && game.puzzle === puzzle;

function taskDone() {
	const r = game.run;
	r.tasks++;
	if (r.strikes >= MAX_STRIKES) {
		game.phase = 'over';
		const st = app.stats;
		st.shows++;
		st.total += r.score;
		st.furthest = Math.max(st.furthest, r.level);
		if (r.score > st.best) {
			st.best = r.score;
			r.newBest = true;
		}
		save();
		return true;
	}
	if (r.tasks % TASKS_PER_LEVEL === 0) r.pendingLevel = true;
	return false;
}

function commit(m) {
	game.grid = applyMove(game.grid, game.R, game.C, m);
	const bad = clashes().length;
	if (bad === 0) onSolved(m);
	else onWrong(bad, m);
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

// A wrong shift: the board waits for Reset. In a challenge it's a strike, and the clock stops till then; the third
// strike ends the run.
// the wrong shift, for Reset to slide back
let wrongMove = null;

function onWrong(n, m) {
	wrongMove = m;
	stopTimer();
	sfx.lose();
	flash('lost');
	const clash = `Oh, shift! That leaves ${n} clash${n > 1 ? 'es' : ''}.`;
	if (app.mode === 'challenge') {
		game.run.strikes++;
		if (game.run.strikes >= MAX_STRIKES) {
			taskDone();
			say(clash, 'bad');
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
	sfx.timeUp();
	flash('lost');
	strike("Time's up.");
}

function strike(reason) {
	game.run.strikes++;
	const over = taskDone();
	if (!over) game.phase = 'failed';
	say(reason, 'bad');
}

/** After a wrong shift: the board as dealt, to try again; a challenge's clock runs on from where it stopped. */
const sameGrid = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);

/** Slides the wrong shift's lane back where it was dealt, the shortest way: back by what it moved, or on round the rest
 *  of the lane if that's less. Then the board is the puzzle again, and `then` runs (unless the player left meanwhile).
 *  Keeps the board busy throughout. */
function slideBack(then) {
	const m = wrongMove;
	const n = laneLen(m.axis);
	const back = m.steps > n / 2 ? n - m.steps : -m.steps;
	const puzzle = game.puzzle;
	game.busy = true;
	Object.assign(lane, { axis: m.axis, idx: m.idx, d: 0, steps: 0, answer: false });
	tween(0, back * pitch(m.axis), RESET_SLIDE_MS, (v) => (lane.d = v), () => {
		// left for Home, or dealt anew, meanwhile
		if (!stillOn(puzzle)) {
			game.busy = false;
			return;
		}
		clearLane();
		game.grid = puzzle.slice();
		then();
	});
}

export function reset() {
	if (game.busy || game.phase !== 'wrong') return;
	slideBack(() => {
		game.busy = false;
		game.phase = 'play';
		if (app.mode === 'challenge') {
			say('Back as it was. The clock runs on.');
			resumeTimer();
		} else {
			say('Back as it was. Try again.');
		}
	});
}

export function review() {
	game.reviewing = true;
}

export function showAnswer() {
	if (game.busy || !game.solutions.length) return;
	const m = game.solutions[0];
	const n = laneLen(m.axis);
	const steps = m.steps > n / 2 ? m.steps - n : m.steps;
	const puzzle = game.puzzle;
	// the board has just shown the move: the message doesn't spell it out
	const told = () => say("That's the trick.");
	// already showing the answer (Reveal again, on the final curtain's board): nothing to move
	if (sameGrid(game.grid, applyMove(puzzle, game.R, game.C, m))) return told();
	// a wrong shift on the board (the last strike's): it slides back first, rather than snapping
	if (wrongMove && sameGrid(game.grid, applyMove(puzzle, game.R, game.C, wrongMove))) return slideBack(() => slideAnswer(m, steps, puzzle, told));
	game.grid = puzzle.slice();
	game.busy = true;
	slideAnswer(m, steps, puzzle, told);
}

/** After a moment, slides the answer's lane from the puzzle to solved. */
function slideAnswer(m, steps, puzzle, told) {
	setTimeout(
		() => {
			if (!stillOn(puzzle)) return;
			Object.assign(lane, { axis: m.axis, idx: m.idx, d: 0, steps: 0, answer: true });
			tween(0, steps * pitch(m.axis), 650, (v) => (lane.d = v), () => {
				if (!stillOn(puzzle)) return;
				clearLane();
				game.grid = applyMove(game.grid, game.R, game.C, m);
				game.busy = false;
				if (game.phase !== 'over') game.phase = 'revealed';
				told();
			});
		},
		reducedMotion() ? 0 : 250
	);
}

// ---------- moving a lane ----------

export function clearLane() {
	Object.assign(lane, { axis: null, idx: 0, d: 0, steps: 0, answer: false, user: false });
}

/** Begins dragging a lane. */
export function grab(axis, idx) {
	Object.assign(lane, { axis, idx, d: 0, steps: 0, answer: false, user: true });
}

/** Snaps the lane to the nearest whole shift and commits it, unless it ends where it began. */
export function settle() {
	if (!lane.axis || game.busy) return;
	const { axis, idx, d } = lane;
	const P = pitch(axis);
	const steps = Math.round(d / P);
	const puzzle = game.puzzle;
	game.busy = true;
	tween(d, steps * P, 140, (v) => (lane.d = v), () => {
		if (!stillOn(puzzle)) return;
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
	if (mod(lane.steps, laneLen(axis)) === 0) sfx.home();
	else sfx.tick();
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

/** Turning the effects on clicks, as they come back; turning them off is silent. */
export function toggleSound() {
	app.sound = !app.sound;
	setSound(app.sound);
	save();
	if (app.sound) sfx.tap();
}

/** Challenge's record, from scratch (a show under way counts when it ends). */
export function resetStats() {
	app.stats = newStats();
	save();
}

/** Practice's tally, from scratch; a puzzle under way still counts as played. */
export function resetPractice() {
	game.practice = { solved: 0, played: ['play', 'wrong'].includes(game.phase) ? 1 : 0 };
}

export function toggleMusic() {
	app.music = !app.music;
	setMusic(app.music);
	save();
}

export function setSize(size) {
	if (game.busy || size === app.size) return;
	app.size = size;
	save();
	newDeal();
}
