import { h, createTextVNode, getCurrentInstance } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

// Fragment 以及 Text
export const App = {
  name: "App",
  setup() {
    const instance = getCurrentInstance()
    console.log(instance)
    
    return {};
  },
  render() {
    const app = h("div", {}, "App");
    const foo = h(
      Foo,
      {},
    );
    return h("div", {}, [app, foo]);
  },
};
