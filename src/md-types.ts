import * as O from "fp-ts/lib/Option";
export type OtherMarkdown = {
    _tag: "OtherMarkdown";
    content: string;
};

export type FenceOpener = {
    _tag: "FenceOpener";
    ticks: string;
    infoString: string;
    precedingSpaces: O.Option<string>;
};
export type FencedCodeBlock = {
    _tag: "FencedCodeBlock";
    content: string;
    opener: FenceOpener;
};

export const OtherMarkdown = (content: string): OtherMarkdown => ({
    _tag: "OtherMarkdown",
    content,
});

export const FenceOpener = (
    ticks: string,
    meta: string,
    precedingSpaces: O.Option<string>
): FenceOpener => ({
    _tag: "FenceOpener",
    ticks,
    infoString: meta,
    precedingSpaces,
});

export const FencedCodeBlock = (
    content: string,
    opener: FenceOpener
): FencedCodeBlock => ({
    _tag: "FencedCodeBlock",
    content,
    opener,
});

export type MarkdownAST = readonly (OtherMarkdown | FencedCodeBlock)[];
