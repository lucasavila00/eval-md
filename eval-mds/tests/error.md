```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Error", __meta.srcUrl + __meta.inputPath, 10);
```

Errors can be caught and shown, explicitly.

```ts eval --out=error --meta
throw new Error("def");
```

Error blocks are eventually wrapped in a try-catch block, and have scope rules accordingly.

```ts eval --out=error
const a = "abc";
throw new Error(a);
```

```ts eval
const a = "def";
a;
```

```ts eval --out=error
const a = "abc";
throw new Error(a);
```

```ts eval
a;
```
