import snapshotDiff from "snapshot-diff";
import { parser, printMarkdown, parseMarkdown } from "../../src/parse-md";
import { assertIsRight } from "../utils";
import { runLeft } from "./utils";

const fail = runLeft(parser);

const reprint = (str: string) => {
    const r = parseMarkdown(str);
    assertIsRight(r);
    return printMarkdown(r.right.value);
};

it("fails", () => {
    expect(fail("") != null).toBe(true);
});

const codeBlock0 = ` `;
it("codeBlock0", () => {
    expect(reprint(codeBlock0)).toBe(codeBlock0);
});

const codeBlock1 = `#h1
~~~
a
~~~
#h2`;
it("codeBlock1", () => {
    expect(reprint(codeBlock1)).toBe(codeBlock1);
});

const codeBlock2 = `#h1
~~~ts x=y
a
~~~
#h2`;
it("codeBlock2", () => {
    expect(reprint(codeBlock2)).toBe(codeBlock2);
});

const codeBlock3 = `#h1
~~~ts x=y
a
~~~
#h2
~~~ts x=y
a
~~~
#h2
~~~ts x=y
a
~~~
#h2
~~~ts x=y
a
~~~`;
it("codeBlock3", () => {
    expect(reprint(codeBlock3)).toBe(codeBlock3);
});

const codeBlock5 = `#h1
~~~
a
~~~
`;
it("codeBlock5", () => {
    expect(reprint(codeBlock5)).toBe(codeBlock5);
});
const codeBlock6 = `#h1
~~~
a
~~~`;
it("codeBlock6", () => {
    expect(reprint(codeBlock6)).toBe(codeBlock6);
});

const codeBlock7 = `#h1
~~~
a
~~`;
it("codeBlock7", () => {
    expect(snapshotDiff(codeBlock7, reprint(codeBlock7)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        - First value
        + Second value

          #h1
          ~~~
          a
          ~~
        + ~~~"
    `);
});
const codeBlock8 = `#h1
~~~
a
~~~~`;
it("codeBlock8", () => {
    expect(snapshotDiff(codeBlock8, reprint(codeBlock8)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        - First value
        + Second value

          #h1
          ~~~
          a
        - ~~~~
        + ~~~"
    `);
});
const codeBlock9 = `#h1
   ~~~
a
  ~~~`;
it("codeBlock9", () => {
    expect(snapshotDiff(codeBlock9, reprint(codeBlock9)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        - First value
        + Second value

          #h1
        -    ~~~
        + ~~~
          a
        -   ~~~
        + ~~~"
    `);
});
const codeBlock10 = `#h1
   ~~~
aaa
  aaa
aaa
   ~~~`;
it("codeBlock10", () => {
    expect(snapshotDiff(codeBlock10, reprint(codeBlock10)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        - First value
        + Second value

          #h1
        -    ~~~
        + ~~~
          aaa
        -   aaa
        + aaa
          aaa
        -    ~~~
        + ~~~"
    `);
});
const codeBlock11 = `#h1
   ~~~
   aaa
    aaa
  aaa
   ~~~`;
it("codeBlock11", () => {
    expect(snapshotDiff(codeBlock11, reprint(codeBlock11)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        - First value
        + Second value

          #h1
        -    ~~~
        -    aaa
        -     aaa
        -   aaa
        -    ~~~
        + ~~~
        + aaa
        +  aaa
        + aaa
        + ~~~"
    `);
});
const codeBlock12 = `~~~ts
abc
~~~
~~~js
def
~~~`;
it("codeBlock12", () => {
    expect(snapshotDiff(codeBlock12, reprint(codeBlock12)))
        .toMatchInlineSnapshot(`
        "Snapshot Diff:
        Compared values have no visual difference."
    `);
});
const example110 = `foo
~~~
bar
~~~
baz`;
it("example110", () => {
    expect(reprint(example110)).toBe(example110);
});

const example111 = `foo
---
~~~
bar
~~~
# baz`;
it("example111", () => {
    expect(reprint(example111)).toBe(example111);
});
