```ts eval --out=md --hide
import { testHeader } from "../ts-utils/test-headers";
testHeader("Inlay Hints", __meta.srcUrl + __meta.inputPath, 10);
```

# Unary calls

It adds inlay hints to identifiers.

```ts eval --out=hide
const nothing = (_it: string) => void 0;
nothing("abc");
```

It adds inlay hints to property access expressions.

```ts eval --out=hide
const nothing2 = { fn: (_it: string) => void 0 };
nothing2.fn("abc");
```

```ts eval
class AClass {
    constructor(_props: string) {}
    public aMethod = (_it: string) => void 0;
}
```

It adds inlay hints to class constructors.

```ts eval
const aClassInstance = new AClass("abc");
```

It adds inlay hints to class methods.

```ts eval --out=hide
aClassInstance.aMethod("def");
```

# N-ary calls

It adds inlay hints to n-ary calls to identifiers.

```ts eval --out=hide
const naryFn = (_it: string, _it2: number, _it3: boolean) => void 0;
naryFn("abc", 123, false);
```

It adds inlay hints to n-ary calls to property access expressions.

```ts eval --out=hide
const naryFnObj = { fn: (_it: string, _it2: number, _it3: boolean) => void 0 };
naryFnObj.fn("abc", 123, false);
```

```ts eval
class AClass3 {
    constructor(_props: string, _props2: number, _props3: boolean) {}
    public aMethod3 = (_it: string, _it2: number, _it3: boolean) => void 0;
}
```

It adds inlay hints to n-ary class constructors.

Notice that the snippet is re-formatted by prettier.

```ts eval --meta
const aClassInstance3 = new AClass3("abc", 123, false);
```

It adds inlay hints to n-ary class methods.

```ts eval --out=hide
aClassInstance3.aMethod3("def", 123, false);
```
