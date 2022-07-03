import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { FencedCodeBlock } from "./md-types";
import { FileSystem } from "./program/FileSystem";
import { Logger } from "./program/Logger";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";

export type TransportedError = any;

export type LanguageCompiler = {
    language: string;
    compileToExecutable: (
        blocks: NonEmptyArray<FencedCodeBlock>
    ) => Promise<O.Option<string>>;
};

export type Settings = {
    readonly srcDir: string;
    readonly outDir: string;
    readonly exclude: ReadonlyArray<string>;
    readonly languageCompilers: LanguageCompiler[];
};

export type Capabilities = {
    readonly fileSystem: FileSystem;
    readonly logger: Logger;
    // readonly settings: Settings;
};

export type Effect<A> = RTE.ReaderTaskEither<Capabilities, TransportedError, A>;

export type Environment = Capabilities & {
    readonly settings: Settings;
};

export type Program<A> = RTE.ReaderTaskEither<Environment, TransportedError, A>;
