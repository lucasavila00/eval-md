import { hole } from "fp-ts/lib/function";
import { FencedCodeBlock, MarkdownAST, OtherMarkdown } from "./md-types";

type ExecResult = {
    language: string;
    data: any[];
};

const yieldTransformer = (
    ast: MarkdownAST,
    execResult: ExecResult[]
): MarkdownAST => {
    const acc: (OtherMarkdown | FencedCodeBlock)[] = [];

    for (const item of ast) {
        if (item._tag === "FencedCodeBlock") {
            // TODO check if is eval call
            // if is yield block, add yielded data

            // if not yield, add to acc
            acc.push(item);
        } else {
            acc.push(item);
        }
    }
    return acc;
};
