import { OtherMarkdownP } from "../../src/parse-md";
import { runLeft, runRight } from "./utils";

const run = runRight(OtherMarkdownP);
const fail = runLeft(OtherMarkdownP);

it("empty string", () => {
    expect(fail("")).toMatchInlineSnapshot(`
        Object {
          "expected": Array [],
          "fatal": false,
          "input": Object {
            "buffer": Array [],
            "cursor": 0,
          },
        }
    `);
});

const str1 = "a";
it("str1", () => {
    expect(run(str1).value.content).toMatchInlineSnapshot(`"a"`);
});

const str2 = `

`;
it("str2", () => {
    expect(run(str2).value.content).toMatchInlineSnapshot(`
        "

        "
    `);
});

const str3 = `# h1
`;
it("str3", () => {
    expect(run(str3).value.content).toMatchInlineSnapshot(`
        "# h1
        "
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
    expect(run(str4).value.content).toMatchInlineSnapshot(`
        "# h1
        x"
    `);
});
