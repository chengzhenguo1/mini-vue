import { ReactiveEffect } from "./effect"

class ComputedImpl {
  private _value: any
  private _dirty: boolean = true
  private _effect: ReactiveEffect

  constructor(getter: Function,) {
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