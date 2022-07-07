import { pipe } from "fp-ts/lib/function";
import * as Executor from "./Executor";
import * as MD from "./MarkdownParser";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as InfoString from "./InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as Core from "./Core";
import * as O from "fp-ts/lib/Option";

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

export type BlockTransformer = (
    execBlock: MD.FencedCodeBlock,
    rawBlock: MD.FencedCodeBlock,
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
    ) => Core.Program<O.Option<BlockTransformationResult>>;
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

const transformPrintedValue = (
    result: Executor.BlockExecutionResult,
    printLanguage: InfoString.OutputLanguage
): Core.Program<O.Option<BlockTransformationResult>> =>
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

const printBlock: BlockTransformer = (
    execBlock,
    _rawBlock,
    infoString,
    results
) => {
    if (infoString.flags.includes("hideout")) {
        return RTE.of([]);
    }
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
        RTE.traverseArray((it) =>
            transformPrintedValue(
                it,
                printLang ?? InfoString.DefaultOutputLanguage
            )
        ),
        RTE.map(getPrintedBlocks),
        RTE.map(
            RA.map((it) =>
                MD.FencedCodeBlock(
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
        RTE.map(RA.intersperse<MD.AstNodes>(MD.OtherMarkdown("\n")))
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
