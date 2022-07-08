import React, { FC } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import prism from "react-syntax-highlighter/dist/esm/styles/prism/prism";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("tsx", tsx);

export const CodeRenderer: FC<{
    language: string;
    code: string;
    codeStyle?: typeof prism;
}> = ({ language, code, codeStyle }) => (
    <SyntaxHighlighter
        language={language}
        style={codeStyle ?? prism}
        customStyle={{ borderRadius: "6px" }}
        wrapLongLines={true}
    >
        {code}
    </SyntaxHighlighter>
);
