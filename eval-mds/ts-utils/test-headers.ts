import { Anchor, text } from "../../src/md-writer";

const tocTemplate = `
<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>
`;

const frontMatter = (title: string, navOrder = 10) => `---
title: ${title}
nav_order: ${navOrder}
parent: Tests
layout: default
---
`;

export const testHeader = (title: string, url: string, navOrder = 10) => {
    const link = text(
        "Check out the",
        Anchor("original file", url),
        "to see the original source."
    );

    return frontMatter(title, navOrder) + tocTemplate + "\n" + link;
};
