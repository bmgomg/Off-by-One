// The itch.io screenshots, 900 × 1600 (the 450 × 800 page at twice the size), from the real game in headless Chrome, with
// a throwaway profile, after Dark Matter's: node scripts/render-screenshots.mjs [output folder]
// Needs the dev server (npm run dev), since it reads the puzzles' answers through the store's source module, and Node 22
// or later. It drags the lanes with the mouse, as a player would. The puzzles are random: look at the results, and run
// it again for others.
//   1-play.png          Challenge, mid-drag: the answer's lane short of home, the card it was taken by lifted
//   2-act.png           the Act 1 panel, over the face-down cards
//   3-win.png           that trick solved, the felt glowing
//   4-home.png          Home
//   5-practice.png      Practice at 5×5, with Clashes on
//   6-final-curtain.png the rest of act 1 and a trick of act 2 solved, then three wrong shifts
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(HERE, '../itch/screenshots'));
const GAME = process.env.GAME ?? 'http://localhost:1130/';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9336;
// tricks solved in act 2 before the three wrong shifts
const ACT2_SOLVES = 1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
	await fetch(GAME);
} catch {
	console.error(`no game at ${GAME}: start it with npm run dev`);
	process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'screenshots-'));
const chrome = spawn(CHROME, [
	'--headless=new',
	`--remote-debugging-port=${PORT}`,
	`--user-data-dir=${profile}`,
	'--window-size=450,800',
	'--no-first-run',
	'about:blank'
]);

let target;

for (let i = 0; i < 40 && !target; i++) {
	await sleep(250);

	try {
		const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
		target = list.find((t) => t.type === 'page');
	} catch {
		// not up yet
	}
}

if (!target) {
	chrome.kill();
	console.error('Chrome did not start');
	process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
const problems = [];

ws.onmessage = (m) => {
	const d = JSON.parse(m.data);

	if (d.id) {
		pending.get(d.id)?.(d.result ?? d);
		pending.delete(d.id);
	} else if (d.method === 'Runtime.exceptionThrown') {
		problems.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
	}
};

const send = (method, params = {}) =>
	new Promise((r) => {
		pending.set(++id, r);
		ws.send(JSON.stringify({ id, method, params }));
	});

const evaluate = async (expression) => {
	const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });

	if (r.exceptionDetails) {
		throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
	}

	return r.result?.value;
};

const shot = async (name) => {
	const { data } = await send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
	console.log(name);
};

// the centre of the deepest visible element with exactly this text, ignoring case
const centre = (text) =>
	evaluate(`(() => {
		const all = [...document.querySelectorAll('button, label, div, span')];
		const el = all.filter((e) => e.textContent.trim().toLowerCase() === ${JSON.stringify(text)} && e.getBoundingClientRect().width > 0).pop();
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	})()`);

const mouse = (type, x, y) =>
	send('Input.dispatchMouseEvent', {
		type,
		x,
		y,
		button: type === 'mouseMoved' ? 'none' : 'left',
		buttons: type === 'mouseReleased' ? 0 : 1,
		clickCount: 1
	});

const click = async (text) => {
	const p = await centre(text);

	if (!p) {
		throw new Error(`no "${text}" on the page`);
	}

	await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'none' });
	await mouse('mousePressed', p.x, p.y);
	await mouse('mouseReleased', p.x, p.y);
};

// the mouse out of the way, off the buttons' hover
const park = () => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 225, y: 2, button: 'none' });

// waits for something on the page to be true, or gives up, saying where the game stood
const until = async (expression, ms = 8000) => {
	for (let t = 0; t < ms; t += 100) {
		if (await evaluate(expression)) return;
		await sleep(100);
	}

	const state = await evaluate('JSON.stringify({ phase: __s.game.phase, busy: __s.game.busy, msg: __s.game.msg.text, run: __s.game.run })');
	throw new Error(`timed out waiting for ${expression}: ${state}`);
};

const ready = () => until('__s.game.phase === "play" && !__s.game.busy');

// Presses on a lane (axis row or col, its index) and drags it by `cards` (a card's pitch each, + right or down), in small
// steps. Lets go there, or with `hold`, stops `hold` cards short and returns the rest of the move. It takes the lane by
// its card at the end the move leaves from, so the pointer stays on the board: past the window's edge, Chrome drops the
// mouse's moves and the letting go.
const drag = async (axis, idx, cards, hold = 0) => {
	const b = await evaluate(`(() => {
		// the incoming board, if the last deal's is still on its way out
		const r = [...document.querySelectorAll('.board')].pop().getBoundingClientRect();
		const g = __s.geo(), s = r.width / g.W;
		const row = ${JSON.stringify(axis)} === 'row';
		const k = ${cards} > 0 ? 0 : (row ? __s.game.C : __s.game.R) - 1;
		const [y, x] = row ? [${idx}, k] : [k, ${idx}];
		return { x: r.left + (x + 0.5) * g.p * s, y: r.top + (y + 0.5) * g.pY * s, P: (row ? g.p : g.pY) * s };
	})()`);
	const at = (n) => (axis === 'row' ? [b.x + n * b.P, b.y] : [b.x, b.y + n * b.P]);
	const stop = cards - Math.sign(cards) * hold;

	await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'none' });
	await mouse('mousePressed', b.x, b.y);

	for (let i = 1; i <= 16; i++) {
		await mouse('mouseMoved', ...at((stop * i) / 16));
		await sleep(25);
	}

	const finish = async () => {
		for (let i = 1; i <= 6; i++) {
			await mouse('mouseMoved', ...at(stop + ((cards - stop) * i) / 6));
			await sleep(25);
		}

		await mouse('mouseReleased', ...at(cards));
	};

	if (!hold) {
		await mouse('mouseReleased', ...at(cards));
	}

	return finish;
};

// the answer's lane and its shortest shift, in cards (+ right or down)
const answer = async () => {
	const { m, n } = await evaluate('(() => { const m = __s.game.solutions[0]; return { m: { ...m }, n: __s.laneLen(m.axis) }; })()');
	return { axis: m.axis, idx: m.idx, cards: m.steps > n / 2 ? m.steps - n : m.steps };
};

// a trick solved with its answer
const solve = async () => {
	const a = await answer();
	await drag(a.axis, a.idx, a.cards);
	await until('__s.game.phase === "solved" && !__s.game.busy');
};

// a shift that leaves clashes: one card along a lane that no answer moves by one card that way
const wrongMove = () =>
	evaluate(`(() => {
		const { game } = __s;
		for (const axis of ['row', 'col'])
			for (let idx = 0; idx < (axis === 'row' ? game.R : game.C); idx++)
				if (!game.solutions.some((s) => s.axis === axis && s.idx === idx && s.steps === 1)) return { axis, idx };
		return null;
	})()`);

try {
	await send('Page.enable');
	await send('Runtime.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: 450, height: 800, deviceScaleFactor: 2, mobile: false });
	await send('Page.navigate', { url: GAME });

	// a cold dev server's first load, then the splash (which isn't touched: a tap on it wipes the saves)
	for (let i = 0; i < 120 && !(await centre('challenge')); i++) {
		await sleep(500);
	}

	await evaluate('document.fonts.ready.then(() => true)');
	await sleep(1200);
	await park();
	await shot('4-home.png');

	// the store as the page has it: the dev server may have added ?t= to the module's URL, and a plain import would be
	// another copy, with no puzzle in it
	const store = await evaluate('performance.getEntriesByType("resource").map((e) => e.name).find((n) => /shared\\.svelte/.test(n))');
	await evaluate(`import(${JSON.stringify(store)}).then((s) => { window.__s = s; })`);

	await click('challenge');
	await until('__s.game.phase === "ready"');
	await sleep(1200);
	await park();
	await shot('2-act.png');

	// Curtain up, past the cards' flip, and a few seconds off the clock
	await click('curtain up');
	await sleep(6000);

	const a = await answer();
	const home = await drag(a.axis, a.idx, a.cards, 0.4);
	await sleep(400);
	// just before the clock's next tick, so its seconds aren't caught mid-roll
	await until('__s.game.left % 1000 > 100 && __s.game.left % 1000 < 300', 2000);
	await shot('1-play.png');

	// the rest of the way home, and let go
	await home();
	await until('__s.game.phase === "solved"');
	await park();
	await sleep(450);
	await shot('3-win.png');

	// the rest of act 1, quickly
	await until('!__s.game.busy');

	while (!(await evaluate('__s.game.run.pendingLevel'))) {
		await click('next trick');
		await ready();
		await sleep(500);
		await solve();
		await sleep(300);
	}

	// Act 2's panel, Continue, and a trick or so solved there
	await click('next trick');
	await until('__s.game.phase === "ready"');
	await sleep(800);
	await click('continue');
	await ready();
	await sleep(1000);

	for (let i = 0; i < ACT2_SOLVES; i++) {
		await solve();
		await sleep(300);
		await click('next trick');
		await ready();
		await sleep(800);
	}

	// three wrong shifts, each Reset but the last
	for (let strike = 1; strike <= 3; strike++) {
		const w = await wrongMove();
		await drag(w.axis, w.idx, 1);
		await until('["wrong", "over"].includes(__s.game.phase) && !__s.game.busy');
		await sleep(600);

		if (strike < 3) {
			await click('reset');
			await ready();
			await sleep(300);
		}
	}

	await until('__s.game.phase === "over"');
	await park();
	await sleep(900);
	await shot('6-final-curtain.png');

	await click('back');
	await sleep(900);
	await click('practice');
	await until('__s.game.phase === "play"');
	await sleep(600);
	await click('5×5');
	await sleep(900);
	await click('clashes');
	await park();
	await sleep(700);
	await shot('5-practice.png');

	if (problems.length) {
		console.error('page errors', JSON.stringify(problems));
		process.exitCode = 1;
	}
} catch (e) {
	console.error(e.message);
	process.exitCode = 1;
} finally {
	ws.close();
	chrome.kill();
	await sleep(500);

	try {
		rmSync(profile, { recursive: true, force: true });
	} catch {
		// Chrome hasn't let go yet: it's only a temp folder
	}
}

process.exit();
