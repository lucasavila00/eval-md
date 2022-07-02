import * as E from "fp-ts/lib/Either";
import * as S from "parser-ts/string";
import * as P from "parser-ts/Parser";

export const assertIsRight: <A>(
    val: E.Either<A, any>
) => asserts val is E.Right<A> = (val) => {
    if (E.isLeft(val)) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(val, null, 2));
        throw new Error(`Expected right, got left`);
    }
};

export const assertIsLeft: <A>(
    val: E.Either<A, any>
) => asserts val is E.Left<A> = (val) => {
    if (E.isRight(val)) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(val, null, 2));
        throw new Error(`Expected left, got right`);
    }
};

export const runRight =
    <A>(parser: P.Parser<string, A>) =>
    (str: string) => {
        const r = S.run(str)(parser);
        assertIsRight(r);
        return r.right;
    };
export const runLeft =
    <A>(parser: P.Parser<string, A>) =>
    (str: string) => {
        const r = S.run(str)(parser);
        assertIsLeft(r);
        return r.left;
    };
