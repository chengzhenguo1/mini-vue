import { shallowReadonly } from "../reactivity/reactive";
import { isObject } from "../shared";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandler } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import { VNodeType } from "./renderer";

export function setupComponent(instance) {
  // 处理props和slots
  initProps(instance, instance.vnode.props)
  initSlots(instance, instance.vnode.children)

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  const { setup } = Component;

  if (setup) {
    // 设置instance，调用setup的时候，可以获取当前组件实例
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.vnode.props), { emit: instance.emit })

    handelSetupResult(instance, setupResult)
    
    // 清空instance
    setCurrentInstance(null)
  }
}

export function createComponentInstance(vnode): any {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    emit: () => { }
  }

  component.emit = emit.bind(null, component) as any

  return component
}

function handelSetupResult(instance, setupResult) {
  if (isObject(setupResult)) {
    // 保存数据
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type
  instance.render = Component.render

  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandler)
}

let currentInstance: VNodeType | null = null

// 返回当前组件实例，利用全局变量，可以在setup中调用
export const getCurrentInstance = () => {
  return currentInstance
}

// 设置当前组件实例
const setCurrentInstance = (instance: VNodeType | null) => {
  currentInstance = instance
}
