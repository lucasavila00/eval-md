import { defaultOutputPrinters } from "../../src/printers";

it("has all printers", () => {
    expect(defaultOutputPrinters.map((it) => it.language))
        .toMatchInlineSnapshot(`
        Array [
          "json",
          "jsonjs",
          "md",
          "sql",
        ]
    `);
});
