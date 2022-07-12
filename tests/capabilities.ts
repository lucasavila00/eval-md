import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as Endomorphism from "fp-ts/lib/Endomorphism";
import * as O from "fp-ts/Option";
import * as R from "fp-ts/Record";
import * as TE from "fp-ts/TaskEither";
import minimatch from "minimatch";
import { join } from "path";
import * as Core from "../src/program/Core";
import { LanguageExecutor } from "../src/program/Executor";
import * as FS from "../src/program/FileSystem";
import * as L from "../src/program/Logger";
import * as Runner from "../src/program/Runner";
import { OutputTransformer } from "../src/program/Transformer";

export type FileSystemState = Record<string, string>;
export type Log = Array<string>;

export const joinCwd = (key: string) => join(process.cwd(), key);
export const rmCwdOne = (key: string) => key.replace(process.cwd(), "");

export const prefixWithCwd: Endomorphism.Endomorphism<FileSystemState> =
    R.reduceWithIndex<string, string, FileSystemState>(
        {},
        (key, acc, content) => ({
            ...acc,
            [joinCwd(key)]: content,
        })
    );

export const rmCwd: Endomorphism.Endomorphism<FileSystemState> =
    R.reduceWithIndex<string, string, FileSystemState>(
        {},
        (key, acc, content) => ({
            ...acc,
            [key.replace(process.cwd(), "")]: content,
        })
    );

export const makeCapabilities = ({
    fileSystemState = {},
    outputPrinters = [],
    languageCompilers = [],
}: {
    fileSystemState?: FileSystemState;
    outputPrinters?: readonly OutputTransformer[];
    languageCompilers?: readonly LanguageExecutor[];
} = {}) => {
    const state: {
        fileSystemState: FileSystemState;
        log: Log;
        command: string;
        executablePath: string[];
    } = {
        fileSystemState: prefixWithCwd(fileSystemState),
        log: [],
        command: "",
        executablePath: [],
    };

    const fileSystem: FS.FileSystem = {
        readFile: (path) =>
            pipe(
                R.lookup(path, state.fileSystemState),
                TE.fromOption(() => `Error: file not found: ${path}`)
            ),
        writeFile: (path, content) => {
            state.fileSystemState = {
                ...state.fileSystemState,
                [join(process.cwd(), path.replace(process.cwd(), ""))]: content,
            };
            return TE.of(undefined);
        },
        exists: (path) =>
            TE.of<string, boolean>(
                pipe(state.fileSystemState, R.lookup(path), O.isSome)
            ),
        remove: (pattern) => {
            Object.keys(state.fileSystemState).forEach((path) => {
                if (minimatch(path, pattern)) {
                    delete state.fileSystemState[path];
                }
            });
            return TE.of(undefined);
        },
        search: (pattern: string, exclude: ReadonlyArray<string>) => {
            return TE.of(
                pipe(
                    state.fileSystemState,
                    R.filterWithIndex((path) =>
                        minimatch(path, join(process.cwd(), pattern))
                    ),
                    R.keys,
                    A.filter(
                        (path) =>
                            !exclude.some((pattern) =>
                                minimatch(path, join(process.cwd(), pattern))
                            )
                    )
                )
            );
        },
    };

    const runner: Runner.Runner = {
        run: (c, p) => {
            state.command = c;
            state.executablePath = p;
            return TE.of(
                "\n##eval-md-start##\n" +
                    JSON.stringify({}) +
                    "\n##eval-md-end##\n"
            );
        },
    };
    const addMsgToLog: (msg: string) => TE.TaskEither<string, void> = (msg) => {
        state.log.push(msg.replace(process.cwd(), "/process/cwd/"));
        return TE.of(undefined);
    };

    const logger: L.Logger = {
        debug: addMsgToLog,
        error: addMsgToLog,
        info: addMsgToLog,
    };
    const capabilities: Core.Capabilities = {
        fileSystem,
        runner,
        logger,
        languageCompilers,
        outputPrinters,
    };
    return { capabilities, state };
};
