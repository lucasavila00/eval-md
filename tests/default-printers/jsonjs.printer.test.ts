import { jsonjsPrinter } from "../../src/printers/jsonjs.printer";
import { assertIsRight } from "../utils";

it("works", async () => {
    const op = await jsonjsPrinter.print({
        _tag: "BlockExecutionResult",
        content: "a string that will pass through",
        blockIndex: 0,
    })();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Object {
          "content": "a string that will pass through",
          "infoString": "js",
        }
    `);
});
