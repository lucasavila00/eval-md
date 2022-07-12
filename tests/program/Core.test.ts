import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as Core from "../../src/program/Core";
import { makeCapabilities, rmCwd } from "../capabilities";
import { assertIsLeft, assertIsRight } from "../utils";

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

it("works with no files, with json config", async () => {
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-md.json": JSON.stringify({ footer: null }),
        },
    });
    const op = await Core.main(capabilities)();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`undefined`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 0 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
    expect(rmCwd(state.fileSystemState)).toMatchInlineSnapshot(`
        Object {
          "/eval-md.json": "{\\"footer\\":null}",
        }
    `);
    expect(state.command).toMatchInlineSnapshot(`""`);
    expect(state.executablePath).toMatchInlineSnapshot(`Array []`);
});

it("fails with no files, with broken json config", async () => {
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-md.json": "{xx",
        },
    });
    const op = await Core.main(capabilities)();

    assertIsLeft(op);
    expect(op.left).toMatchInlineSnapshot(
        `[SyntaxError: Unexpected token x in JSON at position 1]`
    );
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
        ]
    `);
    expect(rmCwd(state.fileSystemState)).toMatchInlineSnapshot(`
        Object {
          "/eval-md.json": "{xx",
        }
    `);
    expect(state.command).toMatchInlineSnapshot(`""`);
    expect(state.executablePath).toMatchInlineSnapshot(`Array []`);
});

it("works with one file, id compiler and default config (default footer)", async () => {
    const indexMd = `#hi
~~~id eval
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
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
          "No configuration file detected, using default settings",
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

        ---

        This document used [eval-md](https://lucasavila00.github.io/eval-md/)"
    `);
});

it("works with one file, no compiler, no eval", async () => {
    const indexMd = `#hi
~~~id
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "eval-md.json": JSON.stringify({ footer: null }),
        },
        languageCompilers: [],
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

it("works with one file, id compiler, no eval", async () => {
    const indexMd = `#hi
~~~id
abc
~~~

~~~other
def
~~~

~~~
foo
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
        abc
        ~~~

        ~~~other
        def
        ~~~

        ~~~
        foo
        ~~~
        "
    `);
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

it("works with no file, id compiler", async () => {
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
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
          "Found 0 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
          "Writing markdown files...",
        ]
    `);
});

it("fails if missing compiler", async () => {
    const indexMd = `#hi
~~~id eval
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "eval-md.json": JSON.stringify({ footer: null }),
        },
        languageCompilers: [],
    });
    const op = await Core.main(capabilities)();

    assertIsLeft(op);
    expect(op.left).toMatchInlineSnapshot(
        `"Missing compiler for input language: id"`
    );
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`undefined`);
});

it("works with one file, id compiler, overwriting files", async () => {
    const indexMd = `#hi
~~~id eval
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "docs/index.md": indexMd,
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
          "Overwriting file /process/cwd//docs/index.md",
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
it("works with one file, id compiler, hide", async () => {
    const indexMd = `#hi
~~~id eval --hide
~~~
`;
    const { capabilities, state } = makeCapabilities({
        fileSystemState: {
            "eval-mds/index.md": indexMd,
            "docs/index.md": indexMd,
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
          "Overwriting file /process/cwd//docs/index.md",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`
        "#hi
        "
    `);
});

it("throws if missing printer (default json)", async () => {
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
        outputPrinters: [],
    });
    const op = await Core.main(capabilities)();

    assertIsLeft(op);
    expect(op.left).toMatchInlineSnapshot(`"Missing printer for output: json"`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`undefined`);
});

it("throws if missing printer (other printer)", async () => {
    const indexMd = `#hi
~~~id eval --out=abc
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
        outputPrinters: [],
    });
    const op = await Core.main(capabilities)();

    assertIsLeft(op);
    expect(op.left).toMatchInlineSnapshot(`"Missing printer for output: abc"`);
    expect(state.log).toMatchInlineSnapshot(`
        Array [
          "Checking for configuration file...",
          "Has config file, parsing...",
          "Parsed config file...",
          "Found 1 modules",
          "Parsing files...",
          "Finished parsing files...",
          "Executing code...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`undefined`);
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

it("works with one file, id compiler, output hidden", async () => {
    const indexMd = `#hi
~~~id eval --out=hide
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
        outputPrinters: [],
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

it("works with one file, id compiler, other printer and logs", async () => {
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
                                {
                                    _tag: "ConsoleExecutionResult",
                                    blockIndex: 0,
                                    content: JSON.stringify("the logs"),
                                    level: "log",
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

        > log: the logs

        ~~~id-out
        content was: {\\"content\\":\\"block1\\"}
        ~~~
        "
    `);
});

it("works with meta", async () => {
    const indexMd = `#hi
~~~id eval --meta
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
                            results: [],
                            transformedBlocks: it.blocks,
                        }))
                    ),
            },
        ],
        outputPrinters: [],
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
        ~~~~md
        ~~~id eval --meta
        some text
        ~~~
        ~~~~

        ~~~id
        some text
        ~~~
        "
    `);
});

it("works with error block", async () => {
    const indexMd = `#hi
~~~id eval --error
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
                                    content: "my error",
                                },
                            ],
                            transformedBlocks: it.blocks,
                        }))
                    ),
            },
        ],
        outputPrinters: [],
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

        ~~~js
        my error
        ~~~
        "
    `);
});
