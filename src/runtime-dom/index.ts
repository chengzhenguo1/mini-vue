import { createRenderer } from "../runtime-core/renderer"

function createElement(type: string) {
  return document.createElement((<string>type))
}

function patchProp(el: Element, key, prevVal, nextVal) {
  const isEvent = key => /^on[A-Z]/.test(key)

  if (isEvent(key)) {
    // 添加事件监听
    const event = key.slice(2).toLocaleLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    // nextVal 为空，则删除属性
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}

function insert(el, container) {
  container.appendChild(el)
}

export const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert
})

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from '../runtime-core'