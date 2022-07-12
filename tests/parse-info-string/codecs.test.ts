import {
    InputLanguage,
    OutputLanguage,
} from "../../src/program/InfoStringParser";

it("InputLanguage codec is noop", () => {
    expect(InputLanguage.decode("abc")).toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "abc",
        }
    `);
});
it("OutputLanguage codec is noop", () => {
    expect(OutputLanguage.decode("abc")).toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "abc",
        }
    `);
});
