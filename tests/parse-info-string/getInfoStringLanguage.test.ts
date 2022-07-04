import * as InfoString from "../../src/program/InfoStringParser";

const str1 = `ts a b c`;
it("str1", () => {
    expect(InfoString.getLanguage(str1)).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": "ts",
        }
    `);
});

const str2 = ``;
it("str2", () => {
    expect(InfoString.getLanguage(str2)).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});

const str3 = `   `;
it("str3", () => {
    expect(InfoString.getLanguage(str3)).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});
