import { defineConfig } from 'tsup'

export default defineConfig({
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  minify: false,
  noExternal: ["defu","commander", "chalk", "inquirer"],
  //noExternal: [ /(.*)/ ],
  skipNodeModulesBundle: false,
  entryPoints: ['src/index.ts', 'src/start.ts'],
  target: 'es2020',
  outDir: 'dist',
})