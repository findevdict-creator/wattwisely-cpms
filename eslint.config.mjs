// Shared lint rules for every app and package.
// These rules turn the coding standards from the Tech stack doc into build failures:
// classes only, one class per file, small files and methods, strict naming,
// no circular imports and no reaching into another project's internals.
import nx from '@nx/eslint-plugin';
import importX from 'eslint-plugin-import-x';

const LOOSE_FUNCTION_MESSAGE =
  'Put logic in a class method. Loose functions are not allowed (see Coding standards, rule 1).';

// 4. Naming conventions.
const NAMING_RULES = [
  { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
  { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
  {
    selector: 'variable',
    modifiers: ['const', 'global'],
    format: ['UPPER_CASE', 'PascalCase', 'camelCase'],
  },
  { selector: 'classProperty', modifiers: ['static', 'readonly'], format: ['UPPER_CASE'] },
  {
    selector: 'variable',
    types: ['boolean'],
    format: ['PascalCase'],
    prefix: ['is', 'has', 'can', 'should'],
  },
  // Names that come from outside (HTTP headers, token claims, JSON fields) keep their own spelling.
  { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
  { selector: 'import', format: null },
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/coverage', '**/.angular'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:lib'] },
            { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    plugins: { 'import-x': importX },
    // Type information lets the naming rule check that booleans start with is/has/can.
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // 2. One class, one job, one file.
      'max-classes-per-file': ['error', 1],
      // 3. Size limits.
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'max-depth': ['error', 3],
      complexity: ['error', 10],
      // No circular imports inside a project (Nx checks cycles between projects).
      'import-x/no-cycle': 'error',
      // Strict typing.
      '@typescript-eslint/no-explicit-any': 'error',
      // 1. Classes only: no top-level functions or arrow functions.
      'no-restricted-syntax': [
        'error',
        { selector: 'Program > FunctionDeclaration', message: LOOSE_FUNCTION_MESSAGE },
        {
          selector: 'Program > ExportNamedDeclaration > FunctionDeclaration',
          message: LOOSE_FUNCTION_MESSAGE,
        },
        {
          selector: 'Program > ExportDefaultDeclaration > FunctionDeclaration',
          message: LOOSE_FUNCTION_MESSAGE,
        },
        {
          selector:
            'Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
          message: LOOSE_FUNCTION_MESSAGE,
        },
        {
          selector:
            'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
          message: LOOSE_FUNCTION_MESSAGE,
        },
      ],
      // 4. Naming conventions.
      '@typescript-eslint/naming-convention': ['error', ...NAMING_RULES],
    },
  },
  {
    // Request and response shapes use the API's snake_case field names (API Design, Conventions).
    files: ['**/*.dto.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: ['classProperty', 'parameterProperty'], format: ['snake_case'] },
        ...NAMING_RULES,
      ],
    },
  },
  {
    // Tests may use a few more lines per block and helper objects.
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-classes-per-file': 'off',
    },
  },
  {
    // Startup and tool configuration files are the only exceptions to the class rule.
    files: [
      '**/main.ts',
      '**/*.config.ts',
      '**/*.config.[cm]js',
      '**/jest.config.*',
      '**/test-setup.ts',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
