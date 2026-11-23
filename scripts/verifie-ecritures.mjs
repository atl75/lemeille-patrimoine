#!/usr/bin/env node
/**
 * Toute mutation de collection doit passer par updateJSON.
 * Analyse syntaxique TypeScript : ignore commentaires/chaînes, reconnaît
 * les alias d'import et les appels via namespace.
 * L'unique remplacement volontaire autorisé est le jeton OAuth Google ;
 * ses lectures et son remplacement vivent dans des opérations distinctes.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const root = process.cwd();
const violations = [];
function* files(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (/\.tsx?$/.test(entry.name)) yield file;
  }
}
for (const dir of ['app', 'lib']) {
  for (const file of files(path.join(root, dir))) {
    const relative = path.relative(root, file);
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const names = new Set(['writeJSON']);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const spec of bindings.elements) {
          if ((spec.propertyName || spec.name).text === 'writeJSON') names.add(spec.name.text);
        }
      }
    }
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const isWrite = (ts.isIdentifier(callee) && names.has(callee.text))
          || (ts.isPropertyAccessExpression(callee) && callee.name.text === 'writeJSON');
        if (isWrite) {
          const arg = node.arguments[0];
          const tokenReplacement = relative === 'lib/googleMail.ts' && arg && ts.isIdentifier(arg) && arg.text === 'TOKEN_FILE';
          if (!tokenReplacement) {
            const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            violations.push(`${relative}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
if (violations.length) {
  console.error('✗ Écritures directes interdites :\n' + violations.join('\n') + '\nUtiliser updateJSON ; garder les effets externes hors de la mutation.');
  process.exit(1);
}
console.log('✓ Aucune écriture directe de collection détectée ; seul le remplacement du jeton OAuth reste autorisé.');
