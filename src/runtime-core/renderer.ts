import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export interface VNodeType {
  type: string | Function
  el?: Element
  props: Object
  shapeFlags: ShapeFlags
  children: Array<VNodeType> | string
}

export function createRenderer(options: any) {
  // 获取options的参数，让外部可以自定义传递处理方法来达到自定义渲染器效果，利用闭包的特性，将参数保存在内部
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert } = options

  function render(vnode: VNodeType, container: Element) {
    patch(null, vnode, container)
  }

  function patch(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent?: VNodeType) {
    const { shapeFlags, type } = n2

    switch (type) {
      case (Fragment as any):
        processFragment(n1, n2, container, parentComponent)
        break;
      case (Text as any):
        processTextVNode(n1, n2, container)
        break;
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // element类型
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlags & ShapeFlags.COMPONENT_STATEFUL) {
          processComponent(n1, n2, container, parentComponent)
        }
        break;
    }
  }

  function processFragment(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent) {
    mountChildren((n2.children as any), container, parentComponent)
  }

  function processTextVNode(n1: null | VNodeType, n2: VNodeType, container: Element) {
    const { children } = n2
    const textNode = document.createTextNode((children as string))
    container.append(textNode)
  }

  function processElement(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent) {
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent)
    } else {
      // update
      patchElement(n1, n2, container, parentComponent)
    }
  }

  function patchElement(n1: VNodeType, n2: VNodeType, container: Element, parentComponent) {
    console.log('n1', n1)
    console.log('n2', n2)
    const oldProps = n1 ? n1.props : EMPTY_OBJ
    const nextProps = n2 ? n2.props : EMPTY_OBJ
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, nextProps)
  }

  // 更新props方法
  function patchProps(el, oldProps, nextProps) {
    if (oldProps !== nextProps) {
      // 循环遍历props，更新属性
      for (let key in nextProps) {
        const prevProp = oldProps[key]
        const nextProp = nextProps[key]

        // 新旧节点值不一致，更新属性
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }

      // 循环遍历旧props，判断在新props里是否存在，不存在则删除
      if (oldProps === EMPTY_OBJ) {
        for (let key in oldProps) {
          if (!(key in nextProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  function processComponent(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent?: VNodeType) {
    mountComponent(n2, container, parentComponent)
  }

  function mountElement(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    const { type, props, children, shapeFlags } = vnode
    const element: Element = hostCreateElement((<string>type))
    // 保存当前的el，后续this.$el调用
    vnode.el = element

    for (let key in props) {
      const value = props[key]

      hostPatchProp(element, key, null, value)
    }

    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      element.textContent = (children as string)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren((children as Array<VNodeType>), element, parentComponent)
    }

    hostInsert(element, container)
  }


  function mountComponent(vnode: VNodeType, container: Element, parentComponent?: VNodeType) {
    const instance = createComponentInstance(vnode, parentComponent)

    setupComponent(instance)
    setupRenderEffect(instance, vnode, container)
  }

  function mountChildren(children: VNodeType[], container: Element, parentComponent) {
    children.forEach(child => {
      patch(null, child, container, parentComponent)
    })
  }

  function setupRenderEffect(instance, vnode, container) {
    // proxy是setup的值
    // 使用effect追踪render里调用ref等响应式参数，改变后触发更新逻辑
    effect(() => {
      const { proxy, isMounted, subTree: prevSubTree } = instance
      // init
      if (!isMounted) {
        // 在App组件中，render函数会被调用,App的this指向实例
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.isMounted = true
      } else {
        // update 重新调用render函数
        const subTree = instance.render.call(proxy)

        patch(prevSubTree, subTree, container, instance)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.subTree = subTree
      }
    })
  }

  // 将createApp导出
  return {
    createApp: createAppAPI(render)
  }
}

