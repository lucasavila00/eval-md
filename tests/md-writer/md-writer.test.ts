import { Anchor, text } from "../../src/md-writer";

it("Anchor", () => {
    expect(Anchor("text", "url")).toBe("[text](url)");
});

it("text", () => {
    expect(text("a", "b", "c")).toBe("a b c");
});
