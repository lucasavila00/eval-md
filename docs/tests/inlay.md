---
title: Inlay Hints
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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/inlay.md) to see the uncompiled source.

# Unary calls

It adds inlay hints to identifiers.

```ts
const nothing = (_it: string) => void 0;
nothing(/* _it: */ "abc");
```

It adds inlay hints to property access expressions.

```ts
const nothing2 = { fn: (_it: string) => void 0 };
nothing2.fn(/* _it: */ "abc");
```

```ts
class AClass {
  constructor(_props: string) {}
  public aMethod = (_it: string) => void 0;
}
```

It adds inlay hints to class constructors.

```ts
const aClassInstance = new AClass(/* _props: */ "abc");
```

It adds inlay hints to class methods.

```ts
aClassInstance.aMethod(/* _it: */ "def");
```

# N-ary calls

It adds inlay hints to n-ary calls to identifiers.

```ts
const naryFn = (_it: string, _it2: number, _it3: boolean) => void 0;
naryFn(/* _it: */ "abc", /* _it2: */ 123, /* _it3: */ false);
```

It adds inlay hints to n-ary calls to property access expressions.

```ts
const naryFnObj = { fn: (_it: string, _it2: number, _it3: boolean) => void 0 };
naryFnObj.fn(/* _it: */ "abc", /* _it2: */ 123, /* _it3: */ false);
```

```ts
class AClass3 {
  constructor(_props: string, _props2: number, _props3: boolean) {}
  public aMethod3 = (_it: string, _it2: number, _it3: boolean) => void 0;
}
```

It adds inlay hints to n-ary class constructors.

Notice that the snippet is re-formatted by prettier.

````md
```ts eval --meta
const aClassInstance3 = new AClass3("abc", 123, false);
```
````

```ts
const aClassInstance3 = new AClass3(
  /* _props: */ "abc",
  /* _props2: */ 123,
  /* _props3: */ false
);
```

It adds inlay hints to n-ary class methods.

```ts
aClassInstance3.aMethod3(/* _it: */ "def", /* _it2: */ 123, /* _it3: */ false);
```
