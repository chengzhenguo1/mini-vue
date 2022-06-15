import { h, getCurrentInstance } from "../../lib/mini-vue.esm.js";

export const Foo = {
  name: 'Foo',
  setup() {
    const instance = getCurrentInstance()
    console.log(instance)

    return {
      onClick: () => {
        // 这样不行，因为setup执行完毕后清空为null，所以获取不到
        // const instance = getCurrentInstance()
        // 利用了闭包原理，把instance保存下来
        console.log(instance)
      }
    }
  },
  render() {
    return h("div", {}, [h('button', {
      onClick: this.onClick
    }, 'click Me')]);
  },
};
