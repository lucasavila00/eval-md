import { LanguageP } from "../../src/parse-info-string";
import { runRight } from "../parse-md/utils";

const run = runRight(LanguageP);

const str1 = `ts a b c`;
it("str1", () => {
    expect(run(str1).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": "ts",
        }
    `);
});

const str2 = ``;
it("str2", () => {
    expect(run(str2).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});

const str3 = `   `;
it("str3", () => {
    expect(run(str3).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});
