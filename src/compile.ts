import { pipe } from "fp-ts/lib/function";
import { FencedCodeBlock, MarkdownAST } from "./md-types";
import { EvalRTE, LanguageCompiler } from "./types";
import * as TE from "fp-ts/lib/TaskEither";
import * as A from "fp-ts/lib/Array";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { getInfoStringLanguage } from "./parse-info-string";

const getCompilers = (): EvalRTE<LanguageCompiler[]> => (deps) =>
    TE.of(deps.languageCompilers);

const fencedCodeBlocksFromAST = (ast: MarkdownAST): FencedCodeBlock[] =>
    ast.filter((it) => it._tag === "FencedCodeBlock") as FencedCodeBlock[];

const filterLanguageBlocks = (
    ast: MarkdownAST,
    comp: LanguageCompiler
): EvalRTE<FencedCodeBlock[]> =>
    pipe(
        fencedCodeBlocksFromAST(ast),
        A.filter((it) =>
            pipe(
                getInfoStringLanguage(it.opener.infoString),
                O.fold(
                    () => false,
                    (it) => it === comp.language
                )
            )
        ),
        RTE.of
    );

const tryCatchCompiler =
    (
        blocks: FencedCodeBlock[],
        comp: LanguageCompiler
    ): EvalRTE<O.Option<string>> =>
    (_deps) =>
        TE.tryCatch(
            () => comp.compileToExecutable(blocks),
            (e) => e
        );

type CompiledAST = {
    language: string;
    code: string;
};

const runOneCompiler = (
    ast: MarkdownAST,
    comp: LanguageCompiler
): EvalRTE<O.Option<CompiledAST>> =>
    pipe(
        filterLanguageBlocks(ast, comp),
        RTE.chain((blocks) => tryCatchCompiler(blocks, comp)),
        RTE.map(
            O.map((it) => ({
                code: it,
                language: comp.language,
            }))
        )
    );

export const compileOneFile = (
    ast: MarkdownAST
): EvalRTE<readonly CompiledAST[]> =>
    pipe(
        getCompilers(),
        RTE.chain(RTE.traverseArray((comp) => runOneCompiler(ast, comp))),
        RTE.map((it) =>
            it.reduce((p, c) => {
                if (O.isSome(c)) {
                    return [...p, c.value];
                }
                return p;
            }, [] as readonly CompiledAST[])
        )
    );
