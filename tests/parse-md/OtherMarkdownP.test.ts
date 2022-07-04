import { OtherMarkdownP } from "../../src/program/MarkdownParser";
import { runRight } from "./utils";

const run = runRight(OtherMarkdownP);

const str0 = "";
it("empty string", () => {
    expect(run(str0).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});

const str1 = "a";
it("str1", () => {
    expect(run(str1).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": Object {
            "_tag": "OtherMarkdown",
            "content": "a",
          },
        }
    `);
});

const str2 = `

`;
it("str2", () => {
    expect(run(str2).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": Object {
            "_tag": "OtherMarkdown",
            "content": "

        ",
          },
        }
    `);
});

const str3 = `# h1
`;
it("str3", () => {
    expect(run(str3).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": Object {
            "_tag": "OtherMarkdown",
            "content": "# h1
        ",
          },
        }
    `);
});

const str4 = `# h1
x
~~~
abc
~~~
y
`;
it("str4", () => {
    expect(run(str4).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "Some",
          "value": Object {
            "_tag": "OtherMarkdown",
            "content": "# h1
        x",
          },
        }
    `);
});

const str5 = `
~~~
abc
~~~
y
`;
it("str5", () => {
    expect(run(str5).value).toMatchInlineSnapshot(`
        Object {
          "_tag": "None",
        }
    `);
});
