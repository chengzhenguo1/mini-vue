
export function transform(root, options) {
  const context = createTransFromContext(root, options)

  traverseNode(root, context)
}

function createTransFromContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || []
  }

  return context
}

function traverseNode(node: any, context) {
  const { nodeTransforms } = context

  if (Array.isArray(nodeTransforms)) {
    nodeTransforms.forEach(nodeTransform => {
      nodeTransform(node)
    })
  }

  let children = node.children

  if (children) {
    for (let i = 0; i < children.length; i++) {
      transform(children[i], context)
    }
  }

}
