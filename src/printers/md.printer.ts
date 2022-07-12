import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as TE from "fp-ts/lib/TaskEither";

export const mdPrinter: Transformer.OutputTransformer = {
    language: "md" as InfoString.OutputLanguage,
    print: (result) =>
        TE.of({
            content: JSON.parse(result.content),
            infoString: "#md#",
        }),
};
