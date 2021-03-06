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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/error.md) to see the original source.

Errors can be caught and shown, explicitly. Errors that are thrown but not explicitly will stop the markdown generation.

````md
```ts eval --error --meta
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

We can create a variable with const in an error block...

```ts
const a = "abc";
throw new Error(/* message: */ a);
```

```js
Error: abc
```

And later create another const with the same name.

```ts
const a = "def";
a;
```

```json
"def"
```

And a third time, we can re-create the const.

```ts
const a = "abc";
throw new Error(/* message: */ a);
```

```js
Error: abc
```

The "a" variable was never changed.

```ts
a;
```

```json
"def"
```

---

This document used [eval-md](https://lucasavila00.github.io/eval-md/)