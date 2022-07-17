// 利用闭包，将Component保存起来了
export const emit = (component, event: string, ...args) => {
  console.log(component)
  const { props } = component

  // 获取父组件传进来的props事件，然后找到触发
  const eventName = 'on' + upperFirst(camelize(event))

  const handler = props[eventName]
  // 触发事件，传递参数
  handler && handler(...args)
}

// 处理get-msg这种emit名，转换成getMsg
function camelize(event: string) {
  return event ? event.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : ''
  }) : ''
}

// 首字母大写
function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}