import * as P from "parser-ts/Parser";
import * as S from "parser-ts/string";
import { assertIsLeft, assertIsRight } from "../utils";

export const runRight =
    <A>(parser: P.Parser<string, A>) =>
    (str: string) => {
        const r = S.run(str)(parser);
        assertIsRight(r);
        return r.right;
    };
export const runLeft =
    <A>(parser: P.Parser<string, A>) =>
    (str: string) => {
        const r = S.run(str)(parser);
        assertIsLeft(r);
        return r.left;
    };
