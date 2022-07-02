import { EvalReads, EvalRTE, TransportedError } from "../types";
import { File } from "./FileSystem";
import * as RTE from "fp-ts/ReaderTaskEither";
import { constVoid, flow, pipe } from "fp-ts/function";
import * as path from "path";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";

const readFile = (path: string): EvalRTE<File> =>
    pipe(
        RTE.ask<EvalReads>(),
        RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.readFile(path)),
        RTE.map((content) => File(path, content, false))
    );

const readFiles: (
    paths: ReadonlyArray<string>
) => EvalRTE<ReadonlyArray<File>> = RA.traverse(RTE.ApplicativePar)(readFile);

const writeFile = (file: File): EvalRTE<void> => {
    const overwrite: EvalRTE<void> = pipe(
        RTE.ask<EvalReads>(),
        RTE.chainTaskEitherK(({ fileSystem, logger }) =>
            pipe(
                logger.debug(`Overwriting file ${file.path}`),
                TE.chain(() => fileSystem.writeFile(file.path, file.content))
            )
        )
    );

    const skip: EvalRTE<void> = pipe(
        RTE.ask<EvalReads>(),
        RTE.chainTaskEitherK(({ logger }) =>
            logger.debug(`File ${file.path} already exists, skipping creation`)
        )
    );

    const write: EvalRTE<void> = pipe(
        RTE.ask<EvalReads>(),
        RTE.chainTaskEitherK(({ fileSystem }) =>
            fileSystem.writeFile(file.path, file.content)
        )
    );

    return pipe(
        RTE.ask<EvalReads>(),
        RTE.chain(({ fileSystem }) =>
            RTE.fromTaskEither(fileSystem.exists(file.path))
        ),
        RTE.chain((exists) =>
            exists ? (file.overwrite ? overwrite : skip) : write
        )
    );
};

const writeFiles: (files: ReadonlyArray<File>) => EvalRTE<void> = flow(
    RA.traverse(RTE.ApplicativePar)(writeFile),
    RTE.map(constVoid)
);

const readSourcePaths: EvalRTE<ReadonlyArray<string>> = pipe(
    RTE.ask<EvalReads, string>(),
    RTE.chainTaskEitherK(({ fileSystem, logger, settings }) =>
        pipe(
            fileSystem.search(
                path.join(settings.srcDir, "**", "*.md"),
                settings.exclude
            ),
            TE.map(RA.map(path.normalize)),
            TE.chainFirst((paths) =>
                pipe(logger.info(`Found ${paths.length} modules`))
            )
        )
    )
);

const readSourceFiles: EvalRTE<ReadonlyArray<File>> = pipe(
    RTE.ask<EvalReads, TransportedError>(),
    RTE.chain((C) =>
        pipe(
            readSourcePaths,
            RTE.chainTaskEitherK((paths) => pipe(C, readFiles(paths)))
        )
    )
);
