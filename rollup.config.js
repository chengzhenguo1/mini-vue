import pkj from './package.json'
import typescript from '@rollup/plugin-typescript'

export default {
  input: './src/index.ts',
  output: [
    {
      format: 'cjs',
      file: pkj.main
    },
    {
      format: 'es',
      file: pkj.module
    }
  ],
  plugins: [
    typescript()
  ]
}