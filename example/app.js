export default {
  render() {
    return h('div', `hi ${this.msg}`);
  },
  setup() {
    const msg = ref('Hello Mini-Vue!');

    return {
      msg
    }
  }
}