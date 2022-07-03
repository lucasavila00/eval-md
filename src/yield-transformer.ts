import { FencedCodeBlock, MarkdownAST, OtherMarkdown } from "./md-types";
import { isEvalInfoString } from "./parse-info-string";

type ExecResult = {
    language: string;
    data: any[];
};

export const yieldTransformer = (
    ast: MarkdownAST,
    _execResult: ExecResult[]
): MarkdownAST => {
    const acc: (OtherMarkdown | FencedCodeBlock)[] = [];

    for (const item of ast) {
        if (item._tag === "FencedCodeBlock") {
            if (isEvalInfoString(item.opener.infoString)) {
                // if is yield block, add yielded data
                // if not yield, add to acc, applying transforms
            }
            acc.push(item);
        } else {
            acc.push(item);
        }
    }
    return acc;
};
