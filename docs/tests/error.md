---
title: Error
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/error.md) to see the uncompiled source.

Errors can be caught and shown, explicitly.

````md
```ts eval --out=error --meta
throw new Error("def");
```
````

```ts
throw new Error(/* message: */ "def");
```

```js
Error: def
```

Error blocks are eventually wrapped in a try-catch block, and have scope rules accordingly.

```ts
const a = "abc";
throw new Error(/* message: */ a);
```

```js
Error: abc
```

```ts
const a = "def";
a;
```

```json
"def"
```

```ts
const a = "abc";
throw new Error(/* message: */ a);
```

```js
Error: abc
```

```ts
a;
```

```json
"def"
```
