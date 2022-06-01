import { reactive } from '../reactive'

describe('reactive', () => {
  it('happy path', () => {
    const user = {
      name: 'zs'
    }

    const obj = reactive(user)

    expect(obj.name).toBe('zs')

    // 响应式包裹的对象不等于原始对象
    expect(obj).not.toBe(user)
  })
})