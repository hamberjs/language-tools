import { IPseudoClassData } from 'vscode-css-languageservice';

export const pesudoClass: IPseudoClassData[] = [
    {
        name: ':global()',
        description: `[hamber] :global modifier

Applying styles to a selector globally`,
        references: [
            {
                name: 'Hamber.js Reference',
                url: 'https://hamberjs.web.app/docs#style'
            }
        ]
    }
];
