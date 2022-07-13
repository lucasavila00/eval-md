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
import { FencedCodeBlock } from "../../program/MarkdownParser";
import * as prettier from "prettier";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import { TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";
import { getExecFileName } from "./shared";
import { TransportedError } from "../../program/Errors";
import * as TE from "fp-ts/lib/TaskEither";
import { transformWithTsMorph } from "./worker-ts";
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
                n.innerComments = last.innerComments;
                n.trailingComments = last.trailingComments;
                n.leadingComments = last.leadingComments;
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
const hoistStartStr = "eval-md-hoisted:";
const hoistEndStr = ":end-eval-md-hoist";
const importsToCommentVisitor = (
    imports: string[],
    importMap: Record<string, string>
): TraverseOptions => ({
    ImportDeclaration(path) {
        imports.push(generator(path.node).code);
        Object.entries(importMap).forEach(([k, v]) => {
            if (path.node.source.value.includes(k)) {
                path.node.source.value = path.node.source.value.replace(k, v);
            }
        });

        path.replaceWith(
            t.stringLiteral(
                hoistStartStr +
                    Buffer.from(generator(path.node).code.trim()).toString(
                        "base64"
                    ) +
                    hoistEndStr
            )
        );
    },
});
const transformTs = (it: string, visitors: TraverseOptions[]): string => {
    const ast = parser.parse(it, {
        plugins: ["typescript"],
        sourceType: "module",
    });
    visitors.forEach((visitor) => traverse(ast, visitor));
    const newCode = generator(ast, {
        comments: true,
        concise: true,
        // retainLines: true,
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

                            const isErrorBlock = pipe(
                                InfoString.parse(block.opener.infoString),
                                E.fold(
                                    () => false,
                                    (it) => it.value.flags.includes("error")
                                )
                            );
                            if (isErrorBlock) {
                                const out = transformTs(block.content, [
                                    consoleVisitor,
                                    importsDeleteVisitor(imports),
                                ]);

                                const try_ = "try {";
                                const catch_ = `;__dnt=true;}catch(e){__consume("error",${index},e)};if(__dnt){throw new Error('did not throw')}`;
                                return [consoleBlockN, try_, out, catch_];
                            } else {
                                const out = transformTs(block.content, [
                                    consoleVisitor,
                                    importsDeleteVisitor(imports),
                                    consumeVisitor(outLanguage, index),
                                ]);

                                return [consoleBlockN, out];
                            }
                        } else {
                            const out = transformTs(block.content, [
                                importsToCommentVisitor(
                                    imports,
                                    env.settings.imports
                                ),
                            ]);

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
                return File(ref.file.path, content);
            }),
            E.of
        );
// -------------------------------------------------------------------------------------
// transformer
// -------------------------------------------------------------------------------------

const getExecutableSourceCode = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        getAnnotatedSourceCode(refs, true),
        RTE.map(
            RA.map((it) => File(getExecFileName(it, "exec.ts"), it.content))
        )
    );

const getIndex = (
    refs: ReadonlyArray<Executor.CompilerInputFile>
): Program<File> =>
    pipe(
        RTE.ask<Core.Environment, TransportedError>(),
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
                path.join(env.settings.srcDir, "__entrypoint.exec.ts"),
                indexTemplate(
                    `${imports}\nconst generators: GenDef[] = [${generators}];`
                )
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
const consumeHoistedLine = (line: string, acc: string[]): string[] => {
    const startIdx = line.indexOf(hoistStartStr);
    const endIdx = line.indexOf(hoistEndStr);

    const captured = Buffer.from(
        line.substring(startIdx + hoistStartStr.length, endIdx),
        "base64"
    ).toString("ascii");

    const final = line
        .substring(endIdx + hoistEndStr.length)
        .trim()
        .replace('";', "");
    const newAcc = [...acc, captured];
    if (final.includes(hoistStartStr) && final.includes(hoistEndStr)) {
        return consumeHoistedLine(final, newAcc);
    } else {
        return [...newAcc, final];
    }
};
type FileBlocks = ReadonlyArray<MD.FencedCodeBlock>;

const toPrint =
    (
        refs: ReadonlyArray<Executor.CompilerInputFile>
    ): Program<ReadonlyArray<FileBlocks>> =>
    (deps) =>
        !deps.settings.typescript.inlayHints
            ? TE.of(refs.map((it) => it.blocks))
            : pipe(
                  RTE.ask<Core.Environment, TransportedError>(),
                  RTE.chainFirst(({ logger }) =>
                      RTE.fromTaskEither(
                          logger.debug("Processing code with ts-morph...")
                      )
                  ),
                  RTE.chain(() => getAnnotatedSourceCode(refs, false)),
                  RTE.chain((it) => (deps) => async () => {
                      const result = transformWithTsMorph(it);
                      deps.logger.debug("Ts-morph finished")();
                      return E.of(result);
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
                                  if (
                                      line.includes(hoistStartStr) &&
                                      line.includes(hoistEndStr)
                                  ) {
                                      acc[acc.length - 1].push(
                                          ...consumeHoistedLine(line, [])
                                      );
                                  } else {
                                      acc[acc.length - 1].push(line);
                                  }
                              }
                          }

                          return pipe(
                              acc,
                              RA.map(([head, ...tail]) =>
                                  FencedCodeBlock(
                                      tail.join("\n"),
                                      JSON.parse(
                                          head.replace(
                                              "// start-eval-block ",
                                              ""
                                          )
                                      )
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
                          deps.logger.debug(
                              "Finished formatting with ts-morph..."
                          )
                  )
              )(deps);

// -------------------------------------------------------------------------------------
// runner
// -------------------------------------------------------------------------------------

const spawnTsNode = (): Program<SpawnResult> =>
    pipe(
        RTE.ask<Core.Environment, TransportedError>(),
        RTE.chainFirst(({ logger }) =>
            RTE.fromTaskEither(logger.debug("Spawning ts-node..."))
        ),
        RTE.chainTaskEitherK(({ settings, runner: Runner }) => {
            const command =
                process.platform === "win32" ? "ts-node.cmd" : "ts-node";
            const executablePath = path.join(
                process.cwd(),
                settings.srcDir,
                "__entrypoint.exec.ts"
            );
            return Runner.run(command, [executablePath]);
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
        RTE.ask<Core.Environment, TransportedError>(),
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

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (refs) =>
        pipe(
            RTE.Do,
            RTE.apS("execResult", getExec(refs)),
            RTE.apS("toPrint", toPrint(refs)),
            RTE.map((acc) =>
                pipe(
                    RA.zip(refs, acc.toPrint),
                    RA.map(([ref, toPrint]) => ({
                        inputFilePath: ref.file.path,
                        results: acc.execResult[ref.file.path],
                        transformedBlocks: toPrint,
                    }))
                )
            )
        ),
};
