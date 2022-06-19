import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp";
import { Fragment } from "./vnode";

export interface VNodeType {
  type: string | Function
  el?: Element
  props: Object
  shapeFlags: ShapeFlags
  children: Array<VNodeType> | string
}

export function createRenderer(options: any) {
  // 获取options的参数，让外部可以自定义传递处理方法来达到自定义渲染器效果，利用闭包的特性，将参数保存在内部
  const { createElement, patchProp, insert } = options

  function render(vnode: VNodeType, container: Element) {
    patch(null, vnode, container)
  }

  function patch(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent?: VNodeType) {
    const { shapeFlags, type } = n2

    switch (type) {
      case (Fragment as any):
        processFragment(n1, n2, container, parentComponent)
        break;
      case (Text as any):
        processTextVNode(n1, n2, container)
        break;
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // element类型
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlags & ShapeFlags.COMPONENT_STATEFUL) {
          processComponent(n1, n2, container, parentComponent)
        }
        break;
    }
  }

  function processFragment(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent) {
    mountChildren((n2.children as any), container, parentComponent)
  }

  function processTextVNode(n1: null | VNodeType, n2: VNodeType, container: Element) {
    const { children } = n2
    const textNode = document.createTextNode((children as string))
    container.append(textNode)
  }

  function processElement(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, container, parentComponent)
    }
  }

  function patchElement(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent) {
    console.log('n1', n1)
    console.log('n2', n2)
  }

  function processComponent(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent?: VNodeType) {
    mountComponent(n2, container, parentComponent)
  }

  function mountElement(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    const { type, props, children, shapeFlags } = vnode
    const element: Element = createElement((<string>type))
    // 保存当前的el，后续this.$el调用
    vnode.el = element

    for (let key in props) {
      const value = props[key]

      patchProp(element, key, value)
    }

    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      element.textContent = (children as string)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren((children as Array<VNodeType>), element, parentComponent)
    }

    insert(element, container)
  }


  function mountComponent(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    const instance = createComponentInstance(vnode, parentComponent)

    setupComponent(instance)
    setupRenderEffect(instance, vnode, container)
  }

  function mountChildren(children: VNodeType[], container: Element, parentComponent) {
    children.forEach(child => {
      patch(null, child, container, parentComponent)
    })
  }

  function setupRenderEffect(instance, vnode, container) {
    // proxy是setup的值
    // 使用effect追踪render里调用ref等响应式参数，发生改变后重新触发
    effect(() => {
      const { proxy, isMounted, subTree: prevSubTree } = instance
      // init
      if (!isMounted) {
        // 在App组件中，render函数会被调用,App的this指向实例
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.isMounted = true
      } else {
        // update 重新调用render函数
        const subTree = instance.render.call(proxy)

        patch(prevSubTree, subTree, container, instance)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.subTree = subTree
      }
    })
  }

  // 将createApp导出
  return {
    createApp: createAppAPI(render)
  }
}

