const { resolve } = require('path');

module.exports = {
  root: true,

  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/typescript', 'prettier'],

  env: {
    browser: true,
    node: true,
  },

  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: resolve(__dirname, './tsconfig.json'),
  },

  plugins: ['import', '@typescript-eslint'],

  rules: {
    // ESLint default rules
    // `comma-dangle` conflicts with `prettier`
    // `comma-spacing` conflicts with `prettier`
    complexity: [0, 5],
    camelcase: 0,
    'consistent-return': 2,
    'default-case': 2,
    'eol-last': 2,
    // `indent` conflicts with `prettier`
    // `key-spacing` conflicts with `prettier`
    // `linebreak-style` conflicts with `prettier`
    'new-parens': 2,
    'no-alert': 2,
    'no-array-constructor': 2,
    'no-caller': 2,
    'no-console': 2,
    'no-debugger': 0,
    'no-dupe-class-members': 2,
    'no-eq-null': 2,
    'no-eval': 2,
    // `no-floating-decimal` conflicts with `prettier`
    'no-irregular-whitespace': 0,
    'no-magic-numbers': 0,
    // `no-multi-spaces` conflicts with `prettier`
    // `no-trailing-spaces` conflicts with `prettier`
    'no-unused-vars': 0,
    'no-use-before-define': 2,
    // `object-curly-spacing` conflicts with `prettier`
    // `quotes` conflicts with `prettier`
    // `semi` conflicts with `prettier`
    // `semi-spacing` conflicts with `prettier`
    // `space-infix-ops` conflicts with `prettier`
    // `space-in-parens` conflicts with `prettier`
    yoda: 2,
  },

  overrides: [
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],

      rules: {
        // Disable ESLint default rules
        'no-use-before-define': 0,

        // Import plugin rules
        'import/no-relative-parent-imports': 2,

        // TypeScript rules
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-unused-vars': 0, // `tsc` detects instead
        '@typescript-eslint/no-use-before-define': 2,
        '@typescript-eslint/explicit-module-boundary-types': 0,
      },
    },
  ],
};
