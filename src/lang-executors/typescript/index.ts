import { hole, pipe } from "fp-ts/lib/function";
import { Program } from "../../program/Core";
import * as Executor from "../../program/Executor";
import * as Core from "../../program/Core";
import { File } from "../../program/FileSystem";
import * as InfoString from "../../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord";

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

const getFiles = (
    files: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> => {
    // const z = pipe(
    //     files,
    //     RA.map((file) => {
    //         let content = "";
    //         for (const b of file.blocks) {
    //             const either = InfoString.parse(b.opener.infoString);
    //             if (E.isLeft(either)) {
    //                 throw either.left;
    //             }
    //             const infoString = either.right.value;

    //             if (infoString.named["print"] != null) {
    //                 if (infoString.named["print"] === "error") {
    //                     content += consumeError(b.content);
    //                 } else {
    //                     content += consumeLastStatement(b);
    //                 }
    //             } else {
    //                 content += b.content;
    //             }
    //             content += "\n";
    //         }
    //         const y = codeTemplate(content);
    //         return hole();
    //     })
    // );

    return hole();
};

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

// // todo improve
// const getExecFileName = (file: File, language: string): string =>
//     file.path.replace(".md", "." + language);

// {
// language: "ts" as Language,
// compileOneFile: async (blocks) => {

// },
// };

// pipe(
//     compiledFiles,
//     RA.chain((it) =>
//         it.compiledAsts.map((ast) => ({
//             inFile: it.file,
//             outFile: File(
//                 getExecFileName(it.file, ast.language),
//                 ast.code,
//                 true
//             ),
//         }))
//     ),
//     RTE.of,
//     RTE.bindTo("comp"),
//     RTE.bind("index", (acc) =>
//     ),
//     RTE.map((it) => [it.index, ...it.comp.map((it) => it.outFile)])
// );

const getIndex = (
    files: ReadonlyArray<Executor.CompilerInputFile>
): Program<File> => hole();
//         pipe(
//             RTE.ask<Environment, TransportedError>(),
//             RTE.map((env) => {
//                 const imports = acc.comp
//                     .map((it) => it.outFile)
//                     .map((it) => it.path.replace(env.settings.srcDir, "."))
//                     .map((it) => it.replace(".ts", ""))
//                     .map((it, idx) => `import g${idx} from '${it}';`)
//                     .join("\n");

//                 const generators = acc.comp
//                     .map(
//                         (it, idx) =>
//                             `{generator: g${idx}, source: "${it.inFile.path}", }`
//                     )
//                     .join(",");
//                 return File(
//                     path.join(env.settings.srcDir, "index.ts"),
//                     indexTemplate(
//                         `${imports}\nconst generators: GenDef[] = [${generators}];`
//                     ),
//                     true
//                 );
//             })
//         )

const getExecutableFiles = (
    files: ReadonlyArray<Executor.CompilerInputFile>
): Program<ReadonlyArray<File>> =>
    pipe(
        getIndex(files),
        RTE.bindTo("index"),
        RTE.bind("fs", () => getFiles(files)),
        RTE.map((it) => [it.index, ...it.fs])
    );

// -------------------------------------------------------------------------------------
// runner
// -------------------------------------------------------------------------------------

const spawnTsNode = (): Program<SpawnResult> => hole();

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

//  pipe(
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

// -------------------------------------------------------------------------------------
// executor
// -------------------------------------------------------------------------------------

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (files) =>
        pipe(
            getExecutableFiles(files),
            RTE.chainW(Core.writeFiles),
            RTE.chain(spawnTsNode),
            RTE.map((execResult) =>
                pipe(
                    files,
                    RA.map((ref) => ({
                        ...ref,
                        results: execResult[ref.file.path],
                    }))
                )
            )
        ),
};
