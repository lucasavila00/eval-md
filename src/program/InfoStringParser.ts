import { pipe } from "fp-ts/lib/function";
import * as P from "parser-ts/Parser";
import * as S from "parser-ts/string";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { ParseResult } from "parser-ts/lib/ParseResult";
import * as C from "parser-ts/char";
import * as A from "fp-ts/lib/Array";
import * as R from "fp-ts/lib/Record";
import * as MO from "fp-ts/lib/Monoid";
import * as SM from "fp-ts/lib/Semigroup";
import * as t from "io-ts";
import { TransportedError, EGetOrThrow } from "./Errors";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

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

export type Args = {
    readonly flags: Array<string>;
    readonly named: Record<string, string>;
};

export type EvalInfoString = Args & {
    readonly _tag: "EvalInfoString";
    readonly language: string;
};

// -------------------------------------------------------------------------------------
// codecs
// -------------------------------------------------------------------------------------

type InputLanguageBrand = {
    readonly InputLanguage: unique symbol;
};

export const InputLanguage = t.brand(
    t.string,
    (_it): _it is t.Branded<string, InputLanguageBrand> => true,
    "InputLanguage"
);

export type InputLanguage = t.TypeOf<typeof InputLanguage>;

type OutputLanguageBrand = {
    readonly OutputLanguage: unique symbol;
};

export const OutputLanguage = t.brand(
    t.string,
    (_it): _it is t.Branded<string, OutputLanguageBrand> => true,
    "OutputLanguage"
);

export type OutputLanguage = t.TypeOf<typeof OutputLanguage>;

export const DefaultOutputLanguage = "json" as OutputLanguage;
// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const monoidArgs: MO.Monoid<Args> = MO.struct({
    flags: A.getMonoid<string>(),
    named: R.getMonoid(SM.last<string>()),
});

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const EvalInfoString = (
    language: string,
    flags: Array<string>,
    named: Record<string, string>
): EvalInfoString => ({
    _tag: "EvalInfoString",
    language,
    flags,
    named,
});

const Flag = (value: string): Flag => ({ _tag: "Flag", value });

const Named = (name: string, value: string): Named => ({
    _tag: "Named",
    name,
    value,
});

const FlagArg = (value: string): Args => ({
    flags: [value],
    named: {},
});

const NamedArg = (name: string, value: string): Args => ({
    flags: [],
    named: { [name]: value },
});

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

const fold =
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
        }
    };

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

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
        return EvalInfoString(it.language, monoid.flags, monoid.named);
    })
);

// -------------------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------------------

export const getLanguage = (infoString: string): O.Option<string> =>
    pipe(
        LanguageP,
        S.run(infoString),
        E.map((it) => it.value),
        EGetOrThrow
    );

export const isEval = (infoString: string): boolean =>
    pipe(
        EvalP,
        S.run(infoString),
        E.fold(
            (_e) => false,
            (_it) => true
        )
    );

export const parse = (
    infoString: string
): ParseResult<TransportedError, EvalInfoString> =>
    pipe(InfoStringP, S.run(infoString));
