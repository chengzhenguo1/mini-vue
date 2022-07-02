
export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  genFunctionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(", ");

  push(`function ${functionName}(${signature}){`);
  push("return ");
  push("}");

  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast, context) {
  const { push } = context;

  push("\n");
  push("return ");
}

function createCodegenContext(): any {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    }
  };

  return context;
}

