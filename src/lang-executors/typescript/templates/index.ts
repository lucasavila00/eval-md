import * as path from "path";
import * as fs from "fs";

const applyTemplate1 = (file: string) => {
    const template = fs.readFileSync(path.join(__dirname, file), "utf8");
    return (replacement: string) => {
        return template.replace("{{##1##}}", replacement);
    };
};
export const codeTemplate = applyTemplate1("code.template");
export const indexTemplate = applyTemplate1("index.template");
