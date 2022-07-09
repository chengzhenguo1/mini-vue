// mini-vue 出口
export * from "./runtime-dom";
import { baseCompile } from "./compiler-core/src";
import * as runtimeDom from "./runtime-dom";
import { registerRuntimeCompiler } from "./runtime-dom";
 
function compileToFunction(template) {
  const { code } = baseCompile(template);
  // 执行code生成的代码
  const render = new Function("Vue", code)(runtimeDom);
  return render;
}

// 进行解耦注入
registerRuntimeCompiler(compileToFunction);
