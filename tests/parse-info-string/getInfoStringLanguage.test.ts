import { getInfoStringLanguage } from "../../src/parse-info-string";

const str1 = `ts a b c`;
it("str1", () => {
    expect(getInfoStringLanguage(str1)).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": "ts",
        }
    `);
});

const str2 = ``;
it("str2", () => {
    expect(getInfoStringLanguage(str2)).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});

const str3 = `   `;
it("str3", () => {
    expect(getInfoStringLanguage(str3)).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});
