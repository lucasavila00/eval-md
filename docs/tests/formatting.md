---
title: Formatting
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/formatting.md) to see the original source.

TS code is formatted by prettier

<!-- prettier-ignore-start -->
````md
```ts eval --hideout --meta
123 +                                456 + 789;
```
````

```ts
123 + 456 + 789;
```
<!-- prettier-ignore-end -->
