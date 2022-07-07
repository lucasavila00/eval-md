---
title: Console
nav_order: 12
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/console.md) to see the uncompiled source.

```ts
console.log(/* message: */ "hi");
```

> log : hi

```json
undefined
```

```ts
const fn = () => {
  console.log(/* message: */ "hi2");
};
```

> log : hi2

```ts
fn();
```

```json
undefined
```
