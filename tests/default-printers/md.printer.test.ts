import { mdPrinter } from "../../src/printers/md.printer";
import { assertIsRight } from "../utils";

it("works", async () => {
    const op = await mdPrinter.print({
        _tag: "BlockExecutionResult",
        content: JSON.stringify("a string"),
        blockIndex: 0,
    })();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Object {
          "content": "a string",
          "infoString": "#md#",
        }
    `);
});
