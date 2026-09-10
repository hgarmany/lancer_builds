import { defineConfig } from 'vite';

export default defineConfig({
	base: '/lancer-roadmap/',
	server: {
		watch: {
			ignored: ['**/.vs/**']
		}
	}
});