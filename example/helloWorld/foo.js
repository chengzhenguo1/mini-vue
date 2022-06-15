import { h } from '../../lib/mini-vue.esm.js'

export const Foo = {
  setup(props) {
    console.log(props)
    props.foo = '123'
  },
  render() {
    return h('div', { class: 'a' }, 'Foo: ' + this.foo)
  }
}