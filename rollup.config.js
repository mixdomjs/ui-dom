
// rollup.config.js
//
// See terser options here: https://github.com/terser/terser#minify-options

import dts from 'rollup-plugin-dts';
import del from 'rollup-plugin-delete';
import copy from 'rollup-plugin-copy';
import { terser } from 'rollup-plugin-terser';

// const devMode = (process.env.NODE_ENV === 'development');
// console.log(`${ devMode ? 'development' : 'production' } mode bundle`);

export default [

    // - Declarations (+ delete dts folder) - //

    {
        input: 'dist/dts/index.d.ts',
        output: {
          file: 'dist/ui-dom.d.ts',
          format: 'es',
        },
        plugins: [
            dts(),
            del({ targets: 'dist/dts*', hook: 'buildEnd' }),
        ],
    },


    // - ES Module - //

    {
        input: 'dist/modules/index.js',
        output: {
            file: 'dist/ui-dom.mjs',
            format: 'es',
        },
        plugins: [
            terser({
                ecma: 2015,
                // sourceMap: true,
                compress: {
                    module: true,
                    toplevel: true,
                    unsafe_arrows: true,
                    drop_debugger: true
                    // drop_console: !devMode,
                    // drop_debugger: !devMode
                },
                output: { quote_style: 1 }
            }),
        ],
    },

    // - CJS - //

    {
        input: 'dist/modules/index.cjs.js',
        output: {
            file: 'dist/ui-dom.js',
            format: 'cjs',
        },
        plugins: [
            terser({
                ecma: 2015,
                // sourceMap: true,
                compress: {
                    // toplevel: true,
                    module: true,
                    unsafe_arrows: true,
                    drop_debugger: true
                    // drop_console: !devMode,
                    // drop_debugger: !devMode
                },
                output: { quote_style: 1 }
            }),
        ],
    },

    // - Global (= window.UIDom) - //

    {
        input: 'dist/modules/index.global.js',
        output: {
          file: 'dist/UIDom.js',
          format: 'cjs',
        },
        plugins: [
            terser({
                ecma: 2015,
                // mangle: false,
                // sourceMap: true,
                // module: true,
                enclose: true,
                compress: {
                    toplevel: true,
                    unsafe_arrows: true,
                    drop_debugger: true
                    // drop_console: !devMode,
                    // drop_debugger: !devMode
                },
                output: { quote_style: 1 },
            }),
        ]
    },

    // - Copy & delete - //

    // Copy for direct es module use (cannot use .mjs, instead the d.ts and .js must have same path).
    {
        input: 'dist/ui-dom.mjs',
        plugins: [
            copy({ targets: [ { src: 'dist/ui-dom.d.ts', dest: 'dist', rename: 'ui-dom.module.d.ts' } ] }),
            copy({ targets: [ { src: 'dist/ui-dom.mjs', dest: 'dist', rename: 'ui-dom.module.js' } ] }),
            del({ targets: 'dist/modules*', hook: 'buildEnd' })
        ]
    },

];
