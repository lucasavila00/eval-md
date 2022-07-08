import React, { FC } from "react";
import {
    Markdown,
    ParagraphExtendedProps,
    Paragraph,
    AnchorExtendedProps,
    Anchor,
    Box,
} from "grommet";
import { CodeRenderer } from "./CodeRenderer";

export const MarkdownRenderer: FC<{ markdown: string }> = ({ markdown }) => (
    <Markdown
        components={{
            a: (props: AnchorExtendedProps) => {
                return <Anchor {...props} />;
            },
            p: (props: ParagraphExtendedProps) => (
                <Paragraph
                    {...props}
                    fill={true}
                    margin={{ top: "medium", bottom: "medium" }}
                />
            ),
            code: (props: { className?: string; children: string }) => (
                <>
                    <CodeRenderer
                        language={
                            props.className?.replace("lang-", "") ?? "none"
                        }
                        code={props.children}
                    />
                </>
            ),
        }}
    >
        {markdown}
    </Markdown>
);
