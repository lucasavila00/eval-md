import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

export const jsonjsPrinter: Transformer.OutputTransformer = {
    language: "jsonjs" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of({
            content: String(result.content),
            infoString: "js",
        }),
};
