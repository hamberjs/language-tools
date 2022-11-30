# hamber2tsx

Converts [Hamber](https://hamberjs.web.app) component source into TSX. The TSX can be type checked using the included `hamber-jsx.d.ts` and `hamber-shims.d.ts`.

_This project only converts hamber to tsx, type checking is left to consumers of this plugin such as language services_

```typescript
type HamberCompiledToTsx = {
    code: string;
    map: import('magic-string').SourceMap;
};

export default function hamber2tsx(hamber: string): HamberCompiledToTsx;
```

For example

Input.hamber

```hamber
<script>
    export let world = 'name';
</script>

<h1>hello {world}</h1>
```

will produce this ugly but type checkable TSX

```tsx
<></>;
function render() {
    let world = 'name';
    <>
        <h1>hello {world}</h1>
    </>;
    return { props: { world }, slots: {}, events: {} };
}

export default class _World_ extends __hamberts_1_createHamber2TsxComponent(
    __hamberts_1_partial(__hamberts_1_with_any_event(render))
) {}
```

with a v3 SourceMap back to the original source.
