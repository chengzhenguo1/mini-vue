import { hasChanged, isObject } from "../shared";
import { trackRefValue, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any
  // 以普通对象形式存储，value有可能是reactive对象，方便赋值的时候进行对比
  private rawValue: any
  // ref对象的标识符
  public __v_isRef = true
  // 保存Effect
  public dep: Set<any>

  constructor(value) {
    this._value = convert(value)
    this.rawValue = value
    this.dep = new Set()
  }

  get value() {
    // 判断当前activeEffect是否存在
    trackRefValue(this)

    return this._value
  }

  set value(newValue: any) {
    // 和普通属性对比是否改变，改变就触发effect
    if (hasChanged(this.rawValue, newValue)) {
      this._value = convert(newValue)
      this.rawValue = newValue
      triggerEffects(this.dep)
    }
  }
}

// 对象形式需要包裹一层reactive
export function convert(value) {
  return isObject(value) ? reactive(value) : value
}

export function ref(value) {
  return new RefImpl(value)
}

// 判断是否是ref对象
export function isRef(ref) {
  return !!ref.__v_isRef
}

// 取消ref对象，转换为普通对象
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

// 返回直接访问的对象，不用.value
export function proxyRefs(withProxyRefs) {
  // 返回新的代理对象
  return new Proxy(withProxyRefs, {
    get(target, key) {
      // 直接返回解析后的值
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      // 如果当前要赋值的属性是ref类型，并且value是普通值，就直接赋值给ref的.value上
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        // 否则直接赋值即可
        return Reflect.set(target, key, value)
      }
    }
  })
}