import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { FencedCodeBlock } from "./md-types";
import { FileSystem } from "./program/FileSystem";
import { Logger } from "./program/Logger";

export type TransportedError = any;

export type LanguageCompiler = {
    language: string;
    compileToExecutable: (
        blocks: FencedCodeBlock[]
    ) => Promise<O.Option<string>>;
};

export type Settings = {
    readonly srcDir: string;
    readonly outDir: string;
    readonly exclude: ReadonlyArray<string>;
};

export type EvalReads = {
    readonly languageCompilers: LanguageCompiler[];
    readonly fileSystem: FileSystem;
    readonly logger: Logger;
    readonly settings: Settings;
};

export type EvalRTE<A> = RTE.ReaderTaskEither<EvalReads, TransportedError, A>;
