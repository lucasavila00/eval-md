import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";

export const jsonPrinter: Transformer.OutputTransformer = {
    language: "json" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content:
                    result.content == null
                        ? String(result.content)
                        : JSON.stringify(JSON.parse(result.content)),
                infoString: "json",
            })
        ),
};
