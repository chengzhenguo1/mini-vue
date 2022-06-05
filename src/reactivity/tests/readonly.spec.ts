import { readonly } from "../reactive"

describe('readonly', () => {
  it('happy path', () => {
    const user = { name: 'zs', son: { name: 'ls' } }

    const readonlyUser = readonly(user)

    expect(readonlyUser).not.toBe(user)

    expect(readonlyUser.name).toBe('zs')
  })
  
  it('should call console.warn when set', () => {
    // 创建一个fn对象
    console.warn = jest.fn()

    const user = readonly({ name: 'zs' })

    user.name = 'zs'
    // 调用warn是否被调用
    expect(console.warn).toHaveBeenCalled()
  })
})