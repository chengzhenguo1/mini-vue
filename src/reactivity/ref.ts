import { hasChanged, isObject } from "../shared";
import { isTracking, trackRefValue, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any
  // 以普通对象形式存储，value有可能是reactive对象，方便赋值的时候进行对比
  private rawValue: any
  // ref对象的标识符
  public __v_isRef = true
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