import { LanguageCompiler } from "../types";
import * as O from "fp-ts/lib/Option";

export const typescriptLanguageCompiler: LanguageCompiler = {
    language: "ts",
    compileToExecutable: async () => O.some("the_code"),
};
