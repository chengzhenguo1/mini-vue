import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
import { Fragment, Text } from "./vnode";

export interface VNodeType {
  type: string | Function
  el?: Element
  props: Object
  shapeFlags: ShapeFlags
  children: Array<VNodeType> | string
  component: any
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
      // a b d
      // a b c d
      // 当前新节点还没有到尾，则继续挂载
      if (i <= e2) {
        const nextPos = e2 + 1
        // 获取要插入的位置,如果到结尾就设置null
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
      // 中间都有剩余节点
      let s1 = i
      let s2 = i
      // 新列表中剩余的节点长度
      let toBePatched = e2 - s2 + 1
      let patched = 0
      // 新列表节点与index的映射
      let keyToNewIndexMap = new Map()
      // 根据新列表剩余的节点数量，创建一个数组, 填充为0
      const newIndexToOldIndexMap = new Array(toBePatched);
      let moved = false;
      // 记录上一次的位置
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
            // 说明需要移动
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
      // 获取最长递增子序列，返回的是索引
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];

      let j = increasingNewIndexSequence.length - 1;
      // 从后向前进行遍历中间的每一项
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        // 全新的节点，直接插入
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
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor)
    } else {
      updateComponent(n1, n2)
    }
  }

  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      n2.vnode = n2;
    }
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


  function mountComponent(initialVNode: VNodeType, container: Element, parentComponent: VNodeType | null, anchor) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));

    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container)
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
    // 将effect保存  使用effect追踪render里调用ref等响应式参数，改变后触发render
    instance.update = effect(() => {
      const { proxy, isMounted } = instance
      // init proxy是setup的值
      if (!isMounted) {
        // 在App组件中，render函数会被调用,App的this指向实例
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance, null)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.isMounted = true
      } else {
        // update 重新调用render函数
        const { subTree: prevSubTree, next, vnode } = instance

        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }

        const subTree = instance.render.call(proxy)

        patch(prevSubTree, subTree, container, instance, null)

        // 取出返回结果，将el赋值给vnode.el上
        vnode.el = subTree.el
        instance.subTree = subTree
      }
    }, {
      scheduler() {
        // 将更新任务添加到任务队列中，使同步变为异步
        queueJobs(instance.update)
      }
    })
  }

  // 将createApp导出
  return {
    createApp: createAppAPI(render)
  }
}

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode;
  instance.next = null;

  instance.props = nextVNode.props;
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


