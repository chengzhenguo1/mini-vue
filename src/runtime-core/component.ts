import { isObject } from "../shared";
import { PublicInstanceProxyHandler } from "./componentPublicInstance";

export function setupComponent(instance) {
  // TODO 处理props和slots
  // initProps()
  // initSlots()

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  const { setup } = Component;

  if (setup) {
    const setupResult = setup()

    handelSetupResult(instance, setupResult)
  }
}

export function createComponentInstance(vnode): any {
  const component = {
    vnode,
    type: vnode.type
  }

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

