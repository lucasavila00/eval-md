import { pipe } from "fp-ts/lib/function";
import { Program } from "../../program/Core";
import * as Executor from "../../program/Executor";
import * as Core from "../../program/Core";
import * as InfoString from "../../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";
import * as S from "fp-ts/lib/string";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord";
import { File } from "../../program/FileSystem";
import { codeTemplate, indexTemplate } from "./templates";
import * as MD from "../../program/MarkdownParser";
import * as path from "path";
import {
    Project,
    Node,
    SyntaxKind,
    SourceFile,
    CallExpression,
    NewExpression,
} from "ts-morph";
import { FencedCodeBlock } from "../../program/MarkdownParser";
import { ts } from "ts-morph";
import * as prettier from "prettier";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import { TraverseOptions } from "@babel/traverse";

import * as t from "@babel/types";
// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

type SpawnResult = ReadonlyRecord<
    // file path
    string,
    // results
    ReadonlyArray<Executor.LanguageExecutionResult>
>;

// -------------------------------------------------------------------------------------
// md -> valid TS
// -------------------------------------------------------------------------------------

const getOutputLanguage = (infoString: string) => {
    const infoStringEither = InfoString.parse(infoString);
    const outLanguage = pipe(
        infoStringEither,
        E.fold(
            () => "json",
            (it) => it.value.named["out"] ?? "json"
        )
    );
    return outLanguage;
};

const consoleVisitor: TraverseOptions = {
    CallExpression(path) {
        if (
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object) &&
            path.node.callee.object.name === "console"
        ) {
            path.node.callee.object.name = "__console";
        }
    },
};

const consumeVisitor = (
    outLanguage: string,
    index: number
): TraverseOptions => ({
    Program: (path) => {
        const body = path.node.body;
        const last = body[body.length - 1];
        if (last != null) {
            if (t.isExpressionStatement(last)) {
                const n = t.expressionStatement(
                    t.callExpression(t.identifier("__consume"), [
                        t.stringLiteral(outLanguage),
                        t.numericLiteral(index),
                        last.expression,
                    ])
                );
                body[body.length - 1] = n;
            }
        }
    },
});

const importsDeleteVisitor = (imports: string[]): TraverseOptions => ({
    ImportDeclaration(path) {
        imports.push(generator(path.node).code);
        path.remove();
    },
});

const importsToCommentVisitor = (imports: string[]): TraverseOptions => ({
    ImportDeclaration(path) {
        imports.push(generator(path.node).code);

        const x =
            generator(path.node)
                .code.trim()
                .split("\n")
                .map((it) => "eval-md-hoisted\n" + it)
                .join("\n") + "\n";

        path.addComment("leading", x);
        path.remove();
    },
});
const transformTs = (
    it: string,
    visitors: TraverseOptions[],
    shouldPrintComment: boolean
): string => {
    const ast = parser.parse(it, {
        plugins: ["typescript"],
        sourceType: "module",
    });
    visitors.forEach((visitor) => traverse(ast, visitor));
    const newCode = generator(ast, {
        shouldPrintComment: () => shouldPrintComment,
    }).code;
    return newCode;
};

const getAnnotatedSourceCode =
    (
        refs: ReadonlyArray<Executor.CompilerInputFile>,
        willExecute: boolean
    ): Program<ReadonlyArray<File>> =>
    (env) =>
    async () =>
        pipe(
            refs,
            RA.map((ref) => {
                const imports: string[] = [];

                const code = pipe(
                    ref.blocks,
                    RA.chainWithIndex((index, block) => {
                        const outLanguage = getOutputLanguage(
                            block.opener.infoString
                        );

                        if (willExecute) {
                            const consoleBlockN = `__consoleBlock = ${index};`;

                            if (outLanguage === "error") {
                                const out = transformTs(
                                    block.content,
                                    [
                                        consoleVisitor,
                                        importsDeleteVisitor(imports),
                                    ],
                                    false
                                );

                                const try_ = "try {";
                                const catch_ = `;__dnt=true;}catch(e){__consume("error",${index},e)};if(__dnt){throw new Error('did not throw')}`;
                                return [consoleBlockN, try_, out, catch_];
                            } else {
                                const out = transformTs(
                                    block.content,
                                    [
                                        consoleVisitor,
                                        importsDeleteVisitor(imports),
                                        consumeVisitor(outLanguage, index),
                                    ],
                                    false
                                );

                                return [consoleBlockN, out];
                            }
                        } else {
                            const out = transformTs(
                                block.content,
                                [importsToCommentVisitor(imports)],
                                true
                            );

                            const opener = JSON.stringify(block.opener);
                            const header = `// start-eval-block ${opener}`;
                            const footer = `// end-eval-block`;

                            return [header, out, footer];
                        }
                    })
                );
                const content = [
                    ...pipe(imports, RA.uniq(S.Eq)),
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
// -------------------------------------------------------------------------------------
// transformer
// -------------------------------------------------------------------------------------

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

const addInlayParametersToNode = (
    node: CallExpression<ts.CallExpression>,
    names: string[] | null
): void => {
    node.getArguments().forEach((arg, index) => {
        const inlay = names?.[index] ?? "";
        if (inlay != "") {
            arg.replaceWithText("/* " + inlay + ": */ " + arg.getText());
        }
    });
};
const addInlayParametersToNodeNewExpression = (
    node: NewExpression,
    names: string[] | null
): void => {
    node.getArguments().forEach((arg, index) => {
        const inlay = names?.[index] ?? "";
        if (inlay != "") {
            arg.replaceWithText("/* " + inlay + ": */ " + arg.getText());
        }
    });
};

const addInlayParameters = (sourceFile: SourceFile) => {
    sourceFile.forEachDescendant((node) => {
        if (Node.isNewExpression(node)) {
            const identifierKind = node.getExpressionIfKind(
                SyntaxKind.Identifier
            );

            if (identifierKind != null) {
                const names = identifierKind
                    .getType()
                    .getConstructSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNodeNewExpression(node, names);
            }
        }
        if (Node.isCallExpression(node)) {
            const identifierKind = node.getExpressionIfKind(
                SyntaxKind.Identifier
            );
            if (identifierKind != null) {
                const names = identifierKind
                    .getType()
                    .getCallSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNode(node, names);
            }

            const propertyAccessKind = node.getExpressionIfKind(
                SyntaxKind.PropertyAccessExpression
            );

            if (propertyAccessKind != null) {
                const names = propertyAccessKind
                    .getType()
                    .getCallSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNode(node, names);
            }
        }
    });
};

type FileBlocks = ReadonlyArray<MD.FencedCodeBlock>;

const toPrint = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<FileBlocks>> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Processing code with ts-morph..."))
        ),
        RTE.chain(() => getAnnotatedSourceCode(refs, false)),
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
                let hoisted = 0;
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
                        if (line.startsWith("/*eval-md-hoisted")) {
                            hoisted++;
                            continue;
                        }

                        if (hoisted > 0) {
                            if (line.startsWith("*/")) {
                                hoisted--;
                                continue;
                            }
                        }

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
        ),
        RTE.map(
            RA.map(
                RA.map((block) => ({
                    ...block,
                    content: prettier
                        .format(block.content, {
                            filepath: "it.ts",
                        })
                        .trim(),
                }))
            )
        ),
        RTE.chainFirst(
            (_it) => (deps) =>
                deps.logger.debug("Finished formatting with ts-morph...")
        )
    );

// -------------------------------------------------------------------------------------
// runner
// -------------------------------------------------------------------------------------

const spawnTsNode = (): Program<SpawnResult> =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Spawning ts-node..."))
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

const getExec = (refs: ReadonlyArray<Executor.CompilerInputFile>) =>
    pipe(
        RTE.ask<Core.Environment, Core.TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Starting ts-node execution..."))
        ),
        RTE.chain(() => getExecutableFilesAndIndex(refs)),
        RTE.chainW((it) => Core.writeFiles(it)),
        RTE.chain(spawnTsNode),
        RTE.chainFirst(
            (_it) => (deps) =>
                deps.logger.debug("Finished ts-node execution...")
        )
    );

const mergeParallel =
    (
        refs: ReadonlyArray<Executor.CompilerInputFile>
    ): Program<{
        execResult: Readonly<
            Record<string, readonly Executor.LanguageExecutionResult[]>
        >;
        toPrint: ReadonlyArray<FileBlocks>;
    }> =>
    (deps) =>
    async () => {
        const [ex, prt] = await Promise.all([
            getExec(refs)(deps)(),
            toPrint(refs)(deps)(),
        ]);
        return pipe(
            ex,
            E.bindTo("execResult"),
            E.bind("toPrint", () => prt)
        );
    };

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (refs) =>
        pipe(
            mergeParallel(refs),
            // getExecutableFilesAndIndex(refs),
            // RTE.chainW((it) => Core.writeFiles(it)),
            // RTE.chain(spawnTsNode),
            // RTE.bindTo("execResult"),
            // RTE.bind("toPrint", () => toPrint(refs)),
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
