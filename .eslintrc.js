module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    project: ['./tsconfig.json', './tsconfig.eslint.json'],
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    'plugin:prettier/recommended',
  ],
  plugins: ['unused-imports', 'jsdoc'],
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
    'jsdoc/check-access': 'error', // Recommended
    'jsdoc/check-alignment': 'error', // Recommended
    'jsdoc/check-indentation': 'error',
    'jsdoc/check-line-alignment': 'error',
    'jsdoc/check-param-names': 'error', // Recommended
    'jsdoc/check-property-names': 'error', // Recommended
    'jsdoc/check-syntax': 'error',
    'jsdoc/check-types': 'error', // Recommended
    'jsdoc/check-values': 'error', // Recommended
    'jsdoc/empty-tags': 'error', // Recommended
    'jsdoc/implements-on-classes': 'error', // Recommended
    // 'jsdoc/informative-docs': 'error',
    'jsdoc/multiline-blocks': 'error', // Recommended
    'jsdoc/no-bad-blocks': 'error',
    'jsdoc/no-blank-blocks': 'error',
    'jsdoc/no-blank-block-descriptions': 2,
    'jsdoc/no-defaults': 'error',
    'jsdoc/no-multi-asterisks': 'error', // Recommended
    'jsdoc/no-types': ['error', { contexts: ['any'] }], // Recommended
    'jsdoc/require-asterisk-prefix': 'error',
    'jsdoc/require-description': 'error',
    'jsdoc/require-hyphen-before-param-description': 'error',
    'jsdoc/require-param': 'error', // Recommended
    'jsdoc/require-param-description': 'error', // Recommended
    'jsdoc/require-param-name': 'error', // Recommended
    'jsdoc/require-param-type': 'off', // Recommended
    'jsdoc/require-property': 'error', // Recommended
    'jsdoc/require-property-description': 'error', // Recommended
    'jsdoc/require-property-name': 'error', // Recommended
    'jsdoc/require-property-type': 'off', // Recommended
    'jsdoc/require-returns': 'error', // Recommended
    'jsdoc/require-returns-check': 'error', // Recommended
    'jsdoc/require-returns-description': 'error', // Recommended
    'jsdoc/require-throws': 'error',
    'jsdoc/require-yields': 'error', // Recommended
    'jsdoc/require-yields-check': 'error', // Recommended
    'jsdoc/sort-tags': 'error',
    'jsdoc/tag-lines': 'error', // Recommended
    'jsdoc/valid-types': 'error', // Recommended
    'jsdoc/require-jsdoc': ['error', { contexts: ['TSMethodSignature', 'TSPropertySignature'], publicOnly: true }],
  },
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['*.ts', '*.tsx'], // Your TypeScript files extension
      parserOptions: {
        project: ['./tsconfig.json'], // Specify it only for TypeScript files
      },
    },
  ],
};
