import { ReactiveEffect } from "./effect"

class ComputedImpl {
  private _value: any
  // 懒执行
  private _dirty: boolean = true
  private _effect: ReactiveEffect

  constructor(getter: Function) {
    // 创建一个effect,在依赖值发生改变的时候，触发scheduler将_dirty设置为true，在下次获取的时候重新执行
    this._effect = new ReactiveEffect(getter, () => {
      this._dirty = true
    })
  }

  get value() {
    if (this._dirty) {
      this._value = this._effect.run()
      this._dirty = false
    }
    return this._value
  }
}

export function computed(getter: Function) {
  return new ComputedImpl(getter)
}