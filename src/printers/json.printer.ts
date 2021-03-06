import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as prettier from "prettier";
import * as TE from "fp-ts/lib/TaskEither";

export const jsonPrinter: Transformer.OutputTransformer = {
    language: "json" as InfoString.OutputLanguage,
    print: (result) => {
        const inspect =
            result.content == null
                ? String(result.content)
                : JSON.stringify(JSON.parse(result.content));
        const pretty = prettier.format(inspect, { filepath: "it.json" }).trim();

        return TE.of({
            content: pretty,
            infoString: "json",
        });
    },
};
