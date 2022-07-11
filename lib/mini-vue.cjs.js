'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function toDisplayString(str) {
    return String(str);
}

const EMPTY_OBJ = {};
// 继承函数
const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (val) => typeof val === 'string';
const isArray = (val) => Array.isArray(val);
const isFunction = (val) => typeof val === 'function';
const hasOwn = (obj, key) => Object.hasOwnProperty.call(obj, key);
const hasChanged = (oldValue, newValue) => {
    return !Object.is(oldValue, newValue);
};

let activeEffect;
let shouldTrack = true;
class ReactiveEffect {
    constructor(fn, scheduler) {
        // dep就是reactive, 方便删除当下的effect
        this.deps = [];
        // 状态
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 停止收集依赖，直接执行
        if (!this.active) {
            return this._fn();
        }
        // 记录当前正在执行的effect
        activeEffect = this;
        shouldTrack = true;
        // 执行的时候，如果fn内部有reactive或ref就会把当前effect收集起来，在数据改变的时候重新触发run方法
        const result = this._fn();
        // reset 将执行effect标志变为false 说明没有正在执行的effect
        shouldTrack = false;
        return result;
    }
    // 停止当前依赖，只生效一次
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
            this.onStop && this.onStop();
        }
    }
}
function cleanupEffect(effect) {
    // 循环每一个依赖当前effect的reactive
    effect.deps.forEach((dep) => {
        // dep就是reactive，让reactive删除当前的effect
        dep.delete(effect);
    });
    // 把 effect.deps 清空
    effect.deps.length = 0;
}
// 收集依赖
const targetMap = new Map();
function track(target, key) {
    // 防止二次收集effect
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        // key是他这个对象
        targetMap.set(target, depsMap);
    }
    // target.key中添加里面的Effect
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackRefValue(ref) {
    if (isTracking()) {
        // 保存effect
        trackEffects(ref.dep);
    }
}
function trackEffects(dep) {
    // 看看 dep 之前有没有添加过，添加过的话 那么就不添加了
    if (dep.has(activeEffect)) {
        return;
    }
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
// ref是否正在effect中
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    const dep = depsMap.get(key);
    triggerEffects(dep);
}
// 执行ref保存的effects
function triggerEffects(dep) {
    for (let effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 绑定在effect上，在后续触发依赖的时候，可以访问到.scheduler
    extend(_effect, options);
    // 执行effect函数
    _effect.run();
    // 处理指针指向，让run方法内的this指向当前effect，返回run方法
    const runner = _effect.run.bind(_effect);
    // 保存当前effect，后续调用stop
    runner.effect = _effect;
    return runner;
}

// 利用缓存，防止每次get都重新调用函数
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowGet = createGetter(true, true);
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`${key}赋值失败，因为${key}是只读的`);
        return true;
    }
};
const shallowHandlers = extend({}, readonlyHandlers, {
    get: shallowGet,
});
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 判断key是否是isReadonly函数调用的,
        // 创建readonly的时候会将isReadonly置为true，所以在key = 的时候，取反就是false,
        // 说明当前不是reactive对象
        if (key === "__V_IS_REACTIVE" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__V_IS_READONLY" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        // 只做第一层处理
        if (shallow) {
            return res;
        }
        // 判断是否是对象,如果是对象，则嵌套添加响应式
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            // 收集依赖
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
}

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
// 只对对象第一层进行只读
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowHandlers);
}
function createReactiveObject(target, baseHandles) {
    if (!isObject(target)) {
        console.warn(`target必须是对象 target: ${target}`);
        return target;
    }
    return new Proxy(target, baseHandles);
}

class RefImpl {
    constructor(value) {
        // ref对象的标识符
        this.__v_isRef = true;
        this._value = convert(value);
        this.rawValue = value;
        this.dep = new Set();
    }
    get value() {
        // 判断当前activeEffect是否存在
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 和普通属性对比是否改变，改变就触发effect
        if (hasChanged(this.rawValue, newValue)) {
            this._value = convert(newValue);
            this.rawValue = newValue;
            triggerEffects(this.dep);
        }
    }
}
// 对象形式需要包裹一层reactive
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
// 判断是否是ref对象
function isRef(ref) {
    return !!ref.__v_isRef;
}
// 取消ref对象，转换为普通对象
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
// 返回直接访问的对象，不用.value
function proxyRefs(withProxyRefs) {
    // 返回新的代理对象
    return new Proxy(withProxyRefs, {
        get(target, key) {
            // 直接返回解析后的值
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 如果当前要赋值的属性是ref类型，并且value是普通值，就直接赋值给ref的.value上
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                // 否则直接赋值即可
                return Reflect.set(target, key, value);
            }
        }
    });
}

const emit = (component, event, ...args) => {
    const { props } = component;
    // 获取父组件传进来的props事件，然后找到触发
    const eventName = 'on' + upperFirst(camelize(event));
    const handler = props[eventName];
    // 触发事件，传递参数
    handler && handler(...args);
};
// 处理get-msg这种emit名，转换成getMsg
function camelize(event) {
    return event ? event.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    }) : '';
}
// 首字母大写
function upperFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// 初始化Props，挂载到实例上
function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandler = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

// slots挂载到实例上
const initSlots = (component, slots) => {
    const { vnode } = component;
    if (vnode.shapeFlags & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(slots, component.slots);
    }
};
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function setupComponent(instance) {
    // 处理props和slots
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
// 执行组件中setup
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandler);
    if (setup) {
        // 设置instance，调用setup的时候，可以获取当前组件实例
        setCurrentInstance(instance);
        // 给setup传递Props变为只读，传递emit
        const setupResult = setup(shallowReadonly(instance.vnode.props), { emit: instance.emit });
        // 处理Setup返回参数，保存到setupState属性上
        handelSetupResult(instance, setupResult);
        // 执行完毕，清空instance
        setCurrentInstance(null);
    }
}
// 创建组件实例
function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        component: null,
        setupState: {},
        props: {},
        slots: {},
        //  引用类型provides不断向上指向父亲的provides
        provides: parent ? parent.provides : { name: vnode.type },
        parent,
        // 是否已挂载
        isMounted: false,
        subTree: null,
        emit: () => { }
    };
    component.emit = emit.bind(null, component);
    return component;
}
// 处理Setup返回参数，保存到setupState属性上
function handelSetupResult(instance, setupResult) {
    if (isObject(setupResult)) {
        // 保存数据，使用proxyRefs来解构ref对象，不用加.value即可访问
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    // render的优先级大于template
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
// 返回当前组件实例，利用全局变量，可以在setup中调用
const getCurrentInstance = () => {
    return currentInstance;
};
// 设置当前组件实例
const setCurrentInstance = (instance) => {
    currentInstance = instance;
};
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    debugger;
    const vnode = {
        type,
        props,
        children,
        shapeFlags: getShapeFlags(type, children),
        el: null,
        key: props ? props.key : null,
    };
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
// 设置当前VNode类型
function getShapeFlags(type, children) {
    let flags = 0;
    if (isString(type)) {
        flags |= 1 /* ShapeFlags.ELEMENT */;
    }
    else if (isObject(type)) {
        flags |= 2 /* ShapeFlags.COMPONENT_STATEFUL */;
    }
    if (isString(children)) {
        flags |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
        flags |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    if (flags & 2 /* ShapeFlags.COMPONENT_STATEFUL */ && isObject(children)) {
        flags |= 16 /* ShapeFlags.SLOT_CHILDREN */;
    }
    return flags;
}

function createAppAPI(render) {
    // 利用闭包保存render
    return function createApp(rootComponent) {
        debugger;
        return {
            mount(rootContainer) {
                if (typeof rootContainer === "string") {
                    rootContainer = document.querySelector(rootContainer);
                }
                //  创建虚拟节点
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

// 防止多次创建Promise
let isFlushPending = false;
let jobs = [];
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!jobs.includes(job)) {
        jobs.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    // 推到异步任务队列中执行
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = jobs.shift())) {
        isFunction(job) && job();
    }
}

function createRenderer(options) {
    // 获取options的参数，让外部可以自定义传递处理方法来达到自定义渲染器效果，利用闭包的特性，将参数保存在内部
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    // 第一次渲染
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        const { shapeFlags, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processTextVNode(n1, n2, container);
                break;
            default:
                if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
                    // element类型
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlags & 2 /* ShapeFlags.COMPONENT_STATEFUL */) {
                    // component类型
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processTextVNode(n1, n2, container) {
        const { children } = n2;
        const textNode = document.createTextNode(children);
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // init
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // update
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1 ? n1.props : EMPTY_OBJ;
        const nextProps = n2 ? n2.props : EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, nextProps);
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // init
            mountComponent(n2, container, parentComponent);
        }
        else {
            // update
            updateComponent(n1, n2);
        }
    }
    // 更新元素props
    function patchProps(el, oldProps, nextProps) {
        if (oldProps !== nextProps) {
            // 循环遍历props，更新属性
            for (let key in nextProps) {
                const prevProp = oldProps[key];
                const nextProp = nextProps[key];
                // 新旧节点值不一致，更新属性
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            // 循环遍历旧props，判断在新props里是否存在，不存在则删除
            if (oldProps === EMPTY_OBJ) {
                for (let key in oldProps) {
                    if (!(key in nextProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    // 更新元素子节点
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlags = n1.shapeFlags;
        const nextShapeFlags = n2.shapeFlags;
        const c1 = n1.children;
        const c2 = n2.children;
        // 新节点的子元素为文本
        if (nextShapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // 旧节点子元素为数组，则移除数组，同时在下面对比c1,c2
            if (prevShapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(n1.children);
            }
            // 新旧节点文本不同，替换文本
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 新节点子元素为数组，旧节点子元素为文本，则清空旧文本，挂载子元素
            if (prevShapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 清空旧文本
                hostSetElementText(container, '');
                // 挂载子元素到节点上anchor
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 都为数组
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0; // 首指针
        const l2 = c2.length;
        let e1 = c1.length - 1; // 旧节点的尾指针
        let e2 = l2 - 1; // 新节点的尾指针
        // 节点是否相等
        function isSomeVNodeType(c1, c2) {
            return c1.type === c2.type && c1.key === c2.key;
        }
        // 首首比较
        while (i <= e1 && i <= e2) {
            const child1 = c1[i];
            const child2 = c2[i];
            if (isSomeVNodeType(child1, child2)) {
                // 递归对比
                patch(child1, child2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 尾尾比较
        while (e1 >= i && e2 >= i) {
            const child1 = c1[e1];
            const child2 = c2[e2];
            if (isSomeVNodeType(child1, child2)) {
                // 递归对比
                patch(child1, child2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 说明先遍历完旧元素，新的比老的长，创建新元素插入 e1老元素的尾部
        if (i > e1) {
            // a b d
            // a b c d
            // 当前新节点还没有到尾，则继续挂载
            if (i <= e2) {
                const nextPos = e2 + 1;
                // 获取要插入的位置,如果到结尾就设置null
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 说明先遍历完新元素，新的比老的短，删除老元素 e2新元素尾部
            // a b c  i = 2  e1 = 2
            // a b    e2 = 1
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间都有剩余节点
            let s1 = i;
            let s2 = i;
            // 新列表中剩余的节点长度
            let toBePatched = e2 - s2 + 1;
            let patched = 0;
            // 新列表节点与index的映射
            let keyToNewIndexMap = new Map();
            // 根据新列表剩余的节点数量，创建一个数组, 填充为0
            const newIndexToOldIndexMap = new Array(toBePatched);
            let moved = false;
            // 记录上一次的位置
            let maxNewIndexSoFar = 0;
            // 全部设置为0
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            // 遍历中间的新节点，添加到Map中
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 遍历中间的旧节点，跟新节点对比
            for (let i = s1; i <= e1; i++) {
                const preChild = c1[i];
                // 说明新节点已经遍历完，旧节点还存在节点，需要卸载
                if (patched >= toBePatched) {
                    hostRemove(preChild.el);
                    continue;
                }
                // 新节点的指针
                let findIndex = null;
                if (preChild.key != null) {
                    // 从新节点map中查找
                    findIndex = keyToNewIndexMap.get(preChild.key);
                }
                else {
                    // 遍历新节点，对比查找
                    for (let j = l2; j <= e2; j++) {
                        const newChild = c2[j];
                        if (isSomeVNodeType(preChild, newChild)) {
                            findIndex = j;
                            break;
                        }
                    }
                }
                // 新节点在旧节点中存在，对比替换
                if (findIndex != null) {
                    if (findIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = findIndex;
                    }
                    else {
                        // 说明需要移动
                        moved = true;
                    }
                    // 记录新节点的位置
                    newIndexToOldIndexMap[findIndex - s2] = i + 1;
                    patch(preChild, c2[findIndex], container, parentComponent, null);
                    patched++;
                }
                else {
                    // 新节点在就旧节点中不存在，直接删除
                    hostRemove(preChild.el);
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
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const { type, props, children, shapeFlags } = vnode;
        const element = hostCreateElement(type);
        // 保存当前的el，后续this.$el调用
        vnode.el = element;
        for (let key in props) {
            const value = props[key];
            hostPatchProp(element, key, null, value);
        }
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            element.textContent = children;
        }
        else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, element, parentComponent, anchor);
        }
        hostInsert(element, container, anchor);
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        // 处理props和slots，运行setup
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(child => {
            patch(null, child, container, parentComponent, anchor);
        });
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
            const { proxy, isMounted } = instance;
            // init proxy是setup的值
            if (!isMounted) {
                // 在App组件中，render函数会被调用,App的this指向实例 第二个proxy是为了调用render函数的时候传参
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                patch(null, subTree, container, instance, null);
                // 取出返回结果，将el赋值给vnode.el上
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update 重新调用render函数
                const { subTree: prevSubTree, next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const subTree = instance.render.call(proxy, proxy);
                patch(prevSubTree, subTree, container, instance, null);
                // 取出返回结果，将el赋值给vnode.el上
                vnode.el = subTree.el;
                instance.subTree = subTree;
            }
        }, {
            scheduler() {
                // 将更新任务添加到任务队列中，使同步变为异步
                queueJobs(instance.update);
            }
        });
    }
    // 将createApp导出,内部利用闭包，保存了render
    return {
        createApp: createAppAPI(render)
    };
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
                }
                else {
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

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (isFunction(slot)) {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const provide = (key, value) => {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 引用类型provides不断向上指向父亲的provides
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent && currentInstance.parent.provides;
        // init 只执行一次，后续因为当前的provides赋值过，所以与父级的provides不相等
        if (provides === parentProvides) {
            // 因为provides是解构的，指向的是原来的地址，currentInstance.provides被指向了一块新内存，所以要重新赋值
            // 修改原型链，使拥有自己的provides，将原型链也指向父级的provides
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
};
const inject = (key, defaultValue) => {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (isFunction(defaultValue)) {
                return defaultValue();
            }
            return defaultValue;
        }
    }
};

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isEvent = key => /^on[A-Z]/.test(key);
    if (isEvent(key)) {
        // 添加事件监听
        const event = key.slice(2).toLocaleLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // nextVal 为空，则删除属性
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, container, anchor) {
    // 插入到指定位置，null或undefined则插入到最后
    container.insertBefore(el, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    debugger;
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    renderer: renderer,
    createApp: createApp,
    h: h,
    createRenderer: createRenderer,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    inject: inject,
    provide: provide,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !s;
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* TagType.Start */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
function parseInterpolation(context) {
    // {{message}}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return (node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */);
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

// mini-vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    // 执行code生成的代码
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
// 进行解耦注入
registerRuntimeCompiler(compileToFunction);

exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.renderer = renderer;
exports.toDisplayString = toDisplayString;
