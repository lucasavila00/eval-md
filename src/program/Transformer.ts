import { pipe } from "fp-ts/lib/function";
import * as Executor from "./Executor";
import * as MD from "./MarkdownParser";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as InfoString from "./InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as Core from "./Core";

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

export type BlockTransformer = (
    block: MD.FencedCodeBlock,
    infoString: InfoString.EvalInfoString,
    results: readonly Executor.BlockExecutionResult[]
) => Core.Program<MD.AST>;

export type BlockTransformationResult = {
    readonly content: string;
    readonly infoString: string;
};

export type OutputTransformer = {
    readonly language: InfoString.OutputLanguage;
    readonly print: (
        result: Executor.BlockExecutionResult
    ) => Core.Program<BlockTransformationResult>;
};

// -------------------------------------------------------------------------------------
// transformers
// -------------------------------------------------------------------------------------

const metaBlock: BlockTransformer = (block, infoString) => {
    if (infoString.flags.includes("meta")) {
        return RTE.of([
            MD.FencedCodeBlock(
                MD.print([block]),
                MD.FenceOpener(
                    block.opener.ticks + block.opener.ticks[0],
                    "md",
                    block.opener.precedingSpaces
                )
            ),
        ]);
    }
    return RTE.of([]);
};

const mainBlock: BlockTransformer = (block, infoString) =>
    RTE.of([
        MD.FencedCodeBlock(
            block.content,
            MD.FenceOpener(
                block.opener.ticks,
                infoString.language,
                block.opener.precedingSpaces
            )
        ),
    ]);

const transformPrintedValue = (
    result: Executor.BlockExecutionResult,
    printLanguage: InfoString.OutputLanguage
): Core.Program<BlockTransformationResult> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chain((env) => {
            const printer = env.settings.outputPrinters.find(
                (it) => it.language === printLanguage
            );
            if (printer == null) {
                return RTE.left("Missing printer for output: " + printLanguage);
            }
            return printer.print(result);
        })
    );

const printBlock: BlockTransformer = (block, infoString, results) => {
    const printLang = infoString.named[
        "print"
    ] as InfoString.OutputLanguage | null;
    if (printLang != null) {
        return pipe(
            results,
            RTE.traverseArray((it) => transformPrintedValue(it, printLang)),
            RTE.map(
                RA.map((it) =>
                    MD.FencedCodeBlock(
                        it.content,
                        MD.FenceOpener(
                            block.opener.ticks,
                            it.infoString,
                            block.opener.precedingSpaces
                        )
                    )
                )
            )
        );
    }

    return RTE.of([]);
};

const transformEvalBlock: BlockTransformer = (block, infoString, results) =>
    pipe(
        [
            metaBlock(block, infoString, results),
            mainBlock(block, infoString, results),
            printBlock(block, infoString, results),
        ],
        RTE.sequenceArray,
        RTE.map(RA.flatten),
        RTE.map(RA.intersperse<MD.AstNodes>(MD.OtherMarkdown("\n")))
    );

// -------------------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------------------

export const transform = (
    ast: MD.AST,
    execResult: ReadonlyArray<Executor.Execution>
): Core.Program<MD.AST> =>
    pipe(
        ast,
        RA.mapWithIndex((index, block) => {
            if (
                block._tag === "FencedCodeBlock" &&
                InfoString.isEval(block.opener.infoString)
            ) {
                return pipe(
                    InfoString.parse(block.opener.infoString),
                    RTE.fromEither,
                    RTE.chain((infoString) =>
                        transformEvalBlock(
                            block,
                            infoString.value,
                            pipe(
                                execResult,
                                RA.chain((it) => it.results),
                                RA.filter((it) => it.blockIndex === index)
                            )
                        )
                    )
                );
            }
            return RTE.of([block]);
        }),
        RTE.sequenceArray,
        RTE.map(RA.flatten)
    );