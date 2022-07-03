---
title: Basic
nav_order: 1
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

TODO link to original file

# Basic tests

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

Eval blocks can be meta.

```ts eval --meta
// some code
```

It evaluates a block of code from a recognized language that calls eval.

```ts eval --meta
const add1 = (it: number) => it + 1;
```

It handles printing values from the evaluated code, that will be printed in the generated markdown.

```ts eval --print=json --meta
add1(3);
```