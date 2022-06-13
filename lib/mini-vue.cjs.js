'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// 继承函数
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (val) => typeof val === 'string';
const isArray = (val) => Array.isArray(val);

const publicPropertiesMap = {
    $el: (i) => i.vnode.el
};
const PublicInstanceProxyHandler = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function setupComponent(instance) {
    // TODO 处理props和slots
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        const setupResult = setup();
        handelSetupResult(instance, setupResult);
    }
}
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type
    };
    return component;
}
function handelSetupResult(instance, setupResult) {
    if (isObject(setupResult)) {
        // 保存数据
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandler);
    // if (!Component.render) {
    // }
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    const { shapeFlags } = vnode;
    if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
        // element类型
        processElement(vnode, container);
    }
    else if (shapeFlags & 2 /* ShapeFlags.COMPONENT_STATEFUL */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountElement(vnode, container) {
    const { type, props, children, shapeFlags } = vnode;
    const element = document.createElement(type);
    // 保存当前的el，后续this.$el调用
    vnode.el = element;
    for (let key in props) {
        const value = props[key];
        element.setAttribute(key, value);
    }
    if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        element.textContent = children;
    }
    else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(children, element);
    }
    container.appendChild(element);
}
function mountComponent(vnode, container) {
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, vnode, container);
}
function mountChildren(children, container) {
    children.forEach(child => {
        patch(child, container);
    });
}
function setupRenderEffect(instance, vnode, container) {
    const { proxy } = instance;
    // 在App组件中，render函数会被调用,App的this指向实例
    const subTree = instance.render.call(proxy);
    patch(subTree, container);
    // 取出返回结果，将el赋值给vnode.el上
    vnode.el = subTree.el;
    // 测试
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        shapeFlags: getShapeFlags(type, children),
        children
    };
    return vnode;
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
    return flags;
}

function createApp(rootComponent) {
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
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;
