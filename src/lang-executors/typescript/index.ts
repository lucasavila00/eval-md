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
import { Worker } from "node:worker_threads";
import * as t from "@babel/types";
import { getExecFileName } from "./shared";
import { TransportedError } from "../../program/Errors";
import * as TE from "fp-ts/lib/TaskEither";
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

        path.replaceWith(t.emptyStatement());
        path.addComment("leading", x);
    },
});
const transformTs = (
    it: string,
    visitors: TraverseOptions[],
    comments: boolean
): string => {
    const ast = parser.parse(it, {
        plugins: ["typescript"],
        sourceType: "module",
    });
    visitors.forEach((visitor) => traverse(ast, visitor));
    const newCode = generator(ast, {
        comments,
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
                      deps.logger.debug("Spawning ts-morph worker")();
                      const p = new Promise((resolve, reject) => {
                          const worker = new Worker(
                              path.join(__dirname, "worker.js"),
                              {
                                  workerData: JSON.stringify(it),
                              }
                          );
                          worker.on("message", resolve);
                          worker.on("error", reject);
                          worker.on("exit", (code) => {
                              if (code !== 0)
                                  reject(
                                      new Error(
                                          `Worker stopped with exit code ${code}`
                                      )
                                  );
                          });
                      });
                      const r = await p;
                      deps.logger.debug("Ts-morph worker finished")();
                      const newFiles2: File[] = JSON.parse(r as any);

                      return E.of(newFiles2);
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
                                          acc[acc.length - 1].push(
                                              line.replace("*/", "")
                                          );
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
