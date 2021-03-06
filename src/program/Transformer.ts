import { pipe } from "fp-ts/lib/function";
import * as Executor from "./Executor";
import * as MD from "./MarkdownParser";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as InfoString from "./InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as Core from "./Core";
import * as O from "fp-ts/lib/Option";
import * as Ord from "fp-ts/lib/Ord";
import * as TE from "fp-ts/lib/TaskEither";
import { TransportedError } from "./Errors";

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

export type BlockTransformer = (
    execBlock: MD.FencedCodeBlock,
    rawBlock: MD.FencedCodeBlock,
    infoString: InfoString.EvalInfoString,
    results: readonly Executor.LanguageExecutionResult[]
) => Core.Program<MD.AST>;

export type BlockTransformationResult = {
    readonly content: string;
    readonly infoString: string;
};

export type OutputTransformer = {
    readonly language: InfoString.OutputLanguage;
    readonly print: (
        result: Executor.BlockExecutionResult
    ) => TE.TaskEither<TransportedError, BlockTransformationResult>;
};

export const LanguageExecutionResultOrd: Ord.Ord<Executor.LanguageExecutionResult> =
    {
        equals: (a, b) =>
            a.blockIndex === b.blockIndex &&
            a._tag === b._tag &&
            a.content === b.content,
        compare: (first, second) => {
            if (
                first._tag === "BlockExecutionResult" &&
                second._tag === "ConsoleExecutionResult"
            ) {
                return 1;
            }
            if (
                first._tag === "ConsoleExecutionResult" &&
                second._tag === "BlockExecutionResult"
            ) {
                return -1;
            }
            return 0;
        },
    };

// -------------------------------------------------------------------------------------
// transformers
// -------------------------------------------------------------------------------------

const metaBlock: BlockTransformer = (_execBlock, rawBlock, infoString) => {
    if (infoString.flags.includes("meta")) {
        return RTE.of([
            MD.FencedCodeBlock(
                MD.print([rawBlock]),
                MD.FenceOpener(
                    rawBlock.opener.ticks + rawBlock.opener.ticks[0],
                    "md",
                    rawBlock.opener.precedingSpaces
                )
            ),
        ]);
    }
    return RTE.of([]);
};

const mainBlock: BlockTransformer = (execBlock, _rawBlock, infoString) =>
    RTE.of(
        infoString.flags.includes("hide")
            ? []
            : [
                  MD.FencedCodeBlock(
                      execBlock.content,
                      MD.FenceOpener(
                          execBlock.opener.ticks,
                          infoString.language,
                          execBlock.opener.precedingSpaces
                      )
                  ),
              ]
    );

const transformError = (
    result: Executor.BlockExecutionResult
): Core.Program<O.Option<BlockTransformationResult>> =>
    RTE.of(
        O.some({
            content: String(result.content),
            infoString: "js",
        })
    );

const transformPrintedValue = (
    result: Executor.BlockExecutionResult,
    printLanguage: InfoString.OutputLanguage
): Core.Program<O.Option<BlockTransformationResult>> =>
    pipe(
        RTE.ask<Core.Environment, TransportedError>(),
        RTE.chainTaskEitherKW((env) => {
            const printer = env.outputPrinters.find(
                (it) => it.language === printLanguage
            );
            if (printer == null) {
                return TE.left("Missing printer for output: " + printLanguage);
            }
            return printer.print(result);
        }),
        RTE.map(O.some)
    );

const transformConsoleValue = (
    result: Executor.ConsoleExecutionResult
): Core.Program<O.Option<BlockTransformationResult>> =>
    RTE.of(
        O.some({
            infoString: "#md#",
            content: "> " + result.level + ": " + JSON.parse(result.content),
        })
    );
const printBlock: BlockTransformer = (
    execBlock,
    _rawBlock,
    infoString,
    results
) => {
    const printLang = infoString.named[
        "out"
    ] as InfoString.OutputLanguage | null;
    const getPrintedBlocks = (
        it: ReadonlyArray<O.Option<BlockTransformationResult>>
    ): ReadonlyArray<BlockTransformationResult> =>
        it.reduce(
            (p, c) => (O.isSome(c) ? [...p, c.value] : p),
            [] as ReadonlyArray<BlockTransformationResult>
        );

    return pipe(
        results,
        RA.sort(LanguageExecutionResultOrd),
        RTE.traverseArray((it) =>
            it._tag == "BlockExecutionResult"
                ? printLang === "hide"
                    ? RTE.of(O.none)
                    : infoString.flags.includes("error")
                    ? transformError(it)
                    : transformPrintedValue(
                          it,
                          printLang ?? InfoString.DefaultOutputLanguage
                      )
                : transformConsoleValue(it)
        ),
        RTE.map(getPrintedBlocks),
        RTE.map(
            RA.map((it) =>
                it.infoString === "#md#"
                    ? MD.OtherMarkdown("\n" + it.content)
                    : MD.FencedCodeBlock(
                          it.content,
                          MD.FenceOpener(
                              execBlock.opener.ticks,
                              it.infoString,
                              execBlock.opener.precedingSpaces
                          )
                      )
            )
        )
    );
};

const transformEvalBlock: BlockTransformer = (
    execBlock,
    rawBlock,
    infoString,
    results
) =>
    pipe(
        [
            metaBlock(execBlock, rawBlock, infoString, results),
            mainBlock(execBlock, rawBlock, infoString, results),
            printBlock(execBlock, rawBlock, infoString, results),
        ],
        RTE.sequenceArray,
        RTE.map(RA.flatten),
        RTE.map(RA.intersperse<MD.AstNode>(MD.OtherMarkdown("\n")))
    );

// -------------------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------------------

export const transform = (
    execAst: MD.AST,
    rawAst: MD.AST,
    execResult: ReadonlyArray<Executor.Execution>
): Core.Program<MD.AST> => {
    let index = 0;
    return pipe(
        RA.zip(execAst, rawAst),
        RA.map(([block, rawBlock]) => {
            if (
                block._tag === "FencedCodeBlock" &&
                rawBlock._tag === "FencedCodeBlock" &&
                InfoString.isEval(block.opener.infoString)
            ) {
                const blockResults = pipe(
                    execResult,
                    RA.chain((it) => it.results),
                    RA.filter((it) => it.blockIndex === index)
                );

                index++;

                return pipe(
                    InfoString.parse(block.opener.infoString),
                    RTE.fromEither,
                    RTE.chain((infoString) =>
                        transformEvalBlock(
                            block,
                            rawBlock,
                            infoString.value,
                            blockResults
                        )
                    )
                );
            }
            return RTE.of([block]);
        }),
        RTE.sequenceArray,
        RTE.map(RA.flatten)
    );
};
