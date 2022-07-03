import { LanguageCompiler } from "../../types";
import * as O from "fp-ts/lib/Option";
import { codeTemplate } from "./templates";
import { parseInfoString } from "../../parse-info-string";
import * as E from "fp-ts/lib/Either";
import * as prettier from "prettier";
import { FencedCodeBlock } from "../../md-types";

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
const consumeError = (code: string) => {
    return `try {${code}; throw new Error('did-not-throw')}
catch(e:any) {if(e.message === 'did-not-throw'){throw e}else{__consume(e)}}`;
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

            if (infoString.named["print"] != null) {
                if (infoString.named["print"] === "error") {
                    content += consumeError(b.content);
                } else {
                    content += consumeLastStatement(b);
                }
            } else {
                content += b.content;
            }
            content += "\n";
        }
        return O.some(codeTemplate(content));
    },
};
