import { h } from '../../lib/mini-vue.esm.js'

export const Foo = {
  setup(props, { emit }) {
    props.foo = '123'

    function onClick() {
      console.log('按钮触发')
      emit('sendMsg', 10, 20)
      emit('get-msg')
    }

    return {
      onClick
    }
  },
  render() {
    const button = h('button', {
      onClick: this.onClick
    }, 'Click ME')

    return h('div', { class: 'a' }, [h('p', {}, 'p'), button])
  }
}