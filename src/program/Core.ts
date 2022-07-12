import { File, FileSystem } from "./FileSystem";
import * as RTE from "fp-ts/ReaderTaskEither";
import { constVoid, flow, pipe } from "fp-ts/function";
import * as path from "path";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as MD from "./MarkdownParser";
import * as InfoString from "./InfoStringParser";
import * as Transformer from "./Transformer";
import * as Executor from "./Executor";
import { Logger } from "./Logger";
import { Settings } from "./Config";
import { defaultLanguageCompilers } from "../lang-executors";
import { Runner } from "./Runner";
import { defaultPrinters } from "../printers";

const CONFIG_FILE_NAME = "eval-md.json";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type TransportedError = any;

export type Capabilities = {
    readonly fileSystem: FileSystem;
    readonly logger: Logger;
    readonly runner: Runner;
};

export type Effect<A> = RTE.ReaderTaskEither<Capabilities, TransportedError, A>;

export type Environment = Capabilities & {
    readonly settings: Settings;
};

export type Program<A> = RTE.ReaderTaskEither<Environment, TransportedError, A>;

export type AstAndFile = {
    ast: MD.AST;
    file: File;
};

// -------------------------------------------------------------------------------------
// files
// -------------------------------------------------------------------------------------

export const readFile = (path: string): Effect<File> =>
    pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.readFile(path)),
        RTE.map((content) => File(path, content, false))
    );

export const readFiles: (
    paths: ReadonlyArray<string>
) => Effect<ReadonlyArray<File>> = RA.traverse(RTE.ApplicativePar)(readFile);

export const writeFile = (file: File): Effect<void> => {
    const overwrite: Effect<void> = pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ fileSystem, logger }) =>
            pipe(
                logger.debug(`Overwriting file ${file.path}`),
                TE.chain(() => fileSystem.writeFile(file.path, file.content))
            )
        )
    );

    const skip: Effect<void> = pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ logger }) =>
            logger.debug(`File ${file.path} already exists, skipping creation`)
        )
    );

    const write: Effect<void> = pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ fileSystem }) =>
            fileSystem.writeFile(file.path, file.content)
        )
    );

    return pipe(
        RTE.ask<Capabilities>(),
        RTE.chain(({ fileSystem }) =>
            RTE.fromTaskEither(fileSystem.exists(file.path))
        ),
        RTE.chain((exists) =>
            exists ? (file.overwrite ? overwrite : skip) : write
        )
    );
};

export const writeFiles: (files: ReadonlyArray<File>) => Effect<void> = flow(
    RA.traverse(RTE.ApplicativePar)(writeFile),
    RTE.map(constVoid)
);

const readSourcePaths: Program<ReadonlyArray<string>> = pipe(
    RTE.ask<Environment, string>(),
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

const readSourceFiles: Program<ReadonlyArray<File>> = pipe(
    RTE.ask<Environment, TransportedError>(),
    RTE.chain((C) =>
        pipe(
            readSourcePaths,
            RTE.chainTaskEitherK((paths) => pipe(C, readFiles(paths)))
        )
    )
);

// -------------------------------------------------------------------------------------
// config
// -------------------------------------------------------------------------------------

export const getDefaultSettings = (): Settings => ({
    languageCompilers: defaultLanguageCompilers,
    srcDir: "eval-mds",
    outDir: "docs",
    exclude: [],
    outputPrinters: defaultPrinters,
    runtimeMeta: {},
});

const hasConfiguration: Effect<boolean> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem, logger }) =>
        pipe(
            logger.debug("Checking for configuration file..."),
            TE.chain(() =>
                fileSystem.exists(path.join(process.cwd(), CONFIG_FILE_NAME))
            )
        )
    )
);

const readConfiguration: Effect<File> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chain(() => readFile(path.join(process.cwd(), CONFIG_FILE_NAME)))
);

const parseConfiguration =
    (defaultSettings: Settings) =>
    (file: File): Effect<Settings> =>
    (deps) =>
        pipe(
            deps.logger.debug("Has config file, parsing..."),
            TE.chain(() =>
                TE.tryCatch(
                    async () => {
                        const settings = JSON.parse(file.content);
                        return { ...defaultSettings, ...settings };
                    },
                    (e) => e as TransportedError
                )
            ),
            TE.chainFirst(() => deps.logger.debug("Parsed config file..."))
        );

const useDefaultSettings = (defaultSettings: Settings): Effect<Settings> =>
    pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ logger }) =>
            pipe(
                logger.info(
                    "No configuration file detected, using default settings"
                ),
                TE.map(() => defaultSettings)
            )
        )
    );

const getConfiguration = (): Effect<Settings> =>
    pipe(
        hasConfiguration,
        RTE.bindTo("hasConfig"),
        RTE.bind("defaultSettings", () => RTE.right(getDefaultSettings())),
        RTE.chain(({ defaultSettings, hasConfig }) =>
            hasConfig
                ? pipe(
                      readConfiguration,
                      RTE.chain(parseConfiguration(defaultSettings))
                  )
                : useDefaultSettings(defaultSettings)
        )
    );

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const parseFiles = (
    files: ReadonlyArray<File>
): Program<ReadonlyArray<AstAndFile>> => {
    const parse: Program<ReadonlyArray<AstAndFile>> = pipe(
        files,
        RTE.traverseArray((f) =>
            pipe(
                RTE.of(f),
                RTE.bindTo("file"),
                RTE.bind(
                    "ast",
                    (_acc) => (_deps) => async () => MD.parse(f.content)
                )
            )
        ),
        RTE.map(RA.map((it) => ({ ast: it.ast.value, file: it.file })))
    );

    return pipe(
        RTE.ask<Environment, string>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Parsing files..."))
        ),
        RTE.chain(() => parse),
        RTE.chainFirst(
            (_it) => (deps) => deps.logger.debug("Finished parsing files...")
        )
    );
};

// -------------------------------------------------------------------------------------
// markdown
// -------------------------------------------------------------------------------------

const getMarkdownFiles = (
    execResults: ReadonlyArray<Executor.Execution>
): Program<ReadonlyArray<File>> =>
    pipe(
        execResults,
        RTE.traverseArray((fileRef) => {
            let index = 0;
            return pipe(
                fileRef.ast.map((item) => {
                    if (item._tag === "FencedCodeBlock") {
                        if (InfoString.isEval(item.opener.infoString)) {
                            const ret = fileRef.transformedBlocks[index];
                            index++;
                            return ret;
                        }
                    }
                    return item;
                }),
                (t) =>
                    Transformer.transform(
                        t,
                        fileRef.ast,
                        pipe(
                            execResults,
                            RA.filter((e) => e.file.path === fileRef.file.path)
                        )
                    ),
                RTE.chainReaderK(
                    (content) => (env) =>
                        File(
                            fileRef.file.path.replace(
                                env.settings.srcDir,
                                env.settings.outDir
                            ),
                            MD.print(content),
                            true
                        )
                )
            );
        })
    );

const writeMarkdownFiles = (files: ReadonlyArray<File>): Program<void> =>
    pipe(
        RTE.ask<Environment, string>(),
        RTE.chainTaskEitherK((C) =>
            pipe(
                C.logger.debug("Writing markdown files..."),
                TE.chain(() => pipe(C, writeFiles(files)))
            )
        )
    );

// -------------------------------------------------------------------------------------
// program
// -------------------------------------------------------------------------------------

/**
 * @category program
 * @since 0.6.0
 */
export const main: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chain((capabilities) =>
        pipe(
            getConfiguration(),
            RTE.chainTaskEitherK((settings) => {
                const program = pipe(
                    readSourceFiles,
                    RTE.bindTo("read"),
                    RTE.bind("parse", (acc) => parseFiles(acc.read)),
                    RTE.bind("exec", (acc) => Executor.run(acc.parse)),
                    RTE.bind("md", (acc) => getMarkdownFiles(acc.exec)),
                    RTE.bind("write", (acc) => writeMarkdownFiles(acc.md)),
                    RTE.map((_it) => void 0)
                );
                return program({ ...capabilities, settings });
            })
        )
    )
);
