import { pipe } from "fp-ts/lib/function";
import { LanguageExecutionResultOrd } from "../../src/program/Transformer";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { LanguageExecutionResult } from "../../src/program/Executor";

it("LanguageExecutionResultOrd equals", () => {
    expect(
        LanguageExecutionResultOrd.equals(
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error",
            },
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error",
            }
        )
    ).toBe(true);
    expect(
        LanguageExecutionResultOrd.equals(
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error",
            },
            {
                _tag: "ConsoleExecutionResult",
                blockIndex: 0,
                content: JSON.stringify("the logs"),
                level: "log",
            }
        )
    ).toBe(false);
    expect(
        LanguageExecutionResultOrd.equals(
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error",
            },
            {
                _tag: "BlockExecutionResult",
                blockIndex: 1,
                content: "my error",
            }
        )
    ).toBe(false);
    expect(
        LanguageExecutionResultOrd.equals(
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error",
            },
            {
                _tag: "BlockExecutionResult",
                blockIndex: 0,
                content: "my error2",
            }
        )
    ).toBe(false);
});

it("LanguageExecutionResultOrd compare same", () => {
    const items: LanguageExecutionResult[] = [
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error",
        },
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error2",
        },
    ];

    expect(pipe(items, RA.sort(LanguageExecutionResultOrd))).toStrictEqual(
        items
    );
});

it("LanguageExecutionResultOrd compare same reverse", () => {
    const items: LanguageExecutionResult[] = [
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error2",
        },
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error",
        },
    ];

    expect(pipe(items, RA.sort(LanguageExecutionResultOrd))).toStrictEqual(
        items
    );
});

it("LanguageExecutionResultOrd compare diff", () => {
    const items: LanguageExecutionResult[] = [
        {
            _tag: "ConsoleExecutionResult",
            blockIndex: 0,
            content: JSON.stringify("the logs"),
            level: "log",
        },
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error",
        },
    ];

    expect(pipe(items, RA.sort(LanguageExecutionResultOrd))).toStrictEqual(
        items
    );
});
it("LanguageExecutionResultOrd compare diff reverse", () => {
    const items: LanguageExecutionResult[] = [
        {
            _tag: "BlockExecutionResult",
            blockIndex: 0,
            content: "my error",
        },
        {
            _tag: "ConsoleExecutionResult",
            blockIndex: 0,
            content: JSON.stringify("the logs"),
            level: "log",
        },
    ];

    expect(pipe(items, RA.sort(LanguageExecutionResultOrd))).toStrictEqual(
        [...items].reverse()
    );
});
