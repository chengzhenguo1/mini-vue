// 继承函数
export const extend = Object.assign

export const isObject = (val: unknown): val is Object => {
  return val !== null && typeof val === 'object'
}

export const hasChanged = (oldValue, newValue) => {
  return !Object.is(oldValue, newValue)
}