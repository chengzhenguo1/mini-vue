import { computed } from "../compunted"
import { reactive } from "../reactive"

describe('computed', () => {
  it('happy path', () => {
    const user = reactive({
      age: 10
    })

    // 原理就是创建了个effect，获取的时候调用effect.run()
    const getter = computed(() => {
      return user.age
    })

    expect(getter.value).toBe(10)
  })

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });

    const getter = jest.fn(() => {
      return value.foo;
    });

    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    cValue.value; // get
    expect(getter).toHaveBeenCalledTimes(1);

    // // should not compute until needed
    value.foo = 2;
    expect(getter).toHaveBeenCalledTimes(1);

    // // now it should compute
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
})