```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Import Maps", __meta.srcUrl + __meta.inputPath, 20);
```

```ts eval
import { text } from "../../src/md-writer";
import { Anchor } from "../../src/md-writer";
```

```ts eval
text("a", "b");
Anchor("abc", "def");
```
