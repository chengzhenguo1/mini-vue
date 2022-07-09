import { extend } from "../shared"

let activeEffect
let shouldTrack = true
export class ReactiveEffect {
  private _fn: any
  // 保存当前实例
  public deps: any[] = []
  // 状态
  private active: boolean = true
  // 调度函数
  public scheduler: Function | undefined
  // 执行stop后的回调函数
  public onStop: Function | undefined

  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    if (!this.active) {
      return this._fn()
    }
    // 记录当前正在执行的effect
    activeEffect = this
    shouldTrack = true
    const result = this._fn()
    // reset 将执行effect标志变为false 说明没有正在执行的effect
    shouldTrack = false

    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
      this.onStop && this.onStop()
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  });
  // 把 effect.deps 清空
  effect.deps.length = 0
}



// 收集依赖
const targetMap = new Map()
export function track(target, key) {
  // 防止二次收集effect
  if (!isTracking()) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    // key是他这个对象
    targetMap.set(target, depsMap)
  }

  // target.key中添加里面的Effect
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  trackEffects(dep)
}

export function trackRefValue(ref) {
  if (isTracking()) {
    // 保存effect
    trackEffects(ref.dep);
  }
}

function trackEffects(dep) {
  // 看看 dep 之前有没有添加过，添加过的话 那么就不添加了
  if (dep.has(activeEffect)) {
    return
  }

  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

// ref是否正在effect中
export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target)

  const dep = depsMap.get(key)

  triggerEffects(dep)
}

// 执行ref保存的effects
export function triggerEffects(dep) {
  for (let effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)

  extend(_effect, options)

  // 执行effect函数
  _effect.run()

  // 处理指针指向
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}

export function stop(runner: any) {
  runner.effect.stop()
}