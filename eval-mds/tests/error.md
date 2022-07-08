```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Error", __meta.srcUrl + __meta.inputPath, 10);
```

Errors can be caught and shown, explicitly. Errors that are thrown but not explictly will stop the markdown generation.

```ts eval --out=error --meta
throw new Error("def");
```

Error blocks are eventually wrapped in a try-catch block, and have scope rules accordingly.

We can create a variable with const in an error block...

```ts eval --out=error
const a = "abc";
throw new Error(a);
```

And later create another const with the same name.

```ts eval
const a = "def";
a;
```

And a third time, we can re-create the const.

```ts eval --out=error
const a = "abc";
throw new Error(a);
```

The "a" variable was never changed.

```ts eval
a;
```
