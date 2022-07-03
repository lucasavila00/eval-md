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

const transformPrintedValue = (value: any, printLanguage: string): string => {
    switch (printLanguage) {
        case "json": {
            return JSON.stringify(JSON.parse(value));
        }
        case "sql": {
            return value;
        }
        case "error": {
            return value;
        }
        default: {
            throw new Error("invalid language");
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
                    // if is print block, add printed data
                    if (infoString.named["print"] != null) {
                        const printLang = infoString.named["print"];
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
                                transformPrintedValue(ret, printLang),
                                FenceOpener(
                                    item.opener.ticks,
                                    printLang,
                                    item.opener.precedingSpaces
                                )
                            ),
                        ];
                    } else {
                        // not print block, remove anything other than language from info string
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
