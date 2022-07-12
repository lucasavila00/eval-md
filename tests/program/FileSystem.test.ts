import * as S from "fp-ts/string";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as _ from "../../src/program/FileSystem";
import { assertRight } from "../utils";

// from https://github.com/gcanti/docs-ts/blob/master/test/FileSystem.ts
describe("FileSystem", () => {
    describe("constructors", () => {
        it("File", () => {
            const file1 = _.File("src/test.ts", "test");
            const file2 = _.File("src/test.ts", "test");

            expect(file1).toStrictEqual({
                path: "src/test.ts",
                content: "test",
            });
            expect(file2).toStrictEqual({
                path: "src/test.ts",
                content: "test",
            });
        });
    });

    describe("utils", () => {
        let TEST_DIR = "";

        beforeEach(async () => {
            TEST_DIR = path.join(os.tmpdir(), "FileSystem");
            await fs.emptyDir(TEST_DIR);
        });

        afterEach(async () => {
            await fs.remove(TEST_DIR);
        });

        it("readFile", async () => {
            const file = path.join(TEST_DIR, Math.random() + ".txt");
            await fs.writeFile(file, "test1", { encoding: "utf8" });

            assertRight(await _.readFile(file, "utf8")(), (op) =>
                expect(op).toStrictEqual("test1")
            );
        });

        it("writeFile", async () => {
            const file = path.join(TEST_DIR, Math.random() + ".txt");

            assertRight(
                await pipe(
                    _.writeFile(file, "test2", { encoding: "utf8" }),
                    TE.chain(() => _.readFile(file, "utf8"))
                )(),
                (op) => expect(op).toStrictEqual("test2")
            );
        });

        it("exists", async () => {
            const file = path.join(TEST_DIR, Math.random() + ".txt");
            await fs.ensureFile(file);
            assertRight(await _.exists(file)(), (op) =>
                expect(op).toStrictEqual(true)
            );
        });

        it("remove", async () => {
            const file = path.join(TEST_DIR, Math.random() + ".txt");
            await fs.ensureFile(file);

            expect(await fs.pathExists(file)).toBe(true);

            await _.remove(file, {})();

            expect(await fs.pathExists(file)).toBe(false);
        });

        it("search", async () => {
            const file0 = path.join(TEST_DIR, Math.random() + ".txt");
            const file1 = path.join(TEST_DIR, Math.random() + ".txt");
            const file2 = path.join(TEST_DIR, Math.random() + ".txt");

            await pipe(
                [file0, file1, file2],
                RA.traverseWithIndex(TE.ApplicativePar)((i, f) =>
                    _.writeFile(f, `${i}`, { encoding: "utf8" })
                )
            )();

            expect(await fs.pathExists(file0)).toBe(true);
            expect(await fs.pathExists(file1)).toBe(true);
            expect(await fs.pathExists(file2)).toBe(true);

            assertRight(
                await pipe(
                    _.search(path.join(TEST_DIR, "*.txt"), {}),
                    TE.chain(
                        RA.traverse(TE.ApplicativePar)((f) =>
                            _.readFile(f, "utf8")
                        )
                    ),
                    TE.map(RA.elem(S.Eq)("2"))
                )(),
                (op) => expect(op).toStrictEqual(true)
            );
        });

        it("toErrorMsg", () => {
            const msg = _.toErrorMsg(new Error("test"));
            expect(msg).toBe("test");
        });
    });
    describe("instances", () => {
        let TEST_DIR = "";

        beforeEach(async () => {
            TEST_DIR = path.join(os.tmpdir(), "FileSystem");
            await fs.emptyDir(TEST_DIR);
        });

        afterEach(async () => {
            await fs.remove(TEST_DIR);
        });

        it("FileSystem", async () => {
            const file1 = path.join(TEST_DIR, Math.random() + ".txt");
            const file2 = path.join(TEST_DIR, Math.random() + ".txt");
            const file3 = path.join(TEST_DIR, Math.random() + ".txt");
            const file4 = path.join(TEST_DIR, Math.random() + ".txt");

            await pipe(
                [file1, file2, file3],
                RA.traverseWithIndex(TE.ApplicativePar)((i, f) =>
                    _.writeFile(f, `${i}`, { encoding: "utf8" })
                )
            )();

            expect(await fs.pathExists(file1)).toBe(true);
            expect(await fs.pathExists(file2)).toBe(true);
            expect(await fs.pathExists(file3)).toBe(true);

            await _.FileSystem.writeFile(file4, "4")();

            assertRight(await _.FileSystem.exists(file4)(), (exists) =>
                expect(exists).toBe(true)
            );
            assertRight(await _.FileSystem.readFile(file4)(), (content) =>
                expect(content).toBe("4")
            );
            assertRight(
                await pipe(
                    _.FileSystem.search(path.join(TEST_DIR, "*.txt"), RA.empty),
                    TE.chain(
                        RA.traverse(TE.ApplicativePar)(_.FileSystem.readFile)
                    ),
                    TE.map(RA.elem(S.Eq)("4"))
                )(),
                (found) => expect(found).toBe(true)
            );

            await _.FileSystem.remove(file4)();
            assertRight(await _.FileSystem.exists(file4)(), (exists) =>
                expect(exists).toBe(false)
            );
        });
    });
});
