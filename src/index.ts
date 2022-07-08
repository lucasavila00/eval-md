/**
 * @since 0.2.0
 */
import chalk from "chalk";
import { log } from "fp-ts/Console";
import * as IO from "fp-ts/IO";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as Core from "./program/Core";
import { File, FileSystem } from "./program/FileSystem";
import { Logger } from "./program/Logger";
import { pipe } from "fp-ts/lib/function";
import { Runner } from "./program/Runner";
import chokidar from "chokidar";
import connect from "connect";
import cors from "cors";
import { WebSocket, WebSocketServer } from "ws";

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const exitProcess =
    (code: 0 | 1): IO.IO<void> =>
    () =>
        process.exit(code);

const onLeft = (e: string): T.Task<void> =>
    process.env["EVAL_MD_WILL_THROW"] == "yes"
        ? pipe(
              T.fromIO(
                  log(chalk.bold.green("Docs generation failed, as expected!"))
              ),
              T.chain(() => T.fromIO(log(chalk.bold.red(e)))),
              T.chain(() => T.fromIO(exitProcess(0)))
          )
        : T.fromIO(
              pipe(
                  log(chalk.bold.red(e)),
                  IO.chain(() => exitProcess(1))
              )
          );

const onRight: T.Task<void> =
    process.env["EVAL_MD_WILL_THROW"] == "yes"
        ? pipe(
              T.fromIO(
                  log(
                      chalk.bold.green(
                          "Docs generation did not fail, it was expected!"
                      )
                  )
              ),
              T.chain(() => T.fromIO(exitProcess(1)))
          )
        : pipe(
              T.fromIO(log(chalk.bold.green("Docs generation succeeded!"))),
              T.chain(() => T.fromIO(exitProcess(0)))
          );

/**
 * @category utils
 * @since 0.6.0
 */
export const exit: (program: TE.TaskEither<string, void>) => T.Task<void> =
    TE.fold(onLeft, () => onRight);

const capabilities: Core.Capabilities = {
    fileSystem: FileSystem,
    logger: Logger,
    runner: Runner,
};

/**
 * @category utils
 * @since 0.6.0
 */

const st = {
    busy: false,
    requested: false,
};

let state: E.Either<Core.TransportedError, ReadonlyArray<File>> = E.right([]);
let wsc: WebSocket | null = null;
export const main: T.Task<void> = async () => {
    if (process.env["EVAL_MD_WATCH"] != "yes") {
        return pipe(Core.main(capabilities), exit)();
    }

    const te = Core.getFiles(capabilities);

    const doit = async () => {
        if (st.busy) {
            st.requested = true;
            wsc?.send("change");
            return;
        }
        st.busy = true;
        try {
            wsc?.send("change");

            await te().then((either) => {
                state = either;
            });
        } catch (e) {
            console.error(e);
        }
        st.busy = false;

        if (st.requested) {
            st.requested = false;
            wsc?.send("change");

            await doit();
        } else {
            wsc?.send("change");
        }
    };

    const settings = Core.getDefaultSettings();

    const wss = new WebSocketServer({ port: 8080 }, () => {
        console.log("Server started on port 8080");
    });

    wss.on("connection", (ws) => {
        wsc = ws;
    });

    const app = connect();
    app.use(cors());

    app.use("/state", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(
            JSON.stringify({ state, busy: st.busy, requested: st.requested })
        );
    });
    app.listen(8010);
    doit();
    chokidar
        .watch(settings.srcDir, { ignoreInitial: true })
        .on("all", (event, path) => {
            if (path.endsWith(".md")) {
                console.log(event, path);
                doit();
            }
        });
};
