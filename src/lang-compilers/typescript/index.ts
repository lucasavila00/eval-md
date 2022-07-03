import { LanguageCompiler } from "../../types";
import * as O from "fp-ts/lib/Option";
import { codeTemplate } from "./templates";

console.error("hoist imports");

export const typescriptLanguageCompiler: LanguageCompiler = {
    language: "ts",
    compileToExecutable: async (blocks) => {
        let content = "";
        for (const b of blocks) {
            content += b.content;
            content += "\n";
        }
        return O.some(codeTemplate(content));
    },
};
