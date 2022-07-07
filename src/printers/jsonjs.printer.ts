import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";

export const jsonjsPrinter: Transformer.OutputTransformer = {
    language: "jsonjs" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content: String(result.content),
                infoString: "js",
            })
        ),
};
