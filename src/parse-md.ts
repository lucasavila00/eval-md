import * as C from "parser-ts/char";
import * as S from "parser-ts/string";
import * as P from "parser-ts/Parser";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import {
    MarkdownAST,
    OtherMarkdown,
    FencedCodeBlock,
    FenceOpener,
} from "./md-types";
import { ParseResult } from "parser-ts/lib/ParseResult";

const StringEOF = pipe(
    P.eof<string>(),
    P.map((_it) => "")
);

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
            FenceOpener(it.ticks, it.meta.join(""), it.precedingSpaces)
        )
    );
export const FenceOpenerP = P.either(FenceOpenerBuilder("~"), () =>
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
    FenceOpenerP,
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
            // remove opener indentation
            .split("\n")
            .map((line) => {
                if (O.isSome(it.opener.precedingSpaces)) {
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

const FenceOpenerLA = P.lookAhead(FenceOpenerP);

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

export const parser: P.Parser<string, MarkdownAST> = pipe(
    OtherMarkdownP,
    P.bindTo("md"),
    P.bind("code", () => P.optional(FencedCodeBlockP)),
    (it) => P.many1Till(it, P.eof()),
    P.map(
        RA.map((ctt) =>
            pipe(
                ctt.code,
                O.fold(
                    () => [ctt.md],
                    (it) => [ctt.md, it]
                )
            )
        )
    ),
    P.map(RA.flatten)
);

// add \n in the beginning to make codes able to parse
export const parseMarkdown = (md: string): ParseResult<string, MarkdownAST> =>
    S.run("\n" + md)(parser);

export const printMarkdown = (it: MarkdownAST): string => {
    let acc = "";
    for (const i of it) {
        switch (i._tag) {
            case "FencedCodeBlock": {
                acc += "\n";
                acc += i.opener.ticks;
                acc += i.opener.infoString;
                acc += "\n";
                acc += i.content;
                acc += "\n";
                acc += i.opener.ticks;
                break;
            }
            case "OtherMarkdown": {
                acc += i.content;
                break;
            }
        }
    }

    // remove the \n that was added
    if (acc.startsWith("\n")) {
        acc = acc.slice(1);
    }
    return acc;
};
