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

````md
```ts eval --meta
// some code
```
````

```ts
// some code
```

It evaluates a block of code from a recognized language that calls eval.

````md
```ts eval --meta
const add1 = (it: number) => it + 1;
```
````

```ts
const add1 = (it: number) => it + 1;
```

It handles yielding values from the evaluated code, that will be printed in the generated markdown.

````md
```ts eval --yield=json --meta
add1(3);
```
````

```ts
add1(3);
```

```json
4
```
