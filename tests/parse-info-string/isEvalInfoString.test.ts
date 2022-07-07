import * as InfoString from "../../src/program/InfoStringParser";

it("works", () => {
    expect(InfoString.isEval("")).toBe(false);
    expect(InfoString.isEval("ts")).toBe(false);
    expect(InfoString.isEval("ts ")).toBe(false);
    expect(InfoString.isEval("ts eva")).toBe(false);
    expect(InfoString.isEval("ts eva l")).toBe(false);
    expect(InfoString.isEval("ts eval")).toBe(true);
    expect(InfoString.isEval("ts eval\n")).toBe(true);
    expect(InfoString.isEval("ts eval ")).toBe(true);
    expect(InfoString.isEval("ts eval abc")).toBe(true);
});
