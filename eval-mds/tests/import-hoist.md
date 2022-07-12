```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Import Hoist", __meta.srcUrl + __meta.inputPath, 10);
```

Imports are hoisted to the top of the file.

```ts eval --out=jsonjs
import { readFile } from "fs";
readFile;
```

Even in environments without top level await, it works.

```ts eval --out=hide
const delay = () => new Promise((rs) => setTimeout(rs, 1));
await delay();
```

We can import stuff one at a time.

```ts eval --out=jsonjs
import { writeFile } from "fs";
writeFile;
```

If the same import statement is repeated, it is de-duplicated.

```ts eval --out=jsonjs
import { writeFile } from "fs";
writeFile;
```
