---
title: Basic
nav_order: 1
parent: Tests
layout: default
---

# Basic tests

It won't change or eval an unrecognized language.

```python
raise Exception("...")
```

It won't change or eval a block that's not being evaluated.

```ts
throw new Error("...");
```

It evaluates a block of code from a recognized language that calls eval.

```ts eval
const add1 = (it: number) => it + 1;
```

It handles yielding values from the evaluated code, that will be printed in the generated markdown.

```ts eval --yield=json
yield add1(3);
```
