import fs from 'fs';
import { hamber2tsx } from '../src/hamber2tsx/index';
const content = fs.readFileSync(`${__dirname}/index.hamber`, 'utf-8');
console.log(hamber2tsx(content).code);
/**
 * To enable the REPL, simply run the "dev" package script.
 *
 * The "/repl/index.hamber" file will be converted to tsx
 * at "/repl/output/" using the modified source code on change.
 *
 * Alternatively you may run this file with a debugger attached,
 * to do so, hit "Ctrl+Shift+D" and select "hamber2tsx" in the dropdown.
 */
