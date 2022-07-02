import * as C from "parser-ts/char";
import * as S from "parser-ts/string";
import * as P from "parser-ts/Parser";
import { flow, pipe } from "fp-ts/lib/function";

const StringEOF = pipe(
    P.eof<string>(),
    P.map((_it) => "")
);

export type ValidMarkdown = {
    _tag: "ValidMarkdown";
    content: string;
};

export const ValidMarkdown = (content: string): ValidMarkdown => ({
    _tag: "ValidMarkdown",
    content,
});

export type FencedCodeBlock = {
    _tag: "FencedCodeBlock";
    content: string;
};

export const FencedCodeBlock = (content: string): FencedCodeBlock => ({
    _tag: "FencedCodeBlock",
    content,
});

const PrecedingFenceSpaces = pipe(
    S.string("\n"),
    P.chain(() =>
        pipe(
            S.string(" "),
            P.alt(() => S.string("  ")),
            P.alt(() => S.string("   ")),
            P.optional
        )
    )
);

type FenceOpenerT = {
    _tag: "FenceOpenerT";
    ticks: string;
    meta: string;
};
const FenceOpenerT = (ticks: string, meta: string): FenceOpenerT => ({
    _tag: "FenceOpenerT",
    ticks,
    meta,
});
const FenceOpener = pipe(
    PrecedingFenceSpaces,
    P.chain(() => S.string("~~~")),
    P.chain((it) =>
        pipe(
            S.many(C.char("~")),
            P.map((p) => it + p)
        )
    ),
    P.bindTo("ticks"),
    P.bind("meta", () =>
        P.manyTill(
            P.item(),
            P.lookAhead(P.either(S.string("\n"), () => StringEOF))
        )
    ),
    P.map((it) => {
        return FenceOpenerT(it.ticks, "it.meta");
    })
);

const FenceCloser = (openerTicks: string) =>
    pipe(
        PrecedingFenceSpaces,
        P.chain(() => S.string(openerTicks)),
        P.chain((it) =>
            pipe(
                S.many(C.char(openerTicks[0])),
                P.map((p) => it + p)
            )
        )
    );

// const FenceOpenerLA = P.lookAhead(FenceOpener);
const FenceCloserLA = flow(FenceCloser, P.lookAhead);

export const Code = pipe(
    FenceOpener,
    P.bindTo("opener"),
    P.bind("content", (acc) =>
        P.manyTill(
            P.item<string>(),
            P.either(FenceCloserLA(acc.opener.ticks), () => StringEOF)
        )
    ),
    P.bind("closer", (acc) =>
        P.either(FenceCloser(acc.opener.ticks), () => StringEOF)
    ),
    P.map((it) => it.content.join("").replace("\n", "")),
    P.map(FencedCodeBlock)
);

// export const ValidMarkdownParser = pipe(
//     P.many1Till(
//         P.item<string>(),
//         P.either(pipe(FenceOpenerLA), () => StringEOF)
//     ),
//     P.map((it) => it.join("")),
//     P.map(ValidMarkdown)
// );

// export const parser = pipe(
//     ValidMarkdownParser,
//     P.bindTo("md"),
//     P.bind("code", () => P.optional(Code)),
//     (it) => P.many1Till(it, P.eof())
// );
