import { isReactive, isReadonly, reactive } from '../reactive'

describe('reactive', () => {
  it('happy path', () => {
    const user = {
      name: 'zs'
    }

    const obj = reactive(user)

    expect(obj.name).toBe('zs')

    // 响应式包裹的对象不等于原始对象
    expect(obj).not.toBe(user)

    expect(isReactive(obj)).toBe(true)
    expect(isReadonly(obj)).toBe(false)
  })

  test("nested reactives", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });
})