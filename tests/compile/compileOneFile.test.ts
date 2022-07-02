import { compileOneFile } from "../../src/compile";
import { parseMarkdown } from "../../src/parse-md";
import { EvalReads } from "../../src/types";
import { assertIsRight } from "../utils";
import * as O from "fp-ts/lib/Option";

const buildDeps = (it: Partial<EvalReads> = {}): EvalReads => it as any;

const str1 = `~~~ts
~~~`;
it("str1", async () => {
    const ast = parseMarkdown(str1);
    assertIsRight(ast);
    const deps = buildDeps({
        languageCompilers: [
            {
                language: "ts",
                compileToExecutable: async () => O.some("the_code"),
            },
        ],
    });
    const op = await compileOneFile(ast.right.value)(deps)();
    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Array [
          Object {
            "code": "the_code",
            "language": "ts",
          },
        ]
    `);
});

const str2 = `~~~ts
~~~

~~~js
~~~

`;
it("str2", async () => {
    const ast = parseMarkdown(str2);
    assertIsRight(ast);
    const deps = buildDeps({
        languageCompilers: [
            {
                language: "ts",
                compileToExecutable: async () => O.some("ts_comp"),
            },
            {
                language: "js",
                compileToExecutable: async () => O.some("js_comp"),
            },
        ],
    });
    const op = await compileOneFile(ast.right.value)(deps)();
    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Array [
          Object {
            "code": "ts_comp",
            "language": "ts",
          },
          Object {
            "code": "js_comp",
            "language": "js",
          },
        ]
    `);
});
