import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";

export const mdPrinter: Transformer.OutputTransformer = {
    language: "md" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content: JSON.parse(result.content),
                infoString: "#md#",
            })
        ),
};
