import { FencedCodeBlockP } from "../../src/parse-md";
import { runLeft, runRight } from "../utils";

const run = runRight(FencedCodeBlockP);
const fail = runLeft(FencedCodeBlockP);

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

const example90 = `
\`\`\`
<
 >
\`\`\``;
it("example90", () => {
    expect(run(example90).value.content).toMatchInlineSnapshot(`
        "<
         >"
    `);
});

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

const example93 = `
\`\`\`
aaa
~~~
\`\`\``;
it("example93", () => {
    expect(run(example93).value.content).toMatchInlineSnapshot(`
        "aaa
        ~~~"
    `);
});

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

const example95 = `
\`\`\`\`
aaa
\`\`\`
\`\`\`\`\`\``;
it("example95", () => {
    expect(run(example95).value.content).toMatchInlineSnapshot(`
        "aaa
        \`\`\`"
    `);
});

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

const example101 = `
 ~~~
aaa
aaa
~~~`;
it("example101", () => {
    expect(run(example101).value.content).toMatchInlineSnapshot(`
        "aaa
        aaa"
    `);
});

const example102 = `
  ~~~
aaa
  aaa
aaa
  ~~~`;
it("example102", () => {
    expect(run(example102).value.content).toMatchInlineSnapshot(`
        "aaa
        aaa
        aaa"
    `);
});

const example103 = `
   ~~~
   aaa
    aaa
  aaa
   ~~~`;
it("example103", () => {
    expect(run(example103).value.content).toMatchInlineSnapshot(`
        "aaa
         aaa
        aaa"
    `);
});

const example104 = `
    ~~~
    aaa
    ~~~
`;
it("example104", () => {
    expect(fail(example104) != null).toBe(true);
});

const example105 = `
~~~
aaa
  ~~~`;
it("example105", () => {
    expect(run(example105).value.content).toMatchInlineSnapshot(`"aaa"`);
});

const example106 = `
   ~~~
aaa
  ~~~`;
it("example106", () => {
    expect(run(example106).value.content).toMatchInlineSnapshot(`"aaa"`);
});

const example107 = `
~~~
aaa
    ~~~`;
it("example107", () => {
    expect(run(example107).value.content).toMatchInlineSnapshot(`
        "aaa
            ~~~"
    `);
});

const example108 = `
\`\`\` \`\`\`
aaa
`;
it("example108", () => {
    expect(fail(example108) != null).toBe(true);
});

const example109 = `
~~~~~~
aaa
~~~ ~~`;
it("example109", () => {
    expect(run(example109).value.content).toMatchInlineSnapshot(`
        "aaa
        ~~~ ~~"
    `);
});

// TODO 110 (not code)
// TODO 111 (not code)

const example112 = `
~~~ruby
def foo(x)
  return 3
end
~~~`;
it("example112", () => {
    expect(run(example112).value.content).toMatchInlineSnapshot(`
        "def foo(x)
          return 3
        end"
    `);
    expect(run(example112).value.infoString).toMatchInlineSnapshot(`"ruby"`);
});

const example113 = `
~~~~    ruby startline=3 $%@#$
def foo(x)
  return 3
end
~~~~~~~`;
it("example113", () => {
    expect(run(example113).value.content).toMatchInlineSnapshot(`
        "def foo(x)
          return 3
        end"
    `);
    expect(run(example113).value.infoString).toMatchInlineSnapshot(
        `"    ruby startline=3 $%@#$"`
    );
});

const example114 = `
~~~~;
~~~~`;
it("example114", () => {
    expect(run(example114).value.content).toMatchInlineSnapshot(`""`);
    expect(run(example114).value.infoString).toMatchInlineSnapshot(`";"`);
});

const example115 = `
\`\`\` aa \`\`\`
foo`;
it("example115", () => {
    expect(fail(example115) != null).toBe(true);
});

const example116 = `
~~~ aa \`\`\` ~~~
foo
~~~
`;
it("example116", () => {
    expect(run(example116).value.content).toMatchInlineSnapshot(`"foo"`);
    expect(run(example116).value.infoString).toMatchInlineSnapshot(
        `" aa \`\`\` ~~~"`
    );
});

const example117 = `
~~~
~~~ aaa
~~~`;
it("example117", () => {
    expect(run(example117).value.content).toMatchInlineSnapshot(`"~~~ aaa"`);
});
