// 组件 provide 和 inject 功能
import { h, ref } from "../../lib/mini-vue.esm.js";

export default {
  name: "App",
  setup() {
    const num = ref(0)

    return {
      num,
      onHandleClick: () => {
        num.value += 1
      }
    }
  },
  render() {
    return h("div", {}, [
      h("button", { onClick: this.onHandleClick }, "click"),
      h('div', {}, `num = ${this.num}`)]);
  },
};
