import { isArray, isObject, isString } from "../shared"
import { ShapeFlags } from "../shared/ShapeFlags"

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    shapeFlags: getShapeFlags(type, children),
    children
  }

  return vnode
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
