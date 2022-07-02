import {
    Capabilities,
    Effect,
    Environment,
    Program,
    Settings,
    TransportedError,
} from "../types";
import { File } from "./FileSystem";
import * as RTE from "fp-ts/ReaderTaskEither";
import { constVoid, flow, hole, pipe } from "fp-ts/function";
import * as path from "path";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { MarkdownAST } from "../md-types";
import { parseMarkdown } from "../parse-md";
import { defaultLanguageCompilers } from "../lang-compilers";
import { CompiledAST, compileOneAst } from "../compile";
// import * as E from 'fp-ts/Either'

const CONFIG_FILE_NAME = "eval-md.json";

const readFile = (path: string): Effect<File> =>
    pipe(
        RTE.ask<Capabilities>(),
        RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.readFile(path)),
        RTE.map((content) => File(path, content, false))
    );

const readFiles: (paths: ReadonlyArray<string>) => Effect<ReadonlyArray<File>> =
    RA.traverse(RTE.ApplicativePar)(readFile);

const writeFile = (file: File): Effect<void> => {
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

const writeFiles: (files: ReadonlyArray<File>) => Effect<void> = flow(
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

const getDefaultSettings = (): Settings => ({
    languageCompilers: defaultLanguageCompilers,
    srcDir: "eval-mds",
    outDir: "docs/eval",
    exclude: [],
});

const parseConfiguration =
    (_defaultSettings: Settings) =>
    (_file: File): Effect<Settings> =>
        hole();
//   pipe(
//     RTE.ask<Capabilities>(),
//     RTE.chainTaskEitherK(({ logger }) =>
//       pipe(
//         E.parseJSON(file.content, toErrorMsg),
//         TE.fromEither,
//         TE.chainFirst(() => logger.info(`Found configuration file`)),
//         TE.chainFirst(() => logger.debug(`Parsing configuration file found at: ${file.path}`)),
//         TE.chain(Config.decode),
//         TE.bimap(
//           (decodeError) => `Invalid configuration file detected:\n${decodeError}`,
//           (settings) => ({ ...defaultSettings, ...settings })
//         )
//       )
//     )
//   )

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

//   pipe(Config.build(projectName, projectHomepage), Config.resolveSettings)
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
type AstAndFile = {
    ast: MarkdownAST;
    file: File;
};

type CompiledAstAndFile = {
    compiledAsts: readonly CompiledAST[];
    file: File;
};
const parseMdFiles = (
    files: ReadonlyArray<File>
): Program<ReadonlyArray<AstAndFile>> =>
    pipe(
        files,
        RTE.traverseArray((f) =>
            pipe(
                RTE.of(f),
                RTE.bindTo("file"),
                RTE.bind(
                    "ast",
                    (_acc) => (_deps) => async () => parseMarkdown(f.content)
                )
            )
        ),
        RTE.map(RA.map((it) => ({ ast: it.ast.value, file: it.file })))
    );

const parseFiles = (
    files: ReadonlyArray<File>
): Program<ReadonlyArray<AstAndFile>> =>
    pipe(
        RTE.ask<Environment, string>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Parsing files..."))
        ),
        RTE.chain(() => parseMdFiles(files))
    );

const getExecutableFiles = (
    _compiledFiles: ReadonlyArray<CompiledAstAndFile>
): Program<ReadonlyArray<File>> => {
    const content = "...";
    return pipe(
        RTE.ask<Environment, string>(),
        RTE.map((env) =>
            File(
                path.join(env.settings.outDir, "examples", "index.ts"),
                `${content}\n`,
                true
            )
        ),
        RTE.map((it) => [it])
    );
};

const writeExecutableFiles = (
    compiledFiles: ReadonlyArray<CompiledAstAndFile>
): Program<void> =>
    pipe(
        RTE.ask<Environment, TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Writing examples..."))
        ),
        RTE.chain((C) =>
            pipe(
                getExecutableFiles(compiledFiles),
                RTE.chainTaskEitherK((files) => pipe(C, writeFiles(files)))
            )
        )
    );

const executeFiles = (modules: ReadonlyArray<AstAndFile>): Program<void> =>
    pipe(
        modules,
        RTE.traverseArray((it) =>
            pipe(
                //
                compileOneAst(it.ast),
                RTE.bindTo("compiledAsts"),
                RTE.bind("file", () => RTE.of(it.file))
            )
        ),
        RTE.chain(writeExecutableFiles)
    );

const getMarkdownFiles = (
    _modules: ReadonlyArray<AstAndFile>
): Program<ReadonlyArray<File>> => hole();

const writeMarkdownFiles = (_files: ReadonlyArray<File>): Program<void> =>
    hole();

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
                    RTE.chain(parseFiles),
                    RTE.chainFirst(executeFiles),
                    RTE.chain(getMarkdownFiles),
                    RTE.chain(writeMarkdownFiles)
                );
                return program({ ...capabilities, settings });
            })
        )
    )
);
// const toErrorMsg: (u: unknown) => string = flow(E.toError, (err) => String(err.message))
