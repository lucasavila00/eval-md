import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as TE from "fp-ts/lib/TaskEither";
import { format } from "sql-formatter";

export const sqlPrinter: Transformer.OutputTransformer = {
    language: "sql" as InfoString.OutputLanguage,
    print: (result) =>
        TE.of({
            content: format(JSON.parse(result.content)),
            infoString: "sql",
        }),
};
