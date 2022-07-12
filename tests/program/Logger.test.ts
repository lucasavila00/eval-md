/* eslint-disable no-console */
import chalk from "chalk";

import * as _ from "../../src/program/Logger";

describe("Logger", () => {
    describe("constructors", () => {
        it("LogEntry", () => {
            const date = new Date(Date.now());

            expect(_.LogEntry("test", date, "DEBUG")).toStrictEqual({
                message: "test",
                date,
                level: "DEBUG",
            });
        });
    });

    describe("utils", () => {
        it("debug", async () => {
            const log_ = console.log;

            const logs: Array<any> = [];

            console.log = (a: any) => {
                logs.push(a);
            };

            const date = new Date(Date.now());

            await _.debug("test")();

            expect(logs).toStrictEqual([
                chalk.cyan(
                    `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | DEBUG | test`
                ),
            ]);

            console.log = log_;
        });

        it("error", async () => {
            const log_ = console.log;

            const logs: Array<any> = [];

            console.log = (a: any) => {
                logs.push(a);
            };

            const date = new Date(Date.now());

            await _.error("test")();

            expect(logs).toStrictEqual([
                chalk.bold.red(
                    `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | ERROR | test`
                ),
            ]);

            console.log = log_;
        });

        it("info", async () => {
            const log_ = console.log;

            const logs: Array<any> = [];

            console.log = (a: any) => {
                logs.push(a);
            };

            const date = new Date(Date.now());

            await _.info("test")();

            expect(logs).toStrictEqual([
                chalk.bold.magenta(
                    `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | INFO | test`
                ),
            ]);

            console.log = log_;
        });

        it("toErrorMsg", () => {
            const msg = _.toErrorMsg(new Error("test"));

            expect(msg).toBe("test");
        });

        describe("instances", () => {
            it("showEntry", () => {
                const date = new Date(Date.now());
                const entry = _.LogEntry("test", date, "DEBUG");
                expect(_.showEntry.show(entry)).toStrictEqual(
                    `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | DEBUG | test`
                );
            });
            it("Logger", async () => {
                const log_ = console.log;
                const logs: Array<any> = [];
                console.log = (a: any) => {
                    logs.push(a);
                };
                const date = new Date(Date.now());
                await _.Logger.debug("test")();
                await _.Logger.error("test")();
                await _.Logger.info("test")();
                expect(logs).toStrictEqual([
                    chalk.cyan(
                        `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | DEBUG | test`
                    ),
                    chalk.bold.red(
                        `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | ERROR | test`
                    ),
                    chalk.bold.magenta(
                        `${date.toLocaleDateString()} | ${date.toLocaleTimeString()} | INFO | test`
                    ),
                ]);
                console.log = log_;
            });
        });
    });
});
