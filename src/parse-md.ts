import * as C from "parser-ts/char";
import * as S from "parser-ts/string";
import * as P from "parser-ts/Parser";
import { flow, pipe } from "fp-ts/lib/function";
import { Option, isSome } from "fp-ts/lib/Option";

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
            S.string("   "),
            P.alt(() => S.string("  ")),
            P.alt(() => S.string(" ")),
            P.optional
        )
    )
);

type FenceOpenerT = {
    _tag: "FenceOpenerT";
    ticks: string;
    meta: string;
    precedingSpaces: Option<string>;
};
const FenceOpenerT = (
    ticks: string,
    meta: string,
    precedingSpaces: Option<string>
): FenceOpenerT => ({
    _tag: "FenceOpenerT",
    ticks,
    meta,
    precedingSpaces,
});
export const FenceOpener = pipe(
    PrecedingFenceSpaces,
    P.bindTo("precedingSpaces"),
    P.bind("ticks", () =>
        pipe(
            S.string("~~~"),
            P.chain((it) =>
                pipe(
                    S.many(C.char("~")),
                    P.map((p) => it + p)
                )
            )
        )
    ),
    P.bind("meta", () =>
        P.manyTill(
            C.notChar("~"),
            P.lookAhead(P.either(S.string("\n"), () => StringEOF))
        )
    ),
    P.map((it) => FenceOpenerT(it.ticks, it.meta.join(""), it.precedingSpaces))
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

const precedingSpacesOf = (it: string): number => {
    let c = 0;
    for (const char of it) {
        if (char === " ") {
            c++;
        } else {
            break;
        }
    }
    return c;
};

const nSpaces = (it: number): string => {
    let acc = "";
    for (let index = 0; index < it; index++) {
        acc += " ";
    }
    return acc;
};
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
    P.map((it) =>
        it.content
            .join("")
            // remove opener identation
            .split("\n")
            .map((line) => {
                if (isSome(it.opener.precedingSpaces)) {
                    if (
                        precedingSpacesOf(line) <
                        it.opener.precedingSpaces.value.length
                    ) {
                        return line.replace(
                            nSpaces(precedingSpacesOf(line)),
                            ""
                        );
                    }

                    if (line.startsWith(it.opener.precedingSpaces.value)) {
                        return line.replace(
                            it.opener.precedingSpaces.value,
                            ""
                        );
                    }
                }
                return line;
            })
            .join("\n")
            // this is not part of the content
            .replace("\n", "")
    ),
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
