---
title: Import Maps
nav_order: 20
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/import-maps.md) to see the original source.

```ts
import { text } from "eval-md/lib/md-writer";
import { Anchor } from "eval-md/lib/md-writer";
```

```ts
text(/* listOfStrings: */ "a", "b");
Anchor(/* text: */ "abc", /* url: */ "def");
```

```json
"[abc](def)"
```

---

This document used [eval-md](https://lucasavila00.github.io/eval-md/)