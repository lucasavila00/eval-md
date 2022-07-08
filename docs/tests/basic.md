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

Check out the [original file](https://github.com/lucasavila00/eval-md/tree/main/eval-mds/tests/basic.md) to see the uncompiled source.

# Not calling eval

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

# Calling eval

Eval blocks can be meta. These tests make extensive use of this feature.

````md
```ts eval --meta
// some code
```
````

```ts
// some code
```

<!-- Eval blocks can be empty. -->


It evaluates a block of code from a recognized language that calls eval.

````md
```ts eval --meta
const nothing = (_arg: number) => void 0;
```
````

```ts
const nothing = (_arg: number) => void 0;
```

It prints inlay hints

````md
```ts eval --meta --hideout
const nothing2 = () => nothing(123);
nothing2();
```
````

```ts
const nothing2 = () => nothing(123);
nothing2();
```

It captures values from the evaluated code, that will be printed in the generated markdown.

````md
```ts eval --meta
const add1 = (it: number) => it + 1;
add1(3);
```
````

```ts
const add1 = (it: number) => it + 1;
add1(3);
```

```json
4
```

By default, values print as json.

```ts
({ a: 1 });
```

```json
{ "a": 1 }
```

The output language can be overidden

````md
```ts eval --out=jsonjs --meta
({
    a: 1,
});
```
````

```ts
({ a: 1 });
```

```js
{ a: 1 }
```

The fenced code block can be hidden

````md
```ts eval --meta --hide
({ hide: "me", n: 123 + 456 });
```
````

```json
{ "hide": "me", "n": 579 }
```

The output can be hidden

````md
```ts eval --meta --hideout
({ hide: "me", n: 123 + 456 });
```
````

```ts
({ hide: "me", n: 123 + 456 });
```
