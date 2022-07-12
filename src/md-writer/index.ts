export const Anchor = (text: string, url: string): string =>
    `[${text}](${url})`;

export const text = (...listOfStrings: string[]): string =>
    listOfStrings.join(" ");
