import * as path from "path";
import { File } from "../../program/FileSystem";
export const getExecFileName = (file: File, language: string): string =>
    changeExtension(file.path, "." + language);
const changeExtension = (file: string, extension: string): string => {
    const basename = path.basename(file, path.extname(file));
    return path.join(path.dirname(file), basename + extension);
};
