import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import { format } from "sql-formatter";

export const sqlPrinter: Transformer.OutputTransformer = {
    language: "sql" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content: format(JSON.parse(result.content)),
                infoString: "sql",
            })
        ),
};
