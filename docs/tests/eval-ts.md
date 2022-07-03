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

```ts
1 + 1;
```

# Error capture

Notice: An error throw in a block that is not `--print=error` will make `eval-md` throw.

Not throwing in a block that is `--print=error` will also make `eval-md` throw.

```ts
throw new Error("...");
```

```error
Error: ...
```

# Console capture

TODO

# Import Hoisting

TODO

# Print

```ts
1;
```

```json
1
```

```ts
"a";
```

```json
"a"
```

```ts
[{ a: 1 }];
```

```json
[{"a":1}]
```

```ts
1;
2;
```

```json
2
```

```ts
3;
4;
```

```json
4
```
