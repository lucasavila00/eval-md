import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as TE from "fp-ts/lib/TaskEither";

export const jsonjsPrinter: Transformer.OutputTransformer = {
    language: "jsonjs" as InfoString.OutputLanguage,
    print: (result) =>
        TE.of({
            content: String(result.content),
            infoString: "js",
        }),
};
