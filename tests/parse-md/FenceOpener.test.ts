import { FenceOpenerP } from "../../src/program/MarkdownParser";
import { runRight } from "./utils";

const run = runRight(FenceOpenerP);

const str1 = `
~~~`;
it("str1", () => {
    expect(run(str1).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpener",
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
          "_tag": "FenceOpener",
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
          "_tag": "FenceOpener",
          "infoString": "",
          "precedingSpaces": Object {
            "_tag": "Some",
            "value": "  ",
          },
          "ticks": "~~~",
        }
    `);
});

const str4 = `
~~~ts
~~~
`;
it("str4", () => {
    expect(run(str4).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpener",
          "infoString": "ts",
          "precedingSpaces": Object {
            "_tag": "None",
          },
          "ticks": "~~~",
        }
    `);
});

const str5 = `
~~~ts x x
abc
~~~
`;
it("str5", () => {
    expect(run(str5).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "FenceOpener",
          "infoString": "ts x x",
          "precedingSpaces": Object {
            "_tag": "None",
          },
          "ticks": "~~~",
        }
    `);
});
