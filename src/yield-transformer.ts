import {
    FencedCodeBlock,
    FenceOpener,
    MarkdownAST,
    OtherMarkdown,
} from "./md-types";
import {
    InfoString,
    isEvalInfoString,
    parseInfoString,
} from "./parse-info-string";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { pipe } from "fp-ts/lib/function";
import { printMarkdown } from "./parse-md";

type PerFileAndLanguageExecResult = {
    language: string;
    data: any[];
};

const transformYieldedValue = (value: any, yieldLanguage: string) => {
    switch (yieldLanguage) {
        case "json": {
            return JSON.stringify(value);
        }
        case "sql": {
            return value;
        }
    }
};

console.error("rename file");
console.error("improve error handling, refactor...");

const addMeta = (
    infoString: InfoString,
    block: FencedCodeBlock
): MarkdownAST => {
    if (infoString.flags.includes("meta")) {
        const printed = printMarkdown([block]);
        return [
            FencedCodeBlock(
                printed,
                FenceOpener(
                    block.opener.ticks + block.opener.ticks[0],
                    "md",
                    block.opener.precedingSpaces
                )
            ),
            OtherMarkdown("\n"),
        ];
    }
    return [];
};
export const evalTransformer = (
    ast: MarkdownAST,
    execResult: PerFileAndLanguageExecResult[]
): MarkdownAST => {
    const languageIndexes: Record<string, number> = {};
    return pipe(
        ast,
        RA.chain((item) => {
            if (
                item._tag === "FencedCodeBlock" &&
                isEvalInfoString(item.opener.infoString)
            ) {
                const either = parseInfoString(item.opener.infoString);
                if (E.isLeft(either)) {
                    throw new Error("info string parse error");
                } else {
                    const infoString = either.right.value;
                    // if is yield block, add yielded data
                    if (infoString.named["yield"] != null) {
                        const yieldLang = infoString.named["yield"];
                        const thisLangExec = execResult.find(
                            (it) => it.language === infoString.language
                        );
                        const index =
                            languageIndexes[infoString.language] ||
                            (languageIndexes[infoString.language] = 0);
                        const ret = thisLangExec?.data[index];
                        languageIndexes[infoString.language]++;
                        return [
                            ...addMeta(infoString, item),
                            FencedCodeBlock(
                                item.content,
                                FenceOpener(
                                    item.opener.ticks,
                                    infoString.language,
                                    item.opener.precedingSpaces
                                )
                            ),
                            OtherMarkdown("\n"),
                            FencedCodeBlock(
                                transformYieldedValue(ret, yieldLang),
                                FenceOpener(
                                    item.opener.ticks,
                                    yieldLang,
                                    item.opener.precedingSpaces
                                )
                            ),
                        ];
                    } else {
                        // not yield block, remove anything other than language from info string
                        return [
                            ...addMeta(infoString, item),
                            FencedCodeBlock(
                                item.content,
                                FenceOpener(
                                    item.opener.ticks,
                                    infoString.language,
                                    item.opener.precedingSpaces
                                )
                            ),
                        ];
                    }
                }
            }

            return [item];
        })
    );
};
