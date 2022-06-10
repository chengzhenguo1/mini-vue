import { h } from '../lib/mini-vue.esm.js'

export const App = {
  render() {
    console.log(this)
    console.log('-----------')
    console.log(App)

    
    setTimeout(() => {
      console.log(this.$el)
    }, 50);
    return h('div', { id: 'test', class: 'h' },
      `${this.msg}`)
      // [
      //   h('p', { id: 'p1', class: 'h2' }, 'hello 1'),
      //   h('p', { id: 'p2', class: 'h3' }, 'hello 2')
      // ]);
  },
  setup() {
    const msg = 'Hello Mini-Vuea!'

    return {
      msg
    }
  }
}