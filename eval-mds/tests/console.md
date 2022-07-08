```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Console", __meta.srcUrl + __meta.inputPath, 12);
```

# Capturing Calls

Local calls to console are captured, and the results shown as a blockquote.

```ts eval --hideout
console.log("hi, log");
console.error("hi, error");
console.warn("hi, warn");
console.info("hi, info");
console.debug("hi, debug");
```

# Capuring calls in functions

Logs are shown in the block they're used, not in the block they're declared.

```ts eval --hideout
const fn = () => {
    console.log("hi2");
};
```

In the following block, there will be a console blockquote.

```ts eval --hideout
fn();
```

# Printing logs and output

If a block has output and logs, the log comes first.

```ts eval
fn();
("Hello!");
```
