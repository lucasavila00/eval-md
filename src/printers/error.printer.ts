import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";

export const errorPrinter: Transformer.OutputTransformer = {
    language: "error" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content: String(result.content),
                infoString: "js",
            })
        ),
};
