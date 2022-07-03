import { isEvalInfoString } from "../../src/parse-info-string";

it("works", () => {
    expect(isEvalInfoString("")).toBe(false);
    expect(isEvalInfoString("ts")).toBe(false);
    expect(isEvalInfoString("ts ")).toBe(false);
    expect(isEvalInfoString("ts eva")).toBe(false);
    expect(isEvalInfoString("ts eva l")).toBe(false);
    expect(isEvalInfoString("ts eval")).toBe(true);
    expect(isEvalInfoString("ts eval\n")).toBe(true);
    expect(isEvalInfoString("ts eval ")).toBe(true);
    expect(isEvalInfoString("ts eval abc")).toBe(true);
});
