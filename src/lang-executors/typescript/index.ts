import { pipe } from "fp-ts/lib/function";
import { Program } from "../../program/Core";
import * as Executor from "../../program/Executor";
import * as Core from "../../program/Core";
import * as InfoString from "../../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord";
import { File } from "../../program/FileSystem";
import { codeTemplate, indexTemplate } from "./templates";
import * as MD from "../../program/MarkdownParser";
import * as path from "path";
import { Project, Node, SyntaxKind, SourceFile } from "ts-morph";
import { FencedCodeBlock } from "../../program/MarkdownParser";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

type SpawnResult = ReadonlyRecord<
    // file path
    string,
    // results
    ReadonlyArray<Executor.BlockExecutionResult>
>;

// -------------------------------------------------------------------------------------
// transformer
// -------------------------------------------------------------------------------------

// // todo improve
const getExecFileName = (file: File, language: string): string =>
    file.path.replace(".md", "." + language);

const getExecutableSourceCode = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        refs,
        RA.map((ref) =>
            File(
                getExecFileName(ref.file, "exec.ts"),
                pipe(
                    ref.blocks,
                    RA.map((block) => block.content),
                    (it) => it.join("\n"),
                    codeTemplate
                ),
                true
            )
        ),
        RTE.of
    );

const hoistImports = (
    files: ReadonlyArray<File>
): Program<ReadonlyArray<File>> => RTE.of(files);

const getExecutableFiles = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        //
        getExecutableSourceCode(refs),
        RTE.chain(hoistImports)
    );

const getIndex = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<File> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.map((env) => {
            const imports = refs
                .map((it) => it.file)
                .map((it) => it.path.replace(env.settings.srcDir, "."))
                .map((it) => it.replace(".ts", ""))
                .map((it, idx) => `import g${idx} from '${it}';`)
                .join("\n");

            const generators = "generators";
            return File(
                path.join(env.settings.srcDir, "index.exec.ts"),
                indexTemplate(
                    `${imports}\nconst generators: GenDef[] = [${generators}];`
                ),
                true
            );
        })
    );

const getExecutableFilesAndIndex = (
    files: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        getIndex(files),
        RTE.bindTo("index"),
        RTE.bind("fs", () => getExecutableFiles(files)),
        RTE.map((it) => [it.index, ...it.fs])
    );

// -------------------------------------------------------------------------------------
// source-printer
// -------------------------------------------------------------------------------------
console.error("both calls to codeTemplate should hoist imports");
console.error(
    "exec should use ts-morph version? it's simple to re-parse the code... no need to come from blocks exactly"
);
const getAnnotatedSourceCode = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        refs,
        RA.map((ref) =>
            File(
                getExecFileName(ref.file, "ts"),
                pipe(
                    ref.blocks,
                    RA.mapWithIndex((_index, block) => {
                        const opener = JSON.stringify(block.opener);
                        const header = `// start-eval-block ${opener}`;
                        const footer = `// end-eval-block`;
                        return [header, block.content, footer].join("\n");
                    }),
                    (it) => it.join("\n"),
                    codeTemplate
                ),
                true
            )
        ),
        RTE.of
    );

const addInlayParameters = (sourceFile: SourceFile) => {
    sourceFile.forEachDescendant((node) => {
        if (Node.isCallExpression(node)) {
            const e = node.getExpressionIfKind(SyntaxKind.Identifier);

            const names = e
                ?.getType()
                .getCallSignatures()[0]
                ?.getParameters()
                .map((p) => p.getFullyQualifiedName());

            node.getArguments().forEach((arg, index) => {
                const inlay = names?.[index] ?? "";
                if (inlay != "") {
                    arg.replaceWithText(
                        "/* " + inlay + ": */ " + arg.getText()
                    );
                }
            });
        }
        return undefined; // return a falsy value or no value to continue iterating
    });
};

type FileBlocks = ReadonlyArray<MD.FencedCodeBlock>;

const toPrint = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<FileBlocks>> =>
    pipe(
        getAnnotatedSourceCode(refs),
        RTE.chain((it) => (_deps) => async () => {
            const project = new Project({
                tsConfigFilePath: "tsconfig.json",
            });

            for (const f of it) {
                project.createSourceFile(f.path, f.content);
            }

            const newFiles = it.map((f) => {
                const sourceFile = project.getSourceFile(f.path);

                if (sourceFile == null) {
                    throw new Error("sf not found");
                }

                addInlayParameters(sourceFile);

                return File(f.path, sourceFile.getFullText(), f.overwrite);
            });

            return E.of(newFiles);
        }),
        RTE.map(
            RA.map((file) => {
                const lines = file.content.split("\n");

                const acc: string[][] = [];

                let skipping = true;
                for (const line of lines) {
                    if (line.startsWith("// end-eval-block")) {
                        skipping = true;
                        continue;
                    }
                    if (line.startsWith("// start-eval-block")) {
                        acc.push([]);
                        skipping = false;
                    }
                    if (!skipping) {
                        acc[acc.length - 1].push(line);
                    }
                }

                return pipe(
                    acc,
                    RA.map(([head, ...tail]) =>
                        FencedCodeBlock(
                            tail.join("\n"),
                            JSON.parse(head.replace("// start-eval-block ", ""))
                        )
                    )
                );
            })
        )
    );

// -------------------------------------------------------------------------------------
// runner
// -------------------------------------------------------------------------------------

const spawnTsNode = (): Program<SpawnResult> => RTE.of(1 as any);

// -------------------------------------------------------------------------------------
// executor
// -------------------------------------------------------------------------------------

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (refs) =>
        pipe(
            getExecutableFilesAndIndex(refs),
            // at this stage we can use morph-ts
            RTE.chainW((it) => Core.writeFiles(it)),
            RTE.chain(spawnTsNode),
            RTE.bindTo("execResult"),
            RTE.bind("toPrint", () => toPrint(refs)),
            RTE.map((acc) =>
                pipe(
                    RA.zip(refs, acc.toPrint),
                    RA.map(([ref, toPrint]) => ({
                        inputFile: ref.file,
                        results: acc.execResult[ref.file.path],
                        transformedBlocks: toPrint,
                    }))
                )
            )
        ),
};
