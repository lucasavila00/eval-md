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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/console.md) to see the original source.

# Capturing Calls

Local calls to console are captured, and the results shown as a blockquote.

```ts
console.log(/* message: */ "hi, log");
console.error(/* message: */ "hi, error");
console.warn(/* message: */ "hi, warn");
console.info(/* message: */ "hi, info");
console.debug(/* message: */ "hi, debug");
```

> log : hi, log

> error : hi, error

> warn : hi, warn

> info : hi, info

> debug : hi, debug

# Capuring calls in functions

Logs are shown in the block they're used, not in the block they're declared.

```ts
const fn = () => {
  console.log(/* message: */ "hi2");
};
```

In the following block, there will be a console blockquote.

```ts
fn();
```

> log : hi2

# Printing logs and output

If a block has output and logs, the log comes first.

```ts
fn();
("Hello!");
```

> log : hi2

```json
"Hello!"
```
