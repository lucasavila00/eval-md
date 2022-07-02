import * as C from "parser-ts/char";
import * as S from "parser-ts/string";
import * as P from "parser-ts/Parser";
import { flow, pipe } from "fp-ts/lib/function";
import { Option, isSome } from "fp-ts/lib/Option";

const StringEOF = pipe(
    P.eof<string>(),
    P.map((_it) => "")
);

export type OtherMarkdown = {
    _tag: "OtherMarkdown";
    content: string;
};

export const OtherMarkdown = (content: string): OtherMarkdown => ({
    _tag: "OtherMarkdown",
    content,
});

export type FenceOpenerT = {
    _tag: "FenceOpenerT";
    ticks: string;
    infoString: string;
    precedingSpaces: Option<string>;
};
export const FenceOpenerT = (
    ticks: string,
    meta: string,
    precedingSpaces: Option<string>
): FenceOpenerT => ({
    _tag: "FenceOpenerT",
    ticks,
    infoString: meta,
    precedingSpaces,
});

export type FencedCodeBlock = {
    _tag: "FencedCodeBlock";
    content: string;
    opener: FenceOpenerT;
};

export const FencedCodeBlock = (
    content: string,
    opener: FenceOpenerT
): FencedCodeBlock => ({
    _tag: "FencedCodeBlock",
    content,
    opener,
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

const nChars = (it: number, char: string): string => {
    let acc = "";
    for (let index = 0; index < it; index++) {
        acc += char;
    }
    return acc;
};

const FenceOpenerBuilder = (char: string) =>
    pipe(
        PrecedingFenceSpaces,
        P.bindTo("precedingSpaces"),
        P.bind("ticks", () =>
            pipe(
                S.string(nChars(3, char)),
                P.chain((it) =>
                    pipe(
                        S.many(C.char(char)),
                        P.map((p) => it + p)
                    )
                )
            )
        ),
        P.bind("meta", () =>
            P.manyTill(
                char === "`" ? C.notChar(char) : P.item(),
                P.lookAhead(P.either(S.string("\n"), () => StringEOF))
            )
        ),
        P.map((it) =>
            FenceOpenerT(it.ticks, it.meta.join(""), it.precedingSpaces)
        )
    );
export const FenceOpener = P.either(FenceOpenerBuilder("~"), () =>
    FenceOpenerBuilder("`")
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
        ),
        P.chain(() => P.lookAhead(P.either(S.string("\n"), () => StringEOF)))
    );

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

export const FencedCodeBlockP = pipe(
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
    P.map((it) => {
        const content = it.content
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
                            nChars(precedingSpacesOf(line), " "),
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
            .replace("\n", "");

        return FencedCodeBlock(content, it.opener);
    })
);

const FenceOpenerLA = P.lookAhead(FenceOpener);

export const OtherMarkdownP = pipe(
    P.many1Till(
        P.item<string>(),
        P.either(
            pipe(
                FenceOpenerLA,
                P.map((_) => "")
            ),
            () => StringEOF
        )
    ),
    P.map((it) => it.join("")),
    P.map(OtherMarkdown)
);

export const parser = pipe(
    OtherMarkdownP,
    P.bindTo("md"),
    P.bind("code", () => P.optional(FencedCodeBlockP)),
    (it) => P.many1Till(it, P.eof())
);
