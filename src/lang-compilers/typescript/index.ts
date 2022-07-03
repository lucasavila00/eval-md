import { LanguageCompiler } from "../../types";
import * as O from "fp-ts/lib/Option";
import { codeTemplate } from "./templates";
import { parseInfoString } from "../../parse-info-string";
import * as E from "fp-ts/lib/Either";
import * as prettier from "prettier";
import { FencedCodeBlock } from "../../md-types";

console.error("hoist imports");

// function visitNode(node: any, fn: any) {
//     if (Array.isArray(node)) {
//         // As of Node.js 16 using raw for loop over Array.entries provides a
//         // measurable difference in performance. Array.entries returns an iterator
//         // of arrays.
//         for (let i = 0; i < node.length; i++) {
//             node[i] = visitNode(node[i], fn);
//         }
//         return node;
//     }
//     if (node && typeof node === "object" && typeof node.type === "string") {
//         // As of Node.js 16 this is benchmarked to be faster over Object.entries.
//         // Object.entries returns an array of arrays. There are multiple ways to
//         // iterate over objects but the Object.keys combined with a for loop
//         // benchmarks well.
//         const keys = Object.keys(node);
//         for (let i = 0; i < keys.length; i++) {
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             //@ts-ignore
//             node[keys[i]] = visitNode(node[keys[i]], fn);
//         }
//         return fn(node) || node;
//     }
//     return node;
// }
const addConsumeToLastStatement = (node: any): any => {
    if (node.type !== "ExpressionStatement") {
        throw new Error("unrecognized node");
    }
    return {
        type: "ExpressionStatement",
        expression: {
            type: "CallExpression",
            callee: {
                type: "Identifier",
                name: "__consume",
            },
            optional: false,
            arguments: [node.expression],
        },
    };
};
const consumeLastStatement = (block: FencedCodeBlock): string => {
    if (block.content.length === 0) {
        throw new Error("code is empty");
    }
    return prettier
        .format(block.content, {
            filepath: "it.ts",
            parser: (text, cfg) => {
                const ast: any = cfg.typescript(text);
                const body = ast.body.map((node: any, index: number) => {
                    if (index === ast.body.length - 1) {
                        return addConsumeToLastStatement(node);
                    }
                    return node;
                });

                const newAst = { ...ast, body };
                return newAst;
            },
        })
        .trimEnd();
};

export const typescriptLanguageCompiler: LanguageCompiler = {
    language: "ts",
    compileToExecutable: async (blocks) => {
        let content = "";
        for (const b of blocks) {
            const either = parseInfoString(b.opener.infoString);
            if (E.isLeft(either)) {
                throw either.left;
            }
            const infoString = either.right.value;

            if (infoString.named["yield"] != null) {
                content += consumeLastStatement(b);
            } else {
                content += b.content;
            }
            content += "\n";
        }
        return O.some(codeTemplate(content));
    },
};
