import * as Transformer from "../program/Transformer";
import * as InfoString from "../program/InfoStringParser";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as util from "util";
import * as O from "fp-ts/lib/Option";

export const jsonjsPrinter: Transformer.OutputTransformer = {
    language: "jsonjs" as InfoString.OutputLanguage,
    print: (result) =>
        RTE.of(
            O.some({
                content: util.inspect(
                    result.content == null
                        ? String(result.content)
                        : JSON.parse(result.content)
                ),
                infoString: "js",
            })
        ),
};
