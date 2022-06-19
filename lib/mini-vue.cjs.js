'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
        // 保存当前实例
        this.deps = [];
        // 状态
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        activeEffect = this;
        shouldTrack = true;
        const result = this._fn();
        // reset
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
            this.onStop && this.onStop();
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    // 把 effect.deps 清空
    effect.deps.length = 0;
}
// 收集依赖
const targetMap = new Map();
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackRefValue(ref) {
    if (isTracking()) {
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
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    const dep = depsMap.get(key);
    triggerEffects(dep);
}
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
    extend(_effect, options);
    _effect.run();
    // 处理指针指向
    const runner = _effect.run.bind(_effect);
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
        // 判断key是否是isReadonly函数调用的
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
function proxyRefs(withProxyRefs) {
    return new Proxy(withProxyRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
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

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
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
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        // 设置instance，调用setup的时候，可以获取当前组件实例
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.vnode.props), { emit: instance.emit });
        // 处理setup返回参数
        handelSetupResult(instance, setupResult);
        // 执行完毕，清空instance
        setCurrentInstance(null);
    }
}
function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
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
function handelSetupResult(instance, setupResult) {
    if (isObject(setupResult)) {
        // 保存数据
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandler);
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

const Fragment = Symbol('Fragment');
const Text$1 = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        shapeFlags: getShapeFlags(type, children),
        children
    };
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text$1, {}, text);
}
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
    return function createApp(rootComponent) {
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

function createRenderer(options) {
    // 获取options的参数，让外部可以自定义传递处理方法来达到自定义渲染器效果，利用闭包的特性，将参数保存在内部
    const { createElement, patchProp, insert } = options;
    function render(vnode, container) {
        patch(null, vnode, container);
    }
    function patch(n1, n2, container, parentComponent) {
        const { shapeFlags, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processTextVNode(n1, n2, container);
                break;
            default:
                if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
                    // element类型
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlags & 2 /* ShapeFlags.COMPONENT_STATEFUL */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2.children, container, parentComponent);
    }
    function processTextVNode(n1, n2, container) {
        const { children } = n2;
        const textNode = document.createTextNode(children);
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container, parentComponent) {
        console.log('n1', n1);
        console.log('n2', n2);
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountElement(vnode, container, parentComponent) {
        const { type, props, children, shapeFlags } = vnode;
        const element = createElement(type);
        // 保存当前的el，后续this.$el调用
        vnode.el = element;
        for (let key in props) {
            const value = props[key];
            patchProp(element, key, value);
        }
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            element.textContent = children;
        }
        else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, element, parentComponent);
        }
        insert(element, container);
    }
    function mountComponent(vnode, container, parentComponent) {
        const instance = createComponentInstance(vnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, vnode, container);
    }
    function mountChildren(children, container, parentComponent) {
        children.forEach(child => {
            patch(null, child, container, parentComponent);
        });
    }
    function setupRenderEffect(instance, vnode, container) {
        // proxy是setup的值
        // 使用effect追踪render里调用ref等响应式参数，发生改变后重新触发
        effect(() => {
            const { proxy, isMounted, subTree: prevSubTree } = instance;
            // init
            if (!isMounted) {
                // 在App组件中，render函数会被调用,App的this指向实例
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance);
                // 取出返回结果，将el赋值给vnode.el上
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update 重新调用render函数
                const subTree = instance.render.call(proxy);
                patch(prevSubTree, subTree, container, instance);
                // 取出返回结果，将el赋值给vnode.el上
                vnode.el = subTree.el;
                instance.subTree = subTree;
            }
        });
    }
    // 将createApp导出
    return {
        createApp: createAppAPI(render)
    };
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
function patchProp(el, key, value) {
    const isEvent = key => /^on[A-Z]/.test(key);
    if (isEvent(key)) {
        // 添加事件监听
        const event = key.slice(2).toLocaleLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
function insert(el, container) {
    container.appendChild(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.renderer = renderer;
