import { shallowReadonly } from "../reactivity/reactive";
import { proxyRefs } from "../reactivity/ref";
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
    // 处理setup返回参数
    handelSetupResult(instance, setupResult)

    // 执行完毕，清空instance
    setCurrentInstance(null)
  }
}

export function createComponentInstance(vnode, parent): any {
  const component = {
    vnode,
    type: vnode.type,
    component: null,
    setupState: {},
    props: {},
    slots: {},
    //  引用类型provides不断向上指向父亲的provides
    provides: parent ? parent.provides : {name: vnode.type},
    parent,
    // 是否已挂载
    isMounted: false,
    subTree: null,
    emit: () => { }
  }

  component.emit = emit.bind(null, component) as any

  return component
}

function handelSetupResult(instance, setupResult) {
  if (isObject(setupResult)) {
    // 保存数据，使用proxyRefs来解构ref对象，不用加.value即可访问
    instance.setupState = proxyRefs(setupResult)
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
