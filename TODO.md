-   [ ] exec shouldn't be called index, might collide with md

-   [ ] adding custom printer, like custom lang

-   [ ] eslint

    -   [ ] enable no console

-   [ ] validate eval args, prevent extra args

-   [ ] cleanup the @since
-   [ ] attribute docs-ts

-   [ ] tests

    -   [ ] enable coverage

----- console

```ts
import * as prettier from "prettier";
import * as util from "util";

function visitNode(node: any, fn: any) {
    if (Array.isArray(node)) {
        // As of Node.js 16 using raw for loop over Array.entries provides a
        // measurable difference in performance. Array.entries returns an iterator
        // of arrays.
        for (let i = 0; i < node.length; i++) {
            node[i] = visitNode(node[i], fn);
        }
        return node;
    }
    if (node && typeof node === "object" && typeof node.type === "string") {
        // As of Node.js 16 this is benchmarked to be faster over Object.entries.
        // Object.entries returns an array of arrays. There are multiple ways to
        // iterate over objects but the Object.keys combined with a for loop
        // benchmarks well.
        const keys = Object.keys(node);
        for (let i = 0; i < keys.length; i++) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            node[keys[i]] = visitNode(node[keys[i]], fn);
        }
        return fn(node) || node;
    }
    return node;
}
console.error("make use of it");
const src = `
x.console.log('a')
console.log('a')
consol.log('a')
`;
it("works", () => {
    const it = prettier.format(src, {
        filepath: "it.ts",
        parser: (text, cfg) => {
            const ast: any = cfg.typescript(text);

            console.error(JSON.stringify(ast.body, null, 2));
            console.error(util.inspect(ast.body));

            const body = visitNode(ast.body, (node: any) => {
                if (node.type === "CallExpression") {
                    const callee = node.callee;
                    if (callee.type === "MemberExpression") {
                        const object = callee.object;
                        if (
                            object.type === "Identifier" &&
                            object.name === "console"
                        ) {
                            return {
                                ...node,
                                callee: {
                                    ...callee,
                                    object: { ...object, name: "__console" },
                                },
                            };
                        }
                    }
                }
                return node;
            });
            const newAst = { ...ast, body };
            return newAst;
        },
    });

    expect(it).toMatchInlineSnapshot(`
        "x.console.log(\\"a\\");
        __console.log(\\"a\\");
        consol.log(\\"a\\");
        "
    `);
});
```
