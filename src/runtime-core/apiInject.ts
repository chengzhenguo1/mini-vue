import { isFunction } from "../shared"
import { getCurrentInstance } from "./component"

export const provide = (key: string, value) => {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    // 引用类型provides不断向上指向父亲的provides
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent && currentInstance.parent.provides

    // init 只执行一次，后续因为当前的provides赋值过，所以与父级的provides不相等
    if (provides === parentProvides) {
      // 修改原型链，使拥有自己的provides，同时通过原型链也指向父级的provides
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    provides[key] = value
  }
}

export const inject = (key, defaultValue: Function | any) => {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides
    if (key in parentProvides) {
      return parentProvides[key]
    } else if (defaultValue) {
      if (isFunction(defaultValue)) {
        return defaultValue()
      }
      return defaultValue
    }
  }
}