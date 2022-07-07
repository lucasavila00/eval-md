import { jsonPrinter } from "./json.printer";
import { jsonjsPrinter } from "./jsonjs.printer";
import { mdPrinter } from "./md.printer";

export const defaultPrinters = [jsonPrinter, jsonjsPrinter, mdPrinter];
