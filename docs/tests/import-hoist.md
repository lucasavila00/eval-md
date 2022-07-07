---
title: Import Hoist
nav_order: 10
parent: Tests
layout: default
---

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/import-hoist.md) to see the uncompiled source.

Imports are hoisted to the top of the file.

```ts
import { readFile } from "fs";

readFile;
```

```js
[Function: readFile]
```

Even in environemnts without top level await, it works.

```ts
const delay = () =>
  new Promise(
    /* executor: */ (rs) => setTimeout(/* callback: */ rs, /* ms: */ 1)
  );
await delay();
```

We can import stuff one at a time.

```ts
import { writeFile } from "fs";

writeFile;
```

```js
[Function: writeFile]
```

If the same import statement is repeated, it is de-duplicated.

```ts
import { writeFile } from "fs";

writeFile;
```

```js
[Function: writeFile]
```
