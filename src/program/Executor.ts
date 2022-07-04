import { pipe } from "fp-ts/lib/function";
import * as Core from "./Core";
import { File } from "./FileSystem";
import * as InfoString from "./InfoStringParser";
import * as MD from "./MarkdownParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type BlockExecutionResult = {
    readonly blockIndex: number;
    readonly content: string;
};
export type ExecutedLanguageResult = {
    readonly file: File;
    readonly results: ReadonlyArray<BlockExecutionResult>;
};

export type CompilerInputFile = {
    readonly blocks: ReadonlyArray<MD.FencedCodeBlock>;
    readonly file: File;
};

export type LanguageExecutor = {
    readonly language: InfoString.InputLanguage;
    readonly execute: (
        files: ReadonlyArray<CompilerInputFile>
    ) => Core.Program<ReadonlyArray<ExecutedLanguageResult>>;
};

export type Execution = Core.AstAndFile & {
    readonly results: ReadonlyArray<BlockExecutionResult>;
};

// -------------------------------------------------------------------------------------
// transformations
// -------------------------------------------------------------------------------------

const fencedCodeBlocks = (ast: MD.AST): MD.FencedCodeBlock[] =>
    ast.filter((it) => it._tag === "FencedCodeBlock") as MD.FencedCodeBlock[];

const compilerInputs = (
    files: ReadonlyArray<Core.AstAndFile>,
    language: InfoString.InputLanguage
): ReadonlyArray<CompilerInputFile> =>
    pipe(
        files,
        RA.map((it) => ({
            blocks: pipe(
                fencedCodeBlocks(it.ast),
                RA.filter((it) =>
                    pipe(
                        // Do it as lazily as possible.
                        // Only throw errors if we're supposed to eval the code block.
                        InfoString.getLanguage(it.opener.infoString),
                        O.fold(
                            () => false,
                            (lang) =>
                                lang === language &&
                                InfoString.isEval(it.opener.infoString)
                        )
                    )
                )
            ),
            file: it.file,
        }))
    );

// -------------------------------------------------------------------------------------
// validations
// -------------------------------------------------------------------------------------

const assertAllPrintBlocksHaveCompilers = (
    files: ReadonlyArray<Core.AstAndFile>
): Core.Program<void> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chainEitherK((env) =>
            pipe(
                files,
                RA.chain((it) => fencedCodeBlocks(it.ast)),
                RA.map((it) =>
                    pipe(
                        InfoString.getLanguage(it.opener.infoString),
                        O.fold(
                            () => E.of(void 0),
                            (lang) =>
                                env.settings.languageCompilers.some(
                                    (it) => it.language === lang
                                )
                                    ? E.of(void 0)
                                    : E.left(
                                          `Missing compiler for input language: ${lang}`
                                      )
                        )
                    )
                ),
                E.sequenceArray,
                E.map((_arr) => void 0)
            )
        )
    );

// -------------------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------------------

export const run = (
    files: ReadonlyArray<Core.AstAndFile>
): Core.Program<ReadonlyArray<Execution>> =>
    pipe(
        assertAllPrintBlocksHaveCompilers(files),
        RTE.chain(() => RTE.ask()),
        RTE.chain((env) =>
            pipe(
                env.settings.languageCompilers,
                RTE.traverseArray((compiler) =>
                    compiler.execute(compilerInputs(files, compiler.language))
                )
            )
        ),
        RTE.map(RA.flatten),
        RTE.map((compilations) =>
            pipe(
                files,
                RA.map((reference) => ({
                    ...reference,
                    results: pipe(
                        compilations,
                        RA.filter((it) => it.file.path === reference.file.path),
                        RA.chain((it) => it.results)
                    ),
                }))
            )
        )
    );
