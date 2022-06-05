import { isReadonly, readonly } from "../reactive"

describe('readonly', () => {
  it('happy path', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);

    expect(wrapped).not.toBe(original);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly({ name: 'zs' })).toBe(false)
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