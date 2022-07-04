import * as Executor from "./Executor";
import * as Transformer from "./Transformer";
// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type Settings = {
    readonly srcDir: string;
    readonly outDir: string;
    readonly exclude: ReadonlyArray<string>;
    readonly languageCompilers: ReadonlyArray<Executor.LanguageCompiler>;
    readonly outputPrinters: ReadonlyArray<Transformer.OutputTransformer>;
};
