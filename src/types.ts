import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { FencedCodeBlock } from "./md-types";

type TransportedError = any;

export type LanguageCompiler = {
    language: string;
    compileToExecutable: (
        blocks: FencedCodeBlock[]
    ) => Promise<O.Option<string>>;
};
type Reads = {
    languageCompilers: LanguageCompiler[];
};

export type EvalRTE<A> = RTE.ReaderTaskEither<Reads, TransportedError, A>;
