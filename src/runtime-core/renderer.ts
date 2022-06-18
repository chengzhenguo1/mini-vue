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
    patch(vnode, container)
  }

  function patch(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    const { shapeFlags, type } = vnode

    switch (type) {
      case (Fragment as any):
        processFragment(vnode, container, parentComponent)
        break;
      case (Text as any):
        processTextVNode(vnode, container)
        break;
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // element类型
          processElement(vnode, container, parentComponent)
        } else if (shapeFlags & ShapeFlags.COMPONENT_STATEFUL) {
          processComponent(vnode, container, parentComponent)
        }
        break;
    }
  }

  function processFragment(vnode: VNodeType, container: Element, parentComponent) {
    mountChildren((vnode.children as any), container, parentComponent)
  }

  function processTextVNode(vnode: VNodeType, container: Element) {
    const { children } = vnode
    const textNode = document.createTextNode((children as string))
    container.append(textNode)
  }

  function processElement(vnode: VNodeType, container: Element, parentComponent) {
    mountElement(vnode, container, parentComponent)
  }

  function processComponent(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    mountComponent(vnode, container, parentComponent)
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
      patch(child, container, parentComponent)
    })
  }

  function setupRenderEffect(instance, vnode, container) {
    const { proxy } = instance
    // 在App组件中，render函数会被调用,App的this指向实例
    const subTree = instance.render.call(proxy)

    patch(subTree, container, instance)
    // 取出返回结果，将el赋值给vnode.el上
    vnode.el = subTree.el
    // 测试
  }

  return {
    createApp: createAppAPI(render)
  }
}

