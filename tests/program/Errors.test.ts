import * as E from "fp-ts/lib/Either";
import { EGetOrThrow } from "../../src/program/Errors";
it("EGetOrThrow", () => {
    expect(() => EGetOrThrow(E.right("abc"))).not.toThrow();
    expect(() => EGetOrThrow(E.left("def"))).toThrow();
});
