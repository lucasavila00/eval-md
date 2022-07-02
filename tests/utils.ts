import * as E from "fp-ts/lib/Either";

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
