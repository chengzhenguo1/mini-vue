import { extend, isObject } from "../shared"
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive"

// 利用缓存，防止每次get都重新调用函数
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowGet = createGetter(true, true)

export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`${key}赋值失败，因为${key}是只读的`)
    return true
  }
}

export const shallowHandlers = extend({}, readonlyHandlers, {
  get: shallowGet,
})

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    // 判断key是否是isReadonly函数调用的
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }

    const res = Reflect.get(target, key)

    // 只做第一层处理
    if (shallow) {
      return res
    }

    // 判断是否是对象,如果是对象，则嵌套添加响应式
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

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


