import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: { port: 1130, strictPort: true },
	test: { include: ['src/**/*.test.js'], environment: 'node' }
});
