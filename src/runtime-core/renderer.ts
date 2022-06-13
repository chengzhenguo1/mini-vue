import { isArray, isObject, isString } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"

interface VNodeType {
  type: string | Function
  el?: Element
  props: Object
  shapeFlags: ShapeFlags
  children: Array<VNodeType> | string
}

export function render(vnode: VNodeType, container: Element) {
  patch(vnode, container)
}

function patch(vnode: VNodeType, container: Element) {
  const { shapeFlags } = vnode

  if (shapeFlags & ShapeFlags.ELEMENT) {
    // element类型
    processElement(vnode, container)
  } else if (shapeFlags & ShapeFlags.COMPONENT_STATEFUL) {
    processComponent(vnode, container)
  }
}

function processElement(vnode: VNodeType, container: Element) {
  mountElement(vnode, container)
}

function processComponent(vnode: VNodeType, container: Element) {
  mountComponent(vnode, container)
}

function mountElement(vnode: VNodeType, container: Element) {
  const { type, props, children, shapeFlags } = vnode
  const element: Element = document.createElement((<string>type))
  // 保存当前的el，后续this.$el调用
  vnode.el = element

  for (let key in props) {
    const value = props[key]
    element.setAttribute(key, value)
  }
  
  if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    element.textContent = (children as string)
  } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren((children as Array<VNodeType>), element)
  }

  container.appendChild(element)
}


function mountComponent(vnode: VNodeType, container: Element) {
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container)
}

function mountChildren(children: VNodeType[], container: Element) {
  children.forEach(child => {
    patch(child, container)
  })
}

function setupRenderEffect(instance, vnode, container) {
  const { proxy } = instance
  // 在App组件中，render函数会被调用,App的this指向实例
  const subTree = instance.render.call(proxy)

  patch(subTree, container)
  // 取出返回结果，将el赋值给vnode.el上
  vnode.el = subTree.el
  // 测试
}
