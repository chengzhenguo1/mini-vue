import { h } from '../lib/mini-vue.esm.js'

export const App = {
  render() {
    return h('div', { id: 'test', class: 'h' },
      [
        h('p', { id: 'p1', class: 'h2' }, 'hello 1'),
        h('p', { id: 'p2', class: 'h3' }, 'hello 2')
      ]);
  },
  setup() {
    const msg = 'Hello Mini-Vue!'

    return {
      msg
    }
  }
}