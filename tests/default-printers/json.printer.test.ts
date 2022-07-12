import { jsonPrinter } from "../../src/printers/json.printer";
import { assertIsRight } from "../utils";

it("works", async () => {
    const op = await jsonPrinter.print({
        _tag: "BlockExecutionResult",
        content: JSON.stringify({ the: "content" }),
        blockIndex: 0,
    })();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Object {
          "content": "{ \\"the\\": \\"content\\" }",
          "infoString": "json",
        }
    `);
});
it("works with null content", async () => {
    const op = await jsonPrinter.print({
        _tag: "BlockExecutionResult",
        content: null as any,
        blockIndex: 0,
    })();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Object {
          "content": "null",
          "infoString": "json",
        }
    `);
});
