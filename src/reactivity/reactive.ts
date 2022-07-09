import { isObject } from "../shared";
import { mutableHandlers, readonlyHandlers, shallowHandlers } from "./baseHandler";

export const enum ReactiveFlags {
  IS_REACTIVE = '__V_IS_REACTIVE',
  IS_READONLY = '__V_IS_READONLY',
}

export function reactive(raw) {
  return createReactiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers)
}

// 只对对象第一层进行只读
export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowHandlers)
}

export function isReadonly(value) {
  // value.xxx会触发get方法，在get方法中判断key值是否是IS_READONLY
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isReactive(value) {
  // value.xxx会触发get方法，在get方法中判断key值是否是IS_IS_REACTIVE
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}

function createReactiveObject(target, baseHandles) {
  if (!isObject(target)) {
    console.warn(`target必须是对象 target: ${target}`)
    return target
  }

  return new Proxy(target, baseHandles)
}
