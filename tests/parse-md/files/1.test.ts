import { parseMarkdown } from "../../../src/parse-md";
import * as fs from "fs/promises";
import { assertIsRight } from "../../utils";
import * as path from "path";
it("works", async () => {
    const content = await fs.readFile(path.join(__dirname, "./1.md"), "utf8");
    const r = parseMarkdown(content);
    assertIsRight(r);
    expect(r.right.value).toMatchInlineSnapshot(`
        Array [
          Object {
            "_tag": "OtherMarkdown",
            "content": "
        \`\`\`ts eval
        const add1 = (it: number) => it + 1;",
          },
          Object {
            "_tag": "FencedCodeBlock",
            "content": "
        \`\`\`ts eval --yield=json
        yield add1(3);",
            "opener": Object {
              "_tag": "FenceOpener",
              "infoString": "",
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
