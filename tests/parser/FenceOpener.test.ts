import { FenceOpener } from "../../src/parse-md";
import { runRight } from "./utils";

const run = runRight(FenceOpener);

const str1 = `
~~~`;
it("str1", () => {
    expect(run(str1).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpenerT",
          "infoString": "",
          "precedingSpaces": Object {
            "_tag": "None",
          },
          "ticks": "~~~",
        }
    `);
});

const str2 = `
 ~~~`;
it("str2", () => {
    expect(run(str2).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpenerT",
          "infoString": "",
          "precedingSpaces": Object {
            "_tag": "Some",
            "value": " ",
          },
          "ticks": "~~~",
        }
    `);
});

const str3 = `
  ~~~`;
it("str3", () => {
    expect(run(str3).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpenerT",
          "infoString": "",
          "precedingSpaces": Object {
            "_tag": "Some",
            "value": "  ",
          },
          "ticks": "~~~",
        }
    `);
});
