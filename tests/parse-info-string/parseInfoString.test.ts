import { InfoStringP } from "../../src/program/InfoStringParser";
import { runRight, runLeft } from "../parse-md/utils";

const run = runRight(InfoStringP);
const fail = runLeft(InfoStringP);
it("fails", () => {
    expect(fail("") != null).toBe(true);
    expect(fail("\n") != null).toBe(true);
    expect(fail("ts") != null).toBe(true);
    expect(fail("ts ") != null).toBe(true);
    expect(fail("ts a") != null).toBe(true);
    expect(fail("ts eva") != null).toBe(true);
    expect(fail(" eval") != null).toBe(true);
    expect(fail("eval") != null).toBe(true);
});

it("works", () => {
    expect(run("ts eval").value).toMatchInlineSnapshot(`
        Object {
          "_tag": "EvalInfoString",
          "flags": Array [],
          "language": "ts",
          "named": Object {},
        }
    `);
    expect(run("ts eval ").value).toMatchInlineSnapshot(`
        Object {
          "_tag": "EvalInfoString",
          "flags": Array [],
          "language": "ts",
          "named": Object {},
        }
    `);
    expect(run("ts eval --out=sql").value).toMatchInlineSnapshot(`
        Object {
          "_tag": "EvalInfoString",
          "flags": Array [],
          "language": "ts",
          "named": Object {
            "print": "sql",
          },
        }
    `);
    expect(run("ts eval --out").value).toMatchInlineSnapshot(`
        Object {
          "_tag": "EvalInfoString",
          "flags": Array [
            "print",
          ],
          "language": "ts",
          "named": Object {},
        }
    `);
    expect(run("ts eval --meta").value).toMatchInlineSnapshot(`
        Object {
          "_tag": "EvalInfoString",
          "flags": Array [
            "meta",
          ],
          "language": "ts",
          "named": Object {},
        }
    `);
});
