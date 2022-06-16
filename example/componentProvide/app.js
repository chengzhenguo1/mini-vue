// 组件 provide 和 inject 功能
import { h, provide, inject } from "../../lib/mini-vue.esm.js";

const Provider = {
  name: "Provider",
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(Foo)]);
  },
};

const Foo = {
  name: "Foo",
  setup() {
    provide("foo", "foo");
    const foo = inject('foo')

    return {
      foo
    }
  },
  render() {
    return h("div", {}, [h("p", {}, "foo: " + this.foo), h(Consumer)]);
  },
};


const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const defaultValue = inject("default", () => '我是函数默认值');

    return {
      foo,
      bar,
      defaultValue
    };
  },

  render() {
    return h("div", {}, `Consumer: - ${this.foo} - ${this.bar} - ${this.defaultValue}`);
  },
};

export default {
  name: "App",
  setup() { },
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(Provider)]);
  },
};
