import adapter from '@sveltejs/adapter-static';

// Set by scripts/build-itch.js to its output folder: the itch.io build goes there, without a service worker
const itch = process.env.ITCH;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// runes mode for the project, not for libraries
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: itch ? adapter({ pages: itch, assets: itch }) : adapter(),
		serviceWorker: { register: !itch }
	}
};

export default config;
