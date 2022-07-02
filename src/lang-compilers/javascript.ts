import { LanguageCompiler } from "../types";
import * as O from "fp-ts/lib/Option";

export const javascriptLanguageCompiler: LanguageCompiler = {
    language: "js",
    compileToExecutable: async () => O.some("the_code"),
};
