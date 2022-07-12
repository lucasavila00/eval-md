import { sqlPrinter } from "../../src/printers/sql.printer";
import { assertIsRight } from "../utils";

it("works", async () => {
    const op = await sqlPrinter.print({
        _tag: "BlockExecutionResult",
        content: JSON.stringify("SELECT 1 FROM ABC"),
        blockIndex: 0,
    })();

    assertIsRight(op);
    expect(op.right).toMatchInlineSnapshot(`
        Object {
          "content": "SELECT
          1
        FROM
          ABC",
          "infoString": "sql",
        }
    `);
});
