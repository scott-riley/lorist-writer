import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			adapter: adapter(),
			experimental: {
				remoteFunctions: true
			}
		})
	]
});
