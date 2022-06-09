import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer: string | Element) {
      if (typeof rootContainer === "string") {
        rootContainer = document.querySelector(rootContainer)!
      }
      
      //  创建虚拟节点
      const vnode = createVNode(rootComponent);

      render(vnode, rootContainer)
    }
  }
}