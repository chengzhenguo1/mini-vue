import { isArray, isObject, isString } from "../shared";
import { createComponentInstance, setupComponent } from "./component"

interface VNodeType {
  type: string | Function
  props: Object
  children: Array<VNodeType> | string
}

export function render(vnode: VNodeType, container: Element) {
  patch(vnode, container)
}

function patch(vnode: VNodeType, container: Element) {
  const { type } = vnode

  if (isString(type)) {
    // element类型
    processElement(vnode, container)
  } else if (isObject(type)) {
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
  const { type, props, children } = vnode
  const element: Element = document.createElement((<string>type))

  for (let key in props) {
    const value = props[key]
    element.setAttribute(key, value)
  }

  if (isString(children)) {
    element.textContent = children
  } else if (isArray(children)) {
    mountChildren(children, element)
  }

  container.appendChild(element)
}


function mountComponent(vnode: VNodeType, container: Element) {
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance, container)
}

function mountChildren(children: VNodeType[], container: Element) {
  children.forEach(child => {
    patch(child, container)
  })
}

function setupRenderEffect(instance, container) {
  const subTree = instance.render()

  patch(subTree, container)
}
