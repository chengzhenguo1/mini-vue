import { createRenderer } from "../runtime-core/renderer"

function createElement(type: string) {
  return document.createElement((<string>type))
}

// 处理element的props,挂载到元素上
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

function insert(el, container: Element, anchor: Element | null) {
  // 插入到指定位置，null或undefined则插入到最后
  container.insertBefore(el, anchor || null)
}

function remove(child) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}

function setElementText(el: Element, text: string) {
  el.textContent = text
}

// 将方法传进去，利用闭包保存
export const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText
})

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from '../runtime-core'