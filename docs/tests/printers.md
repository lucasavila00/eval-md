---
title: Printers
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/printers.md) to see the uncompiled source.

```ts
const obj = { a: 1 };
const str = "abc";
const num = 1234;
const bool = true;
const fn = () => 123;
```

# JSON

The default printer. Values are stringified then formatted by prettier.

````md
```ts eval --meta
obj;
```
````

```ts
obj;
```

```json
{ "a": 1 }
```

````md
```ts eval --out=json --meta
obj;
```
````

```ts
obj;
```

```json
{ "a": 1 }
```

```ts
str;
```

```json
"abc"
```

```ts
num;
```

```json
1234
```

```ts
bool;
```

```json
true
```

```ts
fn;
```

```json
undefined
```

# JSON-JS

Values are printed using node's util.inspect.

````md
```ts eval --out=jsonjs --meta
obj;
```
````

```ts
obj;
```

```js
{ a: 1 }
```

```ts
str;
```

```js
'abc'
```

```ts
num;
```

```js
1234
```

```ts
bool;
```

```js
true
```

```ts
fn;
```

```js
[Function: fn]
```

## Example with bigger JSON

```ts
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

````md
```ts eval --meta
someJson;
```
````

```ts
someJson;
```

```json
{
  "glossary": {
    "title": "example glossary",
    "GlossDiv": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": ["GML", "XML"]
          },
          "GlossSee": "markup"
        }
      }
    }
  }
}
```

````md
```ts eval --out=jsonjs --meta
someJson;
```
````

```ts
someJson;
```

```js
{
  glossary: {
    title: 'example glossary',
    GlossDiv: { title: 'S', GlossList: [Object] }
  }
}
```

# MD

Special kind of output language, as it skips the fences. Useful to return markdown from the typescript code.

It is used in this file to automatically have a link to the original file, and to avoid copying and pasting the table of contents markup template.

````md
```ts eval --out=md --meta
import { Anchor, text } from "../../src/md-writer";

text(
    "Check out the",
    Anchor("original file", __meta.srcUrl + __meta.inputPath),
    "to see the uncompiled source."
);
```
````

```ts
import { Anchor, text } from "../../src/md-writer";

text(
  /* strs: */ "Check out the",
  Anchor(
    /* text: */ "original file",
    /* url: */ __meta.srcUrl + __meta.inputPath
  ),
  "to see the uncompiled source."
);
```

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/printers.md) to see the uncompiled source.
