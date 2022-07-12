import * as Executor from "./Executor";
import * as Transformer from "./Transformer";
import { defaultLanguageCompilers } from "../lang-executors";
import { defaultPrinters } from "../printers";
// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type Settings = {
    readonly srcDir: string;
    readonly outDir: string;
    readonly exclude: ReadonlyArray<string>;
    readonly languageCompilers: ReadonlyArray<Executor.LanguageExecutor>;
    readonly outputPrinters: ReadonlyArray<Transformer.OutputTransformer>;
    readonly runtimeMeta: Record<string, string>;
    readonly footer: string | null;
};

export const getDefaultSettings = (): Settings => ({
    languageCompilers: defaultLanguageCompilers,
    srcDir: "eval-mds",
    outDir: "docs",
    exclude: [],
    outputPrinters: defaultPrinters,
    runtimeMeta: {},
    footer: "\n---\n\nThis document used [eval-md](https://lucasavila00.github.io/eval-md/)",
});
