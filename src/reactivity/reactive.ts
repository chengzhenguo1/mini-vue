import { mutableHandlers, readonlyHandlers } from "./baseHandler";

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

export function isReadonly(value) {
  // value.xxx会触发get方法，在get方法中判断key值是否是IS_READONLY
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isReactive(value) {
  // value.xxx会触发get方法，在get方法中判断key值是否是IS_IS_REACTIVE
  return !!value[ReactiveFlags.IS_REACTIVE]
}

function createReactiveObject(target, baseHandles) {
  return new Proxy(target, baseHandles)
}