import { Project, Node, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
const transform = () => {
    const project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });

    project.createSourceFile(
        "out-goal/index.ts",
        fs.readFileSync(
            path.join(__dirname, "../out-goal/index.ts.bak"),
            "utf-8"
        )
    );
    project.createSourceFile(
        "out-goal/table.ts",
        fs.readFileSync(
            path.join(__dirname, "../out-goal/table.ts.bak"),
            "utf-8"
        )
    );
    const sourceFile = project.getSourceFile("out-goal/index.ts")!;
    // this can be done starting on any node and not just the root node

    // outputs: 2; 3; 4;
    sourceFile.forEachDescendant((node) => {
        if (Node.isCallExpression(node)) {
            const e = node.getExpressionIfKind(SyntaxKind.Identifier);

            const names = e
                ?.getType()
                .getCallSignatures()[0]
                ?.getParameters()
                .map((p) => p.getFullyQualifiedName());

            node.getArguments().forEach((arg, index) => {
                const inlay = names?.[index] ?? "";
                if (inlay != "") {
                    arg.replaceWithText(
                        "/* " + inlay + ": */ " + arg.getText()
                    );
                }
            });
        }
        return undefined; // return a falsy value or no value to continue iterating
    });

    return sourceFile;
};
it("works", async () => {
    const it = transform();

    expect(it?.getFullText()).toMatchInlineSnapshot(`
        "import { table } from \\"./table\\";

        const add1 = (it: number) => it + 1;
        add1(/* it: */ 3);

        table(/* columns: */ [\\"a\\", \\"b\\"], /* alias: */ \\"c\\");

        export {};
        "
    `);
});
