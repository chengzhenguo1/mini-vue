
export function setupComponent(instance) {
  // TODO 处理props和slots
  // initProps()
  // initSlots()

  setupStatefulComponent(instance)
}

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type
  }

  return component
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  const { setup } = Component;

  if (setup) {
    const setupResult = setup()

    handelSetupResult(instance, setupResult)
  }
}
function handelSetupResult(instance, setupResult) {
  if (typeof setupResult === 'object') {
    // 保存数据
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type
  instance.render = Component.render

  // if (!Component.render) {
  // }
}

