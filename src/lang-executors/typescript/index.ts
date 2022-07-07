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
import { ts } from "ts-morph";

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

const getAnnotatedSourceCode =
    (
        refs: ReadonlyArray<Executor.CompilerInputFile>,
        consumeEndOfBlock: boolean
    ): Program<ReadonlyArray<File>> =>
    (env) =>
    async () =>
        pipe(
            refs,
            RA.map((ref) => {
                const imports: string[] = [];

                const code = pipe(
                    ref.blocks,
                    RA.mapWithIndex((index, block) => {
                        const opener = JSON.stringify(block.opener);
                        const header = `// start-eval-block ${opener}`;
                        const footer = `// end-eval-block`;

                        const project = new Project();
                        const sourceFile = project.createSourceFile(
                            "it.ts",
                            block.content
                        );

                        sourceFile.forEachChild((node) => {
                            if (Node.isImportDeclaration(node)) {
                                imports.push(node.getFullText());
                                node.replaceWithText(
                                    node
                                        .getFullText()
                                        .trim()
                                        .split("\n")
                                        .map((it) => "// eval-md-hoisted " + it)
                                        .join("\n")
                                );
                            }
                        });

                        if (consumeEndOfBlock) {
                            const sts = sourceFile.getStatements();
                            const last = sts[sts.length - 1];

                            last?.transform((traversal) => {
                                if (
                                    ts.isExpressionStatement(
                                        traversal.currentNode
                                    )
                                ) {
                                    return traversal.factory.createExpressionStatement(
                                        traversal.factory.createCallExpression(
                                            traversal.factory.createIdentifier(
                                                "__consume"
                                            ),
                                            undefined,
                                            [
                                                traversal.factory.createNumericLiteral(
                                                    index
                                                ),
                                                traversal.currentNode
                                                    .expression,
                                            ]
                                        )
                                    );
                                }
                                return traversal.currentNode;
                            });
                        }

                        return [header, sourceFile.getFullText(), footer].join(
                            "\n"
                        );
                    })
                );
                const content = [
                    imports,
                    codeTemplate(
                        "const __meta = " +
                            JSON.stringify({
                                ...env.settings.runtimeMeta,
                                inputPath: ref.file.path,
                                outputPath: ref.file.path.replace(
                                    env.settings.srcDir,
                                    env.settings.outDir
                                ),
                            }) +
                            ";\n" +
                            code.join("\n")
                    ),
                ].join("\n");
                return File(ref.file.path, content, false);
            }),
            E.of
        );

const changeExtension = (file: string, extension: string): string => {
    const basename = path.basename(file, path.extname(file));
    return path.join(path.dirname(file), basename + extension);
};

const getExecFileName = (file: File, language: string): string =>
    changeExtension(file.path, "." + language);

const getExecutableSourceCode = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        getAnnotatedSourceCode(refs, true),
        RTE.map(
            RA.map((it) =>
                File(getExecFileName(it, "exec.ts"), it.content, true)
            )
        )
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
                .map((it) => it.replace(".md", ".exec"))
                .map((it, idx) => `import g${idx} from '${it}';`)
                .join("\n");

            const generators = refs
                .map(
                    (it, idx) =>
                        `{generator: g${idx}, source: "${it.file.path}", }`
                )
                .join(",");

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
        RTE.bind("fs", () => getExecutableSourceCode(files)),
        RTE.map((it) => [it.index, ...it.fs])
    );

// -------------------------------------------------------------------------------------
// source-printer
// -------------------------------------------------------------------------------------

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
    });
};

type FileBlocks = ReadonlyArray<MD.FencedCodeBlock>;

const toPrint = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<FileBlocks>> =>
    pipe(
        getAnnotatedSourceCode(refs, false),
        RTE.chain((it) => (_deps) => async () => {
            const project = new Project({
                tsConfigFilePath: "tsconfig.json",
            });

            for (const f of it) {
                project.createSourceFile(
                    getExecFileName(f, "check.ts"),
                    f.content
                );
            }

            const newFiles = it.map((f) => {
                const sourceFile = project.getSourceFile(
                    getExecFileName(f, "check.ts")
                );

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
                    RA.map(
                        RA.map((it) =>
                            it.startsWith("// eval-md-hoisted ")
                                ? it.replace("// eval-md-hoisted ", "")
                                : it
                        )
                    ),
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

const spawnTsNode = (): Program<SpawnResult> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Type checking examples..."))
        ),
        RTE.chainTaskEitherK(({ settings, runner: Runner }) => {
            const command =
                process.platform === "win32" ? "ts-node.cmd" : "ts-node";
            const executablePath = path.join(
                process.cwd(),
                settings.srcDir,
                "index.exec.ts"
            );
            return Runner.run(command, executablePath);
        }),
        RTE.map((value) => {
            let capturing = false;
            const lines: string[] = [];
            for (const iterator of value.split("\n")) {
                if (iterator.startsWith("##eval-md-start##")) {
                    capturing = true;
                    continue;
                }
                if (iterator.startsWith("##eval-md-end##")) {
                    capturing = false;
                    break;
                }
                if (capturing) {
                    lines.push(iterator);
                }
            }
            return JSON.parse(lines.join("\n"));
        })
    );
// -------------------------------------------------------------------------------------
// executor
// -------------------------------------------------------------------------------------

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (refs) =>
        pipe(
            getExecutableFilesAndIndex(refs),
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
