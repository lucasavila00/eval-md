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
import { parseMarkdown, printMarkdown } from "../parse-md";
import { defaultLanguageCompilers } from "../lang-compilers";
import { CompiledAST, compileOneAst } from "../compile";
import { run } from "./Runner";
import { indexTemplate } from "../lang-compilers/typescript/templates";
import { yieldTransformer } from "../yield-transformer";

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
    outDir: "docs",
    exclude: [],
});

console.error("implement me");
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

// todo improve
const getExecFileName = (file: File, language: string): string =>
    file.path.replace(".md", "." + language);

const getExecutableFiles = (
    compiledFiles: ReadonlyArray<CompiledAstAndFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        compiledFiles,
        RA.chain((it) =>
            it.compiledAsts.map((ast) => ({
                inFile: it.file,
                outFile: File(
                    getExecFileName(it.file, ast.language),
                    ast.code,
                    true
                ),
            }))
        ),
        RTE.of,
        RTE.bindTo("comp"),
        RTE.bind("index", (acc) =>
            pipe(
                RTE.ask<Environment, TransportedError>(),
                RTE.map((env) => {
                    const imports = acc.comp
                        .map((it) => it.outFile)
                        .map((it) => it.path.replace(env.settings.srcDir, "."))
                        .map((it) => it.replace(".ts", ""))
                        .map((it, idx) => `import g${idx} from '${it}'`);

                    const generators = acc.comp
                        .map(
                            (it, idx) =>
                                `{generator: g${idx}, source: "${it.inFile.path}", }`
                        )
                        .join(",");
                    return File(
                        path.join(env.settings.srcDir, "index.ts"),
                        indexTemplate(
                            `${imports}\nconst generators: GenDef[] = [${generators}];`
                        ),
                        true
                    );
                })
            )
        ),
        RTE.map((it) => [it.index, ...it.comp.map((it) => it.outFile)])
    );

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

type ExecResult = {
    language: string;
    value: any;
};
const spawnTsNode: Program<ExecResult> = pipe(
    RTE.ask<Environment, TransportedError>(),
    RTE.chainFirst(({ logger }) =>
        RTE.fromTaskEither(logger.debug("Type checking examples..."))
    ),
    RTE.chainTaskEitherK(({ settings }) => {
        const command =
            process.platform === "win32" ? "ts-node.cmd" : "ts-node";
        const executablePath = path.join(
            process.cwd(),
            settings.srcDir,
            "index.ts"
        );
        return run(command, executablePath);
    }),

    RTE.map((value) => {
        return { value, language: "ts" };
    })
);

console.error("more than 1 lang");
const executeFiles = (
    modules: ReadonlyArray<AstAndFile>
): Program<ExecResult[]> =>
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
        RTE.chain(writeExecutableFiles),
        RTE.chain(() => spawnTsNode),
        RTE.map((it) => [it])
    );

const getMarkdownFiles = (
    modules: ReadonlyArray<AstAndFile>,
    execResults: ExecResult[]
): Program<ReadonlyArray<File>> =>
    pipe(
        RTE.ask<Environment, TransportedError>(),
        RTE.map((env) =>
            pipe(
                modules,
                RA.map((it) => {
                    const exec = execResults.map((exec) => {
                        const parsed = JSON.parse(exec.value);
                        const fromThisFile = parsed[it.file.path];
                        return {
                            language: exec.language,
                            data: fromThisFile,
                        };
                    });
                    const content = yieldTransformer(it.ast, exec);
                    const path = it.file.path.replace(
                        env.settings.srcDir,
                        env.settings.outDir
                    );
                    return File(path, printMarkdown(content), true);
                })
            )
        )
    );

const writeMarkdownFiles = (files: ReadonlyArray<File>): Program<void> =>
    pipe(
        RTE.ask<Environment, string>(),
        RTE.chainFirst<Environment, string, Environment, void>(
            ({ fileSystem, logger, settings }) => {
                const outPattern = path.join(settings.outDir, "**/*.ts.md");
                return pipe(
                    logger.debug(
                        `Cleaning up docs folder: deleting ${outPattern}`
                    ),
                    TE.chain(() => fileSystem.remove(outPattern)),
                    RTE.fromTaskEither
                );
            }
        ),
        RTE.chainTaskEitherK((C) =>
            pipe(
                C.logger.debug("Writing markdown files..."),
                TE.chain(() => pipe(C, writeFiles(files)))
            )
        )
    );

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
                    RTE.bind("exec", (acc) => executeFiles(acc.parse)),
                    RTE.bind("md", (acc) =>
                        getMarkdownFiles(acc.parse, acc.exec)
                    ),
                    RTE.bind("write", (acc) => writeMarkdownFiles(acc.md)),
                    RTE.map((_it) => void 0)
                );
                return program({ ...capabilities, settings });
            })
        )
    )
);
// const toErrorMsg: (u: unknown) => string = flow(E.toError, (err) => String(err.message))
