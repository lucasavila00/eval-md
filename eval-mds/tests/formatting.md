```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Formatting", __meta.srcUrl + __meta.inputPath, 12);
```

TS code is formatted by prettier

```ts eval --hideout
// prettier-ignore
123 +                                456 + 789;
```

<!-- prettier-ignore-start -->
```ts eval --hideout
123 +                                456 + 789;
```
<!-- prettier-ignore-end -->
