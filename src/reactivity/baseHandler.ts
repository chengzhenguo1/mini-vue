import { track, trigger } from "./effect"
import { ReactiveFlags } from "./reactive"

// 利用缓存，防止每次get都调用函数
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`${key}赋值失败，因为${target}是只读的`)
    return true
  }
}

function createGetter(isReadonly: boolean = false) {
  return function get(target, key) {
    // 判断key是否是isReadonly函数调用的
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }

    const res = Reflect.get(target, key)
    if (!isReadonly) {
      // 收集依赖
      track(target, key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)

    // 触发依赖
    trigger(target, key)

    return res
  }
}


