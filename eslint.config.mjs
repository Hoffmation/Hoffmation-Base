import unusedImports from 'eslint-plugin-unused-imports';
import jsdoc from 'eslint-plugin-jsdoc';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/.eslintrc.js', '**/.eslint.config.mjs', '**/*.js', '**/lib', 'lib/*'],
  },
  ...compat.extends('plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'),
  {
    plugins: {
      'unused-imports': unusedImports,
      jsdoc,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: 'module',

      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },

    rules: {
      'linebreak-style': 'off',
      'no-duplicate-imports': [1],
      '@typescript-eslint/no-inferrable-types': [0],
      '@typescript-eslint/adjacent-overload-signatures': [0],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'unused-imports/no-unused-imports': 'error',
      'jsdoc/check-access': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-indentation': 'error',
      'jsdoc/check-line-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-property-names': 'error',
      'jsdoc/check-syntax': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/check-values': 'error',
      'jsdoc/empty-tags': 'error',
      'jsdoc/implements-on-classes': 'error',
      'jsdoc/multiline-blocks': 'error',
      'jsdoc/no-bad-blocks': 'error',
      'jsdoc/no-blank-blocks': 'error',
      'jsdoc/no-blank-block-descriptions': 2,
      'jsdoc/no-defaults': 'error',
      'jsdoc/no-multi-asterisks': 'error',

      'jsdoc/no-types': [
        'error',
        {
          contexts: ['TSMethodSignature', 'TSPropertySignature', 'TSInterfaceDeclaration', 'PropertyDefinition'],
        },
      ],

      'jsdoc/require-asterisk-prefix': 'error',
      'jsdoc/require-description': 'error',
      'jsdoc/require-hyphen-before-param-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-property': 'error',
      'jsdoc/require-property-description': 'error',
      'jsdoc/require-property-name': 'error',
      'jsdoc/require-property-type': 'off',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-check': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/require-yields': 'error',
      'jsdoc/require-yields-check': 'error',
      'jsdoc/sort-tags': 'error',
      'jsdoc/tag-lines': 'error',
      'jsdoc/valid-types': 'error',

      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: ['TSMethodSignature', 'TSPropertySignature', 'TSInterfaceDeclaration', 'PropertyDefinition'],

          publicOnly: {
            ancestorsOnly: true,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],

    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
];
