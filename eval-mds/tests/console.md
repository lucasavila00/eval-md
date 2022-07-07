```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Console", __meta.srcUrl + __meta.inputPath, 12);
```

```ts eval --hideout
console.log("hi");
```

```ts eval --hideout
const fn = () => {
    console.log("hi2");
};
```

```ts eval --hideout
fn();
```
