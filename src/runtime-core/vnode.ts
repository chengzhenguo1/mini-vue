import { isArray, isObject, isString } from "../shared"
import { ShapeFlags } from "../shared/ShapeFlags"

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    shapeFlags: getShapeFlags(type, children),
    children
  }

  return vnode
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text);
}

function getShapeFlags(type: any, children: any) {
  let flags = 0
  if (isString(type)) {
    flags |= ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    flags |= ShapeFlags.COMPONENT_STATEFUL
  }

  if (isString(children)) {
    flags |= ShapeFlags.TEXT_CHILDREN
  } else if (isArray(children)) {
    flags |= ShapeFlags.ARRAY_CHILDREN
  }

  if (flags & ShapeFlags.COMPONENT_STATEFUL && isObject(children)) {
    flags |= ShapeFlags.SLOT_CHILDREN
  }

  return flags
}
