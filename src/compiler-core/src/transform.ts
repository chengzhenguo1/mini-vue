
export function transform(root, options = {}) {
  const context = createTransFromContext(root, options)

  traverseNode(root, context)
  createRootCodegen(root);
}

// 挂载到root.codegenNode上
function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}

function createTransFromContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || []
  }

  return context
}

// 循环转换Nodes
function traverseNode(node: any, context) {
  const { nodeTransforms } = context

  // 执行传入进来的nodeTransforms
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node, context);
  }

  let children = node.children

  if (children) {
    for (let i = 0; i < children.length; i++) {
      traverseNode(children[i], context)
    }
  }
}
