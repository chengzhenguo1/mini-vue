const publicPropertiesMap = {
  $el: (i) => i.vnode.el
}

export const PublicInstanceProxyHandler = {
  get({ _: instance }, key) {
    const { setupState, props } = instance
    const hasOwn = (obj, key) => Object.hasOwnProperty.call(obj, key)

    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }

    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }

  }
}