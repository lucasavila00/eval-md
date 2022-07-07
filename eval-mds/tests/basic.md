---
title: Basic
nav_order: 1
parent: Tests
layout: default
---

```ts eval --out=md --hide
__meta.tocTemplate;
```

# Basic tests

```ts eval --out=md --hide
import { Anchor, text } from "../../src/md-writer";

text(
    "Check out the",
    Anchor("original file", __meta.srcUrl + __meta.inputPath),
    "to see the uncompiled source."
);
```

## Not calling eval

It won't change or eval an unrecognized language.

````md
```python
raise Exception("...")
```
````

```python
raise Exception("...")
```

It won't change or eval a block that's not being evaluated.

````md
```ts
throw new Error("...");
```
````

```ts
throw new Error("...");
```

## Calling eval

Eval blocks can be meta. These tests make extensive use of this feature.

```ts eval --meta
// some code
```

<!-- Eval blocks can be empty. -->

```ts eval --hide

```

It evaluates a block of code from a recognized language that calls eval.

```ts eval --meta
const nothing = (_arg: number) => void 0;
```

It prints inlay hints

```ts eval --meta
const nothing2 = () => nothing(123);
```

```ts eval
const add1 = (it: number) => it + 1;
```

It captures values from the evaluated code, that will be printed in the generated markdown.

```ts eval --meta
add1(3);
```

```ts eval
nothing2();
```

By default, values print as json.

```ts eval
({
    a: 1;
})
```

The output language can be overidden

```ts eval --out=jsonjs --meta
({
    a: 1;
})
```

The fenced code block can be hidden

```ts eval --meta --hide
({ hide: "me", n: 123 + 456 });
```

The output can be hidden

```ts eval --meta --hideout
({ hide: "me", n: 123 + 456 });
```
