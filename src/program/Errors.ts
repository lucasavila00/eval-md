import * as E from "fp-ts/lib/Either";
export type TransportedError = any;
export const EGetOrThrow = <A>(either: E.Either<TransportedError, A>): A => {
    if (E.isRight(either)) {
        return either.right;
    } else {
        throw either.left;
    }
};
