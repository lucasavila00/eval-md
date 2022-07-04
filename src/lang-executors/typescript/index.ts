// import { LanguageCompiler } from "../../types";
// import { codeTemplate } from "./templates";
// import { parseInfoString } from "../../parse-info-string";
// import * as E from "fp-ts/lib/Either";
// import * as prettier from "prettier";
// import { FencedCodeBlock } from "../../md-types";

import { hole } from "fp-ts/lib/function";
import { LanguageCompiler } from "../../program/Executor";

// const addConsumeToLastStatement = (node: any): any => {
//     if (node.type !== "ExpressionStatement") {
//         throw new Error("unrecognized node");
//     }
//     return {
//         type: "ExpressionStatement",
//         expression: {
//             type: "CallExpression",
//             callee: {
//                 type: "Identifier",
//                 name: "__consume",
//             },
//             optional: false,
//             arguments: [node.expression],
//         },
//     };
// };
// const consumeLastStatement = (block: FencedCodeBlock): string => {
//     if (block.content.length === 0) {
//         throw new Error("code is empty");
//     }
//     return prettier
//         .format(block.content, {
//             filepath: "it.ts",
//             parser: (text, cfg) => {
//                 const ast: any = cfg.typescript(text);
//                 const body = ast.body.map((node: any, index: number) => {
//                     if (index === ast.body.length - 1) {
//                         return addConsumeToLastStatement(node);
//                     }
//                     return node;
//                 });

//                 const newAst = { ...ast, body };
//                 return newAst;
//             },
//         })
//         .trimEnd();
// };

// const consumeError = (code: string) => {
//     return `try {${code}; throw new Error('did-not-throw')}
// catch(e:any) {if(e.message === 'did-not-throw'){throw e}else{__consume(e)}}`;
// };

export const typescriptLanguageCompiler: LanguageCompiler = hole();
// {
// language: "ts" as Language,
// compileOneFile: async (blocks) => {
//     let content = "";
//     for (const b of blocks) {
//         const either = parseInfoString(b.opener.infoString);
//         if (E.isLeft(either)) {
//             throw either.left;
//         }
//         const infoString = either.right.value;

//         if (infoString.named["print"] != null) {
//             if (infoString.named["print"] === "error") {
//                 content += consumeError(b.content);
//             } else {
//                 content += consumeLastStatement(b);
//             }
//         } else {
//             content += b.content;
//         }
//         content += "\n";
//     }
//     return codeTemplate(content);
// },
// };

// const executeFiles = (
//     modules: ReadonlyArray<AstAndFile>
// ): Program<ExecResult[]> =>
//     pipe(
//         modules,
//         RTE.traverseArray((it) =>
//             pipe(
//                 //
//                 compileOneAst(it.ast),
//                 RTE.bindTo("compiledAsts"),
//                 RTE.bind("file", () => RTE.of(it.file))
//             )
//         ),
//         RTE.chain(writeExecutableFiles),
//         RTE.chain(() => spawnTsNode),
//         RTE.map((it) => [it])
//     );

// const getCompilers = (): Program<LanguageCompiler[]> => (deps) =>
//     TE.of(deps.settings.languageCompilers);

// const fencedCodeBlocksFromAST = (ast: MarkdownAST): FencedCodeBlock[] =>
//     ast.filter((it) => it._tag === "FencedCodeBlock") as FencedCodeBlock[];

// const filterLanguageBlocks = (
//     ast: MarkdownAST,
//     comp: LanguageCompiler
// ): Program<FencedCodeBlock[]> =>
//     pipe(
//         fencedCodeBlocksFromAST(ast),
//         A.filter((it) =>
//             pipe(
//                 // do it as lazily ass possible, to only throw errors if we're supposed to eval the code block
//                 getInfoStringLanguage(it.opener.infoString),
//                 O.fold(
//                     () => false,
//                     (lang) =>
//                         lang === comp.language &&
//                         isEvalInfoString(it.opener.infoString)
//                 )
//             )
//         ),
//         RTE.of
//     );

// const tryCatchCompiler =
//     (
//         blocks: NonEmptyArray<FencedCodeBlock>,
//         comp: LanguageCompiler
//     ): Program<string> =>
//     (_deps) =>
//         TE.tryCatch(
//             () => comp.compileOneFile(blocks),
//             (e) => e
//         );

// type CompiledAST = {
//     language: string;
//     code: string;
// };

// const runOneCompiler = (
//     ast: MarkdownAST,
//     comp: LanguageCompiler
// ): Program<O.Option<CompiledAST>> =>
//     pipe(
//         filterLanguageBlocks(ast, comp),
//         RTE.map(fromArray),
//         RTE.chain((blocks) =>
//             O.isNone(blocks)
//                 ? RTE.of(O.none)
//                 : pipe(
//                       tryCatchCompiler(blocks.value, comp),
//                       RTE.map((code) =>
//                           O.some({
//                               code,
//                               language: comp.language,
//                           })
//                       )
//                   )
//         )
//     );

// export const compileOneAst = (
//     ast: MarkdownAST
// ): Program<readonly CompiledAST[]> =>
//     pipe(
//         getCompilers(),
//         RTE.chain(RTE.traverseArray((comp) => runOneCompiler(ast, comp))),
//         RTE.map((it) =>
//             it.reduce(
//                 (p, c) => (O.isSome(c) ? [...p, c.value] : p),
//                 [] as readonly CompiledAST[]
//             )
//         )
//     );

// // todo improve
// const getExecFileName = (file: File, language: string): string =>
//     file.path.replace(".md", "." + language);

// const getExecutableFiles = (
//     compiledFiles: ReadonlyArray<CompiledAstAndFile>
// ): Program<ReadonlyArray<File>> =>
//     pipe(
//         compiledFiles,
//         RA.chain((it) =>
//             it.compiledAsts.map((ast) => ({
//                 inFile: it.file,
//                 outFile: File(
//                     getExecFileName(it.file, ast.language),
//                     ast.code,
//                     true
//                 ),
//             }))
//         ),
//         RTE.of,
//         RTE.bindTo("comp"),
//         RTE.bind("index", (acc) =>
//             pipe(
//                 RTE.ask<Environment, TransportedError>(),
//                 RTE.map((env) => {
//                     const imports = acc.comp
//                         .map((it) => it.outFile)
//                         .map((it) => it.path.replace(env.settings.srcDir, "."))
//                         .map((it) => it.replace(".ts", ""))
//                         .map((it, idx) => `import g${idx} from '${it}';`)
//                         .join("\n");

//                     const generators = acc.comp
//                         .map(
//                             (it, idx) =>
//                                 `{generator: g${idx}, source: "${it.inFile.path}", }`
//                         )
//                         .join(",");
//                     return File(
//                         path.join(env.settings.srcDir, "index.ts"),
//                         indexTemplate(
//                             `${imports}\nconst generators: GenDef[] = [${generators}];`
//                         ),
//                         true
//                     );
//                 })
//             )
//         ),
//         RTE.map((it) => [it.index, ...it.comp.map((it) => it.outFile)])
//     );

// const writeExecutableFiles = (
//     compiledFiles: ReadonlyArray<CompiledAstAndFile>
// ): Program<void> =>
//     pipe(
//         RTE.ask<Environment, TransportedError>(),
//         RTE.chainFirst(({ logger }) =>
//             RTE.fromTaskEither(logger.debug("Writing examples..."))
//         ),
//         RTE.chain((C) =>
//             pipe(
//                 getExecutableFiles(compiledFiles),
//                 RTE.chainTaskEitherK((files) => pipe(C, writeFiles(files)))
//             )
//         )
//     );

// type ExecResult = {
//     language: string;
//     stdout: any;
// };
// const spawnTsNode: Program<ExecResult> = pipe(
//     RTE.ask<Environment, TransportedError>(),
//     RTE.chainFirst(({ logger }) =>
//         RTE.fromTaskEither(logger.debug("Type checking examples..."))
//     ),
//     RTE.chainTaskEitherK(({ settings }) => {
//         const command =
//             process.platform === "win32" ? "ts-node.cmd" : "ts-node";
//         const executablePath = path.join(
//             process.cwd(),
//             settings.srcDir,
//             "index.ts"
//         );
//         return run(command, executablePath);
//     }),
//     RTE.map((stdout) => {
//         return { stdout, language: "ts" };
//     })
// );

// type CompiledAstAndFile = {
//     compiledAsts: readonly CompiledAST[];
//     file: File;
// };
// const getOutputFromStdout = (it: string): string => {
//     const acc: string[] = [];
//     let capturing = false;
//     for (const line of it.split("\n")) {
//         if (line.startsWith("##eval-md-end##")) {
//             return acc.join("\n");
//         }
//         if (capturing) {
//             acc.push(line);
//         }
//         if (line.startsWith("##eval-md-start##")) {
//             capturing = true;
//         }
//     }

//     return acc.join("\n");
// };
// /**
//  * @since 0.6.0
//  */
//  import * as E from "fp-ts/Either";
//  import * as TE from "fp-ts/TaskEither";
//  import { pipe } from "fp-ts/function";
//  import { spawnSync } from "child_process";

//  export const run = (
//      command: string,
//      executablePath: string
//  ): TE.TaskEither<string, string> =>
//      pipe(
//          TE.fromEither(
//              E.tryCatch(
//                  () =>
//                      spawnSync(command, [executablePath], {
//                          stdio: "pipe",
//                          encoding: "utf8",
//                      }),
//                  String
//              )
//          ),
//          TE.chain(({ status, stderr, stdout }) =>
//              status === 0 ? TE.right(stdout) : TE.left(stderr)
//          )
//      );
