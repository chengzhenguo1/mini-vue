import { h } from '../../lib/mini-vue.esm.js'
import { Foo } from './foo.js'

console.log('app')
export const App = {
  render() {
    console.log(this.msg)
    console.log('-----------')


    setTimeout(() => {
      console.log(this.$el)
    }, 5000);

    return h('div',
      {
        id: 'test',
        class: 'h',
        onClick: () => {
          console.log(`${this.msg} 啊哈哈`)
        }
      },
      [
        h('div', {}, 'hello div1'),
        h(Foo, { foo: '我是传进来的Foo' })
      ])
    // `msg: ${this.msg}`)
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