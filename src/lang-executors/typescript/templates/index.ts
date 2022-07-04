import * as path from "path";
import * as fs from "fs";

const applyTemplate1 = (file: string, replacement: string) => {
    console.error("make async or import all at startup");
    const template = fs.readFileSync(path.join(__dirname, file), "utf8");
    return template.replace("{{##1##}}", replacement);
};
export const codeTemplate = (it: string) => applyTemplate1("code.template", it);
export const indexTemplate = (it: string) =>
    applyTemplate1("index.template", it);
