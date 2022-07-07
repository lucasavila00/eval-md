import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { spawnSync } from "child_process";
import { TransportedError } from "./Core";
// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type Runner = {
    readonly run: (
        command: string,
        executablePath: string
    ) => TE.TaskEither<TransportedError, string>;
};

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

export const run = (
    command: string,
    executablePath: string
): TE.TaskEither<string, string> =>
    pipe(
        TE.fromEither(
            E.tryCatch(
                () =>
                    spawnSync(command, [executablePath], {
                        stdio: "pipe",
                        encoding: "utf8",
                    }),
                String
            )
        ),
        TE.chain(({ status, stderr, stdout }) =>
            status === 0 ? TE.right(stdout) : TE.left(stderr)
        )
    );

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.6.0
 */
export const Runner: Runner = {
    run,
};
