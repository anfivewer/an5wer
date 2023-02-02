const baseExtends = ['eslint:recommended'];

const options = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  extends: [...baseExtends],
  rules: {
    'linebreak-style': ['error', 'unix'],
    'wrap-iife': ['error', 'inside'],
    'no-constant-condition': ['error', {checkLoops: false}],
    'no-restricted-syntax': ['error', 'BinaryExpression[operator="in"]'],
    'semi': ['error', 'always'],
  },

  overrides: [
    {
      files: ['**/*.ts+(x|)'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.base.json'],
      },
      extends: [
        ...baseExtends,
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/ban-ts-comment': 0,
        '@typescript-eslint/no-unused-vars': [
          'error',
          {varsIgnorePattern: '^shouldBeNever$|^_typeChecks'},
        ],
        '@typescript-eslint/strict-boolean-expressions': [
          'warn',
          {allowNullableObject: true, allowAny: true},
        ],
      },
    },
    {
      files: ['**/*.+(spec|test).ts+(x|)'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        'jest/expect-expect': 0,
      },
    },
  ],
};

const errorRules = [
  'guard-for-in',
  'no-extra-bind',
  'no-extra-label',
  'no-floating-decimal',
  'no-lone-blocks',
  'no-loop-func',
  'no-new',
  'no-new-wrappers',
  'no-octal-escape',
  'no-proto',
  'no-return-assign',
  'no-self-compare',
  'no-sequences',
  'no-unmodified-loop-condition',
  'no-unused-expressions',
  'no-useless-call',
  'no-useless-return',
  'require-await',
  'no-label-var',
];

const warningRules = [
  'block-scoped-var',
  'dot-notation',
  'radix',
  //   'no-console',
  'no-mixed-spaces-and-tabs',
];

errorRules.forEach(function (x) {
  options.rules[x] = 'error';
});

warningRules.forEach(function (x) {
  options.rules[x] = 'warn';
});

module.exports = options;
