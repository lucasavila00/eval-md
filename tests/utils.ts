import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
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
export const assertLeft = <E, A = unknown>(
    either: E.Either<E, A>,
    onLeft: (e: E) => void
) =>
    pipe(
        either,
        E.fold(onLeft, (right) => {
            // eslint-disable-next-line no-console
            console.log(right);

            throw new Error("Expected Left");
        })
    );

export const assertRight = <A, E = unknown>(
    either: E.Either<E, A>,
    onRight: (e: A) => void
) =>
    pipe(
        either,
        E.fold((left) => {
            // eslint-disable-next-line no-console
            console.log(left);

            throw new Error("Expected Right");
        }, onRight)
    );
