import { pipe } from "fp-ts/lib/function";
import { FencedCodeBlock, MarkdownAST } from "./md-types";
import { EvalRTE, LanguageCompiler } from "./types";
import * as TE from "fp-ts/lib/TaskEither";
import * as A from "fp-ts/lib/Array";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { defaultLanguageCompilers } from "./lang-compilers";

const getCompilers = (): EvalRTE<LanguageCompiler[]> => (deps) => {
    const compilers: Record<string, LanguageCompiler> = {};
    for (const compiler of defaultLanguageCompilers) {
        compilers[compiler.language] = compiler;
    }
    for (const compiler of deps.languageCompilers) {
        compilers[compiler.language] = compiler;
    }
    return TE.of(Object.values(compilers));
};

type CompiledAST = {
    language: string;
    code: string;
};

const fencedCodeBlocksFromAST = (ast: MarkdownAST): FencedCodeBlock[] =>
    ast.filter((it) => it._tag === "FencedCodeBlock") as FencedCodeBlock[];

const filterLanguageBlocks = (
    ast: MarkdownAST,
    comp: LanguageCompiler
): FencedCodeBlock[] =>
    pipe(
        fencedCodeBlocksFromAST(ast),
        A.filter((it) => it.opener.infoString.includes(comp.language))
    );

const compileOneFile =
    (
        ast: MarkdownAST,
        comp: LanguageCompiler
    ): EvalRTE<O.Option<CompiledAST>> =>
    (_deps) =>
        pipe(
            filterLanguageBlocks(ast, comp),
            (blocks) =>
                TE.tryCatch(
                    () => comp.compileToExecutable(blocks),
                    (e) => e
                ),
            TE.map(
                O.map((it) => ({
                    code: it,
                    language: comp.language,
                }))
            )
        );

export const compileFile = (
    ast: MarkdownAST
): EvalRTE<readonly CompiledAST[]> =>
    pipe(
        getCompilers(),
        RTE.chain(RTE.traverseArray((comp) => compileOneFile(ast, comp))),
        RTE.map((it) =>
            it.reduce((p, c) => {
                if (O.isSome(c)) {
                    return [...p, c.value];
                }
                return p;
            }, [] as readonly CompiledAST[])
        )
    );
