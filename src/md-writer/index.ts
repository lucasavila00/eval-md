export const Anchor = (text: string, url: string): string =>
    `[${text}](${url})`;

export const text = (...strs: string[]): string => strs.join(" ");
