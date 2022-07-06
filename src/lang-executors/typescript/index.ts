import { hole, pipe } from "fp-ts/lib/function";
import { Program } from "../../program/Core";
import * as Executor from "../../program/Executor";
import * as Core from "../../program/Core";
import * as InfoString from "../../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord";
import { File } from "../../program/FileSystem";
import { indexTemplate } from "./templates";
import * as path from "path";

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
                    RA.mapWithIndex((index, block) => {
                        const header = `// start-eval-block ${index}`;
                        const footer = `// end-eval-block ${index}`;
                        return [header, block.content, footer].join("\n");
                    }),
                    (it) => it.join("\n")
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
        getAnnotatedSourceCode(refs),
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
                path.join(env.settings.srcDir, "index.ts"),
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
// runner
// -------------------------------------------------------------------------------------

const spawnTsNode = (): Program<SpawnResult> => hole();

// -------------------------------------------------------------------------------------
// executor
// -------------------------------------------------------------------------------------

export const typescriptLanguageExecutor: Executor.LanguageExecutor = {
    language: "ts" as InfoString.InputLanguage,
    execute: (files) =>
        pipe(
            getExecutableFilesAndIndex(files),
            // at this stage we can use morph-ts
            RTE.chainW((it) => Core.writeFiles(it)),
            RTE.chain(spawnTsNode),
            RTE.map((execResult) =>
                pipe(
                    files,
                    RA.map((ref) => ({
                        inputFile: ref.file,
                        results: execResult[ref.file.path],
                        transformedBlocks: 1 as any,
                    }))
                )
            )
        ),
};
