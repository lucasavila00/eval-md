import { absurd, pipe } from "fp-ts/lib/function";
import * as P from "parser-ts/Parser";
import * as S from "parser-ts/string";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { TransportedError } from "./types";
import { ParseResult } from "parser-ts/lib/ParseResult";
import * as C from "parser-ts/char";
import * as A from "fp-ts/lib/Array";
import * as R from "fp-ts/lib/Record";
import * as MO from "fp-ts/lib/Monoid";
import * as SM from "fp-ts/lib/Semigroup";

export type Argument = Flag | Named;

export type Flag = {
    readonly _tag: "Flag";
    readonly value: string;
};

export type Named = {
    readonly _tag: "Named";
    readonly name: string;
    readonly value: string;
};

export const Flag = (value: string): Flag => ({ _tag: "Flag", value });

export const Named = (name: string, value: string): Named => ({
    _tag: "Named",
    name,
    value,
});
export type Args = {
    readonly flags: Array<string>;
    readonly named: Record<string, string>;
};

const monoidArgs: MO.Monoid<Args> = MO.struct({
    flags: A.getMonoid<string>(),
    named: R.getMonoid(SM.last<string>()),
});

export type InfoString = Args & {
    readonly _tag: "InfoString";
    readonly language: string;
    readonly evalStr: string;
};
export const InfoString = (
    language: string,
    evalStr: string,
    flags: Array<string>,
    named: Record<string, string>
): InfoString => ({
    _tag: "InfoString",
    language,
    evalStr,
    flags,
    named,
});

export const FlagArg = (value: string): Args => ({
    flags: [value],
    named: {},
});

export const NamedArg = (name: string, value: string): Args => ({
    flags: [],
    named: { [name]: value },
});

export const fold =
    <R>(
        onFlag: (value: string) => R,
        onNamed: (name: string, value: string) => R
    ) =>
    (a: Argument): R => {
        switch (a._tag) {
            case "Flag":
                return onFlag(a.value);

            case "Named":
                return onNamed(a.name, a.value);

            default:
                return absurd<R>(a);
        }
    };

const whitespaceSurrounded = P.surroundedBy(S.spaces);

const doubleDash = S.string("--");

const equals = C.char("=");

const identifier = C.many1(C.alphanum);

const flag: P.Parser<string, Flag> = pipe(
    doubleDash,
    P.chain(() => identifier),
    P.map(Flag)
);

const named: P.Parser<string, Named> = pipe(
    doubleDash,
    P.chain(() => P.sepBy1(equals, identifier)),
    P.chain(([name, value]) =>
        (value ?? "").length === 0 ? P.fail() : P.of([name, value])
    ),
    P.map(([name, value]) => Named(name, value))
);

const argument = P.either<string, Argument>(named, () => flag);

export const LanguageP = pipe(
    P.manyTill(
        //
        P.item<string>(),
        P.lookAhead(
            P.either(S.string(" "), () =>
                pipe(
                    P.eof<string>(),
                    P.map((_it) => "")
                )
            )
        )
    ),
    P.map((it) => it.join("")),
    P.map((it) => (it.length > 0 ? O.some(it) : O.none))
);

const EvalP = pipe(
    LanguageP,
    P.chain(
        O.fold(
            () => P.fail(),
            (it) => P.of(it)
        )
    ),
    P.bindTo("language"),
    P.chainFirst(() => S.string(" ")),
    P.bind("evalStr", () => S.string("eval"))
);

export const InfoStringP = pipe(
    //
    EvalP,
    P.bind("args", () => P.many(whitespaceSurrounded(argument))),
    P.map((it) => {
        const monoid = pipe(
            it.args,
            A.foldMap(monoidArgs)(fold(FlagArg, NamedArg))
        );
        return InfoString(it.language, it.evalStr, monoid.flags, monoid.named);
    })
);

export const getInfoStringLanguage = (infoString: string): O.Option<string> =>
    pipe(
        LanguageP,
        S.run(infoString),
        E.fold(
            (e) => {
                throw e;
            },
            (it) => it.value
        )
    );

export const isEvalInfoString = (infoString: string): boolean =>
    pipe(
        EvalP,
        S.run(infoString),
        E.fold(
            (_e) => false,
            (_it) => true
        )
    );

export const parseInfoString = (
    infoString: string
): ParseResult<TransportedError, InfoString> =>
    pipe(InfoStringP, S.run(infoString));
