export * from './toDisplayString'

export const EMPTY_OBJ = {}
// 继承函数
export const extend = Object.assign

export const isObject = (val: unknown): val is Object => {
  return val !== null && typeof val === 'object'
}

export const isString = (val: unknown): val is string => typeof val === 'string'

export const isArray = (val: unknown): val is Array<any> => Array.isArray(val)

export const isFunction = (val: unknown): val is Function => typeof val === 'function'

export const hasOwn = (obj, key) => Object.hasOwnProperty.call(obj, key)

export const hasChanged = (oldValue, newValue) => {
  return !Object.is(oldValue, newValue)
}