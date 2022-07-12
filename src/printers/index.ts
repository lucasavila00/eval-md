import { jsonPrinter } from "./json.printer";
import { jsonjsPrinter } from "./jsonjs.printer";
import { mdPrinter } from "./md.printer";
import { sqlPrinter } from "./sql.printer";

export const defaultOutputPrinters = [
    jsonPrinter,
    jsonjsPrinter,
    mdPrinter,
    sqlPrinter,
];
