import { pipe } from "fp-ts/lib/function";
import * as P from "parser-ts/Parser";
import * as S from "parser-ts/string";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";

export type InfoString = {
    language: string;
};

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
