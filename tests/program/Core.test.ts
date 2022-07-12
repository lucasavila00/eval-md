import * as Core from "../../src/program/Core";
import * as Runner from "../../src/program/Runner";
import { assertIsRight } from "../utils";
import * as R from "fp-ts/Record";
import * as FS from "../../src/program/FileSystem";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";
import { join } from "path";
import minimatch from "minimatch";
import * as O from "fp-ts/Option";
import * as L from "../../src/program/Logger";
import * as Endomorphism from "fp-ts/lib/Endomorphism";
import { OutputTransformer } from "../../src/program/Transformer";
import { LanguageExecutor } from "../../src/program/Executor";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

type FileSystemState = Record<string, string>;
type Log = Array<string>;

const joinCwd = (key: string) => join(process.cwd(), key);

const prefixWithCwd: Endomorphism.Endomorphism<FileSystemState> =
    R.reduceWithIndex<string, string, FileSystemState>(
        {},
        (key, acc, content) => ({
            ...acc,
            [joinCwd(key)]: content,
        })
    );

const rmCwd: Endomorphism.Endomorphism<FileSystemState> = R.reduceWithIndex<
    string,
    string,
    FileSystemState
>({}, (key, acc, content) => ({
    ...acc,
    [key.replace(process.cwd(), "")]: content,
}));

const makeCapabilities = ({
    fileSystemState = {},
    outputPrinters = [],
    languageCompilers = [],
}: {
    fileSystemState?: FileSystemState;
    outputPrinters?: readonly OutputTransformer[];
    languageCompilers?: readonly LanguageExecutor[];
} = {}) => {
    const state: {
        fileSystemState: FileSystemState;
        log: Log;
        command: string;
        executablePath: string[];
    } = {
        fileSystemState: prefixWithCwd(fileSystemState),
        log: [],
        command: "",
        executablePath: [],
    };

    const fileSystem: FS.FileSystem = {
        readFile: (path) =>
            pipe(
                R.lookup(path, state.fileSystemState),
                TE.fromOption(() => `Error: file not found: ${path}`)
            ),
        writeFile: (path, content) => {
            state.fileSystemState = {
                ...state.fileSystemState,
                [join(process.cwd(), path.replace(process.cwd(), ""))]: content,
            };
            return TE.of(undefined);
        },
        exists: (path) =>
            TE.of<string, boolean>(
                pipe(state.fileSystemState, R.lookup(path), O.isSome)
            ),
        remove: (pattern) => {
            Object.keys(state.fileSystemState).forEach((path) => {
                if (minimatch(path, pattern)) {
                    delete state.fileSystemState[path];
                }
            });
            return TE.of(undefined);
        },
        search: (pattern: string, exclude: ReadonlyArray<string>) => {
            return TE.of(
                pipe(
                    state.fileSystemState,
                    R.filterWithIndex((path) =>
                        minimatch(path, join(process.cwd(), pattern))
                    ),
                    R.keys,
                    A.filter(
                        (path) =>
                            !exclude.some((pattern) =>
                                minimatch(path, join(process.cwd(), pattern))
                            )
                    )
                )
            );
        },
    };

    const runner: Runner.Runner = {
        run: (c, p) => {
            state.command = c;
            state.executablePath = p;
            return TE.of(
                "\n##eval-md-start##\n" +
                    JSON.stringify({}) +
                    "\n##eval-md-end##\n"
            );
        },
    };
    const addMsgToLog: (msg: string) => TE.TaskEither<string, void> = (msg) => {
        state.log.push(msg);
        return TE.of(undefined);
    };

    const logger: L.Logger = {
        debug: addMsgToLog,
        error: addMsgToLog,
        info: addMsgToLog,
    };
    const capabilities: Core.Capabilities = {
        fileSystem,
        runner,
        logger,
        languageCompilers,
        outputPrinters,
    };
    return { capabilities, state };
};

it("works with no files", async () => {
    const { capabilities, state } = makeCapabilities();
    const op = await Core.main(capabilities)();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`undefined`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "No configuration file detected, using default settings",
          "Found 0 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
    expect(state.fileSystemState).toMatchInlineSnapshot(`Object {}`);
    expect(state.command).toMatchInlineSnapshot(`""`);
    expect(state.executablePath).toMatchInlineSnapshot(`Array []`);
});

it("works with one file, id compiler", async () => {
    const indexMd = `#hi
~~~id eval
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "eval-md.json": JSON.stringify({ footer: null }),
        },
        languageCompilers: [
            {
                language: "id" as any,
                execute: (files) =>
                    RTE.of(
                        files.map((it) => ({
                            inputFilePath: it.file.path,
                            results: [],
                            transformedBlocks: it.blocks,
                        }))
                    ),
            },
        ],
    });
    const op = await Core.main(capabilities)();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`undefined`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`
        "#hi
        ~~~id

        ~~~
        "
    `);
});

it("works with one file, id compiler, default printer (json)", async () => {
    const indexMd = `#hi
~~~id eval
some text
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "eval-md.json": JSON.stringify({ footer: null }),
        },
        languageCompilers: [
            {
                language: "id" as any,
                execute: (files) =>
                    RTE.of(
                        files.map((it) => ({
                            inputFilePath: it.file.path,
                            results: [
                                {
                                    _tag: "BlockExecutionResult",
                                    blockIndex: 0,
                                    content: JSON.stringify({
                                        content: "block1",
                                    }),
                                },
                            ],
                            transformedBlocks: it.blocks,
                        }))
                    ),
            },
        ],
        outputPrinters: [
            {
                language: "json" as any,
                print: (r) =>
                    TE.of({
                        content: "content was: " + r.content,
                        infoString: "id-out",
                    }),
            },
        ],
    });
    const op = await Core.main(capabilities)();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`undefined`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`
        "#hi
        ~~~id
        some text
        ~~~

        ~~~id-out
        content was: {\\"content\\":\\"block1\\"}
        ~~~
        "
    `);
});

it("works with one file, id compiler, other printer", async () => {
    const indexMd = `#hi
~~~id eval --out=id
some text
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "eval-md.json": JSON.stringify({ footer: null }),
        },
        languageCompilers: [
            {
                language: "id" as any,
                execute: (files) =>
                    RTE.of(
                        files.map((it) => ({
                            inputFilePath: it.file.path,
                            results: [
                                {
                                    _tag: "BlockExecutionResult",
                                    blockIndex: 0,
                                    content: JSON.stringify({
                                        content: "block1",
                                    }),
                                },
                            ],
                            transformedBlocks: it.blocks,
                        }))
                    ),
            },
        ],
        outputPrinters: [
            {
                language: "id" as any,
                print: (r) =>
                    TE.of({
                        content: "content was: " + r.content,
                        infoString: "id-out",
                    }),
            },
        ],
    });
    const op = await Core.main(capabilities)();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`undefined`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`
        "#hi
        ~~~id
        some text
        ~~~

        ~~~id-out
        content was: {\\"content\\":\\"block1\\"}
        ~~~
        "
    `);
});
