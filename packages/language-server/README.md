# Hamber Language Server

A language server (implementing the [language server protocol](https://microsoft.github.io/language-server-protocol/))
for Hamber.

Requires Node 12 or later.

## What is a language server?

From https://microsoft.github.io/language-server-protocol/overview

> The idea behind a Language Server is to provide the language-specific smarts inside a server that can communicate with development tooling over a protocol that enables inter-process communication.

In simpler terms, this allows editor and addon devs to add support for hamber specific 'smarts' (e.g. diagnostics, autocomplete, etc) to any editor without reinventing the wheel.

## Features

Hamber language server is under development and the list of features will surely grow over time.

Currently Supported:

-   Hamber
    -   Diagnostic messages for warnings and errors
    -   Hamber specific formatting
-   HTML (via [vscode-html-languageservice](https://github.com/Microsoft/vscode-html-languageservice))
    -   Hover info
    -   Autocompletions
    -   [Emmet](https://emmet.io/)
    -   Symbols in Outline panel
-   CSS / SCSS / LESS (via [vscode-css-languageservice](https://github.com/Microsoft/vscode-css-languageservice))
    -   Diagnostic messages for syntax and lint errors
    -   Hover info
    -   Autocompletions
    -   Formatting (via [prettier](https://github.com/prettier/prettier))
    -   [Emmet](https://emmet.io/)
    -   Color highlighting and color picker
    -   Symbols in Outline panel
-   TypeScript / JavaScript (via TypeScript)
    -   Diagnostics messages for syntax errors, semantic errors, and suggestions
    -   Hover info
    -   Formatting (via [prettier](https://github.com/prettier/prettier))
    -   Symbols in Outline panel
    -   Autocompletions
    -   Go to definition
    -   Code Actions

## How can I use it?

Install a plugin for your editor:

-   [VS Code](../hamber-vscode)

## Settings

The language server has quite a few settings to toggle features. They are listed below. When using the VS Code extension, you can set these through the settings UI or in the `settings.json` using the keys mentioned below.

When using the language server directly, put the settings as JSON inside `initializationOptions.configuration` for the [initialize command](https://microsoft.github.io/language-server-protocol/specification#initialize). When using the [didChangeConfiguration command](https://microsoft.github.io/language-server-protocol/specification#workspace_didChangeConfiguration), pass the JSON directly. The language server also accepts configuration for Emmet (key: `emmet`), Prettier (key: `prettier`), CSS (key: `css` / `less` / `scss`) and TypeScript (keys: `javascript` and `typescript` for JS/TS config).

Example:

Init:

```js
{
    initializationOptions: {
        configuration: {
            hamber: {
                plugin: {
                    css: { enable: false },
                    // ...
                }
            },
            typescript: { /* .. */ },
            javascript: { /* .. */ },
            prettier: { /* .. */ },
            // ...
        }
    }
}
```

Update:

```js
{
    hamber: {
        plugin: {
            css: { enable: false },
            // ...
        }
    },
    typescript: { /* .. */ },
    javascript: { /* .. */ },
    prettier: { /* .. */ },
    // ...
    }
}
```

### List of settings

##### `hamber.plugin.typescript.enable`

Enable the TypeScript plugin. _Default_: `true`

##### `hamber.plugin.typescript.diagnostics.enable`

Enable diagnostic messages for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.hover.enable`

Enable hover info for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.documentSymbols.enable`

Enable document symbols for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.completions.enable`

Enable completions for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.codeActions.enable`

Enable code actions for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.selectionRange.enable`

Enable selection range for TypeScript. _Default_: `true`

##### `hamber.plugin.typescript.signatureHelp.enable`

Enable signature help (parameter hints) for JS/TS. _Default_: `true`

##### `hamber.plugin.typescript.semanticTokens.enable`

Enable semantic tokens (semantic highlight) for TypeScript. _Default_: `true`

##### `hamber.plugin.css.enable`

Enable the CSS plugin. _Default_: `true`

##### `hamber.plugin.css.globals`

Which css files should be checked for global variables (`--global-var: value;`). These variables are added to the css completions. String of comma-separated file paths or globs relative to workspace root.

##### `hamber.plugin.css.diagnostics.enable`

Enable diagnostic messages for CSS. _Default_: `true`

##### `hamber.plugin.css.hover.enable`

Enable hover info for CSS. _Default_: `true`

##### `hamber.plugin.css.completions.enable`

Enable auto completions for CSS. _Default_: `true`

##### `hamber.plugin.css.completions.emmet`

Enable emmet auto completions for CSS. _Default_: `true`
If you want to disable emmet completely everywhere (not just Hamber), you can also set `"emmet.showExpandedAbbreviation": "never"` in your settings.

##### `hamber.plugin.css.documentColors.enable`

Enable document colors for CSS. _Default_: `true`

##### `hamber.plugin.css.colorPresentations.enable`

Enable color picker for CSS. _Default_: `true`

##### `hamber.plugin.css.documentSymbols.enable`

Enable document symbols for CSS. _Default_: `true`

##### `hamber.plugin.css.selectionRange.enable`

Enable selection range for CSS. _Default_: `true`

##### `hamber.plugin.html.enable`

Enable the HTML plugin. _Default_: `true`

##### `hamber.plugin.html.hover.enable`

Enable hover info for HTML. _Default_: `true`

##### `hamber.plugin.html.completions.enable`

Enable auto completions for HTML. _Default_: `true`

##### `hamber.plugin.html.completions.emmet`

Enable emmet auto completions for HTML. _Default_: `true`
If you want to disable emmet completely everywhere (not just Hamber), you can also set `"emmet.showExpandedAbbreviation": "never"` in your settings.

##### `hamber.plugin.html.tagComplete.enable`

Enable HTML tag auto closing. _Default_: `true`

##### `hamber.plugin.html.documentSymbols.enable`

Enable document symbols for HTML. _Default_: `true`

##### `hamber.plugin.html.linkedEditing.enable`

Enable Linked Editing for HTML. _Default_: `true`

##### `hamber.plugin.hamber.enable`

Enable the Hamber plugin. _Default_: `true`

##### `hamber.plugin.hamber.useNewTransformation`

Hamber files need to be transformed to something that TypeScript understands for intellisense. Version 2.0 of this transformation can be enabled with this setting. It will be the default, soon.

##### `hamber.plugin.hamber.diagnostics.enable`

Enable diagnostic messages for Hamber. _Default_: `true`

##### `hamber.plugin.hamber.compilerWarnings`

Hamber compiler warning codes to ignore or to treat as errors. Example: { 'css-unused-selector': 'ignore', 'unused-export-let': 'error'}

##### `hamber.plugin.hamber.format.enable`

Enable formatting for Hamber (includes css & js) using [prettier-plugin-hamber](https://github.com/hamberjs/prettier-plugin-hamber). _Default_: `true`

You can set some formatting options through this extension. They will be ignored if there's any kind of configuration file, for example a `.prettierrc` file. Read more about Prettier's configuration file [here](https://prettier.io/docs/en/configuration.html).

##### `hamber.plugin.hamber.format.config.hamberSortOrder`

Format: join the keys `options`, `scripts`, `markup`, `styles` with a `-` in the order you want. _Default_: `options-scripts-markup-styles`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `hamber.plugin.hamber.format.config.hamberStrictMode`

More strict HTML syntax. _Default_: `false`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `hamber.plugin.hamber.format.config.hamberAllowShorthand`

Option to enable/disable component attribute shorthand if attribute name and expression are the same. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `hamber.plugin.hamber.format.config.hamberBracketNewLine`

Put the `>` of a multiline element on a new line. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `hamber.plugin.hamber.format.config.hamberIndentScriptAndStyle`

Whether or not to indent code inside `<script>` and `<style>` tags. _Default_: `true`

This option is ignored if there's any kind of configuration file, for example a `.prettierrc` file.

##### `hamber.plugin.hamber.format.config.printWidth`

Maximum line width after which code is tried to be broken up. This is a Prettier core option. If you have the Prettier extension installed, this option is ignored and the corresponding option of that extension is used instead. This option is also ignored if there's any kind of configuration file, for example a `.prettierrc` file. _Default_: `80`

##### `hamber.plugin.hamber.format.config.singleQuote`

Use single quotes instead of double quotes, where possible. This is a Prettier core option. If you have the Prettier extension installed, this option is ignored and the corresponding option of that extension is used instead. This option is also ignored if there's any kind of configuration file, for example a `.prettierrc` file. _Default_: `false`

##### `hamber.plugin.hamber.hover.enable`

Enable hover info for Hamber (for tags like #if/#each). _Default_: `true`

##### `hamber.plugin.hamber.completions.enable`

Enable autocompletion for Hamber (for tags like #if/#each). _Default_: `true`

##### `hamber.plugin.hamber.rename.enable`

Enable rename/move Hamber files functionality. _Default_: `true`

##### `hamber.plugin.hamber.codeActions.enable`

Enable code actions for Hamber. _Default_: `true`

##### `hamber.plugin.hamber.selectionRange.enable`

Enable selection range for Hamber. _Default_: `true`

##### `hamber.plugin.hamber.defaultScriptLanguage`

The default language to use when generating new script tags in Hamber. _Default_: `none`
