import { defaultLanguageCompilers } from "../../src/lang-executors";
import { defaultOutputPrinters } from "../../src/printers";
import * as Core from "../../src/program/Core";
import { makeCapabilities, rmCwd, rmCwdOne } from "../capabilities";
import { assertIsRight } from "../utils";

it("works with no files", async () => {
    const indexMd = `~~~ts eval
1+1
~~~
    `;
    const { capabilities, state } = makeCapabilities({
        languageCompilers: defaultLanguageCompilers,
        outputPrinters: defaultOutputPrinters,
        fileSystemState: {
            "eval-mds/index.md": indexMd,
        },
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
          "Starting ts-node execution...",
          "Spawning ts-node...",
          "Finished ts-node execution...",
          "Writing markdown files...",
        ]
    `);
    const files = rmCwd(state.fileSystemState);
    expect(files["/eval-mds/index.md"]).toBe(indexMd);
    expect(files["/docs/index.md"]).toMatchInlineSnapshot(`
        "~~~ts
        1+1
        ~~~
            
        ---

        This document used [eval-md](https://lucasavila00.github.io/eval-md/)"
    `);
    expect(state.command).toMatchInlineSnapshot(`"ts-node"`);
    expect(state.executablePath.map(rmCwdOne)).toMatchInlineSnapshot(`
        Array [
          "/eval-mds/__entrypoint.exec.ts",
        ]
    `);
});
