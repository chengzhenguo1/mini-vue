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
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options

  function render(vnode: VNodeType, container: Element) {
    patch(null, vnode, container, null, null)
  }

  function patch(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent: VNodeType | null, anchor) {
    const { shapeFlags, type } = n2

    switch (type) {
      case (Fragment as any):
        processFragment(n1, n2, container, parentComponent, anchor)
        break;
      case (Text as any):
        processTextVNode(n1, n2, container)
        break;
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // element类型
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlags & ShapeFlags.COMPONENT_STATEFUL) {
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break;
    }
  }

  function processFragment(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent, anchor) {
    mountChildren((n2.children as any), container, parentComponent, anchor)
  }

  function processTextVNode(n1: null | VNodeType, n2: VNodeType, container: Element) {
    const { children } = n2
    const textNode = document.createTextNode((children as string))
    container.append(textNode)
  }

  function processElement(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent, anchor) {
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent, anchor)
    } else {
      // update
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  function patchElement(n1: VNodeType, n2: VNodeType, container: Element, parentComponent, anchor) {
    const oldProps = n1 ? n1.props : EMPTY_OBJ
    const nextProps = n2 ? n2.props : EMPTY_OBJ
    const el = (n2.el = n1.el)

    patchChildren(n1, n2, el, parentComponent, anchor)
    patchProps(el, oldProps, nextProps)
  }

  // 更新元素props
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

  // 更新元素子节点
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapeFlags = n1.shapeFlags
    const nextShapeFlags = n2.shapeFlags
    const c1 = n1.children
    const c2 = n2.children
    // 新节点的子元素为文本
    if (nextShapeFlags & ShapeFlags.TEXT_CHILDREN) {
      // 旧节点子元素为数组，则移除数组，同时在下面对比c1,c2
      if (prevShapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children)
      }
      // 新旧节点文本不同，替换文本
      if (c1 !== c2) {
        hostSetElementText(container, c2)
      }
    } else {
      // 新节点子元素为数组，旧节点子元素为文本，则清空旧文本，挂载子元素
      if (prevShapeFlags & ShapeFlags.TEXT_CHILDREN) {
        // 清空旧文本
        hostSetElementText(container, '')
        // 挂载子元素到节点上anchor
        mountChildren(c2, container, parentComponent, anchor)
      } else {
        // 都为数组
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
    let i = 0 // 首指针
    const l2 = c2.length
    let e1 = c1.length - 1 // 旧节点的尾指针
    let e2 = l2 - 1 // 新节点的尾指针

    // 节点是否相等
    function isSomeVNodeType(c1, c2) {
      return c1.type === c2.type && c1.key === c2.key
    }

    // 首首比较
    while (i <= e1 && i <= e2) {
      const child1 = c1[i]
      const child2 = c2[i]
      if (isSomeVNodeType(child1, child2)) {
        // 递归对比
        patch(child1, child2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      i++
    }


    // 尾尾比较
    while (e1 >= i && e2 >= i) {
      const child1 = c1[e1]
      const child2 = c2[e2]
      if (isSomeVNodeType(child1, child2)) {
        // 递归对比
        patch(child1, child2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 说明先遍历完旧元素，新的比老的长，创建新元素插入 e1老元素的尾部
    if (i > e1) {
      // a b 
      // a b c
      // 当前新节点还没有到尾，则继续挂载
      if (i <= e2) {
        const nextPos = e2 + 1
        // 锚点，获取要插入的位置
        const anchor = nextPos < l2 ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 说明先遍历完新元素，新的比老的短，删除老元素 e2新元素尾部
      // a b c  i = 2  e1 = 2
      // a b    e2 = 1
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++
      }
    } else {
      // 中间有剩余节点
      let s1 = i
      let s2 = i
      // 新节点要对比的节点数量
      let toBePatched = e2 - s2 + 1
      let patched = 0
      let keyToNewIndexMap = new Map()
      const newIndexToOldIndexMap = new Array(toBePatched);
      let moved = false;
      let maxNewIndexSoFar = 0;

      // 全部设置为0
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;

      // 遍历中间的新节点，添加到Map中
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 遍历中间的旧节点，跟新节点对比
      for (let i = s1; i <= e1; i++) {
        const preChild = c1[i]

        // 说明新节点已经遍历完，旧节点还存在节点，需要卸载
        if (patched >= toBePatched) {
          hostRemove(preChild.el);
          continue;
        }
        // 新节点的指针
        let findIndex: number | null = null
        
        if (preChild.key != null) {
          // 从新节点map中查找
          findIndex = keyToNewIndexMap.get(preChild.key);
        } else {
          // 遍历新节点，对比查找
          for (let j = l2; j <= e2; j++) {
            const newChild = c2[j];
            if (isSomeVNodeType(preChild, newChild)) {
              findIndex = j
              break;
            }
          }
        }

        // 新节点在旧节点中存在，对比替换
        if (findIndex != null) {
          if (findIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = findIndex;
          } else {
            moved = true;
          }
          // 记录新节点的位置
          newIndexToOldIndexMap[findIndex - s2] = i + 1;

          patch(preChild, c2[findIndex], container, parentComponent, null)
          patched++
        } else {
          // 新节点在就旧节点中不存在，直接删除
          hostRemove(preChild.el)
        }
      }
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];

      let j = increasingNewIndexSequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }

  }

  function processComponent(n1: null | VNodeType, n2: VNodeType, container: Element, parentComponent: VNodeType | null, anchor) {
    mountComponent(n2, container, parentComponent, anchor)
  }

  function mountElement(vnode: VNodeType, container: Element, parentComponent: VNodeType | null, anchor) {
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
      mountChildren((children as Array<VNodeType>), element, parentComponent, anchor)
    }

    hostInsert(element, container, anchor)
  }


  function mountComponent(vnode: VNodeType, container: Element, parentComponent: VNodeType | null, anchor) {
    const instance = createComponentInstance(vnode, parentComponent)

    setupComponent(instance)
    setupRenderEffect(instance, vnode, container)
  }

  function mountChildren(children: VNodeType[], container: Element, parentComponent, anchor) {
    children.forEach(child => {
      patch(null, child, container, parentComponent, anchor)
    })
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i].el;
      hostRemove(child);
    }
  }

  function setupRenderEffect(instance, vnode, container) {
    // proxy是setup的值
    // 使用effect追踪render里调用ref等响应式参数，改变后触发更新逻辑
    effect(() => {
      const { proxy, isMounted } = instance
      // init
      if (!isMounted) {
        // 在App组件中，render函数会被调用,App的this指向实例
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance, null)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.isMounted = true
      } else {
        // update 重新调用render函数
        const { subTree: prevSubTree } = instance

        const subTree = instance.render.call(proxy)

        patch(prevSubTree, subTree, container, instance, null)

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

// 最长递增子序列
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
