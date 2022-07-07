import * as fs from "fs/promises";
import { assertIsRight } from "../../utils";
import * as path from "path";
import * as MD from "../../../src/program/MarkdownParser";

it("works", async () => {
    const content = await fs.readFile(path.join(__dirname, "./1.md"), "utf8");
    const r = MD.parse(content);
    assertIsRight(r);
    expect(r.right.value).toMatchInlineSnapshot(`
        Array [
          Object {
            "_tag": "FencedCodeBlock",
            "content": "const add1 = (it: number) => it + 1;",
            "opener": Object {
              "_tag": "FenceOpener",
              "infoString": "ts eval",
              "precedingSpaces": Object {
                "_tag": "None",
              },
              "ticks": "\`\`\`",
            },
          },
          Object {
            "_tag": "OtherMarkdown",
            "content": "
        ",
          },
          Object {
            "_tag": "FencedCodeBlock",
            "content": "print add1(3);",
            "opener": Object {
              "_tag": "FenceOpener",
              "infoString": "ts eval --out=json",
              "precedingSpaces": Object {
                "_tag": "None",
              },
              "ticks": "\`\`\`",
            },
          },
          Object {
            "_tag": "OtherMarkdown",
            "content": "
        ",
          },
        ]
    `);
});
