'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// 继承函数
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (val) => typeof val === 'string';
const isArray = (val) => Array.isArray(val);

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
    // if (!Component.render) {
    // }
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    const { type } = vnode;
    if (isString(type)) {
        // element类型
        processElement(vnode, container);
    }
    else if (isObject(type)) {
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
    const { type, props, children } = vnode;
    const element = document.createElement(type);
    for (let key in props) {
        const value = props[key];
        element.setAttribute(key, value);
    }
    if (isString(children)) {
        element.textContent = children;
    }
    else if (isArray(children)) {
        mountChildren(children, element);
    }
    container.appendChild(element);
}
function mountComponent(vnode, container) {
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}
function mountChildren(children, container) {
    children.forEach(child => {
        patch(child, container);
    });
}
function setupRenderEffect(instance, container) {
    const subTree = instance.render();
    patch(subTree, container);
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
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
