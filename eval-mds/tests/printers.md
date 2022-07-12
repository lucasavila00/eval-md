```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Printers", __meta.srcUrl + __meta.inputPath, 10);
```

```ts eval
const obj = { a: 1 };
const str = "abc";
const num = 1234;
const bool = true;
const fn = () => 123;
```

# JSON

The default printer. Values are stringified then formatted by prettier.

```ts eval --meta
obj;
```

```ts eval --out=json --meta
obj;
```

```ts eval
str;
```

```ts eval
num;
```

```ts eval
bool;
```

```ts eval
fn;
```

# JSON-JS

Values are printed using node's util.inspect.

```ts eval --out=jsonjs --meta
obj;
```

```ts eval --out=jsonjs
str;
```

```ts eval --out=jsonjs
num;
```

```ts eval --out=jsonjs
bool;
```

```ts eval --out=jsonjs
fn;
```

## Example with bigger JSON

```ts eval
const someJson = {
    glossary: {
        title: "example glossary",
        GlossDiv: {
            title: "S",
            GlossList: {
                GlossEntry: {
                    ID: "SGML",
                    SortAs: "SGML",
                    GlossTerm: "Standard Generalized Markup Language",
                    Acronym: "SGML",
                    Abbrev: "ISO 8879:1986",
                    GlossDef: {
                        para: "A meta-markup language, used to create markup languages such as DocBook.",
                        GlossSeeAlso: ["GML", "XML"],
                    },
                    GlossSee: "markup",
                },
            },
        },
    },
};
```

```ts eval --meta
someJson;
```

```ts eval --out=jsonjs --meta
someJson;
```

# MD

Special kind of output language, as it skips the fences. Useful to return markdown from the typescript code.

It is used in this file to automatically have a link to the original file, and to avoid copying and pasting the table of contents markup template.

```ts eval --out=md --meta
import { Anchor, text } from "../../src/md-writer";

text(
    "Check out the",
    Anchor("original file", __meta.srcUrl + __meta.inputPath),
    "to see the original source."
);
```
