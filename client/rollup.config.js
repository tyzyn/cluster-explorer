import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'static/svelte/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'static/js/bundle.js'
	},
	plugins: [
		svelte({
						include: 'static/svelte/*.svelte',
						css: css => { css.write('static/css/bundle.css'); }
					 }),
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
		commonjs(),
		!production && livereload('static'),
    !production && livereload('templates'),
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
