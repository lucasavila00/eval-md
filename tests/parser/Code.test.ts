import { Code } from "../../src/parse-md";
import { runLeft, runRight } from "../utils";

const run = runRight(Code);
const fail = runLeft(Code);

it("fails", () => {
    expect(fail("") != null).toBe(true);
    expect(fail("~~~a~~~") != null).toBe(true);
    expect(fail("~~~") != null).toBe(true);
});

const codeBlock1 = `
~~~
a
~~~`;
it("codeBlock1", () => {
    expect(run(codeBlock1).value.content).toMatchInlineSnapshot(`"a"`);
});

const codeBlock2 = `
~~~
a
~~~~~`;
it("codeBlock2", () => {
    expect(run(codeBlock2).value.content).toMatchInlineSnapshot(`"a"`);
});

const codeBlock3 = `
~~~~
a
~~~~~`;
it("codeBlock3", () => {
    expect(run(codeBlock3).value.content).toMatchInlineSnapshot(`"a"`);
});

const codeBlock4 = `
~~~~
a
~~~`;
it("codeBlock4", () => {
    expect(run(codeBlock4).value.content).toMatchInlineSnapshot(`
        "a
        ~~~"
    `);
});

const example89 = `
~~~
<
 >
~~~`;
it("example89", () => {
    expect(run(example89).value.content).toMatchInlineSnapshot(`
        "<
         >"
    `);
});

// TODO 90

const example91 = `
~~
foo
~~`;
it("example91", () => {
    expect(fail(example91) != null).toBe(true);
});

const example92 = `
~~~
aaa
\`\`\`
~~~`;
it("example92", () => {
    expect(run(example92).value.content).toMatchInlineSnapshot(`
        "aaa
        \`\`\`"
    `);
});

// TODO 93

const example94 = `
~~~~
aaa
~~~
~~~~~~`;
it("example94", () => {
    expect(run(example94).value.content).toMatchInlineSnapshot(`
        "aaa
        ~~~"
    `);
});

// TODO 95

const example96 = `
~~~`;
it("example96", () => {
    expect(run(example96).value.content).toMatchInlineSnapshot(`""`);
});

const example97 = `
~~~~~

~~~
aaa`;
it("example97", () => {
    expect(run(example97).value.content).toMatchInlineSnapshot(`
        "
        ~~~
        aaa"
    `);
});

// TODO 98 (maybe never? should we parse blocks? and print in the blocks? Should this parser be at this level?)

const example99 = `
~~~

  
~~~`;
it("example99", () => {
    expect(run(example99).value.content).toMatchInlineSnapshot(`
        "
          "
    `);
});

const example100 = `
~~~
~~~`;
it("example100", () => {
    expect(run(example100).value.content).toMatchInlineSnapshot(`""`);
});
