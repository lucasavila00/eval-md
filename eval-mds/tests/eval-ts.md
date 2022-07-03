---
title: Eval (TS)
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

# Eval

```ts eval
1 + 1;
```

# Error capture

Notice: An error throw in a block that is not `--print=error` will make `eval-md` throw.

Not throwing in a block that is `--print=error` will also make `eval-md` throw.

```ts eval --print=error
throw new Error("...");
```

# Console capture

TODO

# Import Hoisting

TODO

# Print

```ts eval --print=json
1;
```

```ts eval --print=json
"a";
```

```ts eval --print=json
[{ a: 1 }];
```

```ts eval --print=json
1;
2;
```

```ts eval --print=json
3;
4;
```
