# A TypeScript plugin for Hamber intellisense

This plugin provides intellisense for interacting with Hamber files. It is in a very early stage, so expect bugs. So far the plugin supports

-   Rename
-   Find Usages
-   Go To Definition
-   Diagnostics

Note that these features are only available within TS/JS files. Intellisense within Hamber files is provided by the [hamber-language-server](https://www.npmjs.com/package/hamber-language-server).

## Usage

The plugin comes packaged with the [Hamber for VS Code extension](https://marketplace.visualstudio.com/items?itemName=hamberjs.hamber-vscode). If you are using that one, you don't need to add it manually.

Adding it manually:

`npm install --save-dev typescript-hamber-plugin`

Then add it to your `tsconfig.json` or `jsconfig.json`:

```
{
    "compilerOptions": {
        ...
        "plugins": [{
            "name": "typescript-hamber-plugin"
        }]
    }
}
```

## Limitations

Changes to Hamber files are only recognized after they are saved to disk.
