import { defineConfig } from 'tsup'

export default defineConfig({
  //  //format: ['esm'],
  entry: ['./src/index.ts'],
  noExternal: [
    'defu',
  ],
  //  ////skipNodeModulesBundle: true,
  dts: true,
  clean: true,
  sourcemap: true
})
//export default defineConfig({
//  //format: ['esm'],
//  entry: ['./src/index.ts'],
//  dts: true,
//  //shims: true,
//  ////skipNodeModulesBundle: true,
//  clean: true,
//  //target: 'node20',
//  //platform: 'node',
//  //minify: true,
//  //bundle: true,
//  //// https://github.com/egoist/tsup/issues/619
//  //noExternal: [ /(.*)/ ],
//  //splitting: false,
//});