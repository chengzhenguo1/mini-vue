import { shallowReadonly } from "../reactivity/reactive";
import { isObject } from "../shared";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandler } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

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
    const setupResult = setup(shallowReadonly(instance.vnode.props), { emit: instance.emit })

    handelSetupResult(instance, setupResult)
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

  // if (!Component.render) {
  // }
}

