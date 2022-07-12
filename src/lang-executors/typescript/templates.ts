const codeTemplateStr = `
import * as util from "util";

type BlockExecutionResult = {
    readonly _tag: "BlockExecutionResult";
    readonly blockIndex: number;
    readonly content: string;
};
type ConsoleExecutionResult = {
    readonly _tag: "ConsoleExecutionResult";
    readonly blockIndex: number;
    readonly content: string;
    readonly level: "log" | "error" | "warn" | "info" | "debug";
};

type Ret = BlockExecutionResult | ConsoleExecutionResult;

export default async function main(): Promise<Ret[]> {
    const __arr: Ret[] = [];
    let __dnt = false;
    const __consume = (
        outLanguage: string,
        blockIndex: number,
        content: any
    ) => {
        if (outLanguage === "jsonjs") {
            __arr.push({
                content: util.inspect(content),
                blockIndex,
                _tag: "BlockExecutionResult",
            });
        } else if (outLanguage === "error") {
            __arr.push({
                content: String(content),
                blockIndex,
                _tag: "BlockExecutionResult",
            });
        } else {
            __arr.push({
                content: JSON.stringify(content),
                blockIndex,
                _tag: "BlockExecutionResult",
            });
        }
    };
    let __consoleBlock = 0;
    const __console = {
        log: (...message: any[]) => {
            __arr.push({
                content: JSON.stringify(util.format(...message)),
                blockIndex: __consoleBlock,
                _tag: "ConsoleExecutionResult",
                level: "log",
            });
        },
        error: (...message: any[]) => {
            __arr.push({
                content: JSON.stringify(util.format(...message)),
                blockIndex: __consoleBlock,
                _tag: "ConsoleExecutionResult",
                level: "error",
            });
        },
        warn: (...message: any[]) => {
            __arr.push({
                content: JSON.stringify(util.format(...message)),
                blockIndex: __consoleBlock,
                _tag: "ConsoleExecutionResult",
                level: "warn",
            });
        },
        info: (...message: any[]) => {
            __arr.push({
                content: JSON.stringify(util.format(...message)),
                blockIndex: __consoleBlock,
                _tag: "ConsoleExecutionResult",
                level: "info",
            });
        },
        debug: (...message: any[]) => {
            __arr.push({
                content: JSON.stringify(util.format(...message)),
                blockIndex: __consoleBlock,
                _tag: "ConsoleExecutionResult",
                level: "debug",
            });
        },
    };
{{##0##}}
    // prevent "is declared but its value is never read."
    if (Math.log(1) > 0) {
        String(__consume);
        String(__meta);
        String(util);
        String(__dnt);
        String(__console);
        String(__consoleBlock);
    }
    return __arr;
}

`;

const indexTemplateStr = `
{{##0##}}


type GenDef = {
    generator: () => Promise<any>;
    source: string;
};

const main = async () => {
    const response: Record<string, any> = {};
    const results = await Promise.all(generators.map(it => it.generator()))
    generators.forEach((it, idx) => {
        response[it.source] = results[idx]
    })
    process.stdout.write("\\n##eval-md-start##\\n");
    process.stdout.write(JSON.stringify(response));
    process.stdout.write("\\n##eval-md-end##\\n");
};
main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});

`;

const applyTemplate1 = (template: string) => (replacement: string) =>
    template.replace("{{##0##}}", replacement);

export const codeTemplate = applyTemplate1(codeTemplateStr);
export const indexTemplate = applyTemplate1(indexTemplateStr);
